"""Synthesises the soundtrack from the same score the figure plays.

Usage: python3 audio.py score.json out.wav
score.json comes from model.mjs (BPM, FPS, FPB, FRAMES, TRACKS) plus "total" frames.
"""
import json
import sys
import wave

import numpy as np

SR = 44100
score = json.load(open(sys.argv[1]))
FPS, FPB, FRAMES = score["FPS"], score["FPB"], score["FRAMES"]
TOTAL = score["total"]
beat_s = FPB / FPS
out = np.zeros(int(SR * TOTAL / FPS) + SR)
rng = np.random.default_rng(7)


def at(frame):
    return int(round(frame / FPS * SR))


def add(sig, frame, gain=1.0):
    i = at(frame)
    out[i:i + len(sig)] += sig[: len(out) - i] * gain


def env(n, attack, decay):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(attack, 1e-4)) * np.exp(-t / decay)


def kick(length=0.45, top=150, low=44):
    n = int(SR * length)
    t = np.arange(n) / SR
    freq = low + (top - low) * np.exp(-t / 0.045)
    phase = 2 * np.pi * np.cumsum(freq) / SR
    return np.sin(phase) * env(n, 0.002, 0.16)


def noise(length, decay, hp=0.0):
    n = int(SR * length)
    x = rng.standard_normal(n)
    if hp:
        x = x - np.convolve(x, np.ones(int(hp)) / hp, mode="same")
    return x * env(n, 0.001, decay)


def tone(freq, length, decay, attack=0.004):
    n = int(SR * length)
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * freq * t) * env(n, attack, decay)


def pad(freqs, length, attack, decay):
    n = int(SR * length)
    t = np.arange(n) / SR
    x = sum(np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t + 0.5) for f in freqs)
    return x / len(freqs) * env(n, attack, decay)


kicks = score["TRACKS"]["kick"]
for f in kicks:
    b = f // FPB
    if b < 12:
        add(kick(), f, 0.9)
    elif b < 15:  # the 16th-note roll: snare-like hits that grow toward the silence
        grow = 0.35 + 0.65 * (f - 12 * FPB) / (3 * FPB)
        add(noise(0.12, 0.05, hp=6) * 0.6 + kick(0.12, 220, 120) * 0.5, f, grow)
    else:
        add(kick(0.7, 170, 40), f, 1.15)

# Hats on the off-beat 8ths in the intro and the drop.
for b in list(range(0, 8)) + list(range(16, 20)):
    add(noise(0.06, 0.018, hp=3), b * FPB + FPB // 2, 0.22)

# Cuts click, text blips.
for f in score["TRACKS"]["cut"]:
    add(tone(2400, 0.05, 0.012), f, 0.25)
for f in score["TRACKS"]["text"]:
    add(tone(880, 0.12, 0.05) + tone(1320, 0.12, 0.04), f + 1, 0.18)

# Riser across the build-up that stops dead on the silent beat.
start, stop = 8 * FPB, 15 * FPB
n = at(stop) - at(start)
ramp = np.linspace(0, 1, n) ** 2.4
riser = rng.standard_normal(n)
riser = riser - np.convolve(riser, np.ones(4) / 4, mode="same")
t = np.arange(n) / SR
sweep = np.sin(2 * np.pi * np.cumsum(200 + 1600 * ramp) / SR)
out[at(start):at(stop)] += (riser * 0.25 + sweep * 0.2) * ramp * 0.6

# Bass under the intro, one note a bar.
for bar in range(2):
    add(pad([55.0, 110.0], beat_s * 4, 0.02, 0.9), bar * 4 * FPB, 0.35)
for bar in range(2, 4):
    add(pad([55.0, 110.0], beat_s * 4, 0.02, 0.6), bar * 4 * FPB, 0.25)

# The drop: sub boom and a chord that rings into the outro.
add(tone(48, 2.2, 0.8, attack=0.002), 16 * FPB, 0.9)
add(pad([220.0, 261.63, 329.63, 440.0], beat_s * 4 + (TOTAL - FRAMES) / FPS, 0.01, 1.6), 16 * FPB, 0.4)
# Outro chime under the title.
add(pad([880.0, 1318.5], 2.4, 0.003, 0.7), FRAMES + 16, 0.22)

# Hard silence on beat 15, then master.
out[at(15 * FPB):at(16 * FPB) - 40] *= np.linspace(1, 0, at(16 * FPB) - 40 - at(15 * FPB)) ** 8
out = out[: at(TOTAL)]
fade = int(SR * 0.6)
out[-fade:] *= np.linspace(1, 0, fade)
out = np.tanh(out * 1.1)
out /= np.max(np.abs(out)) / 0.89
pcm = (out * 32767).astype(np.int16)
with wave.open(sys.argv[2], "wb") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("wrote", sys.argv[2], f"{len(pcm) / SR:.2f}s")
