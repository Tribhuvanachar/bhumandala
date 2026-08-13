#!/usr/bin/env python3
"""
clone_knn_vc.py  —  OPTIONAL Track B: zero-shot voice CONVERSION toward a
target voice using kNN-VC (bshall/knn-vc). This actually re-voices the
recitation to resemble your reference speaker (your "sample voice"), unlike
the DSP transform which only re-timbres generically.

No training needed (zero-shot). CPU works for a ~1-minute clip (slow: a few
minutes); a GPU is much faster. First run downloads WavLM + HiFiGAN (~hundreds
of MB) via torch.hub, so you need internet the first time.

Install (in your Codespace):
    pip install torch torchaudio soundfile numpy

Run:
    python clone_knn_vc.py --source recitation_1min.wav \
        --ref target_voice1.wav target_voice2.wav --out converted.wav

Tips:
  * --ref = one or more clips of the TARGET voice you want to sound like
    (30–60s total of clean speech is plenty; more/varied = better).
  * Use your OWN recorded voice as the reference to avoid consent/copyright issues.
  * Keep audio clean (little BGM). 16 kHz mono is used internally.
"""
import argparse, sys

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", required=True, help="the recitation to convert")
    ap.add_argument("--ref", nargs="+", required=True, help="target-voice reference wav(s)")
    ap.add_argument("--out", default="converted.wav")
    ap.add_argument("--topk", type=int, default=4)
    ap.add_argument("--device", default="cpu", choices=["cpu", "cuda"])
    a = ap.parse_args()
    try:
        import torch, torchaudio
    except ImportError:
        sys.exit("Install first:  pip install torch torchaudio soundfile numpy")

    print("Loading kNN-VC (first run downloads WavLM + HiFiGAN)…")
    knn_vc = torch.hub.load("bshall/knn-vc", "knn_vc",
                            prematched=True, trust_repo=True, device=a.device)
    print(f"Extracting features from source: {a.source}")
    query = knn_vc.get_features(a.source)
    print(f"Building matching set from {len(a.ref)} reference clip(s)…")
    matching = knn_vc.get_matching_set(a.ref)
    print(f"Converting (topk={a.topk})… this can take a few minutes on CPU")
    out = knn_vc.match(query, matching, topk=a.topk)
    torchaudio.save(a.out, out[None].cpu(), 16000)
    print(f"Wrote: {a.out}")

if __name__ == "__main__":
    main()
