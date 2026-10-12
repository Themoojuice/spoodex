"""Builds og.png, the 1200x630 link-preview image (Reddit, Discord, iMessage...), from the owner's picked photos and a sticker.

    python tools/og.py <fonts folder> [--genera 53600,51934,...]

The fonts folder holds the app's Google Fonts as TTFs (build-time only, not shipped): SpecialElite.ttf, Fraunces.ttf,
FrauncesItalic.ttf, PlexMono.ttf (IBM Plex Mono SemiBold), from github.com/google/fonts. Photos are the owner's OWNER_PICKS,
read from spoodex.html, so a changed pick changes the image on the next run. Writes og.png in the repo root.
"""
import base64, io, re, sys, urllib.request
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent.parent
W, H = 1200, 630
BG, PANEL, INK, MUTED, LINE, RULE = '#e7d8b9', '#f4ead3', '#2b2419', '#6b5b43', '#b9a57d', '#dccaa4'
NAMES = {53600: 'Maratus', 51934: 'Portia', 194789: 'Mopsus', 362604: 'Cosmophasis', 51780: 'Myrmarachne'}


def font(folder, name, size, var=None):
    f = ImageFont.truetype(str(Path(folder) / name), size)
    if var:
        try: f.set_variation_by_axes(var)
        except Exception: pass
    return f


def photo(gid, html):
    m = re.search(rf'\b{gid}:\[(\d+),\'([\d.a-z]+)\'\]', html)
    pid, ext = m.group(2).split('.')
    url = f'https://static.inaturalist.org/photos/{pid}/medium.{ext}'
    req = urllib.request.Request(url, headers={'User-Agent': 'spoodex-og-build'})
    return Image.open(io.BytesIO(urllib.request.urlopen(req).read())).convert('RGB')


def sticker(html, i=0):
    block = html[html.index('const STICKERS'):]
    uris = re.findall(r"data:image/webp;base64,([A-Za-z0-9+/=]+)", block)
    return Image.open(io.BytesIO(base64.b64decode(uris[i]))).convert('RGBA')


def main():
    fonts = sys.argv[1]
    genera = [int(x) for x in sys.argv[sys.argv.index('--genera') + 1].split(',')] if '--genera' in sys.argv else list(NAMES)
    html = (ROOT / 'spoodex.html').read_text(encoding='utf-8')
    im = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(im)
    for y in range(40, H, 34): d.line([(0, y), (W, y)], fill=RULE, width=1)   # the notebook's ruled lines

    title = font(fonts, 'SpecialElite.ttf', 132)
    d.text((54, 34), 'SPOODEX', font=title, fill=INK)
    pitch = font(fonts, 'Fraunces.ttf', 36, [36, 400, 0, 0])
    for i, ln in enumerate(['A Pokédex for jumping spiders, filled', 'in from your own iNaturalist photos.']):
        d.text((60, 186 + i * 46), ln, font=pitch, fill=INK)

    st = sticker(html, 0)
    st.thumbnail((250, 250))
    st = st.rotate(-7, expand=True, resample=Image.BICUBIC)
    im.paste(st, (W - st.width - 40, 16), st)

    n, gap, top = len(genera), 24, 318
    cw = (W - 2 * 48 - gap * (n - 1)) // n
    ph_h, lab = cw - 6, 62
    nm = font(fonts, 'FrauncesItalic.ttf', 27, [36, 600, 0, 0])
    for i, gid in enumerate(genera):
        x = 48 + i * (cw + gap)
        d.rectangle([x, top, x + cw, top + ph_h + lab], fill=PANEL, outline=LINE, width=2)
        p = ImageOps.fit(photo(gid, html), (cw - 12, ph_h - 12), Image.LANCZOS)
        im.paste(p, (x + 6, top + 6))
        name = NAMES.get(gid) or str(gid)
        tw = d.textlength(name, font=nm)
        d.text((x + (cw - tw) / 2, top + ph_h + 12), name, font=nm, fill=INK)
    url = font(fonts, 'PlexMono.ttf', 21)
    d.text((48, H - 34), 'themoojuice.github.io/spoodex', font=url, fill=MUTED)
    credit = 'Photos and art © themoojuice'
    d.text((W - 48 - d.textlength(credit, font=url), H - 34), credit, font=url, fill=MUTED)
    im.save(ROOT / 'og.png', optimize=True)
    print('og.png', im.size, (ROOT / 'og.png').stat().st_size, 'bytes')


if __name__ == '__main__':
    main()
