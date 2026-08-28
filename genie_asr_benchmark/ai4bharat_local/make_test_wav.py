"""Generate a trivial synthetic 16kHz mono WAV clip for pipeline smoke-testing.
This is NOT real speech and NOT an accuracy test -- it only validates that
audio -> features -> ONNX encoder -> CTC decoder -> text runs end-to-end
without crashing and produces *some* string output.
"""
import wave
import numpy as np

sr = 16000
duration_s = 3.0
t = np.linspace(0, duration_s, int(sr * duration_s), endpoint=False)

# A few tone segments + silence, so the encoder sees some non-trivial signal.
sig = np.zeros_like(t)
sig += 0.2 * np.sin(2 * np.pi * 220 * t)
sig += 0.1 * np.sin(2 * np.pi * 440 * t) * (t > 1.0)
sig += 0.05 * np.random.RandomState(0).randn(len(t))  # light noise
sig = np.clip(sig, -1.0, 1.0)

pcm16 = (sig * 32767).astype(np.int16)

out_path = "/home/user/bhumandala/genie_asr_benchmark/ai4bharat_local/test_tone.wav"
with wave.open(out_path, "wb") as wf:
    wf.setnchannels(1)
    wf.setsampwidth(2)
    wf.setframerate(sr)
    wf.writeframes(pcm16.tobytes())

print("wrote", out_path, "duration_s=", duration_s, "sr=", sr)
