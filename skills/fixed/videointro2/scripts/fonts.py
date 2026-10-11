"""Download Google Font subsets that cover exactly the characters used in a page.
usage: python3 fonts.py page.html fonts/  [--set default]
Writes: anton.woff2 (Latin numbers/caps), bhs.woff2 (Black Han Sans, Korean display),
        kr-500.woff2 / kr-900.woff2 (Noto Sans KR), pen.woff2 (Nanum Pen Script, handwriting),
        serif-900.woff2 (Noto Serif KR). Re-run after every text change: a missing glyph falls back to a system font.
"""
import os
import re
import sys
import urllib.parse
import urllib.request

page, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
src = open(page, encoding="utf-8").read()
chars = "".join(sorted(set(c for c in src if ord(c) > 127) | set(chr(c) for c in range(32, 127))))
FONTS = [("Anton", None, "anton"), ("Black Han Sans", None, "bhs"), ("Noto Sans KR", 500, "kr-500"),
         ("Noto Sans KR", 900, "kr-900"), ("Nanum Pen Script", None, "pen"), ("Noto Serif KR", 900, "serif-900")]
for fam, w, name in FONTS:
    q = "https://fonts.googleapis.com/css2?family=" + fam.replace(" ", "+") + (f":wght@{w}" if w else "") + "&text=" + urllib.parse.quote(chars)
    css = urllib.request.urlopen(urllib.request.Request(q, headers={"User-Agent": "Mozilla/5.0 Chrome/120"})).read().decode()
    url = re.search(r"url\((.*?)\)", css).group(1)
    open(os.path.join(out, name + ".woff2"), "wb").write(urllib.request.urlopen(url).read())
print(f"{len(FONTS)} fonts, {len(chars)} glyphs -> {out}")
