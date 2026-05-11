"""
Generate SEO image assets from the existing BERLLA footer logo.

Outputs:
  img/og-cover.jpg    — 1200x630 social share image
  favicon.svg         — vector favicon (PNG-wrapped for placeholder simplicity)
  favicon-96.png      — 96x96 PNG fallback favicon
  apple-touch-icon.png — 180x180 iOS home-screen icon

Re-run anytime the source logo changes:
  python tools/generate_seo_assets.py
"""
import base64
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SRC_LOGO = ROOT / "img" / "berlla-footer-logo.png"

# Brand colors (match index.html body gradient)
BURGUNDY_TOP = (122, 36, 64)    # #7a2440
BURGUNDY_BOT = (58, 15, 29)     # #3a0f1d
CREAM = "#F5ECE7"


def gradient_bg(width: int, height: int, top_rgb: tuple, bot_rgb: tuple) -> Image.Image:
    """Vertical linear gradient from top_rgb to bot_rgb."""
    img = Image.new("RGB", (width, height), top_rgb)
    draw = ImageDraw.Draw(img)
    for y in range(height):
        t = y / max(1, height - 1)
        r = int(top_rgb[0] * (1 - t) + bot_rgb[0] * t)
        g = int(top_rgb[1] * (1 - t) + bot_rgb[1] * t)
        b = int(top_rgb[2] * (1 - t) + bot_rgb[2] * t)
        draw.line([(0, y), (width, y)], fill=(r, g, b))
    return img


def find_hebrew_font(size: int) -> ImageFont.FreeTypeFont:
    """Return a Pillow font that renders Hebrew. Fall back through Windows fonts."""
    candidates = [
        "C:/Windows/Fonts/heebo-bold.ttf",
        "C:/Windows/Fonts/Heebo-Bold.ttf",
        "C:/Windows/Fonts/arialbd.ttf",   # Arial Bold ships with Windows + has Hebrew
        "C:/Windows/Fonts/tahomabd.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def make_og_cover(out_path: Path) -> None:
    """1200x630 burgundy gradient + centered logo + Hebrew tagline below."""
    W, H = 1200, 630
    img = gradient_bg(W, H, BURGUNDY_TOP, BURGUNDY_BOT)
    draw = ImageDraw.Draw(img)

    # Place logo centered horizontally, upper-half vertically
    logo = Image.open(SRC_LOGO).convert("RGBA")
    target_w = 520
    aspect = logo.height / logo.width
    target_h = int(target_w * aspect)
    logo = logo.resize((target_w, target_h), Image.LANCZOS)
    logo_x = (W - target_w) // 2
    logo_y = 120
    img.paste(logo, (logo_x, logo_y), logo)

    # Tagline below logo, Hebrew RTL
    tagline = "עיצוב ובניית דפי נחיתה ממירים"
    font = find_hebrew_font(56)
    bbox = draw.textbbox((0, 0), tagline, font=font)
    text_w = bbox[2] - bbox[0]
    text_x = (W - text_w) // 2
    text_y = logo_y + target_h + 60
    draw.text((text_x, text_y), tagline, font=font, fill=CREAM)

    img.save(out_path, "JPEG", quality=88, optimize=True, progressive=True)
    size_kb = out_path.stat().st_size / 1024
    print(f"  og-cover.jpg: {size_kb:.1f} KB")
    if size_kb > 300:
        print(f"  WARNING: og-cover.jpg exceeds 300KB target ({size_kb:.1f} KB)")


def make_favicons(out_dir: Path) -> None:
    """Crop the source logo to a centered square, then resize to favicon sizes."""
    src = Image.open(SRC_LOGO).convert("RGBA")
    sq = src.height
    left = (src.width - sq) // 2
    favicon_src = src.crop((left, 0, left + sq, sq))

    fav96 = favicon_src.resize((96, 96), Image.LANCZOS)
    fav96_path = out_dir / "favicon-96.png"
    fav96.save(fav96_path, "PNG", optimize=True)
    print(f"  favicon-96.png: {fav96_path.stat().st_size / 1024:.1f} KB")

    apple = favicon_src.resize((180, 180), Image.LANCZOS)
    apple_path = out_dir / "apple-touch-icon.png"
    apple.save(apple_path, "PNG", optimize=True)
    print(f"  apple-touch-icon.png: {apple_path.stat().st_size / 1024:.1f} KB")

    # SVG wraps the 96x96 PNG as a data URL — valid SVG, scales at any size.
    # Trade-off: not a true vector. For a placeholder this is fine.
    with fav96_path.open("rb") as f:
        png_b64 = base64.b64encode(f.read()).decode("ascii")
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">'
        f'<image href="data:image/png;base64,{png_b64}" width="96" height="96"/>'
        "</svg>\n"
    )
    svg_path = out_dir / "favicon.svg"
    svg_path.write_text(svg, encoding="utf-8")
    print(f"  favicon.svg: {svg_path.stat().st_size / 1024:.1f} KB")


def main() -> None:
    if not SRC_LOGO.exists():
        raise SystemExit(f"Source logo not found: {SRC_LOGO}")

    print(f"Source: {SRC_LOGO}")
    print(f"Output dir: {ROOT}")
    print()

    make_og_cover(ROOT / "img" / "og-cover.jpg")
    make_favicons(ROOT)
    print("\nDone.")


if __name__ == "__main__":
    main()
