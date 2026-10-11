#!/usr/bin/env bash
# Verify a rendered intro: format, loudness, silence-vs-black alignment, and a frame sheet to eyeball.
# usage: bash verify.sh <video.mp4> <sheet.png>
set -e
FF=${FFMPEG:-ffmpeg}
V=$1; OUT=${2:-sheet.png}
$FF -hide_banner -i "$V" 2>&1 | grep -E "Duration|Stream" || true
echo "# loudness (target about -14 LUFS for YouTube)"
$FF -hide_banner -i "$V" -af ebur128 -f null - 2>&1 | grep -E "^\s+I:" || true
echo "# silences vs black frames (should match within 1 frame)"
$FF -hide_banner -i "$V" -af silencedetect=noise=-50dB:d=0.1 -vf blackdetect=d=0.1:pix_th=0.08 -f null - 2>&1 \
  | grep -oE "(silence_(start|end)|black_(start|end)): ?[0-9.]+" || true
$FF -v error -i "$V" -vf "fps=2,scale=384:-1,tile=5x6" -frames:v 1 "$OUT" -y
echo "# frame sheet: $OUT (2 frames/s)"
