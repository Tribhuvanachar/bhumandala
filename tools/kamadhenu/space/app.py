"""Kamadhenu — DGE Sanskrit chant Space (Hugging Face ZeroGPU).

Same serving model as prathoshap/vagdhenu-demo (the file this is derived from, Apache-2.0): the Vāgdhenu
renderer is created lazily inside an @spaces.GPU function, so a GPU is attached only for the seconds a verse
is being synthesised. Differences from the demo:

  * API-first: /synthesize(text, dge_chandas, seed) → (audio, json). The metre comes from the caller —
    DGE's own chandas engine runs in the browser (dge/js/chandas.js) and its verdict is mapped onto the
    reference bank by meter_map.json. Auto-detection with Vāgdhenu's tts_meter is only the fallback.
  * The voice is configuration: VAGDHENU_HF / VAGDHENU_VOICE / VAGDHENU_VOC env vars (Kamadhenu's own voice
    later replaces the baseline without a code change).
  * Per-IP daily limit is KAMADHENU_DAILY_LIMIT (default 10, as in the demo); one śloka per call.

Local run (real GPU + weights):  VAGDHENU_HF=prathoshap/vagdhenu python app.py
"""
import json, os, re, subprocess, sys, time

import gradio as gr
import spaces

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "src")
sys.path.insert(0, SRC)
from huggingface_hub import hf_hub_download  # noqa: E402
import limits  # noqa: E402  (Vāgdhenu abuse guards: one śloka, per-IP quota)

limits.DAILY_LIMIT = int(os.environ.get("KAMADHENU_DAILY_LIMIT", limits.DAILY_LIMIT))


def _ensure_bigvgan():
    try:
        import bigvgan  # noqa: F401
        return
    except ImportError:
        pass
    dst = os.path.join(HERE, "BigVGAN")
    if not os.path.isdir(os.path.join(dst, ".git")):
        subprocess.run(["git", "clone", "--depth", "1", "https://github.com/NVIDIA/BigVGAN.git", dst], check=True)
    sys.path.insert(0, dst)


_ensure_bigvgan()

WEIGHTS_REPO = os.environ.get("VAGDHENU_HF", "prathoshap/vagdhenu")
VOICE_FILE = os.environ.get("VAGDHENU_VOICE", "voice_steer_ema_2026-06-17.pt")
VOC_FILE = os.environ.get("VAGDHENU_VOC", "voc_bigvgan_EMA_2026-06-11.pth")
BANK_PATH = os.path.join(SRC, "reference_bank", "bank.json")
VOCAB = os.path.join(SRC, "reference_bank", "vocab.txt")
METER_MAP = json.load(open(os.path.join(HERE, "meter_map.json"), encoding="utf-8"))
BANK = json.load(open(BANK_PATH, encoding="utf-8"))
BANK_KEYS = [k for k, v in BANK.items() if not k.startswith("_") and isinstance(v, dict) and "wav" in v]

_RENDERER = None


def _get_renderer():
    global _RENDERER
    if _RENDERER is None:
        from render_core import Renderer
        voice = hf_hub_download(WEIGHTS_REPO, VOICE_FILE)
        voc = hf_hub_download(WEIGHTS_REPO, VOC_FILE)
        _RENDERER = Renderer(voice, voc, BANK_PATH, device="cuda", vocab_file=VOCAB if os.path.exists(VOCAB) else None,
                             nfe=int(os.environ.get("KAMADHENU_NFE", "32")))
    return _RENDERER


def _n_syllables_per_pada(text):
    padas = [p for p in re.split(r"[\n।॥|]+", text) if p.strip()]
    if not padas:
        return 0
    return round(limits._n_aksharas(text) / (4 if len(padas) >= 3 else 2 if len(padas) == 2 else 4))


def resolve_meter(text, dge_chandas):
    """DGE chandas verdict → bank key. Returns (bank_key, how)."""
    name = re.sub(r"\s*\(.*?\)\s*", "", dge_chandas or "")
    name = re.sub(r"\s*—.*$", "", name).strip()          # 'अनुष्टुप् (श्लोकः) — र-विपुला (पादे 1)' → 'अनुष्टुप्'
    if name in ("गद्यम्", "prose", "gadya"):
        return METER_MAP["prose"], "prose"
    for part in name.split(","):                          # ardhasama rows join names: 'वियोगिनी, वैतालीय, सुन्दरी'
        k = METER_MAP["by_name"].get(part.strip())
        if k in BANK_KEYS:
            return k, "dge_name"
    n = _n_syllables_per_pada(text)
    k = METER_MAP["by_syllables"].get(str(n))
    if k in BANK_KEYS:
        return k, f"dge_syllables_{n}"
    try:                                                    # Vāgdhenu's own detector as last resort (CPU)
        from render_core import detect_meter_key
        det = detect_meter_key(text)
    except Exception:
        det = ""
    for bk in BANK_KEYS:
        if det and (bk.lower() == det.lower() or BANK[bk]["wav"].replace(".wav", "").lower() == det.lower()):
            return bk, "vagdhenu_detect"
    return METER_MAP["fallback"], "fallback"


@spaces.GPU(duration=120)
def _render(text, bank_key, seed):
    t0 = time.time()
    sr, audio = _get_renderer().render_one(text, bank_key, seed=int(seed))
    return sr, audio, round(time.time() - t0, 2)


def synthesize(text, dge_chandas, seed, request: gr.Request):
    # Every failure is raised as gr.Error so the /synthesize API returns a message instead of `data: null`
    # (Gradio hides other exception types from clients). The stage name says where it broke.
    text = (text or "").strip()
    if not text:
        raise gr.Error("empty verse")
    try:
        msg = limits.validate_one_shloka(text)
    except Exception as e:
        raise gr.Error(f"validate: {type(e).__name__}: {e}")
    if msg:
        raise gr.Error(msg)
    try:
        ip = limits.client_ip(request) if request is not None else "unknown"
        allowed = limits.check_and_count(ip)
    except Exception as e:
        raise gr.Error(f"quota: {type(e).__name__}: {e}")
    if not allowed:
        raise gr.Error(f"daily limit of {limits.DAILY_LIMIT} verses reached from this network")
    try:
        bank_key, how = resolve_meter(text, dge_chandas)
    except Exception as e:
        raise gr.Error(f"meter: {type(e).__name__}: {e}")
    try:
        sr, audio, gpu_s = _render(text, bank_key, seed)
    except Exception as e:                                  # surfaces ZeroGPU quota errors verbatim
        raise gr.Error(f"rendering failed: {type(e).__name__}: {e}")
    meta = {"dge_chandas": dge_chandas or None, "bank_meter": bank_key, "meter_resolved_by": how,
            "seed": int(seed), "sample_rate": sr, "audio_seconds": round(len(audio) / sr, 2), "gpu_seconds": gpu_s,
            "voice": f"{WEIGHTS_REPO}/{VOICE_FILE}", "engine": "vagdhenu@c18927a8"}
    return (sr, audio), meta


with gr.Blocks(title="Kamadhenu — DGE Sanskrit chant") as demo:
    gr.Markdown("# Kamadhenu — DGE Sanskrit chant\nServing layer for the Sarvamūla Digital Library. "
                "Backbone: [Vāgdhenu](https://github.com/prathoshap/vagdhenu) (Prof. Prathosh, IISc), Apache-2.0. "
                "The reader calls `/synthesize` directly; this page is for manual checks.")
    with gr.Row():
        with gr.Column():
            txt = gr.Textbox(label="Verse (Devanagari, one śloka)", lines=4)
            chandas = gr.Textbox(label="DGE chandas (as reported by the reader; blank = detect)", value="")
            seed = gr.Slider(0, 1000, value=60, step=1, label="Seed")
            btn = gr.Button("Chant", variant="primary")
        with gr.Column():
            out = gr.Audio(label="Chant", type="numpy")
            meta = gr.JSON(label="meta")
    btn.click(synthesize, inputs=[txt, chandas, seed], outputs=[out, meta], api_name="synthesize")

if __name__ == "__main__":
    demo.launch(show_error=True)
