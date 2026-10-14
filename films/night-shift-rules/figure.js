// The thing in the store: almost a person, wrong by 15–40 %. Gaunt, too tall (2.25 m), narrow high shoulders, a neck too long
// and bent forward, arms to the knees, bare feet; the right foot drags turned inward. Drawn as an organic silhouette
// (tapered limb strokes, technique from the library's backrooms demo) on a camera-facing billboard. Units: metres, origin
// between the feet on the floor. o = { step: walking phase (rad), walk: 0..1, tilt: head tilt, lean: forward hunch }
import * as THREE from 'three';
const lerp = (a, b, t) => a + (b - a) * t;
const P = (x, y) => ({ x, y });
function limb(x, pts, widths, S) {
  x.lineCap = 'round'; x.lineJoin = 'round';
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    for (let k = 0; k < 8; k++) {
      const t0 = k / 8, t1 = (k + 1) / 8;
      x.lineWidth = lerp(widths[i], widths[i + 1], (t0 + t1) / 2) * S;
      x.beginPath(); x.moveTo(lerp(a.x, b.x, t0) * S, -lerp(a.y, b.y, t0) * S); x.lineTo(lerp(a.x, b.x, t1) * S, -lerp(a.y, b.y, t1) * S); x.stroke();
    }
  }
}
function fingers(x, wr, S, curl) {
  for (const [dx, len] of [[-.03, .2], [-.01, .24], [.012, .25], [.032, .21]]) limb(x, [P(wr.x + dx * .5, wr.y), P(wr.x + dx, wr.y - len * .6), P(wr.x + dx * 1.3 + curl, wr.y - len)], [.022, .015, .009], S);
}
export function drawFigure(x, S, o = {}) {
  const ph = o.step ?? 0, wk = o.walk ?? 0, tilt = o.tilt ?? .35, lean = o.lean ?? .12;
  x.save(); x.fillStyle = x.strokeStyle = o.color || '#000';
  // legs: thin, knees slightly bent; left leg steps, right leg drags (foot turned in, toes scraping)
  const swL = Math.sin(ph) * .12 * wk, kneeL = P(-.09 + swL * .4, .66), footL = P(-.1 + swL, .03 + Math.max(0, Math.sin(ph)) * .05 * wk);
  limb(x, [P(-.075, 1.25), kneeL, P(footL.x, .09), footL], [.12, .075, .05, .045], S);
  x.beginPath(); x.ellipse(footL.x * S, -footL.y * S, .07 * S, .03 * S, 0, 0, 7); x.fill();
  const drag = Math.sin(ph * .5) * .05 * wk;
  limb(x, [P(.075, 1.25), P(.13, .66), P(.16 + drag, .12), P(.12 + drag, .02)], [.12, .075, .05, .045], S);
  x.save(); x.translate((.1 + drag) * S, -.02 * S); x.rotate(-.9); x.beginPath(); x.ellipse(0, 0, .08 * S, .028 * S, 0, 0, 7); x.fill(); x.restore();   // turned-in foot
  // torso: narrow, long, hunched forward (drawn as a lean of the upper body)
  const T = (px, py) => [(px + lean * (py - 1.2)) * S, -py * S];
  x.beginPath(); x.moveTo(...T(-.13, 1.18));
  x.bezierCurveTo(...T(-.15, 1.45), ...T(-.17, 1.7), ...T(-.16, 1.9));
  x.bezierCurveTo(...T(-.15, 1.98), ...T(-.1, 2.0), ...T(-.04, 2.0));
  x.lineTo(...T(.04, 2.0)); x.bezierCurveTo(...T(.1, 2.0), ...T(.15, 1.98), ...T(.16, 1.9));
  x.bezierCurveTo(...T(.17, 1.7), ...T(.15, 1.45), ...T(.13, 1.18)); x.closePath(); x.fill();
  // neck: far too long, bending forward and to the side
  const nb = P(lean * .8, 1.98), nt = P(lean * 1.4 + Math.sin(tilt) * .14, 2.2);
  limb(x, [nb, P((nb.x + nt.x) / 2 + .03, 2.1), nt], [.07, .055, .05], S);
  // head: small, tilted
  x.save(); x.translate((nt.x + Math.sin(tilt) * .05) * S, -(nt.y + .07) * S); x.rotate(tilt);
  x.beginPath(); x.ellipse(0, 0, .065 * S, .088 * S, 0, 0, 7); x.fill(); x.restore();
  // arms: hanging past the knees, slightly swinging out of time with the steps
  const shL = P(-.16 + lean * .7, 1.93), shR = P(.16 + lean * .7, 1.93), sw = Math.sin(ph + 1) * .04 * wk;
  const wrL = P(-.2 + sw, .62), wrR = P(.21 - sw, .6);
  limb(x, [shL, P(-.2, 1.3), wrL], [.075, .05, .04], S); fingers(x, wrL, S, -.01);
  limb(x, [shR, P(.21, 1.3), wrR], [.075, .05, .04], S); fingers(x, wrR, S, .01);
  x.restore();
}

// billboard: always turned toward the camera around the vertical axis; redrawn when its pose changes
export function makeFigure(scene, { color = '#050505', fog = true } = {}) {
  const PX = 300, Wm = 1.2, Hm = 2.45;
  const cv = document.createElement('canvas'); cv.width = Wm * PX; cv.height = Hm * PX;
  const g = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(Wm, Hm), new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: .4, fog, color: '#ffffff' }));
  m.geometry.translate(0, Hm / 2, 0); m.visible = false; scene.add(m);
  let last = '';
  m.pose = (o) => {
    const key = JSON.stringify(o); if (key === last) return; last = key;
    g.clearRect(0, 0, cv.width, cv.height); g.save(); g.translate(cv.width / 2, cv.height - 3); drawFigure(g, PX, { ...o, color }); g.restore(); tex.needsUpdate = true;
  };
  m.face = (cam) => { m.rotation.y = Math.atan2(cam.position.x - m.position.x, cam.position.z - m.position.z); };
  return m;
}
// the shadow it casts on the wall from behind the camera: head, long neck and shoulders, as an alpha map (white = shadow)
export function shadowCanvas() {
  const PX = 260, c = document.createElement('canvas'); c.width = 1.2 * PX; c.height = 1.4 * PX;
  const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
  g.filter = 'blur(4px)'; g.save(); g.translate(c.width / 2, c.height + 1.0 * PX); drawFigure(g, PX, { tilt: .5, lean: .22, color: '#fff' }); g.restore();
  return c;
}
