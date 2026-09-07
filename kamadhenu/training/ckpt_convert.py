#!/usr/bin/env python3
"""Checkpoint conversion between IndicF5's distribution format and the F5 trainer's (Kamadhenu Phase 8).

  to-trainer     model.safetensors → ckpt/model_last.pt
      IndicF5 ships a flat safetensors state dict whose keys are the EMA weights (`ema_model.…`, plus the EMA
      buffers `initted`/`step`; f5_tts/infer/utils_infer.py::load_checkpoint strips exactly those). The trainer
      (f5_tts/model/trainer.py::load_checkpoint) resumes from `<ckpt_dir>/model_last.pt` and, when that file has
      no top-level "step", initialises the online model FROM the EMA weights and starts at step 0 — which is the
      fine-tune start we want. So: wrap the flat dict as {"ema_model_state_dict": …}, add the two EMA buffers if
      the file lacks them, and save with torch.

  to-safetensors ckpt/model_<step>.pt → model.safetensors   (--online for the non-EMA weights)
      The reverse, for serving: the same loader that reads IndicF5's file reads this one (keys `ema_model.…`).
      F5's own training notes say EMA can be harmful for a short fine-tune, so the launcher exports both the EMA
      and the online weights; the A/B renders decide which one is kept.

The key logic is pure Python (wrap_for_trainer / flatten_for_export) so tests run without torch; torch and
safetensors are imported only inside the I/O commands.
"""
import argparse, sys

MEL_BUFFERS = ("mel_spec.mel_stft.mel_scale.fb", "mel_spec.mel_stft.spectrogram.window")


def wrap_for_trainer(flat):
    """flat safetensors dict → trainer checkpoint dict (no 'step' → fresh fine-tune start)."""
    ema = {k: v for k, v in flat.items()}
    if not any(k.startswith("ema_model.") for k in ema):
        # a plain (online) state dict: present it as the EMA copy, which is what the trainer initialises from
        ema = {"ema_model." + k: v for k, v in ema.items() if k not in ("initted", "step")}
    return {"ema_model_state_dict": ema}


def flatten_for_export(ckpt, online=False):
    """trainer checkpoint → flat dict with `ema_model.` keys (+ initted/step) that load_checkpoint(use_ema=True) reads."""
    if online:
        sd = ckpt["model_state_dict"]
        flat = {"ema_model." + k: v for k, v in sd.items() if not k.endswith(MEL_BUFFERS)}
    else:
        sd = ckpt["ema_model_state_dict"]
        flat = {k: v for k, v in sd.items() if not k.endswith(MEL_BUFFERS)}
    return flat


def cmd_to_trainer(src, dst):
    import torch
    from safetensors.torch import load_file
    flat = load_file(src, device="cpu")
    ck = wrap_for_trainer(flat)
    ema = ck["ema_model_state_dict"]
    ema.setdefault("initted", torch.tensor(True))
    ema.setdefault("step", torch.tensor(0))
    torch.save(ck, dst)
    n = sum(v.numel() for k, v in ema.items() if k.startswith("ema_model."))
    print(f"{src} → {dst}: {len(ema)} tensors, {n / 1e6:.1f} M parameters, no step (fine-tune starts at 0)")


def cmd_to_safetensors(src, dst, online=False):
    import torch
    from safetensors.torch import save_file
    ck = torch.load(src, map_location="cpu", weights_only=True)
    flat = flatten_for_export(ck, online=online)
    flat = {k: v.contiguous() for k, v in flat.items()}
    if not online:
        flat.setdefault("initted", torch.tensor(True))
        flat.setdefault("step", torch.tensor(int(ck.get("step", 0))))
    save_file(flat, dst, metadata={"source": src, "weights": "online" if online else "ema", "step": str(ck.get("step", ""))})
    print(f"{src} (step {ck.get('step', '?')}) → {dst}: {len(flat)} tensors ({'online' if online else 'EMA'} weights)")


def main(argv=None):
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    p1 = sub.add_parser("to-trainer"); p1.add_argument("src"); p1.add_argument("dst")
    p2 = sub.add_parser("to-safetensors"); p2.add_argument("src"); p2.add_argument("dst"); p2.add_argument("--online", action="store_true")
    a = ap.parse_args(argv)
    if a.cmd == "to-trainer":
        cmd_to_trainer(a.src, a.dst)
    else:
        cmd_to_safetensors(a.src, a.dst, a.online)


if __name__ == "__main__":
    sys.exit(main())
