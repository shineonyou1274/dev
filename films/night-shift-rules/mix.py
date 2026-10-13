"""야간 근무 수칙 — every sound the bodycam would have recorded. No score, no voice.
Bed: fluorescent hum gated by the same light curve as the picture, the fridge compressor, a far road through the glass.
Foley from events.json (exported by the page). Silences are digital zero. Writes out/mix.wav.
usage: $LIB/.venv/bin/python mix.py
"""
import json
import os
import sys

import numpy as np
import soundfile as sf

LIB = os.environ['LIB']
sys.path.insert(0, os.path.join(LIB, 'core', 'audio'))
from sfx import SR, add, bp, compress, env_exp, hp, limit, lp, noise, t_  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
E = json.load(open(os.path.join(HERE, 'events.json')))
DUR, EV = E['dur'], E['ev']
N = int(DUR * SR)
bed = np.zeros((N, 2)); fx = np.zeros((N, 2))          # sfx.add() works on (samples, 2)
tt = np.arange(N) / SR
rng = np.random.default_rng(3)
ev = lambda k: [e for e in EV if e['type'] == k]
one = lambda k: ev(k)[0]
win = lambda t0, t1, fi=.05, fo=.05: np.clip(np.minimum((tt - t0) / fi + 1, (t1 - tt) / fo + 1), 0, 1) * ((tt > t0 - fi) & (tt < t1 + fo))

FLICK = [e['t'] for e in ev('flick')]
def glight(t):                     # same blackouts as gLight() in story.js
    g = np.ones_like(t)
    for f in FLICK:
        g = np.where((t > f) & (t < f + .1), .05, g)
        g = np.where((t >= f + .1) & (t < f + .22), np.minimum(g, .6 + .4 * (t - f - .1) / .12), g)
    return g

# ---------- bed ----------
G = glight(tt)
hum = sum(a * np.sin(2 * np.pi * 120 * k * tt + k) for k, a in enumerate([1, .55, .42, .22, .16, .06], 1))
buzz = bp(np.sign(np.sin(2 * np.pi * 120 * tt)) + .3 * noise(DUR), 900, 3200) * .25
whine = np.sin(2 * np.pi * 9300 * tt) * .015
lights = (hum * .05 + buzz * .06 + whine) * G
fridge_on = np.ones(N)
off = one('fridgeOff')['t']; on = one('fridgeOn')['t']
fridge_on *= np.clip(1 - (tt - off) / .25, 0, 1) * (tt < on) + (tt >= on) * np.clip((tt - on) / .6, 0, 1) ** .5
comp = (np.sin(2 * np.pi * 49.5 * tt) * .5 + np.sin(2 * np.pi * 99 * tt + 1) * .35 + lp(noise(DUR), 180) * .4) * (1 + .1 * np.sin(2 * np.pi * .7 * tt))
fan = bp(noise(DUR), 300, 1400) * .25
near = np.clip(np.interp(tt, [20.9, 21.0, 23.5, 29.0, 29.01], [0, .2, 1, 1, 0]), 0, 1)       # walking up to the fridges
fridge = (comp * .09 + fan * .05) * (1 + 2.2 * near) * fridge_on
road = lp(np.cumsum(noise(DUR)) / 600, 400) * .5
road -= np.convolve(road, np.ones(4800) / 4800, mode='same')
out_w = ev('outside')[0]
door_open = np.interp(tt, [out_w['t'], out_w['t'] + 1.2, out_w['t'] + out_w['d'] - 1.2, out_w['t'] + out_w['d']], [0, 1, 1, 0], left=0, right=0)
outside = road * (.25 + 1.6 * door_open) + bp(noise(DUR), 200, 2500) * .05 * door_open           # wind and the street come in
under = ev('under')[0]
muf = win(under['t'], under['t'] + under['d'], .3, .5)                                            # under the counter: muffled, closer
mono = lights * (1 - .4 * muf) + fridge + outside * .6
mono = mono * (1 - muf) + lp(mono, 700) * muf * 1.3
for c in range(2): bed[:, c] += mono * (1 + .05 * (c - .5))

# ---------- foley ----------
def chime(at):                     # an original two-note door chime, through a small cheap speaker
    for k, (f, d) in enumerate([(1318.5, .0), (1046.5, .38)]):
        x = t_(1.6); s = sum(a * np.sin(2 * np.pi * f * m * x) * np.exp(-x / (1.1 / m)) for m, a in [(1, 1), (2.76, .3), (5.4, .12)])
        s = bp(s * np.minimum(1, x / .004), 500, 5000)
        add(fx, s * .28, at + d, pan=-.2)
def step(at, v):                   # work shoes on hard tile
    x = t_(.12); add(fx, (bp(noise(.12), 900, 5000) * np.exp(-x / .012) * .25 + np.sin(2 * np.pi * 85 * x) * np.exp(-x / .03) * .5) * v * .5, at)
def cloth(at, v, d=.45):
    x = t_(d); add(fx, bp(noise(d), 600, 5000) * np.sin(np.pi * x / d) ** 1.5 * .12 * v, at, pan=.1)
def tick(at, v=1.):
    x = t_(.02); add(fx, hp(noise(.02), 3000) * np.exp(-x / .002) * .12 * v, at, pan=.3)
def thud(at, v, f=70, d=.4):
    x = t_(d); add(fx, (np.sin(2 * np.pi * f * x) * np.exp(-x / .08) + lp(noise(d), 300) * np.exp(-x / .03) * .4) * v, at)
def scrape(at, d, v, bright):      # one dragged step: a slow heel scuff, then the sole sliding
    x = t_(d); e = np.minimum(1, x / .05) * np.exp(-x / (d * .55))
    add(fx, (bp(noise(d), 150, bright) * e * .5 + np.sin(2 * np.pi * 60 * x) * np.exp(-x / .05) * .35) * v, at, pan=.15)

for e in EV:
    k, t = e['type'], e['t']
    if k == 'chime': chime(t)
    elif k == 'step': step(t, e.get('v', .7))
    elif k == 'cloth': cloth(t, e.get('v', .6))
    elif k == 'af': [tick(t + j * .05, .7) for j in range(4)]
    elif k == 'boot':
        x = t_(.09); add(fx, np.sin(2 * np.pi * 2000 * x) * np.minimum(1, x / .005) * np.minimum(1, (.09 - x) / .01) * .12, t + .2)
        x = t_(.07); add(fx, np.sin(2 * np.pi * 2600 * x) * np.minimum(1, (.07 - x) / .01) * .1, .62)
    elif k == 'velcro':
        x = t_(.5); add(fx, hp(noise(.5), 1500) * (np.abs(np.sin(x * 180)) ** 3) * np.exp(-x / .3) * .18, t)
    elif k == 'doorOpen':
        x = t_(1.4); hinge = np.sin(2 * np.pi * np.cumsum(330 + 90 * np.sin(x * 5)) / SR) * (np.sin(x * 37) > .2)
        add(fx, bp(hinge, 300, 2500) * np.sin(np.pi * x / 1.4) * .05, t, pan=-.25)
        x = t_(.8); add(fx, lp(noise(.8), 900) * np.sin(np.pi * x / .8) * .12, t + .1, pan=-.25)   # air push
    elif k == 'doorClose':
        thud(t + e['d'], .35, 90, .35); x = t_(.15); add(fx, bp(noise(.15), 2000, 6000) * np.exp(-x / .02) * .08, t + e['d'] + .01, pan=-.25)
    elif k == 'print':
        x = t_(.5); add(fx, bp(noise(.5), 2500, 7000) * np.exp(-x / .2) * .03 + np.sin(2 * np.pi * 1700 * x * (1 + x)) * np.exp(-x / .1) * .01, t)
    elif k == 'flick':
        x = t_(.12); add(fx, (bp(noise(.12), 3000, 9000) * .2 + np.sign(np.sin(2 * np.pi * 120 * x)) * .05) * np.exp(-x / .05), t)
        tick(t + .1, 1.6)
    elif k == 'crouch':
        cloth(t, 1., .6); thud(t + .55, .55, 60, .35); thud(t + .62, .4, 55, .3)
    elif k == 'knees':
        for j in range(4): thud(t + .15 + j * .32, .25, 65, .2); cloth(t + j * .32, .5, .3)
    elif k == 'pen':
        d = e['d']; x = t_(d); s = bp(noise(d), 1800, 6000) * (.6 + .4 * np.sin(2 * np.pi * 23 * x) ** 2) * np.sin(np.pi * x / d) ** .5
        add(fx, s * .14, t, pan=.1)
    elif k == 'fridgeOn':
        thud(t, .9, 48, .7)
        x = t_(.6); add(fx, np.sin(2 * np.pi * (35 + 15 * x) * x) * np.minimum(1, x / .1) * np.exp(-x / .5) * .3, t)
    elif k == 'fridgeOff':
        x = t_(.3); add(fx, np.sin(2 * np.pi * 50 * x * (1 - x)) * np.exp(-x / .12) * .25, t)
    elif k == 'drag':
        t0, d, pk = t, e['d'], e['peak']; j = 0
        while t0 + j * 1.15 < t + d - .2:
            at = t0 + j * 1.15; v = np.interp(at, [t, pk, t + d], [.12, 1, .85]); bright = np.interp(at, [t, pk], [900, 3200])
            scrape(at, .75, v * .55, bright); j += 1
    elif k == 'stop':
        x = t_(.12); add(fx, np.sin(2 * np.pi * 1600 * x) * np.minimum(1, (.12 - x) / .01) * .1, t)

# breath: the operator's, close to the mic. Rate and level follow fear; none while holding it.
fear = np.interp(tt, [0, 15, 16, 21, 24.8, 26, 29, 30, 31.5, 33, 36.3, 38, 42, 45], [.1, .1, .5, .3, .3, .7, .4, .6, .9, .9, .9, .5, .5, .7])
held = np.zeros(N)
for h in ev('hold') + ev('silence'): held = np.maximum(held, win(h['t'], h['t'] + h['d'], .1, .2))
held = np.maximum(held, win(33.0, 36.2, .2, .05))                                                 # holding it under the counter too
rate = .28 + .5 * fear
phase = np.cumsum(rate) / SR * 2 * np.pi
breath = bp(noise(DUR), 300, 2400) * np.clip(np.sin(phase), 0, 1) ** 2 * (.025 + .05 * fear) * (1 - held)
x = t_(1.4); exhale = bp(noise(1.4), 250, 1800) * np.sin(np.pi * x / 1.4) * .08
for c in range(2): fx[:, c] += breath
add(fx, exhale, 19.05); add(fx, exhale * 1.2, 36.45)

# ---------- recording breaks ----------
mix = bed + fx
for e in ev('tear'):                       # the recording drops: sound cuts with the picture, digital noise in its place
    a, b = e['t'], e['t'] + e['d']
    m = win(a, b, .01, .01); mix *= (1 - m)[:, None]
    seg = rng.standard_normal(int((b - a) * SR)); seg = np.round(seg * 3) / 3 * .06 * (rng.random(len(seg)) > .4)
    seg = hp(seg, 1200); add(mix, seg, a)
for e in ev('silence'):                    # digital zero, tails included
    i0, i1 = int(e['t'] * SR), int((e['t'] + e['d']) * SR); mix[i0:i1] = 0
fz = one('freeze'); i0 = int(fz['t'] * SR); i1 = int((fz['t'] + fz['d']) * SR); L = int(.06 * SR)
loop = mix[i0 - L:i0].copy()
for j in range(i0, i1, L): k = min(L, i1 - j); mix[j:j + k] = loop[:k] * (1 - (j - i0) / (i1 - i0)) + rng.standard_normal((k, 2)) * .02 * ((j - i0) / (i1 - i0))
mix[i1:] = 0
add(mix, (lambda x: np.sin(2 * np.pi * 1600 * x) * np.minimum(1, (.12 - x) / .01) * .1)(t_(.12)), one('stop')['t'])
mix[:int(.25 * SR)] = 0                                    # nothing before the camera powers on
mix = mix / (np.abs(mix).max() + 1e-9) * .9
for c in range(2): mix[:, c] = limit(compress(mix[:, c], .3, 2.5))
for e in ev('silence'):
    i0, i1 = int(e['t'] * SR), int((e['t'] + e['d']) * SR); mix[i0:i1] = 0
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), mix.astype(np.float32), SR)
print('out/mix.wav', mix.shape[0] / SR, 's')
