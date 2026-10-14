// 야간 근무 수칙 — a convenience store's night shift on a chest bodycam.
// three.js (720×540, 4:3) → depth of field with autofocus hunting + bloom → recording pass → 1920×1080 with side bars
import * as THREE from 'three';
import { makePost } from '/core/three/post.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { clamp, seg, ss, eo, lerp, hash, vnoise, env } from '/core/lib.js';
import { DUR, T, camKey, speed, FEAR, HOLD, FOCUS, gLight, sensor, doorAngle, clock, battery, CAPS } from './story.js';
import { buildWorld, updateLights } from './world.js';
import { makeFigure, shadowCanvas } from './figure.js';
import * as TX from './tex.js';
import { VHS } from './vhs.js';
import { drawOSD, text as osdText } from './osd.js';
import { drawCaps } from './subs.js';

const Q = new URLSearchParams(location.search), NOSUB = Q.has('nosub'), RAW = Q.has('raw');
for (const f of ["800 40px 'NSans'", "500 30px 'NSans'", "40px 'Pen'", "700 40px 'Mono'"]) await document.fonts.load(f, '야간근무수칙당신은몇번째알바입니까문차임벨정적');

const W = 1920, H = 1080, SW = 720, SH = 540;
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = .95;
document.getElementById('stage').appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0, 0, 0);
scene.fog = new THREE.FogExp2(new THREE.Color(.05, .06, .045), .07);
const HFOV = 85, VFOV = 2 * Math.atan(Math.tan(HFOV / 2 * Math.PI / 180) / (4 / 3)) * 180 / Math.PI;
const camera = new THREE.PerspectiveCamera(VFOV, 4 / 3, .03, 60); camera.rotation.order = 'YXZ'; scene.add(camera);
const post = makePost(renderer, scene, camera, SW, SH, { ssaa: 1, ao: false });
post.bloom.strength = .45; post.bloom.radius = .5; post.bloom.threshold = 1.05;
post.vig.uniforms.amt.value = 0; post.vig.uniforms.contrast.value = 0; post.vig.uniforms.sat.value = .9;
post.dof.maxCoc = 12;
const osdCv = document.createElement('canvas'); osdCv.width = SW; osdCv.height = SH;
const osdTex = new THREE.CanvasTexture(osdCv); osdTex.minFilter = osdTex.magFilter = THREE.LinearFilter; osdTex.generateMipmaps = false;
const vhs = new ShaderPass(VHS);
vhs.uniforms.tOSD.value = osdTex; vhs.uniforms.res.value = [W, H]; vhs.uniforms.src.value = [SW, SH];
vhs.uniforms.barrel.value = .17; vhs.uniforms.vig.value = .5;
if (RAW) { const u = vhs.uniforms; u.sharp.value = 0; u.lumaW.value = .3; u.chromaW.value = .01; u.chromaShift.value = 0; u.gain.value = 0; u.jitter.value = 0; u.barrel.value = 0; u.dropout.value = 0; u.smear.value = 0; }
post.composer.addPass(vhs);

const Wd = buildWorld(scene);
const WALLBASE = (() => { const c = document.createElement('canvas'); c.width = Wd.wallCv.width; c.height = Wd.wallCv.height; c.getContext('2d').drawImage(Wd.wallCv, 0, 0); return c; })();
const TALLY0 = [320, 640];                         // wall px under the sheet
const wallPx = ([px, py]) => new THREE.Vector3(-2.4 - px / 400, 2.6 - py / 400, -.004);
let lastExtra = -1;
function drawWall(extra) {
  if (Math.abs(extra - lastExtra) < 1e-4) return null;
  const g = Wd.wallCv.getContext('2d'); g.drawImage(WALLBASE, 0, 0);
  const tip = TX.drawTallies(g, TALLY0[0], TALLY0[1], extra); Wd.wallTex.needsUpdate = true; lastExtra = extra; return tip;
}
let PENTIP = drawWall(0);

// hands: flat cut-outs in world space, parallel to the surface they touch
const handPlane = (cv, w, h = w) => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: t, transparent: true, alphaTest: .05 })); m.visible = false; scene.add(m); return m; };
const fig = makeFigure(scene);
const wallSh = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.4), new THREE.MeshBasicMaterial({ color: '#000', alphaMap: new THREE.CanvasTexture(shadowCanvas()), transparent: true, depthWrite: false, opacity: 0 }));
wallSh.rotation.y = Math.PI; scene.add(wallSh);
const rag = handPlane(TX.ragHandCanvas(), .42, .84), pen = handPlane(TX.penHandCanvas(), .24);
pen.rotation.y = Math.PI;

// ---------- the chest rig ----------
const nz = (t, f, s) => vnoise(t * f + s * 17.3) - .5;
const STRIDE = .7;
let DIST = null;
{ const dt = 1 / 120, n = Math.ceil(DUR / dt) + 2; DIST = new Float32Array(n);
  for (let k = 1; k < n; k++) { const a = camKey((k - 1) * dt), b = camKey(k * dt); const d = Math.hypot(b[0] - a[0], b[1] - a[1]); DIST[k] = DIST[k - 1] + (d < .3 ? d : 0); } }
const distAt = t => { const f = clamp(t * 120, 0, DIST.length - 1.001), i = Math.floor(f); return lerp(DIST[i], DIST[i + 1], f - i); };
function camPose(t) {
  let [x, z, y, yaw, pitch] = camKey(t), roll = .02;
  const sp = speed(t), amp = clamp(sp / 1.1), ph = distAt(t) / STRIDE * Math.PI, fear = FEAR(t), hold = 1 - HOLD(t);
  // chest mount: the whole torso moves; bounce on every step, sway, a slow breath, tremor that grows with fear
  y += (.045 * amp * (Math.abs(Math.sin(ph)) - .6)) * hold;
  const br = Math.sin(t * Math.PI * 2 * .3) * (1 + fear * .8);
  pitch += (nz(t, .8, 1) * .012 + nz(t, 3.3, 2) * .006 * (1 + 2.5 * fear) + br * .006 + .02 * amp * Math.sin(ph * 2)) * hold;
  yaw += (nz(t, .7, 4) * .016 + nz(t, 3.1, 5) * .006 * (1 + 2.5 * fear) + .025 * amp * Math.sin(ph)) * hold;
  roll += (nz(t, .5, 6) * .03 + .03 * amp * Math.sin(ph) + nz(t, 8, 7) * .004 * fear) * hold;
  y += br * .005 * hold;
  if (t < 1.7) { const k = 1 - ss(seg(t, .6, 1.7)); roll += k * .9 * Math.sin(t * 5); pitch += k * .25 * Math.sin(t * 3.7); }   // clipping it on
  if (t > T.crouch[0] && t < T.crouch[1] + .3) roll += .12 * Math.sin(Math.PI * seg(t, T.crouch[0], T.crouch[1] + .3));
  if (t > T.turn[0] && t < T.turn[1]) { roll += .1 * Math.sin(Math.PI * seg(t, T.turn[0], T.turn[1])); y += .04 * Math.sin(Math.PI * 4 * seg(t, T.turn[0], T.turn[1])); }
  const rx = Math.cos(yaw), rz = -Math.sin(yaw), sway = .02 * amp * Math.sin(ph) * hold;
  return { x: x + rx * sway, y, z: z + rz * sway, yaw, pitch, roll };
}
// what the lens is looking at (m), per shot
function focusD(t) {
  if (t < 4.2) return 3.8; if (t < 13.6) return .28; if (t < 21) return 3.6; if (t < 24.2) return 3.2; if (t < 29) return .85;
  if (t < 31.6) return 4.5; if (t < 36.6) return 2.2; return .36;
}

// ---------- frame ----------
function timeView(t) {   // tears and the final freeze hold an old frame while the picture breaks up
  for (const [a, b] of [T.tear1, T.tear2, T.tear3]) if (t >= a - .08 && t < b) return { tv: a - .1, glitch: clamp(seg(t, a - .08, a + .05) * (1 - seg(t, b - .12, b))) };
  if (t >= T.freeze) return { tv: T.freeze, glitch: .25 + .75 * seg(t, T.freeze + .15, T.black) };
  return { tv: t, glitch: 0 };
}
function render(t) {
  const { tv, glitch } = timeView(t);
  const cp = camPose(tv);
  camera.position.set(cp.x, cp.y, cp.z); camera.rotation.set(cp.pitch, cp.yaw, cp.roll); camera.updateMatrixWorld();
  // lights: the flicker, the aisle light that shudders while something drags, and the fixtures the shadow passes under
  const g = gLight(tv);
  // the thing
  fig.visible = false; let legX = null;
  if (tv >= T.fig1[0] && tv < T.fig1[1]) { fig.visible = true; fig.position.set(6.3, 0, 2.5); fig.pose({ tilt: .35, lean: .12 }); }
  if (tv >= T.fig2[0] && tv < T.fig2[1]) { fig.visible = true; fig.position.set(-.45, 0, -8.35); fig.pose({ tilt: .55, lean: .22 }); }
  if (tv >= T.legs[0] && tv < T.legs[2]) { const u = seg(tv, T.legs[0], T.legs[1]); legX = lerp(-4.4, -3.0, u);
    fig.visible = true; fig.position.set(legX, 0, -3.8); fig.pose({ step: (legX + 4.4) / .42 * Math.PI, walk: u < 1 ? 1 : 0, tilt: .45, lean: .2 }); }
  fig.face(camera);
  const inSh = legX !== null, shX = legX ?? 0, shU = .5;
  updateLights(Wd, g, f => {
    let k = 1;
    if (tv > T.drag[0] && tv < T.silence[1] && f.z < -3.5 && f.x > -1.5 && f.x < 1.5) k *= .75 + .25 * (hash(Math.floor(tv * 18) + f.z) > .25 ? 1 : .2);
    if (inSh && Math.abs(f.z + 4.9) < .8) k *= 1 - .55 * Math.exp(-((f.x - shX) ** 2) / 1.5);
    k *= (f.x < -1.5 && f.z > -3.5) ? .85 : f.z > -5.5 ? .28 : .12;          // night saving: only the counter is fully lit
    return k;
  });
  Wd.shadow.material.opacity = inSh ? .78 : 0;
  Wd.shadow.position.set(shX, .004, -3.3); Wd.shadow.scale.set(.5, 2.4, 1);   // its shadow, thrown toward the camera by the lights behind it
  // its shadow on the wall, from behind the operator, leaning in over the marks
  { const u = seg(tv, T.wallShadow[0], T.wallShadow[1]); wallSh.material.opacity = tv >= T.wallShadow[0] ? .82 * ss(u) : 0;
    wallSh.position.set(-2.97, .57 - .25 * (1 - eo(u)), -.009); wallSh.scale.setScalar(1 + .1 * u); }   // head lands over rule 4 and the marks
  // door, sensor, fridge fog
  Wd.door.rotation.y = -doorAngle(tv);
  const sk = sensor(tv); Wd.sensorM.color.setRGB(sk * 9, sk * .35, sk * .2); Wd.sensorL.intensity = sk * 1.4;
  TX.drawFog(Wd.fogCv, tv, T); Wd.fogTex.needsUpdate = true;
  // rag hand: rises toward the print, stops, trembles, goes back down
  { const up = ss(seg(tv, T.hand[0], T.hand[0] + .6)) * (1 - ss(seg(tv, T.hand[1] - .4, T.hand[1]))); rag.visible = up > .01;
    rag.position.set(.1 + nz(tv, 7, 9) * .01 * up, lerp(.45, 1.0, up) + nz(tv, 9, 3) * .007 * up, -8.45); }
  // pen hand: in from the lower right, draws the new stroke, leaves
  { const inn = ss(seg(tv, T.pen[0], T.pen[0] + .45)) * (1 - ss(seg(tv, T.pen[1] - .35, T.pen[1] + .1)));
    const extra = ss(seg(tv, T.pen[0] + .45, T.pen[1] - .4)); const tip = drawWall(extra) || PENTIP; PENTIP = tip;
    const wp = wallPx([tip.x, tip.y]); pen.visible = inn > .01;
    pen.position.set(wp.x - .0427 - (1 - inn) * .14, wp.y + .0216 - (1 - inn) * .1, -.03); }
  // depth of field: autofocus with hunting
  post.dof.focus = FOCUS(tv, focusD(tv)); post.dof.aper = .7;
  // recording pass
  const u = vhs.uniforms; u.frame.value = Math.floor(t * 30);
  let dm = 0; for (let k = 0; k < 20; k++) dm += (1 - gLight(tv - k * .03)) * Math.exp(-k * .03 / .45) / 9;
  const awb = ss(seg(t, T.rollIn, T.rollIn + 1.4));
  u.tint.value = [lerp(.8, .96, awb), lerp(.95, 1.02, awb), lerp(1.4, .9, awb) * (1 + .03 * Math.sin(t * .37))];
  u.expo.value = (1 + .5 * dm) * (.98 + .02 * Math.sin(t * .5)) * (tv > 31.9 && tv < 36.4 ? .9 : 1);
  u.gain.value = .035 + .09 * dm + .015 * FEAR(tv) + (tv > 31.9 && tv < 36.4 ? .07 : 0);
  u.glitch.value = glitch; u.track.value = glitch * .25;
  u.off.value = t < T.rollIn ? 1 - ss(seg(t, T.rollIn - .2, T.rollIn)) : t >= T.black ? 1 : 0;
  u.roll.value = t < T.rollIn + .3 ? (1 - seg(t, T.rollIn, T.rollIn + .3)) * .3 : 0;
  // OSD
  drawOSD(osdCv, { hide: t < T.rollIn - .1 || t >= T.black, t, rec: t < T.freeze, cam: 'CAM-03', clock: clock(t < T.freeze ? t : T.freeze), date: '2026.10.14', bat: battery(t),
    title: t >= T.title[0] && t < T.title[1] ? '야간 근무 수칙' : null, titleN: Math.floor((t - T.title[0]) * 5) });
  osdTex.needsUpdate = true;
  post.composer.render();
  // overlay: captions, then STOP on black
  ox.clearRect(0, 0, W, H);
  if (!NOSUB) drawCaps(ox, CAPS, t);
  if (t >= T.black) { ox.fillStyle = '#f4f4ee'; ox.fillRect(240 + 100, 92, 36, 36); osdText(ox, 'STOP', 240 + 152, 90, 6); }
}
const ov = document.getElementById('ov'), ox = ov.getContext('2d');

// ---------- events for the mix ----------
const EV = [];
{ let last = 0; for (let t = 0; t < DUR; t += 1 / 120) { const n = Math.floor(distAt(t) / STRIDE); if (n > last) { last = n; EV.push({ t, type: 'step', v: clamp(speed(t) / 1.1, .3, 1) }); } } }
for (const k of ['chime0', 'chime1', 'chime2']) EV.push({ t: T[k], type: 'chime' });
EV.push({ t: T.door[0], type: 'doorOpen', d: T.door[1] - T.door[0] }, { t: T.doorClose[0], type: 'doorClose', d: T.doorClose[1] - T.doorClose[0] });
for (const k of ['tear1', 'tear2', 'tear3']) EV.push({ t: T[k][0] - .08, type: 'tear', d: T[k][1] - T[k][0] + .08 });
EV.push({ t: T.freeze, type: 'freeze', d: T.black - T.freeze }, { t: .05, type: 'boot' }, { t: .7, type: 'velcro' });
for (const a of [.6, 4.95, 14.55, 21.05, 29.05, 37.75]) EV.push({ t: a, type: 'af' });
EV.push({ t: T.print1, type: 'print' }, { t: T.print2, type: 'print' }, { t: T.hand[0], type: 'cloth', v: .6 }, { t: T.hand[1] - .4, type: 'cloth', v: .4 });
EV.push({ t: T.flick, type: 'flick' }, { t: T.flick + .26, type: 'flick' }, { t: T.flick + .44, type: 'flick' });
EV.push({ t: T.crouch[0], type: 'crouch' }, { t: T.turn[0], type: 'knees', d: T.turn[1] - T.turn[0] });
EV.push({ t: T.pen[0] + .45, type: 'pen', d: T.pen[1] - .4 - T.pen[0] - .45 });
for (const [t, v] of [[4.0, .7], [13.5, .6], [21.1, .5], [27.8, .7], [29.1, .5]]) EV.push({ t, type: 'cloth', v });
EV.push({ t: T.hold1[0], type: 'hold', d: T.hold1[1] - T.hold1[0] }, { t: T.silence[0], type: 'silence', d: T.silence[1] - T.silence[0] });
EV.push({ t: T.drag[0], type: 'drag', d: T.drag[1] - T.drag[0], peak: (T.shadow[0] + T.shadow[1]) / 2 });
EV.push({ t: T.crouch[1], type: 'under', d: T.turn[0] - T.crouch[1] }, { t: T.silence[0] - .35, type: 'fridgeOff' }, { t: T.fridgeOn, type: 'fridgeOn' });
EV.push({ t: T.door[0], type: 'outside', d: T.doorClose[1] - T.door[0] }, { t: T.black + .05, type: 'stop' });
EV.push({ t: T.fig2[0], type: 'drone2' }, { t: T.wallShadow[0], type: 'inhale' }, { t: 24.95, type: 'knock' }, { t: 25.35, type: 'knock' });
EV.sort((a, b) => a.t - b.t);

// texts on screen for the reading-time check (boxes are approximate, in 1920×1080 pixels)
window.TEXTS = (t) => {
  const o = [];
  if (t >= T.sheet[0] + .6 && t < 13.5) o.push({ id: 'sheet', text: '야간 근무 수칙 1. 새벽 2시 이후 들어오는 손님에게 “어서오세요”라고 하지 마세요. 2. 냉장고 유리에 손자국이 생기면 닦지 마세요. 3. 발소리가 질질 끌리면 계산대 아래로 숨으세요.', x0: 330, y0: 60, x1: 1590, y1: 1000 });
  if (t >= T.read4[0] && t < T.freeze) o.push({ id: 'rule4', text: '4. 당신은 몇 번째 알바입니까?', x0: 330, y0: 220, x1: 1590, y1: 520 });
  return o;
};
window.DUR = DUR; window.EV = EV; window.render = render; window.CAPS = CAPS;
window.dbg = { camera, scene, post, vhs, Wd, camPose };
render(0);
window.READY = true;
