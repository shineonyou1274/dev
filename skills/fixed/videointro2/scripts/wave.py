"""Sound check for the review loop: a waveform picture with the scene cues on it, loudness, and the faults the
user has complained about (music that stops dead mid-scene, cuts half a beat off the drum).

usage: python3 wave.py build/out.mp4 [--cues cues.json] [--beats beats.json] [--out build/sheets/wave.png]
  input: the final mp4 or build/music.wav. beats.json = {"beats": [...]} from librosa beat_track (or a plain list).
prints: integrated loudness and true peak, sudden drops outside the planned quiet ranges in cues.json,
        and (with --beats) every cue that sits more than 60 ms off its nearest beat.
"""
import argparse
import json
import os
import re
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from sheet import font, load_cues

FF = os.environ.get('FFMPEG', 'ffmpeg')
SR = 22050


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src')
    ap.add_argument('--cues', default='cues.json')
    ap.add_argument('--beats')
    ap.add_argument('--out')
    a = ap.parse_args()
    base = Path(a.src).resolve().parent
    if base.name == 'build':
        base = base.parent
    cues_path = Path(a.cues) if Path(a.cues).is_absolute() else base / a.cues
    cues = load_cues(cues_path, with_flags=True)
    quiet = []
    if cues_path.exists():
        d = json.loads(cues_path.read_text(encoding='utf-8'))
        quiet = [tuple(map(float, q)) for q in (d.get('quiet', []) if isinstance(d, dict) else [])]

    raw = subprocess.run([FF, '-v', 'error', '-i', a.src, '-vn', '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    y = np.frombuffer(raw, np.float32)
    if not len(y):
        raise SystemExit('no audio stream in ' + a.src)
    dur = len(y) / SR

    # loudness: target -14 LUFS, true peak at most -1 dBFS
    err = subprocess.run([FF, '-hide_banner', '-nostats', '-i', a.src, '-vn', '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    lufs = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', err)[-1])
    tp = float(re.findall(r'Peak:\s+(-?[\d.]+|-inf) dBFS', err)[-1])
    print(f'# loudness  {lufs:.1f} LUFS (target -14 ±1)  true peak {tp:.1f} dBFS (at most -1)'
          + ('' if abs(lufs + 14) <= 1 and tp <= -1 else '   <- fix'))

    # level every 20 ms
    hop = SR // 50
    n = len(y) // hop
    rms = np.sqrt((y[:n * hop].reshape(n, hop) ** 2).mean(1) + 1e-12)
    db = 20 * np.log10(rms)
    tt = np.arange(n) / 50

    def planned(t):
        return any(q0 - .15 <= t <= q1 + .15 for q0, q1 in quiet)

    # a sudden stop: the level falls 20 dB or more within 60 ms and stays under -45 dBFS for at least 0.15 s
    drops, k = [], 3
    while k < n - 8:
        if db[k - 3] - db[k] >= 20 and db[k:k + 8].max() < -45 and db[k - 3] > -40 and tt[k] < dur - 1 and not planned(tt[k]):
            drops.append(tt[k]); k += 25
        k += 1
    print('# sudden stops outside the quiet ranges in cues.json (the user hears these as the music breaking)')
    print('  none' if not drops else '\n'.join(f'  {t:.2f}s' for t in drops))

    beats = []
    if a.beats:
        b = json.loads(Path(a.beats).read_text())
        beats = np.array(b['beats'] if isinstance(b, dict) else b, float)
        print('# cues off the beat by more than 60 ms (snap them to the real beat, not to a segment boundary)')
        bad = 0
        for t, name, offbeat in cues:
            if offbeat:
                continue
            off = (t - beats[np.argmin(abs(beats - t))]) * 1000
            if abs(off) > 60:
                bad += 1; print(f'  {t:6.2f}s {name}: {off:+.0f} ms')
        if not bad:
            print('  none')

    # picture: envelope, quiet ranges shaded, cues in yellow, beats as ticks, sudden stops in red
    W, H, TOP = 1800, 300, 58
    img = Image.new('RGB', (W, H + TOP + 30), (24, 24, 24))
    dr = ImageDraw.Draw(img)
    X = lambda t: int(t / dur * (W - 1))
    for q0, q1 in quiet:
        dr.rectangle([X(q0), TOP, X(q1), TOP + H], fill=(45, 60, 90))
    cols = np.array_split(np.abs(y), W)
    for x, c in enumerate(cols):
        h = float(c.max()) * H / 2 if len(c) else 0
        dr.line([x, TOP + H / 2 - h, x, TOP + H / 2 + h], fill=(170, 170, 170))
    for b in beats:
        dr.line([X(b), TOP + H, X(b), TOP + H + 8], fill=(120, 120, 120))
    f = font(16)
    for i, (t, name, _) in enumerate(cues):
        dr.line([X(t), TOP, X(t), TOP + H], fill=(215, 255, 0))
        dr.text((X(t) + 3, 4 + (i % 3) * 18), name, fill=(215, 255, 0), font=f)
    for t in drops:
        dr.line([X(t), TOP, X(t), TOP + H], fill=(255, 60, 60), width=3)
    for s in range(int(dur) + 1):
        dr.text((X(s) + 2, TOP + H + 10), str(s), fill=(140, 140, 140), font=f)
    out = Path(a.out) if a.out else base / 'build' / 'sheets' / 'wave.png'
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out)
    print(out)


if __name__ == '__main__':
    main()
