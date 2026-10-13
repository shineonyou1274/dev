#!/bin/sh
# one command: events → sound → picture → master. Run from anywhere.
set -e
LIB=${LIB:-/tmp/claude-0/-home-user-dev/27126b6a-9690-5003-8b87-9ccb9878144c/scratchpad/repos/lemo-opuscar}
HERE=$(cd "$(dirname "$0")" && pwd)
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the Lemo-Opuscar library folder (sh setup.sh prints it)"; exit 1; }
cd "$LIB"
node core/render/events.mjs "$HERE"
"$LIB/.venv/bin/python" "$HERE/mix.py"
node core/render/video.mjs "$HERE" --fps 24 --workers 4 --out "$HERE/out/video.mp4"
# master: two-pass loudnorm to -14 LUFS / TP -1.2, as core/render/mux.sh does. mux.sh is tried first; on some ffmpeg builds its
# decoded-length check reports ~3 s short (loudnorm look-ahead) and refuses, so the same two passes are run here instead.
if ! sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/night-shift-rules.mp4" 24 0; then
  J=$(ffmpeg -hide_banner -nostats -i "$HERE/out/mix.wav" -af loudnorm=I=-14:TP=-1.2:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
  g() { echo "$J" | "$LIB/.venv/bin/python" -c "import json,sys;print(json.load(sys.stdin)['$1'])"; }
  LN="loudnorm=I=-14:TP=-1.2:LRA=11:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true"
  ffmpeg -y -loglevel error -i "$HERE/out/video.mp4" -i "$HERE/out/mix.wav" -filter_complex "[1:a]$LN,aresample=48000[a]" -map 0:v -map "[a]" \
    -c:v libx264 -preset slow -crf 19 -r 24 -pix_fmt yuv420p -c:a aac -b:a 256k -movflags +faststart -shortest "$HERE/night-shift-rules.mp4"
fi
ffmpeg -v error -y -i "$HERE/night-shift-rules.mp4" -c:v libx264 -preset slow -crf 27 -tune grain -c:a copy -movflags +faststart "$HERE/night-shift-rules-share.mp4"
"$LIB/.venv/bin/python" core/render/srt.py "$HERE/caps.json" "$HERE/night-shift-rules.srt"
