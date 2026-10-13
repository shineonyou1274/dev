// SDH captions, broadcast closed-caption look: white monospace on a black box per row, inside the 4:3 frame.
export function drawCaps(x, caps, t) {
  const c = caps.find(c => t >= c.t0 && t < c.t1); if (!c) return;
  const fs = 44, rh = 58, cx = 960, y = 1080 - 226;
  x.font = `700 ${fs}px 'Mono'`; x.textBaseline = 'middle';
  const w = x.measureText(c.text).width + fs * 1.2, x0 = Math.round(cx - w / 2);
  x.fillStyle = '#000'; x.fillRect(x0, y - rh / 2, w, rh);
  x.fillStyle = '#f2f2f2'; x.fillText(c.text, x0 + fs * .6, y + 2);
}
