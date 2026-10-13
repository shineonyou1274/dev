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
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/night-shift-rules.mp4" 24 0
"$LIB/.venv/bin/python" core/render/srt.py "$HERE/caps.json" "$HERE/night-shift-rules.srt"
