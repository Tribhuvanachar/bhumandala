#!/usr/bin/env python3
"""Kamadhenu Experiment A — A/B renders of the held-out verses (runs on the GPU box after training).

    python3 kamadhenu/training/render_eval.py --base base/model.safetensors --finetuned export/model.safetensors \
        [--finetuned-online export/model_online.safetensors] --vocab export/vocab.txt --out eval/

For each verse in kamadhenu/data/pilot/validation.jsonl: render with the zero-shot base and with the fine-tuned
weights (EMA and, if given, online), same reference clip (the lead's own, from tools/kamadhenu/space/refs), same
seed, same text convention as training. Writes <out>/<id>/{base,finetuned,finetuned_online}.wav and eval.json with
the generated/recorded duration ratio per verse — the first objective signal (1.0 ± 0.25 is on-tempo; the 7 Sep
zero-shot clip D ran ~1.65×). The lead's ear decides the rest (Phase 13 adds HUMAN_REVIEW.csv).
"""
import argparse, json, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from kamadhenu_text import model_text  # noqa: E402


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", required=True); ap.add_argument("--finetuned", required=True)
    ap.add_argument("--finetuned-online", default=None); ap.add_argument("--vocab", required=True)
    ap.add_argument("--eval-jsonl", default="kamadhenu/data/pilot/validation.jsonl")
    ap.add_argument("--ref", default="tp_anushtubh_19"); ap.add_argument("--seed", type=int, default=60)
    ap.add_argument("--nfe", type=int, default=32); ap.add_argument("--cfg", type=float, default=2.0)
    ap.add_argument("--out", required=True); ap.add_argument("--limit", type=int, default=None)
    a = ap.parse_args(argv)
    import soundfile as sf
    from f5_tts.api import F5TTS
    refs = json.load(open(ROOT / "tools/kamadhenu/space/refs/refs.json", encoding="utf-8"))["refs"]
    ref = refs[a.ref]; ref_wav = str(ROOT / "tools/kamadhenu/space/refs" / ref["wav"]); ref_text = model_text(ref["text"])
    rows = [json.loads(l) for l in open(ROOT / a.eval_jsonl, encoding="utf-8")]
    if a.limit: rows = rows[:a.limit]
    models = {"base": a.base, "finetuned": a.finetuned}
    if a.finetuned_online: models["finetuned_online"] = a.finetuned_online
    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    results = {r["id"]: {"text_id": r.get("text_id"), "meter": r.get("meter"), "recorded_seconds": r.get("duration"), "renders": {}} for r in rows}
    for name, ckpt in models.items():
        t0 = time.time()
        tts = F5TTS(model_type="F5TTS_Base", ckpt_file=ckpt, vocab_file=a.vocab, use_ema=True)
        for r in rows:
            d = out / r["id"]; d.mkdir(exist_ok=True)
            wav_path = d / f"{name}.wav"
            t1 = time.time()
            tts.infer(ref_file=ref_wav, ref_text=ref_text, gen_text=model_text(r["text"]), seed=a.seed,
                      nfe_step=a.nfe, cfg_strength=a.cfg, file_wave=str(wav_path))
            info = sf.info(str(wav_path))
            secs = info.frames / info.samplerate
            results[r["id"]]["renders"][name] = {"seconds": round(secs, 2), "duration_ratio": round(secs / r["duration"], 3) if r.get("duration") else None,
                                                  "render_seconds": round(time.time() - t1, 1)}
            print(f"{name:16s} {r['id']} {secs:6.2f}s (recorded {r.get('duration')})")
        del tts
        print(f"== {name}: {len(rows)} renders in {time.time() - t0:.0f}s")
    summary = {}
    for name in models:
        ratios = [v["renders"][name]["duration_ratio"] for v in results.values() if v["renders"].get(name, {}).get("duration_ratio")]
        summary[name] = {"n": len(ratios), "median_duration_ratio": round(sorted(ratios)[len(ratios) // 2], 3) if ratios else None,
                         "on_tempo": sum(1 for x in ratios if 0.75 <= x <= 1.25)}
    json.dump({"reference": a.ref, "seed": a.seed, "nfe": a.nfe, "cfg": a.cfg, "models": models, "summary": summary, "verses": results},
              open(out / "eval.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(json.dumps(summary, indent=1))


if __name__ == "__main__":
    sys.exit(main())
