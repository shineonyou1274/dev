// 야간 근무 수칙 — timeline (single source of truth): events, camera keyframes, focus / fear / hold curves, OSD clock
import { clamp, ss } from '/core/lib.js';

export const DUR = 45;
export const T = {
  on: 0.0, rollIn: 0.6, title: [1.2, 4.0], chime0: 2.8,
  sheet: [5.0, 13.5], rules: [[5.6, 8.6], [8.6, 11.2], [11.2, 13.5]],
  tear1: [14.5, 14.9], chime1: 15.2, door: [15.4, 16.8], hold1: [16.8, 19.0], doorClose: [19.0, 20.4],
  tear2: [21.0, 21.4], print1: 24.8, print2: 25.6, hand: [26.2, 27.6], back: [27.8, 29.0],
  tear3: [29.0, 29.4], drag: [29.4, 35.0], flick: 30.6, crouch: [31.2, 31.9], shadow: [33.2, 34.6], silence: [35.0, 36.2],
  fridgeOn: 36.2, turn: [36.4, 37.8], read4: [37.8, 42.4], pen: [41.6, 43.0], chime2: 43.4, freeze: 44.0, black: 44.5,
};
// recording clock: real seconds after each tear, offset to the time the OSD shows
const CLOCK = [[0, 1 * 3600 + 57 * 60 + 8], [T.tear1[1], 2 * 3600 + 14 * 60 + 3], [T.tear2[1], 3 * 3600 + 2 * 60 + 41], [T.tear3[1], 3 * 3600 + 47 * 60 + 12]];
export function clock(t) {
  let base = CLOCK[0]; for (const c of CLOCK) if (t >= c[0]) base = c;
  const s = Math.floor(base[1] + (t - base[0])), p = n => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}`;
}
export const battery = t => (t < T.tear2[0] ? 3 : t < T.tear3[0] ? 2 : 1);

// ---------- camera keyframes: [t, x, z, y(height), yaw, pitch] — eased between keys ----------
// yaw: 0 looks -z (toward the fridges), -π/2 looks +x, -π looks +z (front wall with the sheet)
const P0 = [-3.1, -2.2];                     // behind the counter
const YDOOR = -2.18;                         // facing the door (the sheet is off to the right, out of frame)
const K = [
  [0.0, ...P0, 1.32, YDOOR - .35, -.35],
  [1.7, ...P0, 1.32, YDOOR, -.02],           // camera clipped onto the vest settles
  [4.0, ...P0, 1.32, YDOOR, -.02],
  [5.0, -3.2, -.27, 1.335, -Math.PI, 0],     // step to the sheet, lens parallel to the page
  [13.5, -3.2, -.27, 1.33, -Math.PI, 0],
  [14.5, ...P0, 1.32, YDOOR + .15, -.02],
  [14.5001, ...P0, 1.32, YDOOR, -.02],       // after the tear
  [21.0, ...P0, 1.32, YDOOR + .03, -.02],
  [21.0001, -1.5, -3.9, 1.32, -.5, -.03],    // after the tear: at the counter end, turning into the aisle
  [22.0, -.15, -4.7, 1.32, -.02, -.02],
  [24.0, 0, -8.05, 1.32, 0, -.02],
  [26.2, 0, -8.1, 1.31, 0, -.03],
  [27.8, 0, -8.1, 1.31, 0, -.03],
  [29.0, 0, -7.2, 1.32, .04, -.02],
  [29.0001, ...P0, 1.32, -.95, -.02],        // after the tear: back behind the counter, facing the aisle
  [31.2, ...P0, 1.32, -.95, -.02],
  [31.9, -2.72, -1.45, .5, .06, .04],         // crouch under the counter top, facing the open end of the counter
  [36.4, -2.72, -1.45, .5, .06, .04],
  [37.8, -3.2, -.34, 1.05, -Math.PI, 0],     // turn around on the knees, shuffle to the wall below the sheet
  [45.0, -3.2, -.34, 1.05, -Math.PI, 0],
];
const lerp = (a, b, k) => a + (b - a) * k;
export function camKey(t) {
  if (t <= K[0][0]) return K[0].slice(1);
  for (let i = 1; i < K.length; i++) if (t <= K[i][0]) {
    const a = K[i - 1], b = K[i], k = ss(clamp((t - a[0]) / (b[0] - a[0])));
    return a.slice(1).map((v, j) => lerp(v, b[j + 1], k));
  }
  return K[K.length - 1].slice(1);
}
// walking speed (for gait) from keyframe positions
export function speed(t) { const a = camKey(t - .1), b = camKey(t + .1); return Math.hypot(b[0] - a[0], b[1] - a[1]) / .2; }

// ---------- fear: tremor amplitude ----------
export function FEAR(t) {
  const bump = (a, b, c, d) => clamp((t - a) / (b - a)) * (1 - clamp((t - c) / (d - c)));
  return Math.max(.08, .5 * bump(15.0, 15.8, 20.4, 21.0), .7 * bump(24.8, 25.8, 28.8, 29.0), bump(29.6, 31.0, 36.2, 38.5) * .95, .5 * bump(41.6, 42.4, 44, 45));
}
// held breath: 1 = all handheld motion frozen
export function HOLD(t) {
  const w = (a, b) => clamp((t - a + .12) / .12) * (1 - clamp((t - b) / .35));
  return Math.max(w(T.hold1[0], T.hold1[1]), w(T.shadow[0] - .3, T.silence[1]), w(T.pen[0] + .3, T.pen[1] - .2) * .7);
}
// autofocus distance (m) with hunting: blur when pulled near
export function FOCUS(t, d) {
  const hunt = (t0, dur) => { const u = (t - t0) / dur; if (u < 0 || u > 1) return 0; return Math.sin(u * Math.PI * 2.2) * (1 - u) * .7; };
  return Math.max(.08, d * (1 - hunt(4.95, .7) - hunt(37.75, .8) - hunt(.6, 1.0) - hunt(14.55, .5) - hunt(21.05, .5) - hunt(29.05, .5)));
}

// ---------- lights ----------
export function gLight(t) {           // global light: the flicker at 30.6, short blackouts
  let g = 1;
  [T.flick, T.flick + .26, T.flick + .44].forEach((f, i) => { if (t > f && t < f + .1) g = .05; else if (t >= f + .1 && t < f + .22) g = Math.min(g, .6 + .4 * (t - f - .1) / .12); });
  return g;
}
// red door sensor: lit when "someone" comes in
export function sensor(t) { return [T.chime0, T.chime1, T.chime2].reduce((m, c) => Math.max(m, t >= c && t < c + 1.6 ? (Math.floor((t - c) * 6) % 2 ? .35 : 1) : 0), 0); }
export const doorAngle = t => -1.15 * ss(clamp((t - T.door[0]) / (T.door[1] - T.door[0]))) * (1 - ss(clamp((t - T.doorClose[0]) / (T.doorClose[1] - T.doorClose[0]))));

// ---------- captions (SDH, Korean) ----------
export const CAPS = [
  { t0: 2.85, t1: 4.75, text: '[문 차임벨]' },
  { t0: 15.25, t1: 17.2, text: '[문 차임벨]' },
  { t0: 17.2, t1: 19.3, text: '[발소리 없음]' },
  { t0: 29.6, t1: 31.6, text: '[질질 끄는 발소리]' },
  { t0: 35.0, t1: 36.2, text: '[정적]' },
  { t0: 43.45, t1: 44.5, text: '[문 차임벨]' },
];

// ---------- the sheet (what is printed) ----------
export const SHEET = {
  top: '근무자는 반드시 숙지할 것',
  title: '야간 근무 수칙',
  doc: '점포 운영 지침 7-2 (개정 11)',
  rules: [
    ['1. 새벽 2시 이후 들어오는 손님에게', '    “어서오세요”라고 하지 마세요.'],
    ['2. 냉장고 유리에 손자국이 생기면', '    닦지 마세요.'],
    ['3. 발소리가 질질 끌리면', '    계산대 아래로 숨으세요.'],
  ],
  foot: '위 수칙을 지키지 않아 발생한 일은 근무자 책임입니다.',
  sign: '확인 서명: ____________',
  hand: '4. 당신은 몇 번째 알바입니까?',
};
