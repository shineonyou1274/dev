#!/usr/bin/env bash
# Installs what the videointro pipeline needs and prints the ffmpeg path to export.
# usage: source <(bash setup.sh)   or   bash setup.sh  (then export the printed line)
set -e
pip install -q numpy scipy pillow imageio-ffmpeg >/dev/null 2>&1 || pip install --user -q numpy scipy pillow imageio-ffmpeg
FF=$(command -v ffmpeg || python3 -c "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())")
# Playwright: prefer an existing global install (cloud containers ship one), else install locally.
if ! node -e "require.resolve('playwright', {paths:[require('child_process').execSync('npm root -g').toString().trim()]})" >/dev/null 2>&1; then
  npm i -g playwright@latest >/dev/null 2>&1 || true
fi
echo "export FFMPEG=$FF"
echo "export PW_ROOT=$(npm root -g)"
