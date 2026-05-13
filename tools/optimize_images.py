"""
One-shot image optimization: resize source images to 2.5x display size
and emit WebP siblings at 85% quality.

Source dimensions are taken from PageSpeed Insights mobile audit (the
"displayed dimensions" column). For images whose source is already
smaller than the 2.5x target, we keep the source dimensions (no upscaling).

Output: PNG/JPEG overwritten in place at the new dimensions, plus a
.webp sibling. HTML uses <picture> to serve WebP when supported.
"""
import os
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
os.chdir(ROOT)

# (relative_path, target_width, target_height)  — target = 2.5x display size
JOBS = [
    # Portfolio (huge files — biggest win)
    ('berlla-portfolio-assets/lebi-mobile.png',   375,  813),
    ('berlla-portfolio-assets/lebi-desktop.png', 1408,  885),
    ('berlla-portfolio-assets/irit-desktop.png', 1408,  880),
    ('berlla-portfolio-assets/irit-mobile.png',   375,  813),
    ('berlla-portfolio-assets/tali-desktop.png', 1408,  885),
    ('berlla-portfolio-assets/tali-mobile.png',   375,  813),
    # Person photos
    ('img/ella.jpeg',  658, 875),
    ('img/yuval.jpeg', 658, 875),
    # Hero brand
    ('img/berlla-wordmark.png', 1353, 370),
]

WEBP_QUALITY = 85
JPEG_QUALITY = 88

def fit_within(src_w: int, src_h: int, max_w: int, max_h: int) -> tuple[int, int]:
    """Return (w, h) that fits within (max_w, max_h) preserving aspect.
    Never upscales — if source is smaller than max, returns source dimensions."""
    if src_w <= max_w and src_h <= max_h:
        return src_w, src_h
    src_aspect = src_w / src_h
    max_aspect = max_w / max_h
    if src_aspect > max_aspect:
        new_w = max_w
        new_h = round(max_w / src_aspect)
    else:
        new_h = max_h
        new_w = round(max_h * src_aspect)
    return new_w, new_h


total_before = 0
total_after_webp = 0
total_after_fallback = 0

for rel_path, target_w, target_h in JOBS:
    src_path = Path(rel_path)
    img = Image.open(src_path)
    orig_w, orig_h = img.size
    size_before = src_path.stat().st_size
    total_before += size_before

    new_w, new_h = fit_within(orig_w, orig_h, target_w, target_h)

    if (new_w, new_h) != (orig_w, orig_h):
        img = img.resize((new_w, new_h), Image.LANCZOS)

    ext = src_path.suffix.lower()
    if ext in ('.jpg', '.jpeg'):
        if img.mode != 'RGB':
            img = img.convert('RGB')
        img.save(src_path, 'JPEG', quality=JPEG_QUALITY, optimize=True, progressive=True)
    elif ext == '.png':
        img.save(src_path, 'PNG', optimize=True)
    else:
        print(f'  SKIP unknown extension: {rel_path}')
        continue

    webp_path = src_path.with_suffix('.webp')
    img.save(webp_path, 'WEBP', quality=WEBP_QUALITY, method=6)

    size_fallback = src_path.stat().st_size
    size_webp = webp_path.stat().st_size
    total_after_webp += size_webp
    total_after_fallback += size_fallback

    print(f'{rel_path}')
    print(f'  {orig_w}x{orig_h} -> {new_w}x{new_h}')
    print(f'  {size_before/1024:>8.1f} KB  (source)')
    print(f'  {size_fallback/1024:>8.1f} KB  (resized fallback: {ext[1:]})')
    print(f'  {size_webp/1024:>8.1f} KB  (webp)')
    print(f'  Saved: {(size_before - size_webp)/1024:.1f} KB ({100*(1 - size_webp/size_before):.1f}%)')
    print()


print('=' * 60)
print(f'Total source weight:    {total_before/1024:>9.1f} KB')
print(f'Total WebP weight:      {total_after_webp/1024:>9.1f} KB  (modern browsers)')
print(f'Total fallback weight:  {total_after_fallback/1024:>9.1f} KB  (legacy browsers)')
print(f'WebP savings:           {(total_before - total_after_webp)/1024:>9.1f} KB  ({100*(1 - total_after_webp/total_before):.1f}%)')
