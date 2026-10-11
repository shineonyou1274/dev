"""Find drum hits in a song and write drums.js for a seek(t) page.
usage: python3 drums.py song.wav beats.json drums.js   (beats.json = {"beats": [...]} from librosa beat_track)
KICK = low-band (30–150Hz) onsets, SNARE = 1.5–11kHz onsets of the percussive part, each [time, strength 0..1.5].
BEAT_SHIFT = median gap between strong snares and the beat grid (librosa beats can sit ~50ms late)."""
import json
import sys
import librosa
import numpy as np

y, sr = librosa.load(sys.argv[1], sr=22050)
_, P = librosa.effects.hpss(y, margin=3.0)
hop = 256
S = np.abs(librosa.stft(P, n_fft=2048, hop_length=hop))
f = librosa.fft_frequencies(sr=sr, n_fft=2048)
tt = librosa.frames_to_time(np.arange(S.shape[1]), sr=sr, hop_length=hop)

def flux(lo, hi):
    e = S[(f >= lo) & (f < hi)].sum(0)
    d = np.maximum(0, np.diff(e, prepend=e[0]))
    return d / (np.percentile(d, 99.5) + 1e-9)

def hits(x, delta, vmin):
    p = librosa.util.peak_pick(x, pre_max=6, post_max=6, pre_avg=20, post_avg=20, delta=delta, wait=8)
    return [[round(float(tt[i]), 3), round(float(min(1.5, x[i])), 2)] for i in p if x[i] >= vmin]

kick = hits(flux(30, 150), .12, .35)
snare = hits(np.maximum(flux(1500, 5000), flux(6000, 11000)), .12, .4)
bt = np.array(json.load(open(sys.argv[2]))['beats'])
off = float(np.median([s[0] - bt[np.argmin(abs(bt - s[0]))] for s in snare if s[1] > .6]))
open(sys.argv[3], 'w').write(f'window.KICK={json.dumps(kick)};\nwindow.SNARE={json.dumps(snare)};\nwindow.BEAT_SHIFT={off:.3f};\n')
print(len(kick), 'kicks', len(snare), 'snares', 'beat shift', round(off, 3))
