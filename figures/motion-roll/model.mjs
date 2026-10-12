// The score of a 10-second code-rendered motion graphic, the way Claude builds one:
// every event sits on a beat grid, and every frame is a pure function of its index.
export const BPM = 120;
export const FPS = 24;
export const FPB = (FPS * 60) / BPM; // 12 frames per beat
export const STEP = FPB / 4; // one 16th note = 3 frames
export const BEATS = 20; // 5 bars of 4
export const FRAMES = BEATS * FPB; // 240 frames = 10 s

const range = (a, b, s = 1) => Array.from({ length: Math.ceil((b - a) / s) }, (_, i) => a + i * s);

// Kick: one per beat for two bars, then 8ths, then 16ths (the build-up),
// one beat of silence, and the drop.
const KICK_STEPS = [
  ...range(0, 8).map((b) => b * 4),
  ...range(8, 12).flatMap((b) => [b * 4, b * 4 + 2]),
  ...range(12 * 4, 15 * 4),
  ...range(16, 20).map((b) => b * 4),
];
export const TRACKS = {
  cut: [0, 4, 8, 12, 16, 18].map((b) => b * FPB),
  kick: KICK_STEPS.map((s) => s * STEP),
  text: [2, 6, 16].map((b) => b * FPB),
};

export function phaseOf(frame) {
  const beat = Math.floor(frame / FPB);
  if (beat < 8) return "인트로";
  if (beat < 15) return "빌드업";
  if (beat < 16) return "1박 무음";
  return "드롭";
}

const lastAt = (list, frame) => {
  let hit = -Infinity;
  for (const f of list) if (f <= frame) hit = f;
  return hit;
};
const countAt = (list, frame) => list.filter((f) => f <= frame).length;

// What the renderer draws on frame `frame`: no state, only the index.
export function frameOf(frame) {
  const f = ((frame % FRAMES) + FRAMES) % FRAMES;
  const scene = Math.max(0, countAt(TRACKS.cut, f) - 1);
  const kick = Math.exp(-(f - lastAt(TRACKS.kick, f)) / 3.2);
  const textAge = f - lastAt(TRACKS.text, f);
  const text = textAge === Infinity || textAge > FPB * 3 ? 0 : Math.min(1, textAge / 6);
  const drop = f >= 16 * FPB ? Math.exp(-(f - 16 * FPB) / 5) : 0;
  const silent = phaseOf(f) === "1박 무음";
  return { f, beat: Math.floor(f / FPB), scene, kick: silent ? 0 : kick, text, drop, silent };
}
