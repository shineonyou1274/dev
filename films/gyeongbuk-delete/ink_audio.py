"""경북, 삭제하시겠습니까 (40 s, ink wash) — score, sound and narration.
Grave and quiet: wind, a water drop, low plucked string (geomungo-like), a breathy bamboo flute (daegeum-like)
while the village lives, a low pluck for every light that goes out, a slow drum and rising low strings over the map,
near-silence under the dialog, then the seal: one deep thud and a temple bell. D minor pentatonic throughout.
usage: VI2_SCRIPTS=.../scripts python3 ink_audio.py build/music.wav   (needs build/narr_raw.mp3)
"""
import json
import os
import subprocess
import sys

import numpy as np
from scipy.io import wavfile

sys.path.insert(0, os.environ["VI2_SCRIPTS"])
from compose import SR, Kit, filt, hz  # noqa: E402

OUT = sys.argv[1]
FF = os.environ.get("FFMPEG", "ffmpeg")
rng = np.random.default_rng(7); K = Kit(rng)
DUR = 40.0; N = int(DUR * SR)
mus = np.zeros((2, N + 6 * SR)); voc = np.zeros((2, N + 6 * SR))
CUE = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "timing.json")))


def put(buf, sig, t, g=1.0, pan=0.0):
    i = int(round(t * SR))
    if i < 0 or i >= buf.shape[1]:
        return
    sig = sig[: buf.shape[1] - i]
    buf[0, i:i + len(sig)] += sig * g * np.sqrt(1 - pan)
    buf[1, i:i + len(sig)] += sig * g * np.sqrt(1 + pan)


def tt(n):
    return np.arange(n) / SR


def geomungo(m, dur=2.5, g=0.5, bright=1800):
    """Karplus-Strong low plucked string with a soft attack thump"""
    n = int(dur * SR); f = hz(m); p = max(2, int(SR / f))
    buf = rng.uniform(-1, 1, p); out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % p]
        buf[i % p] = 0.996 * 0.5 * (buf[i % p] + buf[(i + 1) % p])
    x = filt(out, "lowpass", bright)
    th = np.sin(2 * np.pi * 70 * tt(n)) * np.exp(-tt(n) / 0.05) * 0.4
    return (x + th) * g


def daegeum(m, dur, g=0.25, bend=0.0):
    """breathy bamboo flute: sine + weak harmonics, slow vibrato, breath noise, soft swell"""
    n = int(dur * SR); x = tt(n)
    f = hz(m) * (1 + bend * np.minimum(1, x / 0.25) - bend) * (1 + 0.006 * np.sin(2 * np.pi * 5.2 * x) * np.minimum(1, x / 0.6))
    ph = 2 * np.pi * np.cumsum(f) / SR
    tone = np.sin(ph) + 0.18 * np.sin(2 * ph) + 0.06 * np.sin(3 * ph)
    breath = filt(rng.standard_normal(n), "bandpass", [hz(m) * 0.8, hz(m) * 3]) * 0.25
    e = np.minimum(1, x / 0.35) * np.minimum(1, (dur - x) / 0.5)
    return (tone + breath) * e * g


def cello(m, dur, g=0.4, att=0.5):
    n = int(dur * SR); x = tt(n)
    vib = 1 + 0.004 * np.sin(2 * np.pi * 4.6 * x) * np.minimum(1, x / 0.6)
    s = sum(2 * ((np.cumsum(hz(m) * (1 + d) * vib) / SR) % 1) - 1 for d in (-0.003, 0.003)) / 2
    e = np.minimum(1, x / att) * np.minimum(1, (dur - x) / 0.6)
    return filt(s, "lowpass", 700) * e * g


def drum(g=1.0, f0=62):
    """low barrel drum (buk): pitched sine drop + skin noise"""
    n = int(1.2 * SR); x = tt(n)
    body = np.sin(2 * np.pi * np.cumsum(f0 * (1 + 0.6 * np.exp(-x / 0.03))) / SR) * np.exp(-x / 0.35)
    skin = filt(rng.standard_normal(n), "lowpass", 900) * np.exp(-x / 0.04) * 0.5
    return (body + skin) * g


def drip():
    n = int(0.5 * SR); x = tt(n)
    f = 1100 * np.exp(-x / 0.03) + 380
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x / 0.09) * 0.5


def swell(dur, lo, hi, g=0.3, rise=True):
    n = int(dur * SR); x = tt(n)
    e = (x / dur) ** 2 if rise else (1 - x / dur) ** 1.5
    return filt(rng.standard_normal(n), "bandpass", [lo, hi]) * e * g


# --- bed: wind the whole way, a little louder over the empty map ---
put(mus, K.wind(DUR) * 0.5, 0.0)
# --- 0.3–0.8 drop falls, hits paper; ink blooms into mountains ---
put(mus, drip(), CUE["drop"], 0.6)
put(mus, swell(4.0, 120, 900, 0.18), CUE["drop"])                    # the bloom breathes in
for m, t in [(38, 0.9), (45, 1.4)]:
    put(mus, cello(m, 10.5, 0.32, att=1.5), t)                          # D2 + A2 drone under the valley
for i, (m, t) in enumerate([(50, 2.6), (57, 3.7), (55, 4.9), (53, 5.6), (50, 7.8), (48, 9.4), (50, 10.6)]):
    put(mus, geomungo(m, 2.6, 0.45), t, pan=(-0.3, 0.3)[i % 2])
# --- 6–11.5 the village lives: flute phrase, seal set softly ---
for m, t, d in [(62, 6.1, 1.6), (65, 7.6, 1.0), (67, 8.6, 1.4), (69, 10.0, 0.6), (67, 10.5, 1.3)]:
    put(mus, daegeum(m, d, 0.2, bend=0.012), t, pan=0.15)
put(mus, drum(0.35, 90), CUE["seal_small"])
# --- 12–16 lights go out: one low pluck per light, falling ---
for k, t in enumerate(CUE["lights_out"]):
    put(mus, geomungo([57, 55, 53, 50, 48, 45, 43, 41][k % 8], 2.2, 0.55, bright=1100), t)
    put(mus, filt(rng.standard_normal(int(0.4 * SR)), "highpass", 2500) * np.exp(-tt(int(0.4 * SR)) / 0.08) * 0.04, t + 0.05)
put(mus, cello(38, 8.5, 0.28, att=1.0), 11.6)                           # drone thins but holds
# --- 18.4 the name washes out ---
put(mus, swell(1.6, 300, 2500, 0.16), CUE["name_blur"])
# --- 20 pull back to the map ---
put(mus, swell(1.8, 80, 600, 0.3), 19.6)
put(mus, K.reverse_swell(1.6, [38, 45, 50]) * 0.35, 20.0)
# --- 21.5–29.3 villages go out across Gyeongbuk: slow drum quickening, low strings climbing ---
for i, t in enumerate(CUE["drum"]):
    put(mus, drum(0.55 + 0.25 * i / len(CUE["drum"])), t)
for k, t in enumerate(CUE["dots_out"]):
    put(mus, geomungo(45 + (k * 5) % 12, 1.2, 0.12, bright=900), t, pan=float(np.sin(k * 1.7)) * 0.5)
for j, m in enumerate([38, 41, 45, 48, 50, 51]):
    c = cello(m, 30.3 - 22.5 - j * 0.6, 0.16, att=3.0)
    put(mus, c, 22.5 + j * 0.6)
# --- 29.3–34 quiet: strings close through a filter (no hard stop), dialog arrives, a held breath ---
tail = int(1.2 * SR); i0 = int(29.3 * SR)
seg = mus[:, i0:i0 + tail].copy()
for c in range(2):
    mus[c, i0:i0 + tail] = filt(seg[c], "lowpass", 400) * np.linspace(1, 0.05, tail) ** 1.5
mus[:, i0 + tail:int(33.95 * SR)] *= 0.0
put(mus, K.wind(5.0) * 0.45, 29.6)
n = int(1.1 * SR); x = tt(n)
put(mus, np.sin(2 * np.pi * 196 * x) * np.minimum(1, x / 0.03) * np.exp(-x / 0.4) * 0.25 + np.sin(2 * np.pi * 147 * x) * np.exp(-x / 0.6) * 0.2, CUE["dialog"])
put(mus, swell(1.5, 200, 1500, 0.22), CUE["stamp"] - 1.5)               # the breath before the stamp
# --- 34.0 the seal: deep thud, bell, then a short flute line ---
put(mus, drum(1.3, 52), CUE["stamp"]); put(mus, K.impact(3.0, 0.6) * 0.6, CUE["stamp"])
put(mus, K.church_bell(43, 6.5) * 0.55, CUE["stamp"] + 0.02)
put(mus, cello(38, 5.6, 0.3, att=0.8), CUE["stamp"] + 0.3); put(mus, cello(45, 5.3, 0.22, att=1.2), CUE["stamp"] + 0.6)
for m, t, d in [(62, 37.4, 0.9), (64, 38.2, 0.6), (62, 38.7, 1.2)]:
    put(mus, daegeum(m, d, 0.17, bend=0.01), t, pan=0.1)

# --- narration lines from the generated take, placed on the timeline ---
raw = subprocess.run([FF, "-v", "error", "-i", "build/narr_raw.mp3", "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                     capture_output=True, check=True).stdout
nar = np.frombuffer(raw, np.float32)
for (a, b), t in zip(CUE["narr_src"], CUE["narr_at"]):
    s = nar[int(a * SR):int(b * SR)].copy()
    f = int(0.03 * SR); s[:f] *= np.linspace(0, 1, f); s[-f:] *= np.linspace(1, 0, f)
    put(voc, s, t, 1.0)

# small room on the music only
n_ir = int(2.2 * SR)
ir = filt(rng.standard_normal(n_ir) * np.exp(-np.arange(n_ir) / SR / 0.55), "lowpass", 5000); ir /= np.sqrt((ir ** 2).sum())
for c in range(2):
    mus[c] = mus[c] + np.fft.irfft(np.fft.rfft(mus[c], len(mus[c]) + n_ir) * np.fft.rfft(ir, len(mus[c]) + n_ir))[: len(mus[c])] * 0.25
mus = mus[:, :N]; voc = voc[:, :N]
# duck the music under the voice (-8 dB, smooth)
lev = np.abs(voc[0]); w = int(0.25 * SR)
env_v = np.convolve((lev > 0.01).astype(float), np.ones(w) / w, mode="same")
mus *= 1 - 0.6 * np.clip(env_v * 3, 0, 1)
mix = mus / (np.abs(mus).max() + 1e-9) * 0.5 + voc / (np.abs(voc).max() + 1e-9) * 0.6
tail = int(1.0 * SR); mix[:, -tail:] *= np.linspace(1, 0, tail) ** 1.5
os.makedirs(os.path.dirname(OUT) or ".", exist_ok=True)
tmp = OUT + ".pre.wav"
wavfile.write(tmp, SR, (mix.T * 32767 * 0.9).astype(np.int16))
# two-pass loudnorm: -14 LUFS, true peak -1.5 dBFS
err = subprocess.run([FF, "-hide_banner", "-i", tmp, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
                     capture_output=True, text=True).stderr
m = json.loads(err[err.rindex("{"):err.rindex("}") + 1])
af = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
      f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
subprocess.run([FF, "-v", "error", "-y", "-i", tmp, "-af", af, "-ar", str(SR), OUT], check=True)
os.remove(tmp)
print("wrote", OUT)
