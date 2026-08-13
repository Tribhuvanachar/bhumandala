#!/usr/bin/env python3
"""
autotune.py — "keep trying until it's perfect" loop.

You give it an audio file and the number of shlokas you KNOW are in it.
It separates the voice ONCE, then sweeps the detection parameters until the
segment count matches your number, prints every attempt, and saves the winning
parameters to params.json so the admin panel / Action reuse them.

    python autotune.py Sarga-9.mp3 --target 62
    python autotune.py Sarga-9.mp3 --target 62 --export out/   # also write clips

This is the loop Claude Code runs headlessly in the Codespace. Because the slow
step (Demucs separation) is cached, each re-run after the first is seconds.
"""
import argparse, json, os, sys, tempfile, shutil
import engine as E

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("--target", type=int, required=True, help="known number of shlokas")
    ap.add_argument("--min-len", type=float, default=8.0)
    ap.add_argument("--pad", type=float, default=0.10)
    ap.add_argument("--models", default="htdemucs",
                    help="comma list of demucs models to try in order, e.g. htdemucs,htdemucs_ft")
    ap.add_argument("--cache", default=".voice_cache")
    ap.add_argument("--params-out", default="params.json")
    ap.add_argument("--export", default="", help="if set, write final clips+JSON here")
    ap.add_argument("--no-separation", action="store_true")
    a = ap.parse_args()

    duration = E.ffprobe_duration(a.src)
    print(f"[autotune] {os.path.basename(a.src)}  {duration:.1f}s  target={a.target}")

    best_overall = None
    for model in [m.strip() for m in a.models.split(",") if m.strip()]:
        work = tempfile.mkdtemp(prefix="autotune_")
        try:
            print(f"[autotune] separating voice with '{model}' "
                  f"(cached after first run)…")
            voice, separated = E.separate_voice(
                a.src, work, model, enable=not a.no_separation, cache_dir=a.cache)
            if not separated:
                print("[autotune] WARNING: background NOT removed — cannot reach the "
                      "target on a music-heavy file. Install PyTorch/Demucs.",
                      file=sys.stderr)
            floor = E.auto_noise_floor(voice)
            segs, noise, gap, exact, trials = E.solve_for_target(
                duration, voice, a.target, a.min_len, a.pad, floor)

            # show the neighbourhood of the winning setting
            near = sorted({t["count"] for t in trials
                           if abs(t["count"] - a.target) <= 3})
            print(f"[{model}] best: {len(segs)} shlokas  "
                  f"(noise={noise}dB, min_gap={gap}s)  "
                  f"{'✓ EXACT' if exact else '✗ closest'}")
            print(f"[{model}] counts reachable near target: {near}")

            cand = (abs(len(segs) - a.target), model, noise, gap, segs, separated, exact)
            if best_overall is None or cand[0] < best_overall[0]:
                best_overall = cand
            if exact:
                break
        finally:
            shutil.rmtree(work, ignore_errors=True)

    score, model, noise, gap, segs, separated, exact = best_overall
    params = {
        "separate": not a.no_separation, "model": model,
        "noise_db": noise, "min_gap": gap, "min_len": a.min_len, "pad": a.pad,
        "prefix": "chunk_", "start_no": 1, "width": 2,
    }
    with open(a.params_out, "w") as f:
        json.dump({"target": a.target, "achieved": len(segs), "exact": exact,
                   "separated": separated, "params": params}, f, indent=2)
    print(f"\n[autotune] {'PERFECT' if exact else 'CLOSEST'}: "
          f"{len(segs)}/{a.target} shlokas. Saved winning settings → {a.params_out}")

    if a.export:
        p = E.Params(**params)
        chunks = E.export(a.src, duration, segs, a.export, p, True, True)
        print(f"[autotune] exported {len(chunks)} clips + chunks_map.json → {a.export}/")

    if not exact:
        print("[autotune] Not exact. Options: try more models "
              "(--models htdemucs,htdemucs_ft,mdx_extra), adjust --min-len, or the "
              "recording may run shlokas together without a clean pause.")
        sys.exit(2)

if __name__ == "__main__":
    main()
