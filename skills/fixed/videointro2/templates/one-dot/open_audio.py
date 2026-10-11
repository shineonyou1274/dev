"""Climate opening test (20 s, 120 BPM) — sound design follows the one-dot story, not the compose.py template.
heartbeat → orbit shimmer → temperature line (pitch glide that rises with the graph) → glitch bands →
alert pings → near-silent story (soft keys) → suck-in → 1.5°C burst.
usage: python3 open_audio.py build/music.wav
"""
import os
import re
import subprocess
import sys

import numpy as np
from scipy.io import wavfile

sys.path.insert(0, os.environ.get("VI2_SCRIPTS", os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../scripts")))
from compose import SR, Kit, env, filt, hz  # noqa: E402

OUT = sys.argv[1]
rng = np.random.default_rng(15); K = Kit(rng)
B = 0.5; DUR = 20.0; N = int(DUR * SR)
mix = np.zeros((2, N + 3 * SR))


def put(sig, t, g=1.0, pan=0.0):
    i = int(round(t * SR))
    if i < 0 or i >= mix.shape[1]:
        return
    sig = sig[: mix.shape[1] - i]
    mix[0, i:i + len(sig)] += sig * g * np.sqrt(1 - pan)
    mix[1, i:i + len(sig)] += sig * g * np.sqrt(1 + pan)


def blip(f, d=0.08, dec=0.03, g=0.3):
    n = int(d * SR); tt = np.arange(n) / SR
    return np.sin(2 * np.pi * f * tt) * np.exp(-tt / dec) * g


def glide(t0, t1, f0, f1, curve=3.0, g=0.18):
    """sine+saw lead whose pitch follows the temperature line: flat, then bending up hard"""
    n = int((t1 - t0) * SR); u = np.arange(n) / n
    f = f0 * (f1 / f0) ** (u ** curve)
    ph = np.cumsum(f) / SR
    x = np.sin(2 * np.pi * ph) + 0.25 * (2 * (ph % 1) - 1)
    return filt(x, "lowpass", 5000) * np.minimum(1, u * 20) * np.minimum(1, (1 - u) * 60) * g


# 0–4 s: heartbeat on every beat (lub-dub), sub drone, dot pop, orbit shimmer
for k in range(8):
    t = k * B
    put(K.kick(0.5), t, 0.55); put(K.kick(0.4), t + 0.16, 0.3)
put(K.sub(38, 4.0) * 0.5, 0)
put(blip(1800, 0.12, 0.04, 0.4), 0.25)                               # dot pop
put(K.riser(1.2, 800, 6000, 0.25), 1.8)
for k in range(6):
    put(K.bell_tone(86 + (k % 3) * 5, 0.8) * 0.35, 2.1 + k * 0.28, 1.0, (-1) ** k * 0.5)
put(K.reverse_swell(0.5, [50, 57, 62]), 3.5)

# 4–8 s: neon flash, pulse bass, 16th hats, the line glide + year ticks
put(K.impact(1.6, 0.9), 4.0); put(K.braam(1.6, 38, True) * 0.5, 4.0)
for k in range(16):
    t = 4.0 + k * B / 2
    put(K.sub(38 if k % 4 else 26, B / 2 * 0.9) * 0.55, t)
for k in range(32):
    put(K.hat(g=0.7 if k % 2 else 0.4), 4.0 + k * B / 4, 0.5, 0.3)
put(glide(4.3, 8.0, 220, 1100, 3.5), 4.3, 1.0, -0.1)
for k in range(24):                                                 # year counter ticks
    put(blip(3200, 0.02, 0.006, 0.25), 4.3 + k * 3.5 / 24, 1.0, 0.4)

# 8–11 s: glitch bands — stutter 808 + stabs on every band
for k in range(6):
    t = 8.0 + k * B
    put(K.b808(38, B * 0.9, glide_from=50 if k % 2 else None) * 0.7, t)
    put(K.stab([62, 65, 69], 0.18, 3000) * 0.9, t + B / 2, 1.0, (-1) ** k * 0.3)
    put(filt(K.snare(0.8), "highpass", 800), t + B / 2 if k % 2 else t + 0.75 * B, 0.35)
for k in range(24):
    put(K.hat(g=0.6), 8.0 + k * B / 4, 0.35 if k % 3 else 0.6, -0.3)
for k in range(8):                                                   # digital stutter
    put(blip(600 + 90 * k, 0.03, 0.01, 0.35), 10.0 + k * B / 8)

# 11–14 s: alert pings per card, hashtag plucks
for k in range(4):
    t = 11.0 + k * B
    put(blip(1318, 0.09, 0.05, 0.35), t); put(blip(1760, 0.14, 0.07, 0.35), t + 0.08)
    put(K.kick(0.7), t, 0.6); put(K.sub(38, B * 0.8) * 0.5, t)
for k in range(8):
    put(K.pluck(74 + [0, 3, 5, 7, 10, 7, 5, 3][k], 0.25, 3500) * 1.4, 13.0 + k * B / 4, 1.0, (-1) ** k * 0.4)

# 14–17 s: the story — everything drops out; soft keys, one low boom on "정말?"
put(K.keys([57, 60, 64, 67], 3.0) * 0.8, 14.0)
put(K.keys([55, 59, 62, 66], 2.0) * 0.6, 15.0)
put(K.impact(2.0, 0.5), 16.0); put(K.sub(26, 1.2) * 0.6, 16.0)

# 17–18 s: suck-in (reverse swell + riser), then 1/2 beat of true silence before the burst
put(K.reverse_swell(0.75, [50, 57, 62, 66]), 17.0)
put(K.riser(0.75, 300, 12000, 0.45), 17.0)
S0, S1 = 17.75, 18.0

# 18–20 s: burst
put(K.impact(2.2, 1.1), 18.0); put(K.braam(2.2, 38, True) * 0.8, 18.0)
put(K.crash(1.0), 18.0)
for m, dt in [(74, 0.25), (81, 0.37), (86, 0.49)]:
    put(K.bell_tone(m, 1.5) * 0.6, 18.0 + dt)
for k in range(4):
    put(K.kick(1.0), 18.0 + k * B, 0.8); put(K.hat(True, 0.8), 18.0 + k * B + B / 2, 0.4)

# master: small room, silence gap, loudness
n_ir = int(1.4 * SR)
ir = filt(rng.standard_normal(n_ir) * np.exp(-np.arange(n_ir) / SR / 0.3), "lowpass", 6000); ir /= np.sqrt((ir ** 2).sum())
for c in range(2):
    mix[c] = mix[c] + np.fft.irfft(np.fft.rfft(mix[c], len(mix[c]) + n_ir) * np.fft.rfft(ir, len(mix[c]) + n_ir))[: len(mix[c])] * 0.18
mix = mix[:, :N]
i0, i1 = int(S0 * SR), int(S1 * SR); f = int(0.03 * SR)
mix[:, i0 - f:i0] *= np.linspace(1, 0, f); mix[:, i0:i1] = 0
tail = int(0.8 * SR); mix[:, -tail:] *= np.linspace(1, 0, tail) ** 1.5
ff = os.environ.get("FFMPEG", "ffmpeg")
base = mix / (np.abs(mix).max() + 1e-9) * 0.5; g = 1.0; lufs = None
os.makedirs(os.path.dirname(OUT) or ".", exist_ok=True)
for _ in range(6):
    y = base * g
    y = np.where(np.abs(y) > 0.85, np.sign(y) * (0.85 + 0.12 * np.tanh((np.abs(y) - 0.85) / 0.12)), y)
    wavfile.write(OUT, SR, (y.T * 32767).astype(np.int16))
    err = subprocess.run([ff, "-hide_banner", "-i", OUT, "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr
    lufs = float(re.findall(r"I:\s+(-?[\d.]+) LUFS", err)[-1])
    if abs(lufs - -14) < 0.3:
        break
    g *= 10 ** ((-14 - lufs) / 20)
print(f"wrote {OUT}: {DUR:.1f}s, {lufs:.1f} LUFS")
