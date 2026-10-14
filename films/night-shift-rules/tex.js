// procedural textures: rule sheet, wall with tally marks, floor tiles, ceiling, product faces, fogged fridge glass, hands
import * as THREE from 'three';
import { mulberry } from '/core/lib.js';
import { SHEET } from './story.js';

const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const tex = (c, rep) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); } return t; };
function speckle(g, w, h, n, a, seed, col = '0,0,0') {
  const R = mulberry(seed); for (let k = 0; k < n; k++) { g.fillStyle = `rgba(${col},${a * R()})`; g.fillRect(R() * w, R() * h, 1 + R() * 2, 1 + R() * 2); }
}

// ---------- the rule sheet: yellowed laser print, 0.30 × 0.42 m ----------
export function sheetTex() {
  const W = 900, H = 1260, c = mk(W, H), g = c.getContext('2d'), R = mulberry(7);
  const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#efe8cf'); gr.addColorStop(1, '#e4dbbd');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  speckle(g, W, H, 2600, .06, 3, '120,100,40');
  g.fillStyle = 'rgba(150,120,50,.10)'; g.beginPath(); g.ellipse(760, 1150, 210, 120, -.3, 0, 7); g.fill();   // a coffee-coloured stain
  g.fillStyle = '#1d1c19'; g.textBaseline = 'alphabetic';
  g.font = "500 30px 'NSans'"; g.fillText(SHEET.top, 70, 96);
  g.font = "800 92px 'NSans'"; g.fillText(SHEET.title, 66, 206);
  g.fillRect(66, 232, W - 132, 6);
  g.font = "500 27px 'NSans'"; g.fillText(SHEET.doc, 70, 278);
  const ys = [[378, 436], [552, 610], [726, 784]];
  SHEET.rules.forEach((r, i) => { g.font = "800 46px 'NSans'"; g.fillText(r[0], 66, ys[i][0]); g.font = "800 46px 'NSans'"; g.fillText(r[1], 66, ys[i][1]); });
  g.fillRect(66, 838, W - 132, 3);
  g.font = "500 27px 'NSans'"; g.fillText(SHEET.foot, 70, 884); g.fillText(SHEET.sign, 70, 934);
  // handwritten rule 4: ballpoint, slightly rotated, pressed harder at the start
  g.save(); g.translate(78, 1080); g.rotate(-.025);
  g.fillStyle = '#1f2a55'; g.font = "86px 'Pen'"; g.fillText(SHEET.hand, 0, 0);
  g.globalAlpha = .35; g.fillText(SHEET.hand, .8, .6); g.restore();
  // toner banding + a crease
  for (let y = 0; y < H; y += 7) { g.fillStyle = `rgba(255,255,240,${.04 * R()})`; g.fillRect(0, y, W, 2); }
  g.strokeStyle = 'rgba(90,80,50,.18)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 640); g.lineTo(W, 628); g.stroke();
  // tape at the top corners
  g.fillStyle = 'rgba(235,225,180,.55)'; g.save(); g.translate(40, 20); g.rotate(-.5); g.fillRect(-60, -18, 150, 40); g.restore();
  g.save(); g.translate(W - 40, 20); g.rotate(.5); g.fillRect(-90, -18, 150, 40); g.restore();
  return tex(c);
}

// ---------- front wall panel (solid part left of the glass): paint, tape marks, tally strokes under the sheet ----------
// The wall texture covers 1.6 m × 2.6 m; sheet sits at u∈[0.31,0.50] → we draw tallies just under it.
export const WALLPX = 400;           // px per metre
export function wallCanvas() {
  const W = 640, H = 1040, c = mk(W, H), g = c.getContext('2d');
  g.fillStyle = '#cfd8c4'; g.fillRect(0, 0, W, H);
  speckle(g, W, H, 5000, .05, 11, '60,70,50');
  for (let k = 0; k < 9; k++) { g.fillStyle = `rgba(90,90,60,${.04 + .03 * (k % 3)})`; g.fillRect(150 + k * 9 % 40, 410 + k * 23, 60 + k * 7, 12); }   // old tape marks
  g.fillStyle = '#5f6b58'; g.fillRect(0, H - 40, W, 40);                                     // skirting
  g.fillStyle = 'rgba(80,70,40,.12)'; g.fillRect(0, H - 110, W, 70);                          // grime at the foot
  return c;
}
// tally marks (正) under the sheet: each group by a different pen; extra = progress of the new stroke (0..1)
const PENS = ['#1c1c1e', '#1f3f8a', '#5a1e1e', '#1c1c1e', '#2c3f6a', '#23402c'];
const STROKES = [[[-12, -16], [12, -16]], [[0, -16], [0, 16]], [[0, 0], [10, 0]], [[-8, -2], [-8, 16]], [[-16, 16], [16, 16]]];   // 正 in stroke order
export function drawTallies(g, x0, y0, extra) {
  const R = mulberry(31); const s = .62;
  const groups = 4, rest = 3;            // 4 full 正 + 3 strokes = 23 people before you
  const SPOT = [[-46, 0], [0, 3], [46, -2], [-24, 34], [22, 36]];   // two rows under the sheet (wall px, relative to x0,y0)
  const gx = k => x0 + SPOT[k][0] + (R() - .5) * 5, gy = k => y0 + SPOT[k][1] + (R() - .5) * 4;
  const stroke = (cx, cy, st, col, w, p = 1) => { const [[a, b], [c2, d]] = st;
    g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx + a * s, cy + b * s); g.lineTo(cx + (a + (c2 - a) * p) * s, cy + (b + (d - b) * p) * s); g.stroke(); };
  let k = 0;
  for (; k < groups; k++) { const cx = gx(k), cy = gy(k), col = PENS[k % PENS.length], w = 2.2 + R() * 1.6; for (const st of STROKES) stroke(cx, cy, st, col, w * .55); }
  const cx = gx(k), cy = gy(k);
  for (let j = 0; j < rest; j++) stroke(cx, cy, STROKES[j], PENS[(k + j) % PENS.length], 1.4);
  if (extra > 0) stroke(cx, cy, STROKES[rest], '#16224a', 1.8, extra);    // the new one, in the operator's pen
  return { x: cx + STROKES[rest][0][0] * s + (STROKES[rest][1][0] - STROKES[rest][0][0]) * s * extra, y: cy + (STROKES[rest][0][1] + (STROKES[rest][1][1] - STROKES[rest][0][1]) * extra) * s };
}

// ---------- floor: beige terrazzo tiles 0.6 m ----------
export function floorTex() {
  const S = 512, c = mk(S, S), g = c.getContext('2d');
  g.fillStyle = '#b8b19a'; g.fillRect(0, 0, S, S);
  speckle(g, S, S, 9000, .18, 21, '70,65,50'); speckle(g, S, S, 3000, .25, 22, '235,230,215');
  g.fillStyle = 'rgba(70,65,50,.35)'; g.fillRect(0, 0, S, 3); g.fillRect(0, 0, 3, S);
  return tex(c, [1, 1]);
}
export function ceilTex() {
  const S = 256, c = mk(S, S), g = c.getContext('2d');
  g.fillStyle = '#d9dccd'; g.fillRect(0, 0, S, S); speckle(g, S, S, 4000, .12, 5, '90,90,70');
  g.fillStyle = '#e8eadf'; g.fillRect(0, 0, S, 4); g.fillRect(0, 0, 4, S);
  return tex(c, [1, 1]);
}
export function plainTex(col, seed, n = 3000) { const S = 256, c = mk(S, S), g = c.getContext('2d'); g.fillStyle = col; g.fillRect(0, 0, S, S); speckle(g, S, S, n, .08, seed); return tex(c); }

// ---------- product faces: desaturated packaging in the green-beige family ----------
export function productTex(seed) {
  const W = 512, H = 256, c = mk(W, H), g = c.getContext('2d'), R = mulberry(seed);
  const fam = ['#c9cfb4', '#b7bfa0', '#d8d6bd', '#a9b391', '#cfc7a8', '#9fa88e', '#dfe0cf', '#8f9a7f'];
  let x = 0;
  while (x < W) { const w = 22 + R() * 40, col = fam[Math.floor(R() * fam.length)], h = H * (.55 + R() * .4);
    g.fillStyle = col; g.fillRect(x, H - h, w - 3, h);
    g.fillStyle = 'rgba(40,45,30,.25)'; g.fillRect(x + 3, H - h + 8 + R() * 20, w - 9, 6 + R() * 10);
    g.fillStyle = 'rgba(255,255,240,.25)'; g.fillRect(x, H - h, 3, h);
    x += w; }
  return tex(c);
}
export function bottlesTex(seed) {     // drinks behind the fridge glass
  const W = 512, H = 512, c = mk(W, H), g = c.getContext('2d'), R = mulberry(seed);
  g.fillStyle = '#e6eade'; g.fillRect(0, 0, W, H);
  for (let row = 0; row < 4; row++) { const y1 = 120 + row * 128; g.fillStyle = '#9aa391'; g.fillRect(0, y1, W, 8);
    for (let x = 6; x < W; x += 34 + R() * 6) { const h = 70 + R() * 30, col = ['#b9c2a8', '#8e9b84', '#cfd3bf', '#a4ad92', '#7d8a74'][Math.floor(R() * 5)];
      g.fillStyle = col; g.beginPath(); g.roundRect(x, y1 - h, 26, h, 6); g.fill(); g.fillRect(x + 9, y1 - h - 14, 8, 16);
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x + 4, y1 - h + 6, 4, h - 14); } }
  return tex(c);
}

// ---------- fogged fridge glass (alpha = condensation) with handprints from the inside ----------
export function fogCanvas() { return mk(256, 512); }
function hand(g, cx, cy, s, a) {           // a palm with five fingers, pressed flat: drawn as cleared condensation
  g.save(); g.translate(cx, cy); g.scale(s, s); g.globalAlpha = a;
  g.beginPath(); g.ellipse(0, 18, 26, 30, 0, 0, 7); g.fill();
  [[-22, -14, -.35, 30], [-9, -30, -.1, 38], [5, -32, .05, 40], [18, -26, .2, 35], [30, 6, .9, 26]].forEach(([x, y, r, l]) => {
    g.save(); g.translate(x, y); g.rotate(r); g.beginPath(); g.roundRect(-6, -l / 2, 12, l, 6); g.fill(); g.restore(); });
  g.restore();
}
export function drawFog(cv, t, T) {
  const g = cv.getContext('2d'), W = cv.width, H = cv.height, R = mulberry(9);
  g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, H);
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(226,232,224,.55)'); gr.addColorStop(.6, 'rgba(226,232,224,.7)'); gr.addColorStop(1, 'rgba(226,232,224,.78)');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (let k = 0; k < 900; k++) { g.fillStyle = `rgba(250,252,248,${.25 * R()})`; g.beginPath(); g.arc(R() * W, R() * H, .6 + R() * 1.6, 0, 7); g.fill(); }
  // prints clear the fog (destination-out); they bloom in over ~0.6 s and run a little
  g.globalCompositeOperation = 'source-over'; g.fillStyle = 'rgba(28,36,32,.9)'; g.shadowColor = 'rgba(28,36,32,.6)'; g.shadowBlur = 4;   // wet print: darker than the fog
  const k1 = Math.min(1, Math.max(0, (t - T.print1) / .6)), k2 = Math.min(1, Math.max(0, (t - T.print2) / .6));
  if (k1 > 0) hand(g, 112, 205, .86 + .04 * k1, .72 * k1);
  if (k2 > 0) hand(g, 168, 290, .82 + .03 * k2, .64 * k2);
  // drips below the prints
  if (k1 > .5) for (let d = 0; d < 4; d++) { const len = Math.min(70, (t - T.print1 - .3) * 40) * (.5 + .5 * ((d * 37) % 7) / 7); g.fillRect(100 + d * 7, 232, 2, len * .8); }
  g.shadowBlur = 0; g.globalCompositeOperation = 'source-over';
  // someone breathing on the inside of the glass at head height: a fog patch that swells and shrinks
  if (t > 25.9 && t < 29.0) { const b = .5 + .5 * Math.sin((t - 25.9) * Math.PI * 2 * .55), a = Math.min(1, (t - 25.9) / .5) * (.45 + .5 * b);
    const gr = g.createRadialGradient(118, 150, 2, 118, 150, 34 + 10 * b); gr.addColorStop(0, `rgba(245,248,244,${a})`); gr.addColorStop(1, 'rgba(245,248,244,0)');
    g.fillStyle = gr; g.beginPath(); g.ellipse(118, 150, 46 + 12 * b, 30 + 8 * b, 0, 0, 7); g.fill(); }
}

// ---------- hands entering the frame (camera-space billboards) ----------
export function ragHandCanvas() {        // 512 × 1024: the sleeve runs off the bottom so the arm always comes from below the frame
  const c = mk(512, 1024), g = c.getContext('2d');
  g.fillStyle = '#20262a'; g.beginPath(); g.moveTo(110, 1024); g.bezierCurveTo(130, 700, 190, 360, 255, 330); g.lineTo(335, 338); g.bezierCurveTo(370, 520, 400, 800, 410, 1024); g.fill();
  g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(200, 600, 30, 424);
  g.fillStyle = '#c99d84'; g.beginPath(); g.ellipse(294, 292, 62, 52, -.15, 0, 7); g.fill();
  [[244, 240], [272, 226], [302, 226], [332, 238]].forEach(([x, y]) => { g.beginPath(); g.roundRect(x - 13, y - 36, 26, 58, 12); g.fill(); });
  g.fillStyle = '#8fa3a8'; g.beginPath(); g.moveTo(205, 276); g.bezierCurveTo(240, 206, 330, 196, 380, 256); g.bezierCurveTo(362, 318, 302, 338, 232, 326); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(40,50,55,.35)'; g.lineWidth = 3; for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(220 + k * 22, 306); g.lineTo(244 + k * 20, 236); g.stroke(); }
  return c;
}
export function penHandCanvas() {
  const c = mk(512, 512), g = c.getContext('2d');
  g.fillStyle = '#20262a'; g.beginPath(); g.moveTo(330, 512); g.bezierCurveTo(330, 420, 360, 360, 420, 340); g.lineTo(512, 330); g.lineTo(512, 512); g.fill();
  g.fillStyle = '#c99d84'; g.beginPath(); g.ellipse(370, 300, 70, 52, -.6, 0, 7); g.fill();
  g.beginPath(); g.roundRect(250, 236, 120, 30, 15); g.fill();                       // index finger along the pen
  g.beginPath(); g.roundRect(285, 268, 90, 28, 14); g.fill();                        // thumb
  g.strokeStyle = '#2a3d8f'; g.lineWidth = 12; g.lineCap = 'round'; g.beginPath(); g.moveTo(170, 300); g.lineTo(360, 220); g.stroke();   // ballpoint
  g.strokeStyle = '#ddd'; g.lineWidth = 4; g.beginPath(); g.moveTo(160, 304); g.lineTo(172, 299); g.stroke();
  return c;
}
