// DOM renderer for "morph mode": the page exposes window.READY (promise), window.seek(t) and window.DUR.
// Each output frame = SUB subframes blended by ffmpeg tmix (motion blur), then muxed with build/music.wav.
//
// usage (run in the project folder that holds the html):
//   node render_dom.mjs --html morph.html --beats            # one frame per beat -> build/beat_XX.png (check before full render)
//   node render_dom.mjs --html morph.html --at 0,15          # specific times -> build/at_T.png
//   node render_dom.mjs --html morph.html --out build/morph.mp4 [--fps 60] [--sub 4] [--audio build/music.wav]
//   long videos: render segments in parallel (video only), then concat + mux the audio once:
//   node render_dom.mjs --html x.html --out build/seg0.mp4 --from 0 --to 60 --fps 30 --sub 2   (one process per segment)
import { spawn, execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true); };
const HTML = arg('html', 'morph.html'), OUT = arg('out', 'build/out.mp4'), FPS = +arg('fps', 60), SUB = +arg('sub', 4), AUDIO = arg('audio', 'build/music.wav');
const FF = process.env.FFMPEG || 'ffmpeg';

let chromium;
try { ({ chromium } = await import('playwright')); }
catch { const g = process.env.PW_ROOT || execSync('npm root -g').toString().trim(); ({ chromium } = await import(pathToFileURL(path.join(g, 'playwright', 'index.mjs')).href)); }

const root = process.cwd();
const MIME = { '.html': 'text/html', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.svg': 'image/svg+xml' };
const server = http.createServer(async (req, res) => {
  const f = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!f.startsWith(root)) { res.writeHead(403).end(); return; }
  let body;
  try { body = await readFile(f); } catch { res.writeHead(404).end(); return; }   // read first: a missing file must not crash the server
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }).end(body);
}).listen(0, '127.0.0.1');
await new Promise(r => server.once('listening', r));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const page = await browser.newPage({ viewport: { width: 1440, height: 1440 }, deviceScaleFactor: 1 });
await page.addInitScript(() => { window.__RENDER_MODE__ = true; });
await page.goto(`http://127.0.0.1:${server.address().port}/${HTML}`);
await page.evaluate(() => window.READY);
const size = await page.evaluate(() => { const s = document.getElementById('stage'); return { width: s.offsetWidth, height: s.offsetHeight }; });
await page.setViewportSize(size);
const { DUR, B } = await page.evaluate(() => ({ DUR: window.DUR, B: 60 / window.SB.bpm }));
const shot = async (t, type = 'png') => { await page.evaluate(t => window.seek(t), t); return page.screenshot({ type, quality: type === 'jpeg' ? 94 : undefined, clip: { x: 0, y: 0, ...size } }); };

if (arg('beats')) {
  const n = Math.round(DUR / B);
  for (let b = 0; b < n; b++) writeFileSync(`build/beat_${String(b).padStart(2, '0')}.png`, await shot(b * B + 0.12)); // just after each beat lands
  console.log(`wrote ${n} beat frames`);
} else if (arg('at')) {
  for (const t of String(arg('at')).split(',').map(Number)) writeFileSync(`build/at_${t.toFixed(3)}.png`, await shot(t));
} else {
  const F0 = arg('from') ? Math.round(+arg('from') * FPS) : 0, F1 = arg('to') ? Math.min(Math.round(DUR * FPS), Math.round(+arg('to') * FPS)) : Math.round(DUR * FPS);
  const segment = !!arg('from') || !!arg('to'), rate = FPS * SUB;
  // tmix averages the current subframe with the previous SUB-1; keep every SUB-th output -> one blurred frame per FPS tick
  const vf = `tmix=frames=${SUB},select='not(mod(n+1\\,${SUB}))',setpts=N/(${FPS}*TB)`;
  const audioArgs = segment ? ['-an'] : ['-c:a', 'aac', '-b:a', '256k', '-shortest'];
  const ff = spawn(FF, ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(rate), '-i', '-', ...(segment ? [] : ['-i', AUDIO]),
    '-vf', vf, '-r', String(FPS), '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-maxrate', '14M', '-bufsize', '28M',
    '-pix_fmt', 'yuv420p', ...audioArgs, '-movflags', '+faststart', OUT], { stdio: ['pipe', 'inherit', 'inherit'] });
  const frames = F1;
  for (let f = F0; f < frames; f++) {
    for (let k = 0; k < SUB; k++) {
      const buf = await shot((f + k / SUB) / FPS, 'jpeg');
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    }
    if (f % 120 === 0) console.log(`frame ${f}/${frames}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  console.log('wrote', OUT);
}
await browser.close();
server.close();
