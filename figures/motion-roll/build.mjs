import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../.agents/skills/anatomy/kit/iso-kit.mjs";
import { kitScript } from "../../.agents/skills/anatomy/scripts/inline-kit.mjs";
import { BPM, FPS, FPB, FRAMES, BEATS, TRACKS, frameOf, phaseOf } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 640;
const HEIGHT = 400;

const PLATE = { x: -160, y: -68, w: 320, d: 140, r: 9 };
const PLATE_H = 10;
const FOOT_H = 5;

// The roll: one world unit along x is one frame; the reader sits at x = 0.
const BED = { x: -150, y: 6, w: 300, d: 48, r: 3 };
const BED_TOP = 5;
const STRIP = { x: -104, y: 16, w: 208, d: 28, r: 0 };
const PAPER = BED_TOP + 0.5;
const SPROCKET_Y = [19, 41];
const TRACK_Y = { cut: 25, kick: 30.5, text: 36 };
const HOLE = { cut: { w: 2.6, d: 4.6 }, kick: { r: 1.25 }, text: { w: 3, d: 3 } };
const REACH = { cut: 1.3, kick: 1.3, text: 1.5 };
const CASS_L = { x: -146, y: 8, w: 40, d: 44, r: 3 };
const CASS_R = { x: 106, y: 8, w: 40, d: 44, r: 3 };
const CASS_H = 22;

const BAR = { x: -3.2, y: 8.5, w: 6.4, d: 43, r: 1.4 };
const BAR_Z = 24;
const BAR_H = 4;
const POSTS = [10.8, 48.8];
const LIFT = 2.2;

const MON = { x: -78, y: -60, w: 88, d: 42, r: 5 };
const MON_FRONT = MON.y + MON.d;
const MON_Z = 6;
const MON_TOP = 80;
const BEZEL = { x0: -70, x1: 2, z0: 20, z1: 68, r: 4, depth: 1.6 };
const SCR = { x0: -66, x1: -2, z0: 24, z1: 60, r: 3, depth: 3.2 };

const ENC = { x: 30, y: -58, w: 84, d: 40, r: 4 };
const ENC_FRONT = ENC.y + ENC.d;
const ENC_Z = 4;
const ENC_TOP = 24;
const REEL = [58, -38];
const REEL_R = 15;
const COUNTER = { x0: 80, x1: 106, z0: 8, z1: 17, r: 1.4, depth: 1.4 };

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), ...k.boxCorners(MON, 0, MON_TOP), ...k.boxCorners(ENC, 0, ENC_TOP + 6)],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 52 },
);

const rest = 16 * FPB + 1;
const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const planeOf = (y) => k.sideMatrix([0, y], 0, P, "left");
const sideOf = (x) => k.sideMatrix([x, 0], 0, P, "right");
const flat = (x0, z0, x1, z1, r, steps = 6) => k.pathOf(k.roundedPlan({ x: x0, y: z0, w: x1 - x0, d: z1 - z0, r }, steps).map(([u, z]) => [u, -z]), true);

let clips = 0;
function recess({ x0, x1, z0, z1, r, depth }, y, back = "", backClass = "mr-well", inside = "") {
  const id = `mr-clip-${clips++}`;
  const ring = k.roundedPlan({ x: x0, y: z0, w: x1 - x0, d: z1 - z0, r }, 6);
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const { sinA } = k.cameraOf(P);
  const tops = [];
  const sides = [[], [], [], []];
  ring.forEach(([ax, az], index) => {
    const [bx, bz] = ring[(index + 1) % ring.length];
    const length = Math.hypot(bx - ax, bz - az) || 1;
    let [nx, nz] = [(bz - az) / length, -(bx - ax) / length];
    if (nx * (cx - (ax + bx) / 2) + nz * (cz - (az + bz) / 2) < 0) [nx, nz] = [-nx, -nz];
    if (nx <= 0 && nz <= 0) return;
    const quad = k.pathOf([at([ax, y, az]), at([bx, y, bz]), at([bx, y - depth, bz]), at([ax, y - depth, az])], true);
    if (nz >= nx) tops.push(quad);
    else sides[Math.min(3, Math.max(0, Math.floor(((nx * -sinA + 1) / 2) * 4)))].push(quad);
  });
  const shape = flat(x0, z0, x1, z1, r);
  return [
    `<clipPath id="${id}"><path transform="${planeOf(y)}" d="${shape}"/></clipPath>`,
    `<g clip-path="url(#${id})">`,
    `<path class="iso-top" d="${tops.join("")}"/>`,
    ...sides.map((d, shade) => (d.length ? `<path class="iso-shade" data-shade="${shade}" d="${d.join("")}"/>` : "")),
    `<g transform="${planeOf(y - depth)}"><path class="${backClass}" d="${shape}"/>${back}<path class="iso-line" data-tone="faint" d="${shape}"/></g>`,
    inside,
    `</g>`,
    `<g transform="${planeOf(y)}"><path class="iso-line" data-tone="lo" d="${shape}"/></g>`,
  ].join("");
}

// ---------- base ----------
function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // The beat ruler: a 16th every 3 frames, a major tick every beat, the reader's beat marked hi.
  const strip = { x: -100, y: 58, w: 200, d: 7, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, FPB / 4, 4, strip.y + 0.8, 0.6, [2, 3.8], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(L(k.lineOnTop([0, strip.y + 0.8], [0, strip.y + 5.6], 0.6, P), { tone: "hi" }));
  out.push(D([at([strip.x + 2, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 2, strip.y + 3.5, 0.6])], { size: 0.45 }));
  // Label plate, front left.
  const label = { x: -146, y: 57, w: 36, d: 9, r: 1.2 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.4), 0.8, P, 3), { tone: "faint" }));
  out.push(k.faceTextSvg(k.topMatrix([label.x + 4, label.y + 6], 0.8, P, "x"), `${BPM} BPM`, { size: 3.6, tone: "mid" }));
  out.push(D([at([label.x + label.w - 3, label.y + label.d / 2, 0.8])], { size: 0.45 }));
  return out.join("");
}

// ---------- monitor (the renderer's preview) ----------
function monitor() {
  const out = [`<path class="iso-halo" d="${k.haloOf(MON, 0, 8, P)}"/>`];
  out.push(S(k.slabOf(k.insetPlan(MON, 4), 0, MON_Z, P, 6), { tone: "lo" }));
  out.push(S(k.slabOf(MON, MON_Z, MON_TOP - MON_Z, P, 8, 1.4), { tone: "mid", inner: L(k.sideSeam(MON, MON_TOP - 8, P, 8), { tone: "faint" }) }));
  // Vents on the lid.
  out.push(L(Array.from({ length: 6 }, (_, i) => k.planOutline({ x: -58, y: MON.y + 8 + i * 3.6, w: 48, d: 1.4, r: 0.7 }, MON_TOP, P, 4)).join(""), { tone: "faint" }));
  out.push(D(k.corners(MON, 4).map(([x, y]) => at([x, y, MON_TOP])), { size: 0.45 }));
  out.push(screen());
  // Front panel under the screen: a grille, a power lamp and a seam.
  out.push(`<g transform="${planeOf(MON_FRONT)}">${L(Array.from({ length: 8 }, (_, i) => flat(-68 + i * 3, 9, -66.6 + i * 3, 16, 0.7, 4)).join(""), { tone: "lo" })}</g>`);
  out.push(`<g transform="${planeOf(MON_FRONT)}">${L(flat(-30, 9.5, -4, 15.5, 1.2, 4), { tone: "faint" })}</g>`);
  out.push(`<g data-part="lamp">${D([at([2, MON_FRONT, 12.5])], { size: 0.9, tone: "hi" })}</g>`);
  // Side face: cable port block and vents.
  const side = MON.x + MON.w;
  out.push(`<g transform="${sideOf(side)}">${L(Array.from({ length: 5 }, (_, i) => flat(-(MON.y + 9.4 + i * 3.4), 54, -(MON.y + 8 + i * 3.4), 70, 0.7, 4)).join(""), { tone: "faint" })}</g>`);
  out.push(S(k.slabOf({ x: side, y: -40, w: 3, d: 10, r: 0.8 }, 26, 8, P, 3, 0.4), { tone: "mid" }));
  out.push(S(k.slabOf({ x: side, y: -32, w: 3, d: 8, r: 0.8 }, 12, 6, P, 3, 0.4), { tone: "mid" }));
  return out.join("");
}

function screen() {
  const back = `<g data-part="screen">${screenMarkup(frameOf(16 * FPB), SC)}</g>`;
  const glass = `<path class="mr-scan" d="${Array.from({ length: Math.floor((SCR.z1 - SCR.z0) / 1.6) }, (_, i) => `M${SCR.x0} ${-(SCR.z0 + 0.8 + i * 1.6).toFixed(1)}H${SCR.x1}`).join("")}"/>`;
  return recess(BEZEL, MON_FRONT, "", "mr-bezel", recess(SCR, MON_FRONT - BEZEL.depth, back + glass, "mr-glass"));
}

// The renderer: one frame drawn from its index alone, in the screen's own (u, -z) plane.
const SC = { x0: SCR.x0, x1: SCR.x1, z0: SCR.z0, z1: SCR.z1, frames: FRAMES, fpb: FPB, beats: BEATS };
function screenMarkup(fr, sc) {
  const n = (v) => v.toFixed(2);
  const out = [];
  const w = sc.x1 - sc.x0, h = sc.z1 - sc.z0;
  if (fr.drop > 0.01) out.push(`<rect class="mr-ink" x="${sc.x0}" y="${-sc.z1}" width="${w}" height="${h}" opacity="${n(fr.drop * 0.55)}"/>`);
  const cx = sc.x0 + 17, cz = sc.z0 + 19;
  const s = 7 * (1 + 0.38 * fr.kick);
  const shapes = [];
  const scene = fr.scene;
  if (scene === 0) shapes.push(`<circle class="mr-ink" cx="${cx}" cy="${-cz}" r="${n(s)}"/>`);
  if (scene === 1) shapes.push(`<rect class="mr-ink" x="${n(cx - s)}" y="${n(-cz - s)}" width="${n(2 * s)}" height="${n(2 * s)}" rx="1"/>`);
  if (scene === 2) shapes.push(`<circle class="mr-ring" cx="${cx}" cy="${-cz}" r="${n(s)}" stroke-width="${n(1.4 + fr.kick * 1.6)}"/>`);
  if (scene === 3) for (let i = 0; i < 4; i++) { const bh = 4 + ((i * 5 + fr.f) % 7) * 1.4 * (0.5 + fr.kick); shapes.push(`<rect class="mr-ink" x="${cx - 9 + i * 5}" y="${n(-cz + 7 - bh)}" width="3" height="${n(bh)}"/>`); }
  if (scene === 4) shapes.push(`<circle class="mr-ink" cx="${cx}" cy="${-cz}" r="${n(s * 1.35)}"/><circle class="mr-cut" cx="${cx}" cy="${-cz}" r="${n(s * 0.55)}"/>`);
  if (scene === 5) shapes.push(`<path class="mr-ink" d="M${cx} ${n(-cz - s * 1.2)}L${n(cx + s * 1.2)} ${-cz}L${cx} ${n(-cz + s * 1.2)}L${n(cx - s * 1.2)} ${-cz}Z"/>`);
  out.push(`<g opacity="${fr.silent ? 0.18 : 1}">${shapes.join("")}</g>`);
  if (fr.text > 0) {
    const tx = sc.x0 + 33;
    out.push(`<rect class="mr-ink" x="${tx}" y="${-(cz + 5)}" width="${n(26 * fr.text)}" height="2.6" rx="0.6"/>`);
    out.push(`<rect class="mr-ink" x="${tx}" y="${-(cz - 0.5)}" width="${n(17 * fr.text)}" height="1.6" rx="0.5" opacity="0.7"/>`);
  }
  const px0 = sc.x0 + 4, px1 = sc.x1 - 4, pz = sc.z0 + 3.4;
  out.push(`<rect class="mr-track" x="${px0}" y="${-pz - 0.7}" width="${px1 - px0}" height="1.4" rx="0.7"/>`);
  out.push(`<rect class="mr-ink" x="${px0}" y="${-pz - 0.7}" width="${n(((fr.f + 1) / sc.frames) * (px1 - px0))}" height="1.4" rx="0.7"/>`);
  for (let b = 0; b <= sc.beats; b += 4) out.push(`<rect class="mr-ink" x="${n(px0 + (b / sc.beats) * (px1 - px0) - 0.25)}" y="${-pz - 2.2}" width="0.5" height="1.1"/>`);
  return out.join("");
}

// ---------- encoder (frames into an MP4) ----------
function encoder() {
  const out = [`<path class="iso-halo" d="${k.haloOf(ENC, 0, 6, P)}"/>`];
  out.push(S(k.slabOf(k.insetPlan(ENC, 3), 0, ENC_Z, P, 6), { tone: "lo" }));
  out.push(S(k.slabOf(ENC, ENC_Z, ENC_TOP - ENC_Z, P, 6, 1.2), { tone: "mid", inner: L(k.sideSeam(ENC, ENC_TOP - 5, P, 6), { tone: "faint" }) }));
  out.push(L(k.ring(REEL[0], REEL[1], REEL_R + 2.2, ENC_TOP, P, 64), { tone: "faint" }));
  out.push(S(k.cylinder(REEL[0], REEL[1], REEL_R, ENC_TOP, 1.2, P, 72, 0.5), { tone: "mid" }));
  out.push(L(k.ring(REEL[0], REEL[1], REEL_R - 1.6, ENC_TOP + 1.2, P, 64), { tone: "faint" }));
  out.push(`<g data-part="pack">${packSvg(rest)}</g>`);
  // Keys and a capstan on the right of the deck.
  for (const [i, x] of [92, 100].entries()) {
    out.push(S(k.slabOf({ x, y: ENC.y + 8, w: 6, d: 9, r: 1 }, ENC_TOP, 2.2, P, 3, 0.4), { tone: i ? "mid" : "hi", crease: i ? "faint" : "lo" }));
  }
  out.push(S(k.cylinder(96, -30, 2.2, ENC_TOP, 5, P, 20), { tone: "mid" }));
  out.push(S(k.cylinder(96, -30, 3.6, ENC_TOP, 1, P, 24), { tone: "lo" }));
  out.push(D(k.corners(ENC, 4).map(([x, y]) => at([x, y, ENC_TOP])), { size: 0.45 }));
  // Front: the frame counter window, a lamp and a grille.
  const digits = `<text class="mr-digits" data-part="counter" x="${COUNTER.x0 + 2.2}" y="${-(COUNTER.z0 + 2.1)}" font-size="6.8">0193</text>`;
  out.push(recess(COUNTER, ENC_FRONT, digits, "mr-glass mr-glass-on"));
  out.push(`<g data-part="rec">${D([at([75.5, ENC_FRONT, 12.5])], { size: 0.9, tone: "hi" })}</g>`);
  out.push(`<g transform="${planeOf(ENC_FRONT)}">${L(Array.from({ length: 9 }, (_, i) => flat(38 + i * 3, 8, 39.4 + i * 3, 17, 0.7, 4)).join(""), { tone: "lo" })}</g>`);
  return out.join("");
}

function packSvg(frames) {
  const r = 4.2 + 8.6 * Math.sqrt(frames / FRAMES);
  const z = ENC_TOP + 4.4;
  const a = frames * 0.11;
  const spokes = [0, 1, 2].map((i) => { const t = a + (i * Math.PI * 2) / 3; return k.lineOnTop([REEL[0] + Math.sin(t) * 2.4, REEL[1] - Math.cos(t) * 2.4], [REEL[0] + Math.sin(t) * 3.9, REEL[1] - Math.cos(t) * 3.9], z + 1.2, P); }).join("");
  return S(k.cylinder(REEL[0], REEL[1], r, ENC_TOP + 1.2, 3.2, P, 56), { tone: "lo", crease: "none" }) + L(k.ring(REEL[0], REEL[1], 4.2, z, P, 32), { tone: "faint" }) + S(k.cylinder(REEL[0], REEL[1], 3.9, z, 1.2, P, 32), { tone: "mid" }) + L(spokes, { tone: "hi" }) + D([at([REEL[0], REEL[1], z + 1.2])], { size: 0.6, tone: "hi" });
}

// ---------- the roll ----------
function bed() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BED, 0, 4, P)}"/>`];
  out.push(S(k.slabOf(BED, 0, BED_TOP, P, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(BED, 1.6, P, 4), { tone: "faint" }) }));
  for (const y of [13.4, 44.6]) out.push(S(k.slabOf({ x: -104, y: y - 1, w: 208, d: 2, r: 0.6 }, BED_TOP, 1.4, P, 2), { tone: "lo", crease: "none" }));
  out.push(D([-98, -50, 50, 98].flatMap((x) => [at([x, 13.4, BED_TOP + 1.4]), at([x, 44.6, BED_TOP + 1.4])]), { size: 0.4 }));
  return out.join("");
}

function cassette(plan, knobSide) {
  const out = [];
  out.push(S(k.slabOf(plan, BED_TOP, CASS_H, P, 4, 1), { tone: "mid", inner: L(k.sideSeam(plan, BED_TOP + CASS_H - 6, P, 4), { tone: "faint" }) }));
  const top = BED_TOP + CASS_H;
  out.push(L(k.planOutline(k.insetPlan(plan, 4), top, P, 4), { tone: "faint" }));
  out.push(D(k.corners(plan, 2.4).map(([x, y]) => at([x, y, top])), { size: 0.45 }));
  const kx = plan.x + plan.w / 2;
  const ky = plan.y + plan.d / 2;
  out.push(S(k.cylinder(kx, ky, 8, top, 1, P, 40), { tone: "lo" }));
  out.push(S(k.cylinder(kx, ky, 6.2, top + 1, 4.4, P, 40), { tone: "mid" }));
  out.push(L(k.knurl(kx, ky, 6.2, top + 1, top + 5.4, 40, P), { tone: "lo" }));
  return out.join("");
}

function stripSvg() {
  const out = [];
  const corners = [at([STRIP.x, STRIP.y, PAPER]), at([STRIP.x + STRIP.w, STRIP.y, PAPER]), at([STRIP.x + STRIP.w, STRIP.y + STRIP.d, PAPER]), at([STRIP.x, STRIP.y + STRIP.d, PAPER])];
  out.push(`<g class="mr-paper">${S(k.slabOf(STRIP, BED_TOP, PAPER - BED_TOP, P, 1), { tone: "hi", crease: "none" })}</g>`);
  out.push(`<clipPath id="mr-roll"><path d="${k.pathOf(corners, true)}"/></clipPath>`);
  out.push(`<g clip-path="url(#mr-roll)"><g data-part="roll">${holes()}</g></g>`);
  out.push(L(k.lineOnTop([STRIP.x, STRIP.y], [STRIP.x + STRIP.w, STRIP.y], PAPER, P) + k.lineOnTop([STRIP.x, STRIP.y + STRIP.d], [STRIP.x + STRIP.w, STRIP.y + STRIP.d], PAPER, P), { tone: "lo" }));
  return out.join("");
}

function holes() {
  const marks = [];
  const rows = [];
  for (let copy = -1; copy <= 1; copy++) {
    const o = copy * FRAMES;
    for (let f = 0; f < FRAMES; f += FPB) for (const y of SPROCKET_Y) marks.push(k.planOutline({ x: o + f - 1.4, y: y - 1, w: 2.8, d: 2, r: 0.6 }, PAPER, P, 3));
    for (let f = 0; f < FRAMES; f += FPB / 4) rows.push(k.lineOnTop([o + f, STRIP.y + 6], [o + f, STRIP.y + STRIP.d - 6], PAPER, P));
    for (const f of TRACKS.cut) marks.push(k.planOutline({ x: o + f - HOLE.cut.w / 2, y: TRACK_Y.cut - HOLE.cut.d / 2, w: HOLE.cut.w, d: HOLE.cut.d, r: 1 }, PAPER, P, 3));
    for (const f of TRACKS.kick) marks.push(k.ring(o + f, TRACK_Y.kick, HOLE.kick.r, PAPER, P, 14));
    for (const f of TRACKS.text) marks.push(k.planOutline({ x: o + f - HOLE.text.w / 2, y: TRACK_Y.text - HOLE.text.d / 2, w: HOLE.text.w, d: HOLE.text.d, r: 0.3 }, PAPER, P, 2));
  }
  return `<path class="mr-grid" d="${rows.join("")}"/><path class="mr-hole" d="${marks.join("")}"/>`;
}

// ---------- the reader bridge ----------
function finger(y) {
  const z0 = PAPER + LIFT;
  const out = [];
  out.push(S(k.cylinder(0, y, 0.9, z0, 1.2, P, 16), { tone: "hi", crease: "lo" }));
  out.push(S(k.cylinder(0, y, 1.3, z0 + 1.2, BAR_Z - z0 - 1.2 + BAR_H + 3, P, 20), { tone: "hi", crease: "lo" }));
  return out.join("");
}

function bridgeBack() {
  const out = [];
  out.push(S(k.cylinder(0, POSTS[0], 3.2, BED_TOP, 1.2, P, 24), { tone: "lo" }));
  out.push(S(k.cylinder(0, POSTS[0], 2.2, BED_TOP + 1.2, BAR_Z - BED_TOP - 1.2, P, 24), { tone: "mid", crease: "none" }));
  for (const [name, y] of Object.entries(TRACK_Y)) out.push(`<g data-finger="${name}">${finger(y)}</g>`);
  return out.join("");
}

function bridgeFront() {
  const out = [];
  out.push(S(k.cylinder(0, POSTS[1], 3.2, BED_TOP, 1.2, P, 24), { tone: "lo" }));
  out.push(S(k.cylinder(0, POSTS[1], 2.2, BED_TOP + 1.2, BAR_Z - BED_TOP - 1.2, P, 24), { tone: "mid", crease: "none" }));
  out.push(L([10, 18].map((z) => k.sideArc(0, POSTS[1], 2.2, z, P, 16)).join(""), { tone: "faint" }));
  out.push(S(k.slabOf(BAR, BAR_Z, BAR_H, P, 3, 0.5), { tone: "mid" }));
  for (const y of Object.values(TRACK_Y)) {
    out.push(L(k.ring(0, y, 2.1, BAR_Z + BAR_H, P, 18), { tone: "lo" }));
  }
  out.push(D([at([0, BAR.y + 1.8, BAR_Z + BAR_H]), at([0, BAR.y + BAR.d - 1.8, BAR_Z + BAR_H])], { size: 0.45 }));
  return out.join("");
}

function fingerTops() {
  return Object.entries(TRACK_Y)
    .map(([name, y]) => `<g data-cap="${name}">${S(k.cylinder(0, y, 1.8, BAR_Z + BAR_H + 1.6, 1.4, P, 20), { tone: "hi", crease: "lo" })}</g>`)
    .join("");
}

function cables() {
  const out = [];
  const side = MON.x + MON.w;
  out.push(k.wireSvg(at([0, BAR.y, BAR_Z + 2]), at([side + 3, -35, 30]), { via: [at([0, -4, BAR_Z + 2]), at([side + 8, -10, 30])], tone: "mid" }));
  out.push(k.wireSvg(at([side + 3, -28, 15]), at([ENC.x, -26, 14]), { via: [at([side + 9, -24, 15]), at([ENC.x - 6, -24, 14])], tone: "lo" }));
  return out.join("");
}

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A bench machine that renders a motion graphic from a punched score. A paper roll with holes in three tracks (cuts, kicks and text) and sprocket holes on every beat runs under a reader bridge; three fingers drop into the holes as they pass. Behind it a monitor shows the frame the reader is on, and a tape deck on the right winds each finished frame onto a reel and counts it.",
  body: [plate(), monitor(), encoder(), bed(), cassette(CASS_L, "l"), stripSvg(), bridgeBack(), bridgeFront(), fingerTops(), cassette(CASS_R, "r"), cables()],
});

const model = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");

const live = `
${model}
const P = ${JSON.stringify(P)};
const SC = ${JSON.stringify(SC)};
const TRACK_Y = ${JSON.stringify(TRACK_Y)};
const REACH = ${JSON.stringify(REACH)};
const REEL = ${JSON.stringify(REEL)}, ENC_TOP = ${ENC_TOP};
const LIFT = ${LIFT};
const screenMarkup = ${screenMarkup.toString()};
const S = solidSvg, L = lineSvg, D = dotsSvg, at = (p) => iso(p, P), k = { cylinder, ring, lineOnTop };
const packOf = ${packSvg.toString()};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const roll = svg.querySelector('[data-part="roll"]');
const screenEl = svg.querySelector('[data-part="screen"]');
const pack = svg.querySelector('[data-part="pack"]');
const counter = svg.querySelector('[data-part="counter"]');
const rec = svg.querySelector('[data-part="rec"]');
const fingers = Object.keys(TRACK_Y).map((name) => ({ name, el: svg.querySelector('[data-finger="' + name + '"]'), cap: svg.querySelector('[data-cap="' + name + '"]'), at: 0 }));
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const along = axisVector(P, [1, 0, 0]);
const down = axisVector(P, [0, 0, -1]);
const near = (list, f, reach) => list.some((h) => { const d = Math.abs(((f - h) % FRAMES + FRAMES * 1.5) % FRAMES - FRAMES / 2); return d <= reach; });
let play = ${rest}, target = play, playing = !still.matches, frame = 0, last = 0, visible = false, idle = 0, shown = -1;
function draw() {
  const wrapped = ((play % FRAMES) + FRAMES) % FRAMES;
  roll.setAttribute("transform", "translate(" + (-along[0] * wrapped).toFixed(2) + " " + (-along[1] * wrapped).toFixed(2) + ")");
  const f = Math.floor(wrapped);
  if (f !== shown) {
    shown = f;
    const fr = frameOf(f);
    screenEl.innerHTML = screenMarkup(fr, SC);
    pack.innerHTML = packOf(f + 1);
    counter.textContent = String(f + 1).padStart(4, "0");
    const text = "박자 " + (fr.beat + 1) + "/" + BEATS + " · 프레임 " + (f + 1) + "/" + FRAMES + " · " + phaseOf(f);
    if (readout.textContent !== text) readout.textContent = text;
    stage.setAttribute("aria-valuenow", String(f + 1));
    stage.setAttribute("aria-valuetext", text);
  }
  rec.style.opacity = playing ? (Math.floor(performance.now() / 500) % 2 ? "1" : "0.25") : "0.25";
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (playing) { play += dt * FPS; target = play; }
  else play = calm ? target : play + (target - play) * (1 - Math.exp(-dt / 0.22));
  if (!playing && Math.abs(target - play) < 0.01) play = target;
  let moving = playing || play !== target;
  const wrapped = ((play % FRAMES) + FRAMES) % FRAMES;
  for (const fi of fingers) {
    const want = near(TRACKS[fi.name], wrapped, REACH[fi.name]) ? LIFT : 0;
    fi.at = calm ? want : fi.at + (want - fi.at) * (1 - Math.exp(-dt / (want ? 0.018 : 0.06)));
    if (Math.abs(want - fi.at) < 0.01) fi.at = want; else moving = true;
    const t = "translate(" + (down[0] * fi.at).toFixed(2) + " " + (down[1] * fi.at).toFixed(2) + ")";
    fi.el.setAttribute("transform", t);
    fi.cap.setAttribute("transform", t);
    fi.cap.toggleAttribute("data-hit", fi.at > LIFT * 0.6);
  }
  draw();
  frame = visible && moving ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (next) => { playing = false; target = next; clearTimeout(idle); idle = setTimeout(() => { if (!still.matches) { playing = true; run(); } }, 3200); run(); };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  const share = Math.min(1, Math.max(0, ((event.clientX - box.left) / box.width - 0.1) / 0.8));
  steer(share * (FRAMES - 1));
});
stage.addEventListener("keydown", (event) => {
  const here = Math.round(((target % FRAMES) + FRAMES) % FRAMES);
  let to = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") to = (Math.floor(here / FPB) + 1) * FPB;
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") to = (Math.ceil(here / FPB) - 1) * FPB;
  if (event.key === "Home") to = 0;
  if (event.key === "End") to = 16 * FPB;
  if (event.key === " ") { event.preventDefault(); playing = !playing; if (!playing) target = play; run(); return; }
  if (to === null) return;
  event.preventDefault();
  steer(Math.max(0, Math.min(FRAMES - 1, to)) + 0.5);
});
window.__mrSeek = (t) => {
  playing = false; clearTimeout(idle); play = target = t;
  const wrapped = ((t % FRAMES) + FRAMES) % FRAMES;
  for (const fi of fingers) {
    let dist = Infinity;
    for (const h of TRACKS[fi.name]) dist = Math.min(dist, Math.abs(((wrapped - h) % FRAMES + FRAMES * 1.5) % FRAMES - FRAMES / 2));
    fi.at = LIFT * Math.min(1, Math.max(0, 1 - (dist - REACH[fi.name]) / 1.2));
    const tr = "translate(" + (down[0] * fi.at).toFixed(2) + " " + (down[1] * fi.at).toFixed(2) + ")";
    fi.el.setAttribute("transform", tr);
    fi.cap.setAttribute("transform", tr);
    fi.cap.toggleAttribute("data-hit", fi.at > LIFT * 0.6);
  }
  draw();
  rec.style.opacity = Math.floor(wrapped / 12) % 2 ? "1" : "0.3";
};
draw();
`;

const css = `<style>
.mr-well{fill:var(--anatomy-shade-1)}
.mr-bezel{fill:var(--anatomy-top)}
.mr-glass{fill:var(--anatomy-shade-0)}
.mr-glass-on{fill:var(--anatomy-lit-shade)}
.mr-paper .iso-top{fill:color-mix(in srgb,var(--anatomy-top) 70%,var(--anatomy-hi) 30%)}
[data-theme="light"] .mr-paper .iso-top{fill:var(--anatomy-paper)}
.mr-ink{fill:var(--anatomy-lit)}
.mr-cut{fill:var(--anatomy-lit-shade)}
.mr-ring{fill:none;stroke:var(--anatomy-lit)}
.mr-track{fill:var(--anatomy-faint);opacity:.6}
.mr-scan{fill:none;stroke:var(--anatomy-faint);stroke-width:.5px;vector-effect:non-scaling-stroke;opacity:.22}
.mr-digits{fill:var(--anatomy-lit);font-family:var(--anatomy-mono);letter-spacing:.04em}
.mr-hole{fill:var(--anatomy-shade-0);stroke:var(--anatomy-lo);stroke-width:.5px;vector-effect:non-scaling-stroke}
.mr-grid{fill:none;stroke:var(--anatomy-faint);stroke-width:.4px;vector-effect:non-scaling-stroke;opacity:.7}
[data-cap][data-hit] .iso-edge{stroke:var(--anatomy-lit)}
[data-cap][data-hit] .iso-top{fill:var(--anatomy-lit)}
.iso-stage{touch-action:pan-y}
.iso-stage:focus{outline:none}
.iso-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
</style>`;

const body =
  css +
  k.plateHtml({
    fig: "Fig 1",
    title: "악보 롤 렌더러",
    hint: "마우스로 훑기 · ← → 한 박 · 스페이스 재생",
    readout: `박자 17/${BEATS} · 프레임 ${rest}/${FRAMES} · ${phaseOf(rest - 1)}`,
    keys: [
      { mark: "lit", label: "모니터: 읽기 핀 아래에 있는 프레임을 번호만으로 그린 화면" },
      { mark: "raised", label: "구멍 세 줄: 컷(긴 홈), 킥(동그라미), 글자(네모)" },
      { mark: "dotted", label: "가장자리 구멍: 한 박에 하나씩, 12프레임 간격" },
    ],
    caption: `코드로 모션그래픽 영상을 만드는 순서를 기계 하나로 옮겼습니다. 먼저 콘셉트를 악보처럼 종이 롤에 뚫어 둡니다. ${BPM} BPM에 ${FPS} fps이면 한 박이 ${FPB}프레임이므로, 모든 컷과 킥과 제목은 박이나 16분음표(3프레임) 위에 놓입니다. 인트로 두 마디, 8분음표에서 16분음표로 빨라지는 빌드업, 한 박의 무음, 그리고 드롭이 이어집니다. 롤이 읽기 핀 아래를 지나면 구멍마다 핀이 떨어지고, 모니터는 그 프레임을 번호만 보고 새로 그립니다. 오른쪽 데크는 완성된 프레임을 하나씩 릴에 감으며 세고, ${FRAMES}프레임(10초)이 다 감기면 MP4 한 편이 됩니다.`,
    body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="악보 롤 렌더러: 화살표 키로 한 박씩, 스페이스로 재생" aria-valuemin="1" aria-valuemax="${FRAMES}" aria-valuenow="${rest}">${svg}</div>`,
  });

const name = theme === "light" ? "motion-roll-light.html" : "motion-roll.html";
writeFileSync(join(HERE, name), k.pageHtml({ title: "악보 롤 렌더러", theme, body, script: kitScript() + live }));
console.log("wrote", name);
