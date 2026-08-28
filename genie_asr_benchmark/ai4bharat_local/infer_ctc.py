"""
CPU-only ONNX Runtime inference for AI4Bharat IndicConformer 600M (CTC head),
using the community int8-quantized ONNX export:
  atharva-again/indic-conformer-600m-quantized  (HuggingFace, MIT-licensed model,
  weights derived from ai4bharat/indic-conformer-600m-multilingual)

This deliberately reimplements the feature extraction with librosa/numpy
instead of the upstream repo's torchaudio-based preprocessor, to avoid
installing torch (which the published `indic-asr-onnx` pip package requires
as a hard dependency, along with onnxruntime-gpu and a full CUDA toolkit --
multiple GB of GPU-only wheels that are useless on this CPU-only sandbox).

Only the CTC head is used here (encoder + ctc_decoder_quantized_int8.onnx).
The RNNT head needs extra per-language "adapter" ONNX files and a stateful
greedy decode loop; CTC is the lighter, sufficient path for a feasibility
smoke test.

USAGE:
    python infer_ctc.py <path/to/16k/mono/wav> <lang_code>
    e.g. python infer_ctc.py test_tone.wav sa
"""
import json
import os
import sys
import time

import numpy as np
import librosa
import onnxruntime as ort

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models", "indic-conformer-600m-quantized")


def load_audio_mono_16k(path):
    # librosa.load resamples to sr=16000 and mixes down to mono by default.
    wav, sr = librosa.load(path, sr=16000, mono=True)
    return wav.astype(np.float32), sr


def extract_features(wav):
    """Replicates the upstream torchaudio.transforms.MelSpectrogram config:
    sample_rate=16000, n_fft=512, win_length=400, hop_length=160,
    f_min=0.0, f_max=8000.0, n_mels=80, window=hann, power=2.0,
    followed by log(mel + 1e-9) and per-utterance mean/std normalization.
    """
    mel = librosa.feature.melspectrogram(
        y=wav,
        sr=16000,
        n_fft=512,
        win_length=400,
        hop_length=160,
        window="hann",
        fmin=0.0,
        fmax=8000.0,
        n_mels=80,
        power=2.0,
        center=True,
    )
    feat = np.log(mel + 1e-9)
    mean = feat.mean(axis=1, keepdims=True)
    std = feat.std(axis=1, keepdims=True) + 1e-5
    feat = (feat - mean) / std
    return feat.astype(np.float32)  # shape (n_mels=80, T)


def main():
    if len(sys.argv) < 3:
        print(f"usage: {sys.argv[0]} <wav_path> <lang_code>")
        sys.exit(1)
    wav_path, lang = sys.argv[1], sys.argv[2]

    t_start = time.time()

    with open(os.path.join(MODEL_DIR, "config", "vocab.json"), encoding="utf-8") as f:
        vocab = json.load(f)[lang]
    with open(os.path.join(MODEL_DIR, "config", "language_masks.json"), encoding="utf-8") as f:
        mask = np.array(json.load(f)[lang], dtype=bool)

    print(f"[{time.time()-t_start:.2f}s] loaded vocab/mask for lang={lang} (vocab size {len(vocab)})")

    wav, sr = load_audio_mono_16k(wav_path)
    print(f"[{time.time()-t_start:.2f}s] loaded audio: {wav_path} sr={sr} samples={len(wav)} dur={len(wav)/sr:.2f}s")

    feat = extract_features(wav)
    print(f"[{time.time()-t_start:.2f}s] features shape (mel,T) = {feat.shape}")

    feat_b = np.expand_dims(feat, axis=0)  # (1, 80, T)
    length = np.array([feat.shape[1]], dtype=np.int64)

    print(f"[{time.time()-t_start:.2f}s] loading ONNX sessions (CPUExecutionProvider) ...")
    so = ort.SessionOptions()
    enc_sess = ort.InferenceSession(
        os.path.join(MODEL_DIR, "onnx", "encoder_quantized_int8.onnx"),
        sess_options=so,
        providers=["CPUExecutionProvider"],
    )
    ctc_sess = ort.InferenceSession(
        os.path.join(MODEL_DIR, "onnx", "ctc_decoder_quantized_int8.onnx"),
        sess_options=so,
        providers=["CPUExecutionProvider"],
    )
    print(f"[{time.time()-t_start:.2f}s] sessions loaded")

    enc_inputs = enc_sess.get_inputs()
    print("encoder inputs:", [(i.name, i.shape, i.type) for i in enc_inputs])
    enc_dict = {enc_inputs[0].name: feat_b}
    if len(enc_inputs) > 1:
        enc_dict[enc_inputs[1].name] = length

    t_enc0 = time.time()
    enc_out = enc_sess.run(None, enc_dict)[0]
    print(f"[{time.time()-t_start:.2f}s] encoder ran in {time.time()-t_enc0:.2f}s, enc_out shape={enc_out.shape}")

    ctc_inputs = ctc_sess.get_inputs()
    print("ctc inputs:", [(i.name, i.shape, i.type) for i in ctc_inputs])
    ctc_dict = {ctc_inputs[0].name: enc_out}
    if len(ctc_inputs) > 1:
        ctc_dict[ctc_inputs[1].name] = length

    t_ctc0 = time.time()
    logits = ctc_sess.run(None, ctc_dict)[0]
    print(f"[{time.time()-t_start:.2f}s] ctc decoder ran in {time.time()-t_ctc0:.2f}s, logits shape={logits.shape}")

    logits_sliced = logits[:, :, mask]
    pred_ids = np.argmax(logits_sliced, axis=-1)[0]

    tokens = []
    prev = None
    BLANK = 256
    for idx in pred_ids:
        if idx != prev and idx != BLANK and idx < len(vocab):
            tokens.append(vocab[idx])
        prev = idx
    text = "".join(tokens).replace("▁", " ").strip()

    print(f"[{time.time()-t_start:.2f}s] TOTAL wall time")
    print("RAW_PRED_IDS_SAMPLE:", pred_ids[:40].tolist())
    print("DECODED_TEXT:", repr(text))


if __name__ == "__main__":
    main()
