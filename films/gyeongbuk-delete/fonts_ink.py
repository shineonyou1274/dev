"""Google Font subsets for the characters used in ink.html + timing.json."""
import re, urllib.parse, urllib.request, os
chars = set(open('ink.html', encoding='utf-8').read() + open('timing.json', encoding='utf-8').read())
chars = ''.join(sorted(c for c in chars if ord(c) > 127)) + ''.join(chr(c) for c in range(32, 127))
os.makedirs('fonts', exist_ok=True)
for fam, w, name in [('East Sea Dokdo', None, 'brush'), ('Gowun Batang', 400, 'batang-400'), ('Gowun Batang', 700, 'batang-700')]:
    q = 'https://fonts.googleapis.com/css2?family=' + fam.replace(' ', '+') + (f':wght@{w}' if w else '') + '&text=' + urllib.parse.quote(chars)
    css = urllib.request.urlopen(urllib.request.Request(q, headers={'User-Agent': 'Mozilla/5.0 Chrome/120'})).read().decode()
    open(f'fonts/{name}.woff2', 'wb').write(urllib.request.urlopen(re.search(r'url\((.*?)\)', css).group(1)).read())
print(len(chars), 'chars')
