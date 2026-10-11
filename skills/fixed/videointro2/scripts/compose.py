"""videointro music engine: genre × mood × structure × seed -> music.wav + timeline.json.

Every intro shares one fixed SOUND LOGO (the channel's signature, identical each time);
everything else — genre, harmony, melody, drum patterns, structure — changes per run.

usage:
  python3 compose.py --genre trap --mood dark --structure coldopen --length 15 --seed 7 --out build
  python3 compose.py --list                      # show genres / structures / textures
options:
  --genre      trailer | trap | synthwave | lofi | orchestral | house
  --mood       dark (minor) | bright (major)
  --structure  classic | coldopen | slowburn
  --length     seconds (bars and BPM are solved so the length is an exact number of bars)
  --bpm/--bars override the solver
  --texture    intro colour: clock | sleigh | vinyl | heartbeat | none   (default per genre)
  --breaker    the one sound inside the silent beat: tick | ding | none (default per texture)
  --logo       sound-logo notes as MIDI, default "86,93,98"  (D6 A6 D7 over a D bell — fits every key used here)
  --history    path of intro_history.json; warns when genre+structure repeat the previous intro
Writes <out>/music.wav and <out>/timeline.json (sections, roll hits, silences, drops, logo) for the scene HTML.
"""
import argparse
import json
import os
import re
import subprocess
import sys

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 48000

GENRES = {
    #            bpm range   ideal  default texture  description
    "trailer":    ((100, 140), 128, "clock",     "braams, toms, 808 half-time — tension and impact"),
    "trap":       ((130, 170), 150, "none",      "808 glides, triplet hat rolls, dark plucks"),
    "synthwave":  ((96, 130),  112, "none",      "80s: arps, gated snare, octave bass, big pads"),
    "lofi":       ((80, 100),  90,  "vinyl",     "swung boom-bap, keys, vinyl crackle — soft drop"),
    "orchestral": ((100, 140), 124, "heartbeat", "string ostinato, timpani, brass, choir"),
    "house":      ((118, 130), 124, "none",      "four-on-the-floor, offbeat bass, chord stabs"),
}
STRUCTURES = {
    # section list for 8 bars; the allocator stretches/shrinks for other bar counts
    "classic":  [("intro", 2), ("hook", 2), ("drop", 2), ("hook2", 1), ("logo", 1)],
    "coldopen": [("drop", 1), ("hook", 2), ("drop", 2), ("hook2", 1), ("logo", 2)],
    "slowburn": [("intro", 3), ("hook", 2), ("drop", 1), ("logo", 2)],
}
TEXTURES = ["clock", "sleigh", "vinyl", "heartbeat", "none"]
ROOT = 50  # D3; every key here contains D and A so the sound logo always fits
PROG = {"dark": [(0, "m"), (-4, "M"), (3, "M"), (-2, "M")],     # i  bVI  bIII bVII
        "bright": [(0, "M"), (7, "M"), (-3, "m"), (5, "M")]}     # I  V    vi   IV
SCALE = {"dark": [0, 2, 3, 5, 7, 8, 10], "bright": [0, 2, 4, 5, 7, 9, 11]}


# ============================ DSP helpers ============================
def env(n, a, d):
    tt = np.arange(n) / SR
    e = np.exp(-tt / d)
    na = max(1, int(a * SR))
    e[:na] *= np.linspace(0, 1, na)
    return e


def filt(x, kind, f, order=2):
    return sosfilt(butter(order, f, btype=kind, fs=SR, output="sos"), x)


def hz(m):
    return 440 * 2 ** ((m - 69) / 12)


def saw(f, n, d=0.0):
    return 2 * ((np.arange(n) / SR * f * (1 + d)) % 1) - 1


def sweep(x, f0, f1, kind="lowpass", seg=512):
    out = np.zeros_like(x)
    for s in range(0, len(x), seg):
        fc = min(f0 * (f1 / f0) ** (s / len(x)), SR / 2 - 200)
        out[s:s + seg] = filt(x[s:s + seg + 256], kind, fc)[: len(out[s:s + seg])]
    return out


def chord_notes(bar, mood, octave=0):
    off, q = PROG[mood][bar % 4]
    r = ROOT + off + 12 * octave
    return [r, r + (3 if q == "m" else 4), r + 7]


class Kit:
    """all instruments; rng is seeded so a run is reproducible"""

    def __init__(self, rng):
        self.r = rng

    def noise(self, n):
        return self.r.standard_normal(n)

    # ---- drums ----
    def kick(self, punch=1.0):
        n = int(0.35 * SR); tt = np.arange(n) / SR
        x = np.sin(2 * np.pi * np.cumsum(50 + 140 * punch * np.exp(-tt / 0.025)) / SR) * env(n, 0.001, 0.12)
        return np.tanh(x * 2.5) * 0.85

    def snare(self, g=1.0, tone=185):
        n = int(0.2 * SR); tt = np.arange(n) / SR
        body = np.sin(2 * np.pi * tone * tt) * env(n, 0.0005, 0.03) * 0.6
        nz = filt(self.noise(n), "bandpass", [1200, 9000]) * env(n, 0.0005, 0.06)
        return np.tanh((body + nz) * 1.5) * 0.5 * g

    def gated_snare(self):
        n = int(0.32 * SR)
        x = filt(self.noise(n), "bandpass", [900, 8000]) * 0.8
        e = np.ones(n); e[: int(0.002 * SR)] = np.linspace(0, 1, int(0.002 * SR)); e[int(0.24 * SR):] *= np.linspace(1, 0, n - int(0.24 * SR))
        out = x * e * 0.5
        sn = self.snare(0.8); out[: len(sn)] += sn  # snare body under the gated noise tail
        return out

    def clap(self):
        n = int(0.3 * SR)
        x = filt(self.noise(n), "bandpass", [900, 5000]); e = np.zeros(n)
        for k, off in enumerate((0, 0.009, 0.019)):
            i = int(off * SR); e[i:] += env(n - i, 0.0005, 0.01 if k < 2 else 0.12)
        return x * e * 0.6

    def hat(self, open_=False, g=1.0):
        n = int((0.2 if open_ else 0.04) * SR)
        return filt(self.noise(n), "highpass", 8000) * env(n, 0.0003, 0.06 if open_ else 0.01) * 0.3 * g

    def rim(self):
        n = int(0.06 * SR); tt = np.arange(n) / SR
        return (np.sin(2 * np.pi * 1700 * tt) + filt(self.noise(n), "bandpass", [2000, 5000]) * 0.5) * env(n, 0.0003, 0.012) * 0.3

    def tom(self, m, g=1.0, decay=0.09):
        n = int(0.3 * SR); tt = np.arange(n) / SR
        b = np.sin(2 * np.pi * np.cumsum(hz(m) * (1 + 0.8 * np.exp(-tt / 0.02))) / SR) * env(n, 0.0008, decay)
        s = filt(self.noise(n), "bandpass", [300, 3000]) * env(n, 0.0005, 0.02) * 0.4
        return np.tanh((b + s) * 2.2) * 0.55 * g

    def timpani(self, m, g=1.0):
        return self.tom(m, g, decay=0.35) * 1.1

    def crash(self, g=1.0):
        n = int(1.6 * SR)
        return filt(self.noise(n), "highpass", 3500) * env(n, 0.001, 0.45) * 0.3 * g

    # ---- bass ----
    def sub(self, m, length):
        n = int(length * SR); tt = np.arange(n) / SR
        x = np.sin(2 * np.pi * hz(m) * tt) + 0.35 * filt(saw(hz(m), n), "lowpass", 400)
        e = env(n, 0.004, length * 0.9); e[-int(0.01 * SR):] *= np.linspace(1, 0, int(0.01 * SR))
        return np.tanh(x * e * 1.4) * 0.5

    def b808(self, m, length, glide_from=None):
        n = int(length * SR); tt = np.arange(n) / SR
        f = hz(m) * np.ones(n)
        if glide_from is not None:
            f = hz(m) + (hz(glide_from) - hz(m)) * np.exp(-tt / 0.06)
        x = np.sin(2 * np.pi * np.cumsum(f) / SR)
        e = env(n, 0.002, length * 0.6); e[-int(0.015 * SR):] *= np.linspace(1, 0, int(0.015 * SR))
        return np.tanh(x * e * 3.0) * 0.6

    # ---- tonal ----
    def pluck(self, m, length=0.3, bright=3000):
        n = int(length * SR)
        x = saw(hz(m), n, -0.004) + saw(hz(m), n, 0.004)
        return filt(x, "lowpass", bright) * env(n, 0.002, length * 0.3) * 0.25

    def stab(self, ms, length=0.22, cutoff=2600):
        n = int(length * SR); x = np.zeros(n)
        for m in ms:
            for d in (-0.006, 0, 0.006):
                x += saw(hz(m), n, d)
        return filt(x / (len(ms) * 3), "lowpass", cutoff) * env(n, 0.002, length * 0.35) * 0.55

    def pad(self, ms, length, cutoff=1800):
        n = int(length * SR); x = np.zeros(n)
        for m in ms:
            for d in (-0.004, 0, 0.004):
                x += saw(hz(m), n, d)
        e = np.minimum(1, np.arange(n) / (0.05 * SR)) * np.exp(-np.arange(n) / SR / (length * 0.6))
        return filt(x / (len(ms) * 3), "lowpass", cutoff) * e * 0.4

    def keys(self, ms, length):
        """electric-piano-ish: sine + soft tine"""
        n = int(length * SR); tt = np.arange(n) / SR; x = np.zeros(n)
        for m in ms:
            x += np.sin(2 * np.pi * hz(m) * tt) + 0.25 * np.sin(2 * np.pi * hz(m) * 4 * tt) * np.exp(-tt / 0.08)
        return x / len(ms) * env(n, 0.003, length * 0.5) * 0.35

    def strings(self, ms, length, stacc=False):
        n = int(length * SR); tt = np.arange(n) / SR; x = np.zeros(n)
        for m in ms:
            vib = 1 + 0.003 * np.sin(2 * np.pi * 5.5 * tt + m)
            for d in (-0.006, -0.002, 0.002, 0.006):
                x += 2 * ((np.cumsum(hz(m) * (1 + d) * vib) / SR) % 1) - 1
        x = filt(x / (len(ms) * 4), "lowpass", 3000)
        a = 0.01 if stacc else 0.12
        e = np.minimum(1, tt / a) * (np.exp(-tt / 0.08) if stacc else np.exp(-tt / (length * 0.8)))
        return x * e * 0.45

    def bell_tone(self, m, length=1.2, eerie=False):
        n = int(length * SR); tt = np.arange(n) / SR
        wob = 1 + (0.006 if eerie else 0.0015) * np.sin(2 * np.pi * 5.3 * tt)
        ph = 2 * np.pi * hz(m) * (1.004 if eerie else 1) * np.cumsum(wob) / SR
        x = np.sin(ph) + 0.3 * np.sin(4.0 * ph) + 0.12 * np.sin(9.2 * ph)
        return x * env(n, 0.001, 0.45) * 0.17

    def church_bell(self, m=50, length=3.5):
        n = int(length * SR); tt = np.arange(n) / SR; f = hz(m)
        x = sum(a * np.sin(2 * np.pi * f * r * tt) * np.exp(-tt / (length * dk))
                for r, a, dk in ((0.5, .6, .5), (1, 1, .35), (1.19, .5, .25), (1.56, .35, .2), (2.0, .3, .15), (2.74, .2, .1)))
        return x * np.minimum(1, tt / 0.002) * 0.22

    def choir(self, ms, length):
        n = int(length * SR); tt = np.arange(n) / SR; x = np.zeros(n)
        for m in ms:
            vib = 1 + 0.004 * np.sin(2 * np.pi * 5 * tt + m)
            for d in (-0.005, 0, 0.005):
                x += 2 * ((np.cumsum(hz(m) * (1 + d) * vib) / SR) % 1) - 1
        x = filt(x, "bandpass", [650, 1150]) + 0.6 * filt(x, "bandpass", [2300, 2900])
        return x / (len(ms) * 3) * np.minimum(1, tt / 0.15) * np.exp(-tt / (length * 0.7)) * 0.9

    # ---- fx ----
    def braam(self, length=2.6, root=38, major=False):
        n = int(length * SR); x = np.zeros(n); tt = np.arange(n) / SR
        ivs = (-12, 0, 7, 12, 16) if major else (-12, 0, 7, 12)
        for iv in ivs:
            for d in (-0.008, -0.003, 0.003, 0.008):
                x += saw(hz(root + iv), n, d)
        x /= len(ivs) * 4
        cut = 180 + 2600 * np.exp(-tt / 0.35) * np.minimum(1, tt / 0.03)
        out = np.zeros(n)
        for s in range(0, n, 256):
            out[s:s + 256] = filt(x[s:s + 384], "lowpass", cut[s])[: len(out[s:s + 256])]
        e = np.minimum(1, tt / 0.02) * np.exp(-tt / (length * 0.45))
        return np.tanh((out * 3 + np.sin(2 * np.pi * hz(root - 12) * tt) * 0.8) * e * 1.5) * 0.8

    def impact(self, length=2.0, g=1.0):
        n = int(length * SR); tt = np.arange(n) / SR
        boom = np.sin(2 * np.pi * np.cumsum(30 + 100 * np.exp(-tt / 0.06)) / SR) * env(n, 0.001, 0.6)
        crack = filt(self.noise(n), "bandpass", [800, 6000]) * env(n, 0.0005, 0.05)
        tail = filt(self.noise(n), "highpass", 3000) * env(n, 0.001, 0.4) * 0.25
        return np.tanh(boom * 1.5 + crack * 0.8 + tail) * 0.8 * g

    def riser(self, length, f0=200, f1=12000, g=0.45):
        n = int(length * SR); tt = np.arange(n) / SR
        x = sweep(self.noise(n), f0, f1)
        shep = sum(np.sin(2 * np.pi * np.cumsum(f * 2 ** (2 * tt / length)) / SR) for f in (110, 220, 440)) / 3
        return (x * 0.6 + shep * 0.35) * np.linspace(0.02, 1, n) ** 2.5 * g

    def reverse_swell(self, length, ms):
        n = int(length * SR); tt = np.arange(n) / SR
        x = sum(np.sin(2 * np.pi * hz(m) * tt) for m in ms) / len(ms) + filt(self.noise(n), "highpass", 2000) * 0.3
        return (x * np.exp(-tt / 0.3))[::-1] * 0.5

    def shimmer(self, length, dark):
        n = int(length * SR); tt = np.arange(n) / SR
        f = (900 if dark else 600) * 4 ** (tt / length)
        x = sum(np.sin(2 * np.pi * np.cumsum(f * r) / SR) for r in ((1, 1.02) if dark else (1, 1.5, 2.0)))
        return x * np.linspace(0, 1, n) ** 3 * (0.1 if dark else 0.06)

    def drone(self, length, root, dark):
        n = int(length * SR)
        x = sum(saw(hz(root + m), n, d) for m in ((0, 12, 13) if dark else (0, 7, 12)) for d in (-0.004, 0.004)) / 6
        return sweep(x, 120, 1400) * np.linspace(0, 1, n) ** 1.5 * 0.35

    # ---- textures ----
    def clock(self, tock):
        n = int(0.05 * SR); tt = np.arange(n) / SR
        x = filt(self.noise(n), "bandpass", [1300, 2600] if tock else [2200, 4200]) + np.sin(2 * np.pi * (1900 if tock else 2800) * tt) * 0.5
        return x * env(n, 0.0003, 0.006) * 0.5

    def sleigh(self, tock):
        n = int(0.16 * SR); tt = np.arange(n) / SR; x = np.zeros(n)
        for _ in range(6):
            off = int(self.r.uniform(0, 0.02) * SR); f = self.r.uniform(5200, 7800) * (0.85 if tock else 1)
            e = np.zeros(n); e[off:] = env(n - off, 0.0003, 0.035)
            x += (np.sin(2 * np.pi * f * tt) + 0.4 * np.sin(2 * np.pi * f * 1.51 * tt)) * e
        return x * 0.09

    def heartbeat(self):
        n = int(0.5 * SR); tt = np.arange(n) / SR; out = np.zeros(n)
        for off, g in ((0, 1.0), (0.17, 0.7)):
            i = int(off * SR); t2 = tt[: n - i]
            out[i:] += np.sin(2 * np.pi * (48 + 30 * np.exp(-t2 / 0.02)) * t2) * env(n - i, 0.003, 0.07) * g
        return np.tanh(out * 1.5) * 0.7

    def vinyl(self, length):
        n = int(length * SR); x = filt(self.noise(n), "bandpass", [800, 5000]) * 0.015
        pops = self.r.random(n) < 12 / SR
        x[pops] += self.r.uniform(-0.4, 0.4, pops.sum())
        return x

    def wind(self, length):
        n = int(length * SR); x = self.noise(n); out = np.zeros(n)
        for s in range(0, n, 1024):
            fc = 500 + 400 * np.sin(2 * np.pi * 0.4 * s / SR)
            out[s:s + 1024] = filt(x[s:s + 1536], "bandpass", [fc * 0.8, fc * 1.3], 1)[: len(out[s:s + 1024])]
        return out * 0.25


# ============================ arrangement ============================
def solve_bars(length, genre, bars=None, bpm=None):
    lo_hi, ideal = GENRES[genre][0], GENRES[genre][1]
    if bars and bpm:
        return bars, bpm
    if bpm:
        return max(4, round(length * bpm / 240)), bpm
    if bars:
        return bars, bars * 240 / length
    cands = [(abs(b * 240 / length - ideal) + (0 if lo_hi[0] <= b * 240 / length <= lo_hi[1] else 100), b) for b in range(4, 17)]
    b = min(cands)[1]
    return b, b * 240 / length


def allocate(structure, bars):
    secs = [list(s) for s in STRUCTURES[structure]]
    total = sum(b for _, b in secs)
    grow = [i for i, (k, _) in enumerate(secs) if k in ("drop", "intro")] or [0]
    shrink_order = ["intro", "drop", "logo", "hook2", "hook"]
    g = 0
    while total < bars:
        secs[grow[g % len(grow)]][1] += 1; total += 1; g += 1
    while total > bars:
        for kind in shrink_order:
            cand = [i for i, (k, b) in enumerate(secs) if k == kind and b > 1]
            if cand:
                secs[max(cand, key=lambda i: secs[i][1])][1] -= 1; total -= 1; break
        else:
            drop = [i for i, (k, _) in enumerate(secs) if k == "hook2"]
            if not drop:
                raise SystemExit("length too short for this structure")
            total -= secs.pop(drop[0])[1]
    return secs


def roll_times(start, beats, beat, schedule):
    """accelerating roll: schedule = [(fraction, step_in_beats), ...]"""
    out, p = [], 0.0
    while p < beats - 1e-9:
        out.append(start + p * beat)
        frac = p / beats
        step = next(s for f, s in schedule if frac < f)
        p += step
    return out


def motif(rng, mood, length_beats=4):
    """seeded melody on the scale: rhythm from a small cell library, contour by random walk"""
    cells = [[0.5, 0.5, 0.5, 0.5], [1, 0.5, 0.5], [0.75, 0.25, 1], [0.5, 1, 0.5], [0.25, 0.25, 0.5, 1]]
    sc = SCALE[mood]; notes = []; pos = 0.0; deg = int(rng.integers(0, 5))
    while pos < length_beats - 1e-9:
        for d in cells[int(rng.integers(0, len(cells)))]:
            if pos >= length_beats - 1e-9:
                break
            deg = int(np.clip(deg + rng.choice([-2, -1, 1, 1, 2, 3, -3]), 0, 10))
            notes.append((pos, ROOT + 24 + sc[deg % 7] + 12 * (deg // 7), d))
            pos += d
    return notes


def compose(a):
    rng = np.random.default_rng(a.seed)
    K = Kit(rng)
    bars, bpm = solve_bars(a.length, a.genre, a.bars, a.bpm)
    B = 60 / bpm; BAR = B * 4; DUR = bars * BAR
    N = int(DUR * SR) + SR
    L = np.zeros(N); R = np.zeros(N)
    dark = a.mood == "dark"
    tex = a.texture or GENRES[a.genre][2]
    breaker = a.breaker or {"clock": "tick", "sleigh": "ding", "vinyl": "ding", "heartbeat": "tick", "none": "ding"}[tex]
    logo_notes = [int(v) for v in a.logo.split(",")]
    mot = motif(rng, a.mood)
    secs = allocate(a.structure, bars)

    def add(sig, t, g=1.0, pan=0.0):
        i = int(round(t * SR))
        if 0 <= i < N:
            sig = sig[: N - i]
            L[i:i + len(sig)] += sig * g * np.sqrt(1 - pan); R[i:i + len(sig)] += sig * g * np.sqrt(1 + pan)

    def tex_hit(t, k):
        if tex == "clock": add(K.clock(k % 2 == 1), t, 0.8, 0.3 * (-1) ** k)
        elif tex == "sleigh": add(K.sleigh(k % 2 == 1), t, 0.8, 0.3)
        elif tex == "heartbeat" and k % 4 == 0: add(K.heartbeat(), t, 0.9)

    def lead(t0, gain=0.9, octave=0):
        for pos, m, d in mot:
            if a.genre in ("trailer", "orchestral"): s = K.bell_tone(m + 12 * octave, 1.0, eerie=dark)
            elif a.genre == "synthwave": s = K.pluck(m + 12 * octave, 0.35, 5000)
            elif a.genre == "lofi": s = K.keys([m + 12 * octave], 0.6)
            elif a.genre == "trap": s = K.bell_tone(m + 12 * octave, 0.7, eerie=dark) * 1.2
            else: s = K.pluck(m + 12 * octave, 0.25, 3500)
            add(s, t0 + pos * B, gain, 0.2)

    def intro_bar(t0, bar, first):
        ch = chord_notes(bar, a.mood)
        if first:
            add(K.impact(), t0, 0.7)
            if a.genre in ("trailer", "orchestral"): add(K.braam(root=ROOT - 12, major=not dark), t0, 0.9)
        for k in range(8):
            tex_hit(t0 + k * B / 2, k)
        if tex == "vinyl": add(K.vinyl(BAR), t0, 1.0)
        if a.genre == "orchestral":
            for k in range(8): add(K.strings([ch[0] - 12, ch[2] - 12], B / 2, stacc=True), t0 + k * B / 2, 0.9)
            add(K.timpani(ch[0] - 24), t0, 0.8)
        elif a.genre == "synthwave":
            arp = [ch[0], ch[1], ch[2], ch[0] + 12]
            for k in range(16): add(K.pluck(arp[k % 4], 0.18, 900 + 200 * k), t0 + k * B / 4, 0.8, -0.2)
            add(K.pad([n - 12 for n in ch], BAR), t0, 0.6)
        elif a.genre == "lofi":
            add(K.keys([n - 12 for n in ch] + [ch[0] + 2], BAR * 0.9), t0, 0.9)
        elif a.genre == "house":
            add(K.pad([n - 12 for n in ch], BAR, 900), t0, 0.7)
            for k in range(4): add(K.hat(), t0 + (k + 0.5) * B, 0.6)
        elif a.genre == "trap":
            for k in range(4): add(K.bell_tone(ch[k % 3] + 12, 0.5, eerie=dark), t0 + k * B, 0.7)
            add(K.pad([n - 12 for n in ch], BAR, 700), t0, 0.5)
        lead(t0, 0.8)

    def groove_bar(t0, bar):
        ch = chord_notes(bar, a.mood); root = ch[0] - 24
        if a.genre == "trailer" or a.genre == "trap":
            pat = [(0, 1.75), (1.75, 0.75), (2.5, 1.5)] if bar % 2 == 0 else [(0, 1.5), (1.5, 0.5), (2.0, 0.5), (2.5, 1.5)]
            for pos, ln in pat:
                add(K.kick(), t0 + pos * B); add(K.b808(root, B * ln * 0.95, glide_from=root + 7 if pos else None), t0 + pos * B)
            add(K.clap(), t0 + 2 * B); add(K.snare(0.6), t0 + 2 * B, 0.6)
            for k in range(8): add(K.hat(open_=(k == 7)), t0 + k * B / 2, 0.7, 0.2)
            roll_at = 1.5 if bar % 2 == 0 else 3.25
            for r in range(3): add(K.hat(), t0 + (roll_at + r / 6) * B, 0.6, -0.2)
            if a.genre == "trap":
                for r in range(4): add(K.hat(), t0 + (3.5 + r / 8) * B, 0.5, -0.2)
                for k in range(4): add(K.bell_tone(ch[k % 3] + 12, 0.4, eerie=dark), t0 + k * B, 0.6)
            else:
                add(K.choir([n for n in ch] + [ch[0] + 12], BAR), t0, 0.6)
            lead(t0, 0.7)
        elif a.genre == "synthwave":
            for k in range(4): add(K.kick(0.7), t0 + k * B)
            for k in (1, 3): add(K.gated_snare(), t0 + k * B, 0.9)
            for k in range(8): add(K.sub(root + (12 if k % 2 else 0), B * 0.45), t0 + k * B / 2, 0.8)
            for k in range(16): add(K.hat(g=0.6), t0 + k * B / 4, 0.5, 0.25)
            add(K.pad([n - 12 for n in ch] + [ch[0]], BAR, 2400), t0, 0.8)
            lead(t0, 0.9, 1)
        elif a.genre == "lofi":
            swing = 0.08
            for pos in (0, 1.75, 2.5): add(K.kick(0.6), t0 + pos * B, 0.8)
            for pos in (1, 3): add(K.snare(0.6, 220), t0 + pos * B, 0.7)
            for k in range(8): add(K.hat(g=0.7), t0 + (k / 2 + (swing if k % 2 else 0)) * B, 0.5)
            add(K.keys([n - 12 for n in ch] + [ch[0] + 2, ch[2] + 4], BAR * 0.95), t0, 1.0)
            add(K.sub(root, BAR * 0.9), t0, 0.7)
            if tex == "vinyl": add(K.vinyl(BAR), t0)
            lead(t0, 0.6)
        elif a.genre == "orchestral":
            add(K.timpani(root + 12), t0, 1.0); add(K.timpani(root + 12), t0 + 2 * B, 0.8)
            for k in range(8): add(K.strings([ch[0] - 12, ch[2] - 12, ch[0]], B / 2, stacc=True), t0 + k * B / 2, 1.0)
            add(K.braam(BAR * 1.2, ch[0] - 12, major=not dark), t0, 0.5)
            add(K.choir(ch + [ch[0] + 12], BAR), t0, 0.8)
            add(K.snare(0.5), t0 + 3.5 * B, 0.5); add(K.snare(0.6), t0 + 3.75 * B, 0.6)
            lead(t0, 0.8, 1)
        else:  # house
            for k in range(4):
                add(K.kick(), t0 + k * B)
                add(K.hat(open_=(k == 3)), t0 + (k + 0.5) * B, 0.9, 0.25)
                add(K.sub(root + 12, B * 0.42), t0 + (k + 0.5) * B, 0.9)
            for k in (1, 3): add(K.clap(), t0 + k * B, 0.9)
            for pos in (0, 1.5, 2.75): add(K.stab([n for n in ch] + [ch[0] + 12]), t0 + pos * B, 0.9)
            lead(t0, 0.6, 1)
        if tex == "sleigh":
            for k in range(16): add(K.sleigh(k % 2 == 1), t0 + k * B / 4, 0.4 + 0.3 * (k % 4 == 2), 0.35)

    def drop_hit(t):
        add(K.impact(), t, 1.0)
        if a.genre == "lofi":
            add(K.crash(0.6), t)
        else:
            add(K.braam(2.6, ROOT - 12, major=not dark), t, 1.0 if a.genre != "synthwave" else 0.6)
            add(K.crash(), t)

    def roll_hit(t, prog, k):
        if a.genre == "orchestral":
            add(K.timpani(ROOT - 24 + int(prog * 12), 0.6 + 0.5 * prog), t, 1.0); add(K.snare(0.3 + 0.5 * prog), t, 0.7)
        elif a.genre == "trap":
            add(K.snare(0.4 + 0.6 * prog, 185 + prog * 250), t, 1.0, 0.1 * (-1) ** k); add(K.hat(), t, 0.5)
        elif a.genre == "lofi":
            add(K.rim(), t, 0.8 + 0.6 * prog); add(K.tom(ROOT - 12 + int(prog * 12), 0.4 + 0.4 * prog), t, 0.7)
        elif a.genre in ("synthwave", "house"):
            add(K.snare(0.4 + 0.6 * prog), t, 1.0); add(K.tom(ROOT - 12 + int(prog * 14), 0.4 + 0.4 * prog), t, 0.6)
        else:
            add(K.tom(ROOT - 12 + int(prog * 14) + (k % 2) * 5, 0.6 + 0.5 * prog), t, 1.0, 0.25 * (-1) ** k)
            if prog > 0.5: add(K.snare(0.5 + 0.6 * prog), t, 0.9)

    timeline = {"bpm": bpm, "beat": B, "bar": BAR, "bars": bars, "duration": DUR, "genre": a.genre, "mood": a.mood,
                "structure": a.structure, "seed": a.seed, "sections": [], "silences": [], "drops": [], "hits": []}
    gain_zero = []
    breaker_hits = []
    t = 0.0; bar = 0
    for si, (kind, nb) in enumerate(secs):
        start, end = t, t + nb * BAR
        sec = {"type": kind, "start": start, "end": end, "bars": nb}
        if kind == "intro":
            for k in range(nb): intro_bar(start + k * BAR, bar + k, si == 0 and k == 0)
            add(K.drone(nb * BAR, ROOT - 24, dark), start, 0.7)
            if si == 0: timeline["hits"].append(start)
        elif kind == "hook":
            beats = nb * 4 - 1  # last beat = silence
            sil_s = start + beats * B
            roll = roll_times(start, beats, B, [(0.55, 0.5), (0.76, 0.25), (0.9, 0.125), (1.01, 0.0625)])
            for k, rt in enumerate(roll): roll_hit(rt, (rt - start) / (beats * B), k)
            for k in range(int(beats * 2)): tex_hit(start + k * B / 2, k)
            add(K.riser(beats * B), start, 1.0)
            add(K.drone(beats * B, ROOT - 24, dark), start, 0.5)
            add(K.reverse_swell(B * 1.2, [ROOT, ROOT + (3 if dark else 4), ROOT + 7, ROOT + 12]), sil_s - B * 1.2, 1.2)
            gain_zero.append((sil_s, end)); timeline["silences"].append([sil_s, end])
            if breaker != "none": breaker_hits.append(sil_s + B * 0.5)
            sec.update(roll=roll, silence=[sil_s, end], breaker=(sil_s + B * 0.5) if breaker != "none" else None)
        elif kind == "drop":
            drop_hit(start); timeline["drops"].append(start); timeline["hits"].append(start)
            for k in range(nb): groove_bar(start + k * BAR, bar + k)
            fill_t = end - B * 0.5
            for k in range(4): add(K.tom(ROOT - 5 + k * 3, 0.9), fill_t + k * B / 8)
            sec["fill"] = fill_t
        elif kind == "hook2":
            beats = nb * 4 - 0.5
            roll = roll_times(start, beats, B, [(0.3, 0.25), (0.65, 0.125), (1.01, 0.0625)])
            for k, rt in enumerate(roll): roll_hit(rt, 0.3 + 0.7 * (rt - start) / (beats * B), k)
            add(K.riser(beats * B, 200, 15000, 0.55), start); add(K.shimmer(beats * B, dark), start)
            gap = [start + beats * B, end]; gain_zero.append(tuple(gap)); timeline["silences"].append(gap)
            sec.update(roll=roll, gap=gap)
        elif kind == "logo":
            # ---- SOUND LOGO: identical in every intro ----
            add(K.impact(2.5), start, 1.1); add(K.church_bell(ROOT, 4.0), start, 1.2)
            add(K.kick(), start); add(K.b808(ROOT - 24, BAR * 0.9), start, 0.8)
            for i, m in enumerate(logo_notes):
                add(K.bell_tone(m, 1.8), start + (1 + i * 0.5) * B, 0.9, (-0.4, 0, 0.4)[i % 3])
            # genre-coloured bed under the logo
            add(K.pad([ROOT - 12, ROOT - 5, ROOT, ROOT + (3 if dark else 4), ROOT + 7], nb * BAR * 1.1, 2200), start, 0.9)
            if a.genre in ("trailer", "orchestral", "trap"): add(K.braam(3.0, ROOT - 12, major=not dark), start, 1.0)
            if tex == "sleigh" or a.genre == "orchestral": add(K.choir([ROOT, ROOT + 7, ROOT + 12, ROOT + (15 if dark else 16)], nb * BAR), start, 1.0)
            if tex in ("vinyl",): add(K.vinyl(nb * BAR), start)
            add(K.wind(nb * BAR), start, 0.4)
            timeline["hits"].append(start); timeline["logo"] = start
        timeline["sections"].append(sec)
        t = end; bar += nb

    # main drop = first drop that follows a silence (the midnight moment); else the first drop
    after_sil = [d for d in timeline["drops"] if any(abs(d - s[1]) < 1e-6 for s in timeline["silences"])]
    timeline["main_drop"] = (after_sil or timeline["drops"] or [timeline.get("logo", 0)])[0]

    # reverb, silence automation, dry breaker, loudness
    def reverb(x, secs=2.2, wet=0.26):
        n = int(secs * SR)
        ir = filt(rng.standard_normal(n) * np.exp(-np.arange(n) / SR / (secs / 5)), "lowpass", 5000)
        ir /= np.sqrt(np.sum(ir ** 2))
        return x + np.fft.irfft(np.fft.rfft(x, len(x) + n) * np.fft.rfft(ir, len(x) + n))[: len(x)] * wet

    mix = np.vstack([reverb(L, 2.3), reverb(R, 2.5)])
    tt = np.arange(N) / SR
    for s, e in gain_zero:
        mix[:, (tt >= s) & (tt < e)] = 0.0
    for bt in breaker_hits:
        sig = K.clock(False) * 1.8 if breaker == "tick" else K.bell_tone(ROOT + 36, 0.4)
        i = int(bt * SR); mix[:, i:i + len(sig)] += sig * 0.9
    mix = mix[:, : int(DUR * SR)]
    fade = int(0.5 * SR); mix[:, -fade:] *= np.linspace(1, 0, fade) ** 1.5
    loud = np.abs(mix).max(0) > 1e-4
    mix *= 10 ** (-17 / 20) / np.sqrt(np.mean(mix[:, loud] ** 2))
    mix = np.tanh(mix * 1.2) / np.tanh(1.2)
    mix *= 0.97 / np.abs(mix).max()
    os.makedirs(a.out, exist_ok=True)
    wav = os.path.join(a.out, "music.wav")
    wavfile.write(wav, SR, (mix.T * 32767).astype(np.int16))

    # second pass: measure integrated loudness with ffmpeg and trim toward -14 LUFS
    ff = os.environ.get("FFMPEG", "ffmpeg")
    try:
        base = mix.copy(); g = 1.0
        for _ in range(4):  # measure -> correct; the soft clipper shifts loudness, so iterate
            err = subprocess.run([ff, "-hide_banner", "-i", wav, "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr
            lufs = float(re.findall(r"I:\s+(-?[\d.]+) LUFS", err)[-1])
            if abs(lufs + 14) < 0.3:
                break
            g *= 10 ** ((-14 - lufs) / 20)
            mix = base * g
            pk = np.abs(mix).max()
            if pk > 0.97:  # soft-limit only the part above the ceiling
                mix = np.where(np.abs(mix) > 0.8, np.sign(mix) * (0.8 + 0.17 * np.tanh((np.abs(mix) - 0.8) / 0.17)), mix)
            wavfile.write(wav, SR, (mix.T * 32767).astype(np.int16))
        timeline["lufs"] = lufs
    except Exception as ex:  # ffmpeg missing: keep the RMS-based level
        print("loudness trim skipped:", ex, file=sys.stderr)

    with open(os.path.join(a.out, "timeline.json"), "w") as f:
        json.dump(timeline, f, indent=1)
    return timeline


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--genre", default="trailer", choices=list(GENRES))
    ap.add_argument("--mood", default="dark", choices=["dark", "bright"])
    ap.add_argument("--structure", default="classic", choices=list(STRUCTURES))
    ap.add_argument("--length", type=float, default=15)
    ap.add_argument("--bpm", type=float); ap.add_argument("--bars", type=int)
    ap.add_argument("--texture", choices=TEXTURES); ap.add_argument("--breaker", choices=["tick", "ding", "none"])
    ap.add_argument("--logo", default="86,93,98")
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--out", default="build")
    ap.add_argument("--history")
    ap.add_argument("--list", action="store_true")
    a = ap.parse_args()
    if a.list:
        for g, v in GENRES.items(): print(f"genre  {g:11s} {v[0][0]}-{v[0][1]} BPM, texture={v[2]:9s} {v[3]}")
        for s, v in STRUCTURES.items(): print(f"struct {s:11s} " + " → ".join(f"{k}×{b}" for k, b in v))
        return
    if a.history and os.path.exists(a.history):
        hist = json.load(open(a.history))
        if hist and hist[-1]["genre"] == a.genre and hist[-1]["structure"] == a.structure:
            print(f"WARNING: same genre+structure as the previous intro ({a.genre}/{a.structure}) — change at least one", file=sys.stderr)
    tl = compose(a)
    if a.history:
        hist = json.load(open(a.history)) if os.path.exists(a.history) else []
        hist.append({k: tl[k] for k in ("genre", "mood", "structure", "seed", "bpm", "bars")})
        json.dump(hist, open(a.history, "w"), indent=1)
    print(f"{a.genre}/{a.mood}/{a.structure} seed={a.seed}: {tl['bars']} bars @ {tl['bpm']:.1f} BPM = {tl['duration']:.2f}s")
    print("sections:", " → ".join(f"{s['type']}({s['start']:.2f}-{s['end']:.2f})" for s in tl["sections"]))
    print("silences:", [[round(x, 3) for x in s] for s in tl["silences"]], " main drop:", round(tl["main_drop"], 3))


if __name__ == "__main__":
    main()
