#!/usr/bin/env bash
# Renders score-roll.mp4: frames from the figure, sound from the same score.
set -euo pipefail
cd "$(dirname "$0")"
WORK="${WORK:-$(mktemp -d)}"
node -e 'import("../model.mjs").then(m => console.log(JSON.stringify({ BPM: m.BPM, FPS: m.FPS, FPB: m.FPB, FRAMES: m.FRAMES, TRACKS: m.TRACKS, total: m.FRAMES + 60 })))' > "$WORK/score.json"
python3 audio.py "$WORK/score.json" "$WORK/audio.wav"
(cd .. && node build.mjs)
rm -rf "$WORK/frames"
node render.mjs "$WORK/frames"
ffmpeg -y -loglevel error -framerate 24 -i "$WORK/frames/%04d.png" -i "$WORK/audio.wav" \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart score-roll.mp4
echo "wrote $(pwd)/score-roll.mp4"
