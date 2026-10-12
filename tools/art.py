"""Build SPOODEX's artwork: the owner's sticker and painted-plate art, web-sized into art/, listed in spoodex.html's ART block.

Each source image becomes art/<id>.webp, where <id> is the first 10 hex digits of the SHA-1 of the source file, so the same file
always gets the same id and re-runs only add what's new:
  - stickers (a die-cut white border on a plain dark or light background): cut out along the border, transparent, 480 px long edge;
  - painted plates (everything else): 1000 px long edge.
Near-duplicates (perceptual hash within 6) and phone screenshots are skipped. Tags (genus, record) come from art/tags.json, which
the owner writes in the app (⚙ → Tag the artwork → Copy all) and pastes here; untagged art is still built, shown nowhere a genus is
needed, and waits in the tagging tool.

Usage (from the repo root; needs Pillow, numpy, scipy, imagehash):
  python tools/art.py SOURCE_FOLDER            # report what would change
  python tools/art.py SOURCE_FOLDER --write    # write art/*.webp and replace the ART block in spoodex.html
Not shipped with the site: spoodex.html only carries the generated list, and art/ the images.
"""
import hashlib, io, json, os, sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as nd
import imagehash

BEGIN, END = '// ART:begin', '// ART:end'
OUT = 'art'
STICKER_PX, PLATE_PX = 480, 1000


def ring_mask(im, light):
    """The sticker: the biggest white region (its die-cut border) with everything inside it filled."""
    a = np.asarray(im).astype(int)
    border = np.concatenate([a[:4].reshape(-1, 3), a[-4:].reshape(-1, 3), a[:, :4].reshape(-1, 3), a[:, -4:].reshape(-1, 3)])
    bg = np.median(border, axis=0)
    thr = (bg.min() + 255) / 2 + 4 if light else 185
    white = a.min(axis=2) > thr
    lab, n = nd.label(white)
    if not n:
        return None
    ring = lab == (np.argmax(nd.sum(white, lab, range(1, n + 1))) + 1)
    mask = nd.binary_opening(nd.binary_fill_holes(ring), iterations=2)
    lab, n = nd.label(mask)
    if not n:
        return None
    mask = lab == (np.argmax(nd.sum(mask, lab, range(1, n + 1))) + 1)
    # a real die-cut border is a band around a much bigger filled shape; a painting's stray highlights aren't
    return mask if 0.03 < mask.mean() < 0.85 and 0.06 < (ring & mask).sum() / mask.sum() < 0.6 else None


def classify(path):
    im = Image.open(path).convert('RGB')
    a = np.asarray(im).astype(int)
    dark = a.min(axis=2) < 60
    if dark.mean() > 0.3:   # a white page margin around a dark scene
        bb = Image.fromarray((dark * 255).astype('uint8')).getbbox()
        if bb and bb[2] - bb[0] < im.width - 20:
            im = im.crop((bb[0] + 6, bb[1] + 6, bb[2] - 6, bb[3] - 6))
            a = np.asarray(im).astype(int)
    border = np.concatenate([a[:6].reshape(-1, 3), a[-6:].reshape(-1, 3), a[:, :6].reshape(-1, 3), a[:, -6:].reshape(-1, 3)])
    bmean, bstd, mask = border.mean(), border.std(axis=0).mean(), None
    if bmean < 90:   # dark backgrounds, plain, vignetted or textured
        mask = ring_mask(im, False)
    elif bmean > 190:   # light: a plain sheet, white, or a checkerboard "transparent" background
        mask = ring_mask(im, True) if bstd < 14 else None
        if mask is None:
            im, mask = white_sticker(im, 215 if bstd < 14 else 190)
    if mask is not None:
        alpha = Image.fromarray((mask * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(1.2))
        rgba = im.copy()
        rgba.putalpha(alpha)
        return 's', rgba.crop(Image.fromarray((mask * 255).astype('uint8')).getbbox())
    return 'p', im


def white_sticker(im, thr=215):
    """A sticker on a white background, where its white border can't be told from the page: find the spider, redraw the border."""
    a = np.asarray(im).astype(int)
    spider = nd.binary_closing(a.min(axis=2) < thr, iterations=3)
    lab, n = nd.label(spider)
    if not n:
        return im, None
    spider = nd.binary_fill_holes(lab == (np.argmax(nd.sum(spider, lab, range(1, n + 1))) + 1))
    if not 0.02 < spider.mean() < 0.6:
        return im, None
    border = nd.binary_fill_holes(nd.binary_dilation(spider, iterations=max(8, round(max(im.size) / 64))))
    b = a.copy()
    b[border & ~spider] = 255
    return Image.fromarray(b.astype('uint8')), border


def main(argv):
    if len(argv) < 2:
        sys.exit(__doc__)
    src, write = argv[1], '--write' in argv
    tags = json.load(open(os.path.join(OUT, 'tags.json'), encoding='utf-8')) if os.path.exists(os.path.join(OUT, 'tags.json')) else {}
    files = sorted(f for f in os.listdir(src) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')) and 'screenshot' not in f.lower())
    items, seen = [], []
    for f in files:
        path = os.path.join(src, f)
        aid = hashlib.sha1(open(path, 'rb').read()).hexdigest()[:10]
        k, im = classify(path)
        flat = im if k == 'p' else Image.alpha_composite(Image.new('RGBA', im.size, (128, 128, 128, 255)), im).convert('RGB')
        h = imagehash.phash(flat)
        if any(h - s <= 6 for s in seen):
            print('  duplicate, skipped:', f)
            continue
        seen.append(h)
        im.thumbnail((STICKER_PX, STICKER_PX) if k == 's' else (PLATE_PX, PLATE_PX), Image.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, 'WEBP', quality=80, method=6)
        if write:
            os.makedirs(OUT, exist_ok=True)
            open(os.path.join(OUT, aid + '.webp'), 'wb').write(buf.getvalue())
        t = tags.get(aid, {})
        # v: the built file's fingerprint, put in its URL so a re-cut image never comes from an old cache (the id stays the source's)
        items.append({'id': aid, 'v': hashlib.sha1(buf.getvalue()).hexdigest()[:6], 'k': k, 'w': im.width, 'h': im.height,
                      'g': t.get('g'), 'gn': t.get('gn'), 'o': t.get('o')})
    tagged = sum(1 for x in items if x['g'])
    print(f"{len(items)} artworks ({sum(x['k'] == 's' for x in items)} stickers, {sum(x['k'] == 'p' for x in items)} plates), {tagged} tagged")
    lines = [f"// ART:begin (generated by tools/art.py; edit art/tags.json or use ⚙ → Tag the artwork, not this list)",
             'const ART = ['] + [
        '  ' + json.dumps({k: v for k, v in x.items() if v is not None}, separators=(',', ':')) + ',' for x in items] + ['];']
    if write:
        html = open('spoodex.html', encoding='utf-8').read()
        a, b = html.index(BEGIN), html.index(END)
        html = html[:a] + '\n'.join(lines) + '\n' + html[b:]
        open('spoodex.html', 'w', encoding='utf-8').write(html)
        print('wrote art/ and the ART block')


if __name__ == '__main__':
    main(sys.argv)
