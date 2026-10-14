// the store: an 8 × 9 m convenience store at night. Flat fluorescent light, no shadows; the only saturated colour is the door sensor.
import * as THREE from 'three';
import { mulberry } from '/core/lib.js';
import * as TX from './tex.js';

export const RH = 2.7;                                   // ceiling height
const lam = (o) => new THREE.MeshLambertMaterial(o);
const box = (scene, mat, x0, x1, y0, y1, z0, z1) => { const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); scene.add(m); return m; };
const plane = (scene, mat, w, h, x, y, z, ry = 0, rx = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.set(rx, ry, 0, 'YXZ'); scene.add(m); return m; };

// fluorescent fixtures (x, z); 'dead' one hangs over the aisle
export const FIX = [];
for (const z of [-1.3, -3.1, -4.9, -6.7, -8.3]) for (const x of [-2.9, -1.0, 1.0, 2.9]) FIX.push({ x, z, kind: ((x === 1.0 && z === -6.7) || (Math.abs(x) === 1.0 && z === -8.3)) ? 'dead' : 'ok' });   // the far aisle end is dark

export function buildWorld(scene) {
  const W = {};
  // floor, ceiling
  const fl = TX.floorTex(); fl.repeat.set(8 / .6, 9 / .6);
  plane(scene, lam({ map: fl }), 8, 9, 0, 0, -4.5, 0, -Math.PI / 2);
  const ce = TX.ceilTex(); ce.repeat.set(8 / .6, 9 / .6);
  plane(scene, lam({ map: ce }), 8, 9, 0, RH, -4.5, 0, Math.PI / 2);
  const wallM = lam({ map: TX.plainTex('#cfd8c4', 2) });
  plane(scene, wallM, 9, RH, -4, RH / 2, -4.5, Math.PI / 2);            // left
  plane(scene, wallM, 9, RH, 4, RH / 2, -4.5, -Math.PI / 2);            // right
  plane(scene, wallM, 8, RH, 0, RH / 2, -9);                             // back (behind fridges)
  // front: a solid panel (left) with the sheet, then the glass shop front with the door
  W.wallCv = TX.wallCanvas(); W.wallTex = new THREE.CanvasTexture(W.wallCv); W.wallTex.colorSpace = THREE.SRGBColorSpace; W.wallTex.anisotropy = 4;
  plane(scene, lam({ map: W.wallTex }), 1.6, 2.6, -3.2, 1.3, -.001, Math.PI);
  plane(scene, lam({ color: '#5f6b58' }), 6.4, .1, .8, RH - .05, -.02, Math.PI);       // header beam over the glass
  const glassM = new THREE.MeshLambertMaterial({ color: '#2a3633', transparent: true, opacity: .32, depthWrite: false });
  plane(scene, glassM, 3.2, 2.55, -.8, 1.3, -.002, Math.PI);             // glass left of the door
  plane(scene, glassM, 2.2, 2.55, 2.9, 1.3, -.002, Math.PI);             // glass right of the door
  const alu = lam({ color: '#9aa19b' });
  for (const x of [-2.4, .8, 1.8, 4]) box(scene, alu, x - .03, x + .03, 0, 2.6, -.04, .02);
  box(scene, alu, -2.4, 4, 0, .12, -.04, .02);
  // the door: hinged at x = .8, swings inward
  W.door = new THREE.Group(); W.door.position.set(.8, 0, -.01); scene.add(W.door);
  const dg = new THREE.Mesh(new THREE.PlaneGeometry(.94, 2.2), glassM); dg.position.set(.5, 1.15, 0); dg.rotation.y = Math.PI; W.door.add(dg);
  for (const [x0, x1, y0, y1] of [[0, .05, 0, 2.25], [.95, 1, 0, 2.25], [0, 1, 0, .1], [0, 1, 2.2, 2.25], [.02, .98, 1.0, 1.06]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, .04), alu); b.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0); W.door.add(b); }
  const handle = new THREE.Mesh(new THREE.BoxGeometry(.03, .5, .05), lam({ color: '#8b918c' })); handle.position.set(.86, 1.05, -.05); W.door.add(handle);
  // door sensor (the signal colour) above the door
  W.sensorM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0, 0, 0) });
  box(scene, lam({ color: '#d9dbd2' }), 1.18, 1.42, 2.36, 2.46, -.12, -.02);
  W.sensor = new THREE.Mesh(new THREE.SphereGeometry(.018, 12, 8), W.sensorM); W.sensor.position.set(1.3, 2.34, -.11); scene.add(W.sensor);
  W.sensorL = new THREE.PointLight('#ff2a1a', 0, 6, 2); W.sensorL.position.set(1.3, 2.3, -.2); scene.add(W.sensorL);
  // outside: wet dark pavement, a far sodium lamp
  const oc = document.createElement('canvas'); oc.width = 512; oc.height = 256; const og = oc.getContext('2d');
  og.fillStyle = '#05080a'; og.fillRect(0, 0, 512, 256);
  const sg = og.createRadialGradient(330, 80, 2, 330, 80, 190); sg.addColorStop(0, 'rgba(190,175,120,.9)'); sg.addColorStop(1, 'rgba(0,0,0,0)'); og.fillStyle = sg; og.fillRect(0, 0, 512, 256);
  og.fillStyle = 'rgba(52,56,50,1)'; og.fillRect(0, 170, 512, 86); og.fillStyle = 'rgba(160,150,110,.35)'; og.fillRect(250, 170, 160, 86);   // lamplight on the wet pavement
  const ot = new THREE.CanvasTexture(oc); ot.colorSpace = THREE.SRGBColorSpace;
  plane(scene, new THREE.MeshBasicMaterial({ map: ot, fog: false }), 30, 10, 1, 3, 9, Math.PI);
  plane(scene, lam({ color: '#1c201e' }), 30, 9, 1, -.01, 4.5, 0, -Math.PI / 2);
  { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
    const gr = g.createRadialGradient(128, 30, 4, 128, 40, 140); gr.addColorStop(0, '#b8a46e'); gr.addColorStop(.5, '#4a4232'); gr.addColorStop(1, '#0a0a08');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    plane(scene, new THREE.MeshBasicMaterial({ map: t, fog: false }), 9, 4.5, 14.3, 2.2, 6.5, Math.atan2(-17.4, -8.7)); }

  // counter (front face toward the store), POS, cigarette wall behind the operator
  const wood = lam({ map: TX.plainTex('#a59a80', 4, 5000) }), dark = lam({ color: '#3e4440' });
  box(scene, wood, -2.4, -1.8, 0, .98, -3.4, -1.0);
  box(scene, lam({ color: '#d8d6c8' }), -3.0, -1.75, .98, 1.02, -3.45, -.95);                  // top overhangs the operator's side
  box(scene, lam({ color: '#4a4c44' }), -2.95, -2.42, .7, .72, -3.4, -1.0);                    // under-counter shelf
  box(scene, dark, -2.25, -1.95, 1.02, 1.3, -2.2, -1.9);                                 // POS screen
  box(scene, lam({ color: '#5a8a6a', emissive: '#203a2a' }), -2.24, -2.23, 1.06, 1.26, -2.18, -1.92);
  for (const [x0, x1, y1, z0, z1, col] of [[-2.3, -2.12, 1.1, -2.75, -2.55, '#2f3431'], [-2.2, -1.9, 1.18, -1.55, -1.2, '#9fa88e'], [-2.38, -2.15, 1.14, -3.2, -2.95, '#d8d8cc'],
    [-2.0, -1.84, 1.12, -2.95, -2.75, '#7d8a74'], [-2.35, -2.1, 1.06, -1.85, -1.62, '#cfd3bf']]) box(scene, lam({ color: col }), x0, x1, 1.02, y1, z0, z1);
  const gum = TX.productTex(77); gum.wrapS = THREE.RepeatWrapping; gum.repeat.set(1, 1);
  plane(scene, lam({ map: gum }), .35, .16, -1.899, 1.1, -1.38, Math.PI / 2);
  box(scene, dark, -4, -3.75, 0, .9, -3.4, -1.0);                                       // low cabinet behind
  const cig = TX.productTex(91); cig.wrapS = THREE.RepeatWrapping; cig.repeat.set(3, 1);
  for (let k = 0; k < 4; k++) plane(scene, lam({ map: cig }), 2.4, .3, -3.76, 1.05 + k * .33, -2.2, Math.PI / 2);
  box(scene, dark, -4, -3.78, .9, 2.4, -3.4, -1.0);
  // under the counter, the operator's side: shelves with bags and receipt rolls
  box(scene, lam({ color: '#6c6a5c' }), -2.42, -2.40, .05, .95, -3.4, -1.0);
  for (const [y, z] of [[.35, -1.4], [.35, -2.6], [.7, -1.9], [.7, -3.0]]) box(scene, lam({ color: '#cfccb8' }), -2.62, -2.42, y - .12, y + .1, z - .2, z + .2);

  // two gondolas forming the aisle (x ∈ [-0.6, 0.6]) and wall shelves
  const R = mulberry(5);
  const gondola = (x0, x1, z0, z1, h) => {
    box(scene, lam({ color: '#5f6b58' }), x0, x1, 0, .12, z0, z1);
    box(scene, lam({ color: '#c3c8b6' }), (x0 + x1) / 2 - .03, (x0 + x1) / 2 + .03, .12, h, z0, z1);
    for (let k = 0; k < 4; k++) { const y = .18 + k * .34;
      for (const side of [-1, 1]) { const t = TX.productTex(Math.floor(R() * 1e6)); t.wrapS = THREE.RepeatWrapping; t.repeat.set((z1 - z0) / 1.2, 1);
        const xf = side < 0 ? x0 : x1; plane(scene, lam({ map: t }), z1 - z0, .3, xf + side * .002, y + .15, (z0 + z1) / 2, side < 0 ? -Math.PI / 2 : Math.PI / 2); }
      box(scene, lam({ color: '#9aa190' }), x0 - .02, x1 + .02, y - .015, y, z0, z1); }
  };
  gondola(-1.7, -.6, -7.6, -3.7, 1.5); gondola(.6, 1.7, -7.6, -3.7, 1.5); gondola(2.4, 3.2, -7.6, -3.7, 1.5);
  for (const [x, ry] of [[3.98, -Math.PI / 2]]) for (let k = 0; k < 5; k++) { const t = TX.productTex(300 + k); t.wrapS = THREE.RepeatWrapping; t.repeat.set(5, 1); plane(scene, lam({ map: t }), 6, .32, x, .3 + k * .36, -4.8, ry); }

  // fridge wall: 9 glass doors, lit bottles behind; the middle door's fog is drawn every frame
  box(scene, lam({ color: '#2f3532' }), -3.5, 3.5, 0, 2.3, -9, -8.92);
  W.fogCv = TX.fogCanvas(); TX.drawFog(W.fogCv, 0, { print1: 1e9, print2: 1e9 });
  W.fogTex = new THREE.CanvasTexture(W.fogCv); W.fogTex.colorSpace = THREE.SRGBColorSpace;
  const fogStatic = new THREE.CanvasTexture(W.fogCv.cloneNode ? (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 512; c.getContext('2d').drawImage(W.fogCv, 0, 0); return c; })() : W.fogCv);
  fogStatic.colorSpace = THREE.SRGBColorSpace;
  for (let k = -4; k <= 4; k++) {
    const x = k * .72;
    const bt = TX.bottlesTex(40 + k);
    plane(scene, new THREE.MeshBasicMaterial({ map: bt, color: new THREE.Color(.2, .23, .21) }), .66, 1.9, x, 1.15, -8.905);
    plane(scene, new THREE.MeshLambertMaterial({ map: k === 0 ? W.fogTex : fogStatic, transparent: true, depthWrite: false, emissive: '#4a524a' }), .66, 1.9, x, 1.15, -8.87);
    box(scene, alu, x - .36, x - .33, .2, 2.12, -8.92, -8.85);
    box(scene, lam({ color: '#8b918c' }), x + .24, x + .26, .9, 1.4, -8.86, -8.83);
  }
  box(scene, alu, -3.3, 3.3, .1, .2, -8.92, -8.85); box(scene, alu, -3.3, 3.3, 2.1, 2.2, -8.92, -8.85);
  // water marks at the foot of the fridges
  const wm = document.createElement('canvas'); wm.width = 512; wm.height = 64; const wg = wm.getContext('2d');
  for (let k = 0; k < 40; k++) { wg.fillStyle = `rgba(60,55,40,${.12 * R()})`; wg.beginPath(); wg.ellipse(R() * 512, 20 + R() * 30, 20 + R() * 40, 6 + R() * 8, 0, 0, 7); wg.fill(); }
  const wmt = new THREE.CanvasTexture(wm);
  plane(scene, new THREE.MeshBasicMaterial({ map: wmt, transparent: true, depthWrite: false }), 7, .5, 0, .002, -8.6, 0, -Math.PI / 2);

  // the sheet on the front panel
  W.sheet = plane(scene, lam({ map: TX.sheetTex() }), .30, .42, -3.2, 1.27, -.006, Math.PI);

  // fluorescent fixtures: two tubes each + one point light each
  W.lights = [];
  const tubeOn = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.7, 1.55) }), tubeOff = new THREE.MeshBasicMaterial({ color: '#8f948a' });
  for (const f of FIX) {
    box(scene, lam({ color: '#e6e8de' }), f.x - .33, f.x + .33, RH - .05, RH, f.z - .65, f.z + .65);
    const tubes = [-.12, .12].map(dx => { const m = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, 1.2, 8), f.kind === 'dead' ? tubeOff : tubeOn.clone());
      m.rotation.x = Math.PI / 2; m.position.set(f.x + dx, RH - .07, f.z); scene.add(m); return m; });
    const L = new THREE.PointLight('#f2f6e6', 0, 0, 2); L.position.set(f.x, RH - .25, f.z); scene.add(L);
    W.lights.push({ f, L, tubes });
  }
  scene.add(new THREE.HemisphereLight('#e8eedf', '#6f6a55', .08));
  // the shadow that crosses the floor strip (a soft dark ellipse lying on the floor)
  const shc = document.createElement('canvas'); shc.width = 256; shc.height = 128; const shg = shc.getContext('2d');
  const sgr = shg.createRadialGradient(128, 64, 4, 128, 64, 64); sgr.addColorStop(0, '#fff'); sgr.addColorStop(.55, '#e8e8e8'); sgr.addColorStop(1, '#000');   // alphaMap reads the green channel
  shg.fillStyle = '#000'; shg.fillRect(0, 0, 256, 128); shg.setTransform(2, 0, 0, 1, -128, 0); shg.fillStyle = sgr; shg.fillRect(0, 0, 256, 128);
  W.shadow = plane(scene, new THREE.MeshBasicMaterial({ color: '#000', alphaMap: new THREE.CanvasTexture(shc), transparent: true, depthWrite: false, opacity: 0, fog: false }), 1.6, .7, 0, .004, -4.2, 0, -Math.PI / 2);
  return W;
}

// per-frame light state: g = global flicker, dim(f) = extra factor per fixture
export function updateLights(W, g, dim) {
  for (const { f, L, tubes } of W.lights) {
    const k = f.kind === 'dead' ? 0 : g * dim(f);
    L.intensity = 2.6 * k;
    if (f.kind !== 'dead') tubes.forEach(m => m.visible = true);
    if (f.kind !== 'dead') tubes.forEach(m => m.material.color.setRGB(1.6 * k + .25, 1.7 * k + .26, 1.55 * k + .24));
  }
}
