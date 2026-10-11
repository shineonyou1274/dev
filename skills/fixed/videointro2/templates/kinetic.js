// kinetic.js — shared helpers for beat-locked kinetic-typography promos (DOM + seek(t), motion blur from subframes).
// Every function is a pure function of time; no state carries between frames.
const K = (() => {
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lin = (t, a, b) => clamp((t - a) / (b - a));
  const ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  const eout = x => 1 - Math.pow(1 - x, 4);
  const ein = x => x * x * x;
  const hash = i => { const s = Math.sin(i * 127.1 + 11.7) * 43758.5453; return s - Math.floor(s); };
  function spr(t, t0, f = 2.4, z = .45) {                       // damped spring step, 0 before t0
    const u = t - t0; if (u <= 0) return 0;
    const w = 2 * Math.PI * f, wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * u) * (Math.cos(wd * u) + z * w / wd * Math.sin(wd * u));
  }
  // strongest decaying impulse from a list of hit times (for punch-ins, shake, RGB split)
  function imp(t, hits, tau = .12) {
    let v = 0; for (const h of hits) { if (h > t) break; v = Math.max(v, Math.exp(-(t - h) / tau)); } return v;
  }
  const count = (t, hits) => { let n = 0; for (const h of hits) { if (h <= t) n++; else break; } return n; };
  const el = (tag, css, html = '') => { const e = document.createElement(tag); e.style.cssText = css; e.innerHTML = html; return e; };
  function letters(parent, text) {
    parent.innerHTML = '';
    return [...text].map(c => { const s = document.createElement('span'); s.style.display = 'inline-block'; s.textContent = c === ' ' ? ' ' : c; parent.appendChild(s); return s; });
  }
  function rgb(e, d) {                                          // chromatic split on text
    e.style.textShadow = d > .3 ? `${-d}px 0 rgba(215,255,0,.8), ${d}px 0 rgba(255,255,255,.55)` : (e.dataset.shadow || 'none');
  }
  // entrance / exit transforms for a full-frame shot. kind: slam | whipL | whipR | snap | drop | rise | cut
  function enter(kind, u) {                                      // u = seconds since shot start
    const p = kind === 'snap' || kind === 'drop' ? spr(u, 0, 3, .42) : eout(clamp(u / .16));
    switch (kind) {
      case 'slam': return `scale(${1 + 1.6 * (1 - eout(clamp(u / .13)))})`;
      case 'whipL': return `translateX(${(1 - p) * -2300}px)`;
      case 'whipR': return `translateX(${(1 - p) * 2300}px)`;
      case 'snap': return `scale(${.25 + .75 * p})`;
      case 'drop': return `translateY(${(1 - p) * -1300}px)`;
      case 'rise': return `translateY(${(1 - p) * 1300}px)`;
      default: return '';
    }
  }
  function exit(kind, v) {                                       // v = seconds until shot end (>=0)
    const q = ein(clamp(1 - v / .12));
    switch (kind) {
      case 'whipL': return `translateX(${q * -2300}px)`;
      case 'whipR': return `translateX(${q * 2300}px)`;
      case 'zoom': return `scale(${1 + q * 3})`;
      case 'up': return `translateY(${q * -1300}px)`;
      default: return '';
    }
  }
  // shots: [{t0, t1, el, in, out, update(u, t)}]; visibility + transitions
  function shots(list, t) {
    for (const s of list) {
      const on = t >= s.t0 && t < s.t1;
      s.el.style.visibility = on ? 'visible' : 'hidden';
      if (!on) continue;
      s.el.style.transform = `${enter(s.in || 'cut', t - s.t0)} ${exit(s.out || 'cut', s.t1 - t)}`;
      s.update && s.update(t - s.t0, t);
    }
  }
  // stagger per-letter slam: each letter scales down from big + fades in
  function slamLetters(spans, t, t0, step, big = 3) {
    spans.forEach((s, i) => {
      const u = t - (t0 + i * step), p = u < 0 ? 0 : eout(clamp(u / .12));
      s.style.opacity = u < 0 ? 0 : 1; s.style.transform = `scale(${1 + (big - 1) * (1 - p)})`;
    });
  }
  function dropLetters(spans, t, t0, step) {
    spans.forEach((s, i) => {
      const p = spr(t, t0 + i * step, 3.2, .4);
      s.style.opacity = t < t0 + i * step ? 0 : 1; s.style.transform = `translateY(${(1 - p) * -260}px)`;
    });
  }
  return { clamp, lin, ease, eout, ein, hash, spr, imp, count, el, letters, rgb, enter, exit, shots, slamLetters, dropLetters };
})();
