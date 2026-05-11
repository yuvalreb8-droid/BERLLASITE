# BERLLA SEO Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Approach-A SEO foundations to `berlla.site` — title/description, social-share previews, structured data, crawler files, favicons, and a keyword-rich H1 — so the site is eligible to rank in Google and looks polished when shared on WhatsApp/LinkedIn/iMessage.

**Architecture:** Single-page static site at `index.html` plus 3 new root-level files (`robots.txt`, `sitemap.xml`, favicon set) and 1 new image asset (`img/og-cover.jpg`). All meta tags + JSON-LD live in the existing `<head>` block. Image assets generated programmatically from the existing `berlla-footer-logo.png` so they're swappable later without code changes.

**Tech Stack:** Plain HTML / CSS / JSON-LD. Python 3 + Pillow for one-shot image generation (already installed). No JS changes, no new dependencies.

**Design spec:** `docs/superpowers/specs/2026-05-11-berlla-seo-design.md` — read this first for context on every decision.

---

## File Structure

### Files modified
- `index.html` — head block (title replacement + ~80 lines of new meta/link/script tags), `<style>` block (split body bg + new utility class), H1 line at ~2773

### Files created
- `robots.txt` — site root, crawler directives
- `sitemap.xml` — site root, 5 URLs
- `img/og-cover.jpg` — 1200×630 social share image
- `favicon.svg` — modern browser favicon
- `favicon-96.png` — fallback favicon
- `apple-touch-icon.png` — iOS home screen icon, 180×180
- `tools/generate_seo_assets.py` — Python script that produces the 4 images above (kept in repo so Ella can re-run if needed)

### Files NOT touched
- `legal/*.html` (4 legal pages) — already complete for SEO purposes
- All `_*.html`, `preview-*.html`, `*-preview.html` working files — protected by `robots.txt` Disallow
- All `.css` files — utility class added to existing inline `<style>` in `index.html`

---

## Task 1: Generate SEO image assets

**Why first:** Several later tasks reference these image files in meta tags. Generating them up front means the meta-tag tasks can verify the file paths resolve.

**Files:**
- Create: `tools/generate_seo_assets.py`
- Create: `img/og-cover.jpg`
- Create: `favicon.svg`
- Create: `favicon-96.png`
- Create: `apple-touch-icon.png`

- [ ] **Step 1: Create the tools directory**

```bash
mkdir -p tools
```

Expected: directory exists, no error.

- [ ] **Step 2: Write `tools/generate_seo_assets.py`**

```python
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
```

- [ ] **Step 3: Run the generator**

```bash
python tools/generate_seo_assets.py
```

Expected output:
```
Source: C:\Users\YuvalBer\Desktop\berlla-site\img\berlla-footer-logo.png
Output dir: C:\Users\YuvalBer\Desktop\berlla-site

  og-cover.jpg: <NUMBER> KB
  favicon-96.png: <NUMBER> KB
  apple-touch-icon.png: <NUMBER> KB
  favicon.svg: <NUMBER> KB

Done.
```

If `og-cover.jpg` is over 300KB, lower the `quality` parameter from 88 to 80 in the script and re-run.

- [ ] **Step 4: Verify all 4 files exist**

```bash
ls -la img/og-cover.jpg favicon.svg favicon-96.png apple-touch-icon.png
```

Expected: all 4 files present, none zero-byte.

- [ ] **Step 5: Spot-check `og-cover.jpg` visually**

Open `img/og-cover.jpg` in any image viewer. Verify:
- Burgundy gradient (top brighter, bottom darker)
- BERLLA navy ellipse logo centered horizontally, upper-half
- Hebrew tagline "עיצוב ובניית דפי נחיתה ממירים" in cream below the logo
- No text cut off

If anything looks broken, adjust the script and re-run.

- [ ] **Step 6: Commit**

```bash
git add tools/generate_seo_assets.py img/og-cover.jpg favicon.svg favicon-96.png apple-touch-icon.png
git commit -m "seo: generate placeholder OG cover + favicon assets

Programmatic generation from existing berlla-footer-logo.png so Ella can
swap with custom designs later without touching code. Run script to
regenerate: python tools/generate_seo_assets.py"
```

---

## Task 2: Replace placeholder `<title>` and add meta description

**Files:**
- Modify: `index.html:14` (existing `<title>`)

- [ ] **Step 1: Verify current title is the placeholder**

```bash
grep -n "תצוגה מקדימה" index.html
```

Expected:
```
14:  <title>BERLLA — תצוגה מקדימה למבנה הדף הראשי</title>
```

- [ ] **Step 2: Replace title and add meta description**

Find this block in `index.html` (around lines 13-14):
```html
       the BOTTOM edge via the calc(100lvh + safe-area-inset-bottom) rule. -->
  <title>BERLLA — תצוגה מקדימה למבנה הדף הראשי</title>
```

Replace with:
```html
       the BOTTOM edge via the calc(100lvh + safe-area-inset-bottom) rule. -->
  <title>עיצוב ובניית דפי נחיתה | BERLLA</title>
  <meta name="description" content="עיצוב ובניית דפי נחיתה ממירים לעסקים שלא מסתפקים בגנרי. BERLLA משלבת עיצוב מדויק, קופי שמוכר ופסיכולוגיה צרכנית — שהופכים מבקרים ללקוחות. בואו נדבר.">
```

- [ ] **Step 3: Verify replacement**

```bash
grep -n "<title>\|name=\"description\"" index.html
```

Expected:
```
14:  <title>עיצוב ובניית דפי נחיתה | BERLLA</title>
15:  <meta name="description" content="עיצוב ובניית דפי נחיתה ממירים...בואו נדבר.">
```

The "תצוגה מקדימה" string should no longer appear:
```bash
grep -n "תצוגה מקדימה" index.html
```
Expected: no matches.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "seo: real <title> + meta description

Replace placeholder preview-mode title with keyword-first
'עיצוב ובניית דפי נחיתה | BERLLA' (35 chars). Add meta description
quoting the hero copy with 'בואו נדבר' CTA matching the contact
section."
```

---

## Task 3: Add canonical URL, theme-color, and split body background

**Files:**
- Modify: `index.html` (head, after meta description)
- Modify: `index.html:61` (body `background:` shorthand)

- [ ] **Step 1: Add canonical and theme-color tags**

Insert this block immediately after the `<meta name="description">` line added in Task 2:

```html
  <link rel="canonical" href="https://berlla.site/">
  <meta name="theme-color" content="#7a2440" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#7a2440" media="(prefers-color-scheme: dark)">
```

- [ ] **Step 2: Split the body `background:` shorthand**

Find this rule (around `index.html:55-67`):

```css
    body {
      font-family: 'Heebo', system-ui, -apple-system, sans-serif;
      color: #0E1629;
      /* Layered burgundy gradient ending at #120408 to match the contact
         section's darkest gradient stop — kills the visual seam between
         body bg and contact-hero now that no footer covers the gap. */
      background: linear-gradient(to bottom, #7a2440 0%, #7a2440 25%, #3a0f1d 60%, #120408 100%);
      line-height: 1.6;
```

Replace the `background:` line with these two lines:

```css
      /* Solid background-color set EXPLICITLY (not via shorthand) so iOS 26
         Safari samples it for the URL-bar tint — it does not sample gradients.
         See feedback_ios_safari_webgl_safe_area memory note. */
      background-color: #7a2440;
      background-image: linear-gradient(to bottom, #7a2440 0%, #7a2440 25%, #3a0f1d 60%, #120408 100%);
```

- [ ] **Step 3: Verify the split**

```bash
grep -n "background-color: #7a2440\|background-image: linear-gradient" index.html
```

Expected:
```
<line>:      background-color: #7a2440;
<line>:      background-image: linear-gradient(to bottom, #7a2440 0%, #7a2440 25%, #3a0f1d 60%, #120408 100%);
```

The old `background:` shorthand should be gone:
```bash
grep -nE "^\s*background:\s*linear-gradient\(to bottom, #7a2440" index.html
```
Expected: no matches.

- [ ] **Step 4: Visual sanity check**

Open `index.html` in a browser. The page background should look identical to before — the gradient still renders, the `background-color` is just a fallback that the gradient overlays.

If the page looks different, the split was incorrect. The gradient must remain fully visible on top of the solid color.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "seo: canonical URL + theme-color + body bg split

Canonical URL prevents duplicate-content split across www/utm/index.html
variants. theme-color tints mobile browser chrome burgundy.

Body background: shorthand split into separate background-color and
background-image so iOS 26 Safari samples #7a2440 for the URL-bar tint
(it ignores gradients). Gradient still renders identically on top."
```

---

## Task 4: Add Open Graph + Twitter Card tags

**Files:**
- Modify: `index.html` (head, after the canonical/theme-color block from Task 3)

- [ ] **Step 1: Add OG + Twitter block**

Insert this block immediately after the second `<meta name="theme-color">` line:

```html

  <!-- Open Graph (Facebook, WhatsApp, LinkedIn, iMessage share previews) -->
  <meta property="og:type" content="website">
  <meta property="og:locale" content="he_IL">
  <meta property="og:site_name" content="BERLLA">
  <meta property="og:title" content="עיצוב ובניית דפי נחיתה | BERLLA">
  <meta property="og:description" content="עיצוב ובניית דפי נחיתה ממירים לעסקים שלא מסתפקים בגנרי. עיצוב מדויק, קופי שמוכר, פסיכולוגיה צרכנית.">
  <meta property="og:url" content="https://berlla.site/">
  <meta property="og:image" content="https://berlla.site/img/og-cover.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="BERLLA — סטודיו לעיצוב ובניית דפי נחיתה">

  <!-- Twitter Card (X / Twitter; some other platforms read these too) -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="עיצוב ובניית דפי נחיתה | BERLLA">
  <meta name="twitter:description" content="עיצוב ובניית דפי נחיתה ממירים לעסקים שלא מסתפקים בגנרי.">
  <meta name="twitter:image" content="https://berlla.site/img/og-cover.jpg">
  <meta name="twitter:image:alt" content="BERLLA — סטודיו לעיצוב ובניית דפי נחיתה">
```

- [ ] **Step 2: Verify tags inserted correctly**

```bash
grep -c "og:" index.html
grep -c "twitter:" index.html
```

Expected:
```
10
5
```

- [ ] **Step 3: Verify image path resolves**

```bash
ls -la img/og-cover.jpg
```

Expected: file exists, ~30-200KB.

- [ ] **Step 4: Confirm zero `{{DOMAIN}}` placeholders remain in head**

```bash
grep -n "{{DOMAIN}}" index.html
```

Expected: no matches.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "seo: Open Graph + Twitter Card link previews

Pasting berlla.site into WhatsApp/LinkedIn/iMessage now produces a
branded preview with the burgundy OG cover image and Hebrew tagline
instead of a blank/random unfurl. og:locale=he_IL gets localized UI
on supporting platforms."
```

---

## Task 5: Add favicon link tags

**Files:**
- Modify: `index.html` (head, after the Twitter Card block from Task 4)

- [ ] **Step 1: Add favicon link tags**

Insert this block immediately after the `twitter:image:alt` line:

```html

  <!-- Favicon set: SVG for modern browsers, PNG fallback, apple-touch-icon for iOS home screen -->
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
```

- [ ] **Step 2: Verify all 3 favicon files exist at root**

```bash
ls -la favicon.svg favicon-96.png apple-touch-icon.png
```

Expected: all 3 files present.

- [ ] **Step 3: Verify in browser**

Open `index.html` in Chrome. Look at the browser tab — should show the BERLLA navy ellipse icon (small but recognizable) instead of a blank page icon.

If still blank: hard-refresh (Ctrl+Shift+R) to bust the favicon cache.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "seo: favicon set (SVG + PNG fallback + apple-touch-icon)

Browser tabs and iOS home screens now show the BERLLA logo instead of
a blank icon. Files generated by tools/generate_seo_assets.py from the
existing berlla-footer-logo.png — Ella can replace any of the 3 files
with custom designs without code changes."
```

---

## Task 6: Create `robots.txt`

**Files:**
- Create: `robots.txt` (site root)

- [ ] **Step 1: Create the file**

```bash
cat > robots.txt << 'EOF'
User-agent: *
Allow: /

# Block crawlers from internal/preview files that may be present in deploys
Disallow: /_*
Disallow: /preview-*

# Sitemap location
Sitemap: https://berlla.site/sitemap.xml
EOF
```

(On Windows PowerShell, use `Set-Content -Encoding UTF8 -Path robots.txt -Value @'...'@` — or just create the file with any editor. Content matters, method doesn't.)

- [ ] **Step 2: Verify content**

```bash
cat robots.txt
```

Expected: exact content above, including the blank line before `Sitemap:`.

- [ ] **Step 3: Verify file is at site root (not nested)**

```bash
ls -la robots.txt
```

Expected: file present at the same level as `index.html`.

- [ ] **Step 4: Commit**

```bash
git add robots.txt
git commit -m "seo: robots.txt allowing all crawlers + sitemap pointer

AI crawlers (GPTBot, ClaudeBot, PerplexityBot) explicitly NOT blocked —
maximum visibility including in AI search products. _*/preview-*
patterns block dev files from accidental deploy indexing."
```

---

## Task 7: Create `sitemap.xml`

**Files:**
- Create: `sitemap.xml` (site root)

- [ ] **Step 1: Create the file**

Write `sitemap.xml` with this exact content:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://berlla.site/</loc>
    <lastmod>2026-05-11</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://berlla.site/legal/accessibility.html</loc>
    <lastmod>2026-05-11</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>https://berlla.site/legal/privacy.html</loc>
    <lastmod>2026-05-11</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>https://berlla.site/legal/terms.html</loc>
    <lastmod>2026-05-11</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>https://berlla.site/legal/cookies.html</loc>
    <lastmod>2026-05-11</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
</urlset>
```

- [ ] **Step 2: Verify content**

```bash
cat sitemap.xml
```

Expected: exact content above.

- [ ] **Step 3: Verify all 4 referenced legal pages exist**

```bash
ls -la legal/accessibility.html legal/privacy.html legal/terms.html legal/cookies.html
```

Expected: all 4 files exist. If any are missing, do not commit — fix the sitemap to match reality.

- [ ] **Step 4: Validate XML well-formedness**

```bash
python -c "import xml.etree.ElementTree as ET; ET.parse('sitemap.xml'); print('OK')"
```

Expected: `OK`. If error, fix the XML.

- [ ] **Step 5: Commit**

```bash
git add sitemap.xml
git commit -m "seo: sitemap.xml with homepage + 4 legal pages

Homepage priority 1.0 (the page that should rank), legal pages 0.3
(required to exist by Israeli law, not meant to rank for substance).
lastmod = today's date; update on meaningful content changes."
```

---

## Task 8: Add JSON-LD Organization structured data

**Files:**
- Modify: `index.html` (head, after the favicon block from Task 5)

- [ ] **Step 1: Add the JSON-LD block**

Insert this block immediately after the `apple-touch-icon` link line (the favicon block was the last thing added to head):

```html

  <!-- Structured data: Organization schema. Tells Google explicitly what
       BERLLA is — brand identity, contact, address, founders. Address
       data is the single source of truth from the legal strip in <body>. -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "BERLLA",
    "alternateName": "ברלה",
    "url": "https://berlla.site/",
    "logo": "https://berlla.site/img/berlla-footer-logo.png",
    "image": "https://berlla.site/img/og-cover.jpg",
    "description": "סטודיו לעיצוב ובניית דפי נחיתה ממירים. שילוב של עיצוב מדויק, קופי שמוכר ופסיכולוגיה צרכנית.",
    "email": "berlla.business.contact@gmail.com",
    "telephone": "+972-58-440-4822",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "שבטי ישראל 37/א",
      "addressLocality": "קריית ביאליק",
      "addressCountry": "IL"
    },
    "founder": [
      { "@type": "Person", "name": "אלה בר" },
      { "@type": "Person", "name": "יובל בר" }
    ],
    "sameAs": []
  }
  </script>
```

- [ ] **Step 2: Validate JSON syntax**

Extract the JSON block and parse it to ensure it's valid:

```bash
python -c "
import re, json
html = open('index.html', encoding='utf-8').read()
m = re.search(r'<script type=\"application/ld\+json\">\s*(\{.*?\})\s*</script>', html, re.DOTALL)
assert m, 'JSON-LD script block not found'
data = json.loads(m.group(1))
print('Valid JSON-LD. Type:', data.get('@type'), '| Name:', data.get('name'))
"
```

Expected:
```
Valid JSON-LD. Type: Organization | Name: BERLLA
```

If JSON parse fails, the structured data is broken — fix syntax (likely a missing comma or unescaped quote) and re-validate.

- [ ] **Step 3: Verify contact data matches the legal strip**

The email, phone, and address in the JSON-LD must match the legal strip in `<body>` exactly:

```bash
grep -n "berlla.business.contact@gmail.com\|972-58-440-4822\|972584404822\|שבטי ישראל" index.html
```

Cross-check that the JSON-LD values match what's already shown to humans in the legal strip. If you change the values in the JSON-LD, also update the legal strip — and vice versa. (For this task, no change to legal strip is needed; we're matching what's already there.)

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "seo: JSON-LD Organization structured data

Single Organization schema (not LocalBusiness — user wants nationwide
reach, not local-pack treatment). alternateName 'ברלה' helps Google
connect Hebrew transliteration searches to the brand. sameAs is an
empty array for now; add social profile URLs when they exist."
```

---

## Task 9: Add `.visually-hidden` utility + fix the H1

**Files:**
- Modify: `index.html` `<style>` block (add utility class)
- Modify: `index.html:2773` (H1)

- [ ] **Step 1: Add the `.visually-hidden` utility**

Find the `/* Skip link */` rule (around `index.html:109-120`):

```css
    /* Skip link */
    .skip-link {
      position: absolute;
      right: 0;
      top: -100px;
```

Insert this rule immediately BEFORE the `/* Skip link */` comment:

```css
    /* WebAIM-standard utility — keeps text visible to screen readers
       AND search engines but invisible to sighted users. Used inside the
       hero <h1> so the heading carries keyword-rich text without changing
       the all-image hero design. NOT display:none / visibility:hidden —
       both of those hide from assistive tech AND from search indexers. */
    .visually-hidden {
      position: absolute;
      width: 1px; height: 1px;
      padding: 0; margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    /* Skip link */
```

- [ ] **Step 2: Update the H1**

Find the H1 at `index.html:2773`:

```html
      <h1 class="hero-brand"><img src="img/berlla-wordmark.png" alt="BERLLA"></h1>
```

Replace with:

```html
      <h1 class="hero-brand">
        <img src="img/berlla-wordmark.png" alt="">
        <span class="visually-hidden">BERLLA — סטודיו לעיצוב ובניית דפי נחיתה ממירים</span>
      </h1>
```

Two changes inside the H1:
1. `alt="BERLLA"` → `alt=""` (image becomes decorative because the H1 text now contains the brand name)
2. New `<span class="visually-hidden">` carrying the keyword-rich H1 text

- [ ] **Step 3: Verify changes**

```bash
grep -n "visually-hidden" index.html
```

Expected: at least 2 matches:
- One in the `<style>` block (the utility class definition)
- One in the H1 (the span)

- [ ] **Step 4: Visual verification — hero must look identical**

Open `index.html` in a browser at desktop width (≥1440px). The hero section must look identical to before:
- Wordmark image in same position
- Same size
- No new visible text near the wordmark

Then resize the browser window through these widths:
- 375px (mobile)
- 768px (tablet)
- 1440px (desktop)
- 2560px (large desktop)

At every width, the hero must look unchanged. The `.visually-hidden` rule uses `position: absolute` + `width: 1px`, so the span is removed from layout flow and cannot affect the wordmark image position.

If anything shifts, the issue is likely a CSS conflict with the H1's `line-height: 0`. In that case, add `line-height: normal` to the `.visually-hidden` rule and re-test.

- [ ] **Step 5: Accessibility verification — screen reader announcement**

If you have a screen reader available (NVDA on Windows, VoiceOver on Mac), navigate to the H1. It should announce:

> "Heading level 1: BERLLA — סטודיו לעיצוב ובניית דפי נחיתה ממירים"

(NOT "BERLLA BERLLA — ..." — that would mean the image alt wasn't cleared, which is a bug.)

If no screen reader available, this step is best-effort. Pre-commit checklist will catch issues later.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "seo: keyword-rich H1 via visually-hidden text

Image-only H1 told Google the page was about 'BERLLA' (alt text). New
visually-hidden span gives the H1 the same keyword-rich text as the
title/og:title, while keeping the wordmark-only hero design.

Image alt cleared to '' so screen readers don't announce the brand
name twice."
```

---

## Task 10: Final cross-surface verification

**Files:** none modified — verification only.

- [ ] **Step 1: Confirm no `{{DOMAIN}}` placeholders remain anywhere**

```bash
grep -rn "{{DOMAIN}}" .
```

Expected: no matches. If anything found, fix it before claiming the work done.

- [ ] **Step 2: Confirm preview-mode title is fully gone**

```bash
grep -rn "תצוגה מקדימה" index.html
```

Expected: no matches.

- [ ] **Step 3: Validate all JSON-LD with Google's tester**

The site needs to be deployed to a public URL for Google's tester to work. If the site is not yet live at `berlla.site`:

- Either deploy first, then run this step
- Or use the "Code" mode of [Google Rich Results Test](https://search.google.com/test/rich-results) and paste just the JSON-LD `<script>` block

Expected: "Page is eligible for rich results" with the Organization schema detected.

- [ ] **Step 4: Validate OG previews after deploy**

After deploying to `https://berlla.site/`:

- Paste the URL into [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) → click "Scrape Again"
- Paste the URL into [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)
- (Optional) Paste into [Twitter Card Validator](https://cards-dev.twitter.com/validator) — note: tool is sometimes unavailable

Expected on each: the burgundy OG cover image renders with the Hebrew tagline visible, title shows "עיצוב ובניית דפי נחיתה | BERLLA", description shows the OG description.

If FB shows an old/blank preview, click "Scrape Again" — Facebook caches OG data aggressively.

- [ ] **Step 5: Visual smoke test in real browsers**

After deploy, load `https://berlla.site/` in:
- Chrome (desktop) — favicon visible in tab; page renders normally
- Safari (iPhone, iOS 26 if available) — URL bar tinted burgundy; favicon visible if added to home screen
- Firefox (desktop) — favicon visible; no console errors

Open browser devtools console on each. Expected: zero new errors that weren't there before this work.

- [ ] **Step 6: Confirm `robots.txt` and `sitemap.xml` are reachable after deploy**

```bash
curl -sI https://berlla.site/robots.txt | head -1
curl -sI https://berlla.site/sitemap.xml | head -1
```

Expected: `HTTP/2 200` (or `HTTP/1.1 200 OK`) for both.

- [ ] **Step 7: Submit sitemap to Google Search Console (optional, deferred)**

Per the spec, GSC setup is intentionally OUT OF SCOPE. When you decide to wire it up later (separate task), you'll:
1. Verify ownership of `berlla.site` in GSC
2. Submit `https://berlla.site/sitemap.xml` in the Sitemaps section

Not part of this implementation.

---

## Self-Review Notes

This plan was reviewed against the spec at `docs/superpowers/specs/2026-05-11-berlla-seo-design.md`. Coverage map:

| Spec section | Plan task |
|--------------|-----------|
| §2 Title + meta description | Task 2 |
| §3 OG + Twitter Card | Task 4 (tags) + Task 1 (image asset) |
| §4 Canonical + favicon + theme-color + lang | Task 3 (canonical/theme-color/body bg) + Task 5 (favicon tags) + Task 1 (favicon assets) |
| §4 body background-color split | Task 3 |
| §5 robots.txt + sitemap.xml | Tasks 6 + 7 |
| §6 JSON-LD Organization | Task 8 |
| §7 H1 fix + visually-hidden utility | Task 9 |
| §9 Pre-commit verification checklist | Task 10 |

All spec sections covered. No `{{DOMAIN}}` placeholders in the plan (all resolved to `berlla.site`). No "TODO" or "TBD". All code blocks are complete and runnable. The image generation script in Task 1 is fully written — no "implement later" gaps.

One trade-off worth flagging: the favicon SVG is a PNG-wrapped SVG (data URL inside `<image>` tag), not a true vector. This is a deliberate placeholder choice — when Ella designs a real favicon, she can replace `favicon.svg` with a true vector SVG and the link tag stays the same.
