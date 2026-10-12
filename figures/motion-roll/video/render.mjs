// Renders the score-roll figure as a 12.5 s motion graphic: every camera cut,
// caption and sound sits on the same 120 BPM / 24 fps grid the figure explains.
import { mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
const { chromium } = createRequire(process.env.PLAYWRIGHT_REQUIRE || import.meta.url)("playwright");
import { FPB, FRAMES, frameOf } from "../model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(process.argv[2] || join(HERE, "frames"));
const ONLY = process.argv[3] ? process.argv[3].split(",").map(Number) : null;
const W = 1920, H = 1080;
const TAIL = 60; // 2.5 s outro after the 240-frame score
const TOTAL = FRAMES + TAIL;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
const easeIn = (t) => Math.pow(clamp(t), 2.2);
const lerp = (a, b, t) => a + (b - a) * t;
const mix = (p, q, t) => [lerp(p[0], q[0], t), lerp(p[1], q[1], t)];

const CAPTIONS = [
  { from: 0, to: 48, n: "01", text: "콘셉트를 악보로 뚫는다" },
  { from: 48, to: 96, n: "02", text: "120 BPM · 한 박 = 12프레임" },
  { from: 96, to: 180, n: "03", text: "컷 · 킥 · 글자를 박 위에" },
  { from: 180, to: 192, n: "··", text: "1박 무음" },
  { from: 192, to: 216, n: "04", text: "프레임마다 새로 그린다" },
  { from: 216, to: 240, n: "05", text: "240프레임 → MP4" },
];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on("pageerror", (e) => console.error("page error:", e.message));
await page.goto(pathToFileURL(join(HERE, "..", "motion-roll.html")).href);
const fonts = pathToFileURL(join(HERE, "fonts")).href;

const points = await page.evaluate(({ W, H, fonts }) => {
  const svg = document.querySelector(".iso-stage svg");
  const card = getComputedStyle(document.querySelector(".iso-plate")).backgroundColor;
  const style = document.createElement("style");
  style.textContent = `
    @font-face{font-family:K;font-weight:400;src:url(${fonts}/noto-sans-kr-korean-400-normal.woff2)}
    @font-face{font-family:K;font-weight:700;src:url(${fonts}/noto-sans-kr-korean-700-normal.woff2)}
    @font-face{font-family:K;font-weight:900;src:url(${fonts}/noto-sans-kr-korean-900-normal.woff2)}
    @font-face{font-family:K;font-weight:400;src:url(${fonts}/noto-sans-kr-latin-400-normal.woff2);unicode-range:U+0000-00FF,U+2190-21FF}
    @font-face{font-family:K;font-weight:700;src:url(${fonts}/noto-sans-kr-latin-700-normal.woff2);unicode-range:U+0000-00FF,U+2190-21FF}
    @font-face{font-family:K;font-weight:900;src:url(${fonts}/noto-sans-kr-latin-900-normal.woff2);unicode-range:U+0000-00FF,U+2190-21FF}
    html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;background:${card}}
    body>*:not(#v){display:none!important}
    #v{position:fixed;inset:0;overflow:hidden;background:${card}}
    #v svg{position:absolute;left:0;top:0;width:${(H * 1.6).toFixed(0)}px;height:${H}px;transform-origin:0 0}
    #v .iso-line{vector-effect:non-scaling-stroke}
    .ov{position:absolute;pointer-events:none}
    #dim{inset:0;background:#000;opacity:0}
    #flash{inset:0;background:#fff;opacity:0;mix-blend-mode:screen}
    #vig{inset:0;background:radial-gradient(ellipse at center,transparent 55%,rgba(0,0,0,.55) 100%)}
    #cap{left:96px;bottom:150px;font-family:K;color:#f2f2f2}
    #cap .n{font:700 22px/1 K;letter-spacing:.32em;color:#8a8a8a;margin-bottom:18px}
    #cap .t{font:900 64px/1.1 K;letter-spacing:-.02em;white-space:nowrap}
    #tl{left:96px;top:72px;font:700 18px/1 K;letter-spacing:.42em;color:#9a9a9a}
    #tr{right:96px;top:72px;font:400 18px/1 ui-monospace,monospace;letter-spacing:.12em;color:#cfcfcf;text-align:right}
    #tick{left:96px;right:96px;bottom:84px;height:14px;display:flex;gap:8px;align-items:flex-end}
    #tick i{flex:1;height:4px;background:#3a3a3a;border-radius:2px;transition:none}
    #tick i.on{background:#7a7a7a}
    #tick i.now{background:#fff;height:14px}
    #ph{left:96px;bottom:112px;font:700 16px/1 K;letter-spacing:.36em;color:#8a8a8a}
    #title{left:0;right:0;top:0;bottom:0;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:K;color:#fff;opacity:0}
    #title .a{font:900 96px/1.1 K;letter-spacing:-.03em}
    #title .b{margin-top:28px;font:400 26px/1 K;letter-spacing:.3em;color:#bdbdbd}
  `;
  document.head.append(style);
  const v = document.createElement("div");
  v.id = "v";
  v.innerHTML = `<div class="ov" id="vig"></div><div class="ov" id="dim"></div><div class="ov" id="flash"></div>
    <div class="ov" id="tl">SCORE-ROLL RENDERER</div><div class="ov" id="tr"></div>
    <div class="ov" id="cap"><div class="n"></div><div class="t"></div></div>
    <div class="ov" id="ph"></div><div class="ov" id="tick">${"<i></i>".repeat(20)}</div>
    <div class="ov" id="title"><div class="a">코드로 만드는 모션그래픽</div><div class="b">콘셉트 → 박자 격자 → 컷 → 렌더 → MP4</div></div>`;
  document.body.append(v);
  v.prepend(svg);
  svg.style.transform = "none";
  const mid = (el) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  window.__mrSeek(0);
  return {
    centre: [H * 1.6 / 2, H / 2 + 20],
    screen: mid(svg.querySelector('[data-part="screen"]').parentElement),
    reader: mid(svg.querySelector('[data-cap="kick"]')),
    counter: mid(svg.querySelector('[data-part="counter"]')),
    reel: mid(svg.querySelector('[data-part="pack"]')),
  };
}, { W, H, fonts });
await page.evaluate(() => document.fonts.ready);

const deck = mix(points.counter, points.reel, 0.45);
const rollAt = [points.reader[0] - 40, points.reader[1] + 70];

// The camera: [focus, zoom] for output frame i, cut on the score's cut beats.
function camera(i) {
  const f = i % FRAMES;
  if (i >= FRAMES) { const t = ease((i - FRAMES) / 40); return [mix(deck, points.centre, t), lerp(2.6, 0.92, t)]; }
  const b = (n) => n * FPB;
  if (f < b(4)) { const t = ease(f / b(4)); return [points.centre, lerp(0.94, 1.1, t)]; }
  if (f < b(8)) { const t = (f - b(4)) / b(4); return [[lerp(rollAt[0] - 150, rollAt[0] + 90, t), lerp(rollAt[1] + 60, rollAt[1] - 30, t)], 2.3]; }
  if (f < b(15)) { const t = easeIn((f - b(8)) / b(7)); return [mix(mix(points.reader, points.centre, 0.35), [points.reader[0], points.reader[1] + 30], t), lerp(1.5, 3.2, t)]; }
  if (f < b(16)) { const t = (f - b(15)) / b(1); return [[points.reader[0], points.reader[1] + 30], lerp(3.2, 3.3, t)]; }
  if (f < b(18)) { const t = easeOut((f - b(16)) / b(2)); return [points.screen, lerp(3.9, 3.1, t)]; }
  const t = ease((f - b(18)) / b(2)); return [deck, lerp(3.1, 2.6, t)];
}

const shakeOf = (i) => {
  const f = i % FRAMES;
  if (i >= FRAMES || f < 8 * FPB || f >= 15 * FPB) return [0, 0];
  const k = frameOf(f).kick * (f >= 12 * FPB ? 7 : 3);
  return [Math.sin(f * 12.9898) * k, Math.cos(f * 78.233) * k];
};

const frames = ONLY || Array.from({ length: TOTAL }, (_, i) => i);
for (const i of frames) {
  const f = i % FRAMES;
  const fr = frameOf(f);
  const [[fx, fy], z] = camera(i);
  const [sx, sy] = shakeOf(i);
  const caption = i < FRAMES ? CAPTIONS.find((c) => f >= c.from && f < c.to) : null;
  const capIn = caption ? easeOut((f - caption.from) / 5) : 0;
  const capOut = caption ? clamp((caption.to - f) / 3) : 0;
  const state = {
    i, f,
    seek: f,
    transform: `translate(${(W / 2 - fx * z + sx).toFixed(2)}px, ${(H / 2 - fy * z + sy).toFixed(2)}px) scale(${z.toFixed(4)})`,
    dim: i >= FRAMES ? clamp((i - FRAMES - 10) / 24) * 0.72 : fr.silent ? 0.6 : 0,
    flash: i < FRAMES ? fr.drop * 0.32 : 0,
    cap: caption ? { n: caption.n, text: caption.text, o: Math.min(capIn, capOut), y: (1 - capIn) * 30 } : null,
    title: i >= FRAMES ? easeOut((i - FRAMES - 16) / 18) : 0,
    hud: i < FRAMES ? 1 : clamp(1 - (i - FRAMES) / 12),
    tr: `BEAT ${String(fr.beat + 1).padStart(2, "0")}/20   FRAME ${String(f + 1).padStart(3, "0")}/240<br>120 BPM · 24 FPS`,
    ph: { "인트로": "INTRO", "빌드업": "BUILD-UP", "1박 무음": "1 BEAT SILENCE", "드롭": "DROP" }[["인트로", "빌드업", "1박 무음", "드롭"][fr.beat < 8 ? 0 : fr.beat < 15 ? 1 : fr.beat < 16 ? 2 : 3]],
    beat: fr.beat,
  };
  await page.evaluate((s) => {
    window.__mrSeek(s.seek);
    const q = (id) => document.getElementById(id);
    document.querySelector("#v svg").style.transform = s.transform;
    q("dim").style.opacity = s.dim;
    q("flash").style.opacity = s.flash;
    const cap = q("cap");
    cap.style.opacity = s.cap ? s.cap.o : 0;
    if (s.cap) { cap.querySelector(".n").textContent = s.cap.n; cap.querySelector(".t").textContent = s.cap.text; cap.style.transform = `translateY(${s.cap.y}px)`; }
    q("title").style.opacity = s.title;
    for (const id of ["tl", "tr", "ph", "tick"]) q(id).style.opacity = s.hud;
    q("tr").innerHTML = s.tr;
    q("ph").textContent = s.ph;
    [...q("tick").children].forEach((el, n) => { el.className = n < s.beat ? "on" : n === s.beat ? "now" : ""; });
  }, state);
  await page.screenshot({ path: join(OUT, `${String(i).padStart(4, "0")}.png`) });
  if (i % 30 === 0) console.log("frame", i);
}
await browser.close();
console.log("done", frames.length, "frames →", OUT);
