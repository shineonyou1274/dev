"""Contact sheets for the visual review loop (references/review-loop.md).
Each tile is one frame with its time and scene name written under it, tiled cols x rows per sheet.

usage (run in the project folder that holds the html):
  python3 sheet.py --html open.html                     frame 0, every cue in cues.json (+0.3 s, settled), last frame
  python3 sheet.py --html open.html --seams             every cue: 0.1 s before, on, 0.1 s after (leftovers, hard cuts)
  python3 sheet.py --html open.html --from 7 --to 9 --every 0.1   scrub one transition
  python3 sheet.py --html open.html 3.7 3.75 3.8        exact moments
  python3 sheet.py --video build/out.mp4                same, from the rendered file (check the final, not only stills)
options: --cues cues.json  --offset 0.3  --cols 4  --rows 2  --size 480 (tile width; ~ a phone held upright)  --name x
writes build/sheets/<name>-N.png and prints the paths: open every one with Read.

cues.json = {"cues": [{"t": 0, "name": "점 등장"}, {"t": 17.75, "name": "무음", "offbeat": true}, ...], "quiet": [[17.75, 18]]}
  "offbeat": a cue placed off the beat on purpose (wave.py skips it). A plain [[t, name], ...] list also works.
"""
import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
FF = os.environ.get('FFMPEG', 'ffmpeg')


def load_cues(p, with_flags=False):
    if not p or not Path(p).exists():
        return []
    d = json.loads(Path(p).read_text(encoding='utf-8'))
    raw = d.get('cues', []) if isinstance(d, dict) else d
    out = []
    for c in raw:
        t, name = (c['t'], c.get('name', '')) if isinstance(c, dict) else (c[0], c[1] if len(c) > 1 else '')
        if with_flags:
            out.append((float(t), str(name), bool(isinstance(c, dict) and c.get('offbeat'))))
        else:
            out.append((float(t), str(name)))
    return sorted(out)


def font(px):
    try:   # a Korean-capable font so scene names are readable
        f = subprocess.run(['fc-match', '-f', '%{file}', ':lang=ko'], capture_output=True, text=True).stdout.strip()
        if f:
            return ImageFont.truetype(f, px)
    except (OSError, FileNotFoundError):
        pass
    return ImageFont.load_default(size=px)


def video_duration(v):
    r = subprocess.run([FF, '-hide_banner', '-i', v], capture_output=True, text=True).stderr
    h, m, s = re.search(r'Duration: (\d+):(\d+):([\d.]+)', r).groups()
    return int(h) * 3600 + int(m) * 60 + float(s)


def html_duration(html):
    m = re.search(r'\bDUR\s*=\s*([\d.]+)', Path(html).read_text(encoding='utf-8'))
    return float(m.group(1)) if m else None


def grab_html(html, times):
    # render_dom.mjs --at writes build/at_<t.toFixed(3)>.png at full stage size
    work = Path(html).resolve().parent
    (work / 'build').mkdir(exist_ok=True)
    subprocess.run(['node', str(HERE / 'render_dom.mjs'), '--html', Path(html).name,
                    '--at', ','.join(f'{t:.3f}' for t in times)], cwd=work, check=True)
    return [work / 'build' / f'at_{t:.3f}.png' for t in times]


def grab_video(video, times, tmp):
    tmp.mkdir(parents=True, exist_ok=True)
    out = []
    for t in times:
        p = tmp / f'v_{t:.3f}.png'
        p.unlink(missing_ok=True)
        for back in (0, .05, .1, .2):   # a seek at the very end can land past the last frame and write nothing
            subprocess.run([FF, '-v', 'error', '-y', '-ss', f'{max(t - back, 0):.3f}', '-i', video, '-frames:v', '1', str(p)], check=True)
            if p.exists():
                break
        out.append(p)
    return out


def main():
    ap = argparse.ArgumentParser()
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument('--html')
    src.add_argument('--video')
    ap.add_argument('times', nargs='*', type=float)
    ap.add_argument('--cues', default='cues.json')
    ap.add_argument('--offset', type=float, default=0.3)
    ap.add_argument('--seams', action='store_true')
    ap.add_argument('--every', type=float)
    ap.add_argument('--from', dest='t0', type=float, default=0)
    ap.add_argument('--to', dest='t1', type=float)
    ap.add_argument('--cols', type=int, default=4)
    ap.add_argument('--rows', type=int, default=2)
    ap.add_argument('--size', type=int, default=480)
    ap.add_argument('--name')
    a = ap.parse_args()

    base = Path(a.html or a.video).resolve().parent
    if base.name == 'build':            # build/out.mp4 -> the project folder
        base = base.parent
    cues_path = a.cues if Path(a.cues).is_absolute() else base / a.cues
    cues = load_cues(cues_path)
    dur = video_duration(a.video) if a.video else html_duration(a.html)
    last = (dur - 1 / 30) if dur else None
    names = {}

    if a.times:
        times, name = a.times, a.name or 'picked'
    elif a.every:
        end = a.t1 if a.t1 is not None else last
        times, t = [], a.t0
        while t <= end + 1e-6:
            times.append(round(t, 3)); t += a.every
        name = a.name or 'scrub'
    elif cues:
        if a.seams:
            times = []
            for t, n in cues:
                if t <= 0:
                    continue
                for dt, tag in ((-0.1, '직전'), (0, '경계'), (0.1, '직후')):
                    times.append(round(t + dt, 3)); names[round(t + dt, 3)] = f'{n} {tag}'
            a.cols, a.rows = 3, 4       # one row per cue: before | on | after, four cues per sheet
            name = a.name or 'seams'
        else:
            times = [0.0]; names[0.0] = '첫 프레임(썸네일)'
            for t, n in cues:
                tt = round(t + a.offset, 3); times.append(tt); names[tt] = n
            if last:
                times.append(round(last, 3)); names[round(last, 3)] = '마지막 프레임'
            name = a.name or 'cues'
    else:
        sys.exit(f'no times given and no cues file at {cues_path}. Write cues.json from the scene table first.')

    if last:
        times = [min(max(t, 0), last) for t in times]
    times = sorted(set(round(t, 3) for t in times))

    shots = grab_html(a.html, times) if a.html else grab_video(a.video, times, base / 'build' / 'sheets' / '_frames')
    W = a.size
    first = Image.open(shots[0]); H = round(W * first.height / first.width)
    LAB, PAD = 34, 6
    f = font(20)
    per = a.cols * a.rows
    out_dir = base / 'build' / 'sheets'; out_dir.mkdir(parents=True, exist_ok=True)
    for k in range(0, len(times), per):
        chunk = list(zip(times[k:k + per], shots[k:k + per]))
        rows = -(-len(chunk) // a.cols)
        sheet = Image.new('RGB', (a.cols * (W + PAD) + PAD, rows * (H + LAB + PAD) + PAD), (40, 40, 40))
        d = ImageDraw.Draw(sheet)
        for i, (t, p) in enumerate(chunk):
            x, y = PAD + (i % a.cols) * (W + PAD), PAD + (i // a.cols) * (H + LAB + PAD)
            sheet.paste(Image.open(p).convert('RGB').resize((W, H), Image.LANCZOS), (x, y))
            d.text((x + 6, y + H + 6), f'{t:6.2f}s  {names.get(t, "")}', fill=(235, 235, 235), font=f)
        p = out_dir / f'{name}-{k // per + 1}.png'
        sheet.save(p)
        print(p)


if __name__ == '__main__':
    main()
