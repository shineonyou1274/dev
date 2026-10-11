"""Climate opening (20 s) — serious score. Same event times as open.html, but every sound is low, minor and weighty.
No bright blips, no pings, no hi-hats, no major chords. D minor throughout.
usage: python3 open_audio_grave.py build/music_grave.wav
"""
import os
import re
import subprocess
import sys

import numpy as np
from scipy.io import wavfile

sys.path.insert(0, os.environ.get("VI2_SCRIPTS", os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../scripts")))
from compose import SR, Kit, env, filt, hz, saw  # noqa: E402

OUT = sys.argv[1]
rng = np.random.default_rng(23); K = Kit(rng)
B = 0.5; DUR = 20.0; N = int(DUR * SR)
mix = np.zeros((2, N + 4 * SR))


def put(sig, t, g=1.0, pan=0.0):
    i = int(round(t * SR))
    if i < 0 or i >= mix.shape[1]:
        return
    sig = sig[: mix.shape[1] - i]
    mix[0, i:i + len(sig)] += sig * g * np.sqrt(1 - pan)
    mix[1, i:i + len(sig)] += sig * g * np.sqrt(1 + pan)


def cello(m, dur, g=0.5, bow=0.06):
    """bowed low string: detuned saws, slow attack, gentle vibrato, dark filter"""
    n = int(dur * SR); tt = np.arange(n) / SR
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5 * tt) * np.minimum(1, tt / 0.4)
    x = sum(2 * ((np.cumsum(hz(m) * (1 + d) * vib) / SR) % 1) - 1 for d in (-0.003, 0.003)) / 2
    e = np.minimum(1, tt / bow) * np.minimum(1, (dur - tt) / 0.08)
    return filt(x, "lowpass", 900) * e * g


def rising_cluster(t0, t1, g=0.35):
    """tension strings: a minor-second cluster whose pitch creeps up with the temperature line"""
    n = int((t1 - t0) * SR); u = np.arange(n) / n
    out = np.zeros(n)
    for m, d in ((50, 0), (51, 0.002), (57, -0.002), (62, 0.001)):
        f = hz(m) * 2 ** ((u ** 3) * 7 / 12)                        # rises a fifth, most of it at the end
        vib = 1 + 0.005 * np.sin(2 * np.pi * 5.5 * u * (t1 - t0) + m)
        out += 2 * ((np.cumsum(f * (1 + d) * vib) / SR) % 1) - 1
    out = filt(out / 4, "lowpass", 1400) * (1 - u ** 2) + filt(out / 4, "lowpass", 3600) * u ** 2   # opens up as it rises
    return out * np.minimum(1, u * 6) * (0.4 + 0.6 * u) * g


def piano(m, dur, vel=0.6):
    n = int((dur + 2.0) * SR); tt = np.arange(n) / SR; f = hz(m); x = np.zeros(n)
    for k, (a, inh) in enumerate([(1, 1), (.45, 2.002), (.2, 3.006), (.08, 4.01)]):
        x += a * np.sin(2 * np.pi * f * inh * tt) * np.exp(-tt / ((2.2 if m < 55 else 1.4) / (1 + .6 * k)))
    x += filt(K.noise(n), "lowpass", 700) * env(n, .001, .01) * .12
    return filt(x * np.minimum(1, tt / .004), "lowpass", 3500) * .25 * vel


def muffled_alarm(t, g=0.28):
    """low, muted two-note alarm (D4 → F4), like a warning heard through a wall"""
    for m, dt in ((62, 0), (65, 0.16)):
        n = int(0.32 * SR); tt = np.arange(n) / SR
        x = np.sin(2 * np.pi * hz(m) * tt) + 0.3 * np.sin(2 * np.pi * hz(m) * 2 * tt)
        put(filt(x, "lowpass", 1200) * np.exp(-tt / 0.18) * np.minimum(1, tt / 0.01) * g, t + dt, 1.0, 0.15)


# ---- bed: wind + a very low D drone for the whole piece (except the silence) ----
put(K.wind(20.0) * 0.35, 0)
put(filt(K.drone(17.6, 26, True), "lowpass", 300) * 0.5, 0.0)

# 0–4 s: real heartbeat once per second, low sub thump when the dot appears, dark shimmer for the orbit
for k in range(4):
    put(K.heartbeat() * 0.9, k * 1.0)
put(K.sub(26, 1.2) * 0.6, 0.25)
put(K.shimmer(2.0, True) * 0.4, 2.0)
put(K.reverse_swell(0.6, [38, 45, 50]) * 0.8, 3.4)

# 4–8 s: low impact + minor braam, cello pattern, the rising cluster, clock ticks for the years
put(K.impact(2.5, 1.0), 4.0); put(K.braam(2.5, 38, False) * 0.7, 4.0)
for k in range(8):
    put(cello(38 if k % 4 < 2 else 41, B * 0.95, 0.45), 4.0 + k * B)
put(rising_cluster(4.3, 8.0), 4.3)
for k in range(14):
    put(K.clock(k % 2) * 0.5, 4.3 + k * 0.25, 1.0, (-1) ** k * 0.2)
for k in range(4):
    put(K.heartbeat() * 0.7, 4.0 + k * 1.0)

# 8–11 s: heavy, distorted low hits and timpani on every beat; the thermometer fills with a low cello swell
for k in range(6):
    t = 8.0 + k * B
    hit = np.tanh(K.impact(0.45, 1.0) * 3) * 0.45
    put(hit, t); put(K.timpani(38 if k % 2 == 0 else 33, 0.9), t + (B / 2 if k % 2 else 0))
put(cello(26, 3.0, 0.7, 0.8) + cello(38, 3.0, 0.4, 0.8), 8.0)
put(K.braam(1.2, 38, False) * 0.5, 10.0)

# 11–14 s: each alert card lands with a dull thud and a muffled minor alarm
for k in range(4):
    t = 11.0 + k * B
    put(K.sub(26, 0.35) * 0.6, t); put(filt(K.impact(0.4, 0.7), "lowpass", 400), t)
    muffled_alarm(t)
put(cello(38, 3.0, 0.35, 0.6), 11.0)
put(rising_cluster(12.5, 14.0, 0.25), 12.5)

# 14–17 s: almost nothing — a sparse, low piano in D minor, then one deep boom on "정말?"
for t, m, v in ((14.05, 50, .6), (14.3, 57, .45), (14.6, 60, .4), (15.05, 53, .55), (15.35, 57, .4), (15.7, 62, .35)):
    put(piano(m, 1.4, v), t, 1.0, 0.1)
put(piano(38, 3.0, 0.8), 16.0); put(K.impact(2.5, 0.7), 16.0); put(K.sub(26, 1.5) * 0.7, 16.0)

# 17–17.75 s: everything is pulled back into the dot, then true silence until 18.0
put(K.reverse_swell(0.75, [38, 45, 50, 53]) * 1.1, 17.0)
put(K.riser(0.75, 120, 3000, 0.35), 17.0)
S0, S1 = 17.75, 18.0

# 18–20 s: the burst — low impact, minor braam, low choir, timpani, one long low D
put(K.impact(3.0, 1.2), 18.0); put(K.braam(3.0, 38, False) * 0.9, 18.0)
put(K.choir([50, 53, 57], 2.4) * 0.8, 18.05)
for k, g in enumerate((1.0, .6, .8, .5)):
    put(K.timpani(38, g), 18.0 + k * B)
put(cello(26, 2.0, 0.6, 0.02) + cello(38, 2.0, 0.4, 0.02), 18.0)

# ---- master: dark room reverb, silence gap, loudness ----
n_ir = int(2.6 * SR)
ir = filt(rng.standard_normal(n_ir) * np.exp(-np.arange(n_ir) / SR / 0.6), "lowpass", 4000); ir /= np.sqrt((ir ** 2).sum())
for c in range(2):
    mix[c] = mix[c] + np.fft.irfft(np.fft.rfft(mix[c], len(mix[c]) + n_ir) * np.fft.rfft(ir, len(mix[c]) + n_ir))[: len(mix[c])] * 0.3
mix = filt(mix[:, :N], "lowpass", 9000)
i0, i1 = int(S0 * SR), int(S1 * SR); f = int(0.04 * SR)
mix[:, i0 - f:i0] *= np.linspace(1, 0, f); mix[:, i0:i1] = 0
fi = int(0.3 * SR); mix[:, :fi] *= np.linspace(0, 1, fi)
tail = int(1.0 * SR); mix[:, -tail:] *= np.linspace(1, 0, tail) ** 1.5
ff = os.environ.get("FFMPEG", "ffmpeg")
base = mix / (np.abs(mix).max() + 1e-9) * 0.5; g = 1.0; lufs = None
os.makedirs(os.path.dirname(OUT) or ".", exist_ok=True)
for _ in range(6):
    y = base * g
    y = np.where(np.abs(y) > 0.85, np.sign(y) * (0.85 + 0.12 * np.tanh((np.abs(y) - 0.85) / 0.12)), y)
    wavfile.write(OUT, SR, (y.T * 32767).astype(np.int16))
    err = subprocess.run([ff, "-hide_banner", "-i", OUT, "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr
    lufs = float(re.findall(r"I:\s+(-?[\d.]+) LUFS", err)[-1])
    if abs(lufs - -15) < 0.3:
        break
    g *= 10 ** ((-15 - lufs) / 20)
print(f"wrote {OUT}: {DUR:.1f}s, {lufs:.1f} LUFS")
