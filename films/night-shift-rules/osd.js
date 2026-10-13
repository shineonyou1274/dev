// Bodycam OSD adapted from the library's backrooms demo: hand-made 5×7 bitmap font; Korean title drawn small and enlarged pixel by pixel.
// 摄像机 OSD：自制 5×7 点阵字体（REC、电量、时间码、日期、字幕机片名）
// 画在 720×540 的"磁带空间"画布上，由 VHS 着色器合成进信号（所以也吃色度渗色和跟踪抖动）
const G = {
  '0': '01110 10001 10011 10101 11001 10001 01110', '1': '00100 01100 00100 00100 00100 00100 01110',
  '2': '01110 10001 00001 00010 00100 01000 11111', '3': '11111 00010 00100 00010 00001 10001 01110',
  '4': '00010 00110 01010 10010 11111 00010 00010', '5': '11111 10000 11110 00001 00001 10001 01110',
  '6': '00110 01000 10000 11110 10001 10001 01110', '7': '11111 00001 00010 00100 01000 01000 01000',
  '8': '01110 10001 10001 01110 10001 10001 01110', '9': '01110 10001 10001 01111 00001 00010 01100',
  'A': '01110 10001 10001 11111 10001 10001 10001', 'B': '11110 10001 10001 11110 10001 10001 11110',
  'C': '01110 10001 10000 10000 10000 10001 01110', 'D': '11100 10010 10001 10001 10001 10010 11100',
  'E': '11111 10000 10000 11110 10000 10000 11111', 'F': '11111 10000 10000 11110 10000 10000 10000',
  'G': '01110 10001 10000 10111 10001 10001 01111', 'H': '10001 10001 10001 11111 10001 10001 10001',
  'I': '01110 00100 00100 00100 00100 00100 01110', 'J': '00111 00010 00010 00010 00010 10010 01100',
  'K': '10001 10010 10100 11000 10100 10010 10001', 'L': '10000 10000 10000 10000 10000 10000 11111',
  'M': '10001 11011 10101 10101 10001 10001 10001', 'N': '10001 10001 11001 10101 10011 10001 10001',
  'O': '01110 10001 10001 10001 10001 10001 01110', 'P': '11110 10001 10001 11110 10000 10000 10000',
  'Q': '01110 10001 10001 10001 10101 10010 01101', 'R': '11110 10001 10001 11110 10100 10010 10001',
  'S': '01111 10000 10000 01110 00001 00001 11110', 'T': '11111 00100 00100 00100 00100 00100 00100',
  'U': '10001 10001 10001 10001 10001 10001 01110', 'V': '10001 10001 10001 10001 10001 01010 00100',
  'W': '10001 10001 10001 10101 10101 10101 01010', 'X': '10001 10001 01010 00100 01010 10001 10001',
  'Y': '10001 10001 10001 01010 00100 00100 00100', 'Z': '11111 00001 00010 00100 01000 10000 11111',
  ':': '00000 01100 01100 00000 01100 01100 00000', '.': '00000 00000 00000 00000 00000 01100 01100',
  '-': '00000 00000 00000 11111 00000 00000 00000', '/': '00001 00010 00010 00100 01000 01000 10000',
  '×': '00000 10001 01010 00100 01010 10001 00000', ' ': '00000 00000 00000 00000 00000 00000 00000',
  '(': '00010 00100 01000 01000 01000 00100 00010', ')': '01000 00100 00010 00010 00010 00100 01000',
};
const ROWS = {}; for (const k in G) ROWS[k] = G[k].split(' ');
// s = 点阵像素尺寸；描边 = 1 个点阵像素的黑边（OSD 字符的典型做法）
export function text(x, str, px, py, s, col = '#f4f4ee', outline = true) {
  const draw = (ox, oy, c) => {
    x.fillStyle = c; let cx = px;
    for (const ch of str) {
      const g = ROWS[ch] || ROWS[' '];
      for (let r = 0; r < 7; r++) for (let q = 0; q < 5; q++) if (g[r][q] === '1') x.fillRect(cx + q * s + ox, py + r * s + oy, s, s);
      cx += 6 * s;
    }
  };
  if (outline) for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]]) draw(ox * Math.max(1, s * .5), oy * Math.max(1, s * .5), 'rgba(0,0,0,.85)');
  draw(0, 0, col);
  return str.length * 6 * s;
}
export const width = (str, s) => str.length * 6 * s - s;

// one frame of the bodycam OSD. o = {hide, rec, t, clock, date, bat, cam, title, titleN, stop}
const PX = document.createElement('canvas'); PX.width = 260; PX.height = 40;
function pixelKo(x, str, cx, cy, scale) {      // Korean title: draw at 20 px, enlarge without smoothing, black outline
  const g = PX.getContext('2d'); g.clearRect(0, 0, PX.width, PX.height);
  g.font = "800 20px 'NSans'"; g.textBaseline = 'middle'; const w = Math.ceil(g.measureText(str).width) + 4;
  for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { g.fillStyle = '#000'; g.fillText(str, 2 + ox, 20 + oy); }
  g.fillStyle = '#fbfbf2'; g.fillText(str, 2, 20);
  x.imageSmoothingEnabled = false; x.drawImage(PX, 0, 0, w, 40, cx - w * scale / 2, cy - 20 * scale, w * scale, 40 * scale); x.imageSmoothingEnabled = true;
}
export function drawOSD(cv, o) {
  const x = cv.getContext('2d'), W = cv.width, H = cv.height;
  x.clearRect(0, 0, W, H);
  if (o.hide) return;
  const s = 3;
  if (o.rec) {
    x.fillStyle = 'rgba(0,0,0,.85)'; x.beginPath(); x.arc(58, 55, 10, 0, 7); x.fill();
    if (Math.floor(o.t * 1.6) % 2 === 0) { x.fillStyle = '#e8261c'; x.beginPath(); x.arc(58, 55, 8.5, 0, 7); x.fill(); }
    text(x, 'REC', 76, 45, s);
  }
  if (o.stop) { x.fillStyle = '#f4f4ee'; x.fillRect(50, 46, 18, 18); text(x, 'STOP', 76, 45, s); }
  if (o.bat != null) {
    const bx = W - 118, by = 44;
    x.fillStyle = 'rgba(0,0,0,.85)'; x.fillRect(bx - 2, by - 2, 58, 26); x.fillRect(bx + 54, by + 5, 8, 12);
    x.fillStyle = '#f4f4ee'; x.fillRect(bx, by, 54, 22); x.fillRect(bx + 54, by + 7, 5, 8);
    x.fillStyle = '#111'; x.fillRect(bx + 3, by + 3, 48, 16);
    x.fillStyle = '#f4f4ee'; for (let k = 0; k < o.bat; k++) x.fillRect(bx + 5 + k * 16, by + 5, 12, 12);
  }
  if (o.cam) text(x, o.cam, 48, H - 58, s);
  if (o.clock) {
    const w1 = width(o.clock, s), w2 = width(o.date, s);
    text(x, o.clock, W - 50 - w1, H - 92, s);
    text(x, o.date, W - 50 - w2, H - 58, s);
  }
  if (o.title) {
    const n = Math.max(0, Math.min([...o.title].length, o.titleN ?? 99));
    if (n > 0) pixelKo(x, [...o.title].slice(0, n).join(''), W / 2, H * .42, 3);
  }
}
