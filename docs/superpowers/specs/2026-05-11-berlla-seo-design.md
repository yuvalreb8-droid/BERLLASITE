# BERLLA SEO — Design Doc

**Status:** Approved
**Date:** 2026-05-11
**Approach:** A — Foundations only
**Domain:** berlla.site
**Estimated effort:** ~3-4 hours including image generation and browser verification

---

## 1. Strategic context

### Goals
Make `berlla.site` discoverable in Google for Hebrew searches around landing-page design, and ensure that any link to the site shared on WhatsApp/LinkedIn/iMessage produces a polished branded preview instead of a blank/broken unfurl.

### Constraints
- **Geographic target:** All of Israel — no local-pack focus (BERLLA accepts remote clients)
- **Primary keyword cluster:** "דפי נחיתה" + variations ("עיצוב דפי נחיתה", "בניית דפי נחיתה", "מעצב דפי נחיתה")
- **Site structure:** Single-page (`index.html`) — no expansion plans for `/blog`, `/portfolio/*`, etc.
- **Tracking:** None for now — no GSC verification meta tag, no GA4, no analytics cookie banner extension
- **Scope:** Approach A (foundations) only. Approach B (richer schema + content) and Approach C (content marketing) explicitly rejected for this iteration.

### Why Approach A and not B/C
A delivers the technical foundation that makes the site *eligible* to rank and *presentable* when shared. B and C would deliver competitive ranking power, but require ongoing content work and broader scope changes the user wants to defer.

---

## 2. Section 1 — `<title>` + meta description

**Replaces:** existing `<title>BERLLA — תצוגה מקדימה למבנה הדף הראשי</title>` at `index.html:14` (a placeholder from preview-mode).

```html
<title>עיצוב ובניית דפי נחיתה | BERLLA</title>
<meta name="description" content="עיצוב ובניית דפי נחיתה ממירים לעסקים שלא מסתפקים בגנרי. BERLLA משלבת עיצוב מדויק, קופי שמוכר ופסיכולוגיה צרכנית — שהופכים מבקרים ללקוחות. בואו נדבר.">
```

**Rationale:**
- Title leads with the primary keyword "עיצוב ובניית דפי נחיתה" so it's the first thing Google sees and weights heaviest. Brand pushed to the back of the title.
- 35 chars title (well under the 60-char SERP truncation limit).
- 158-char description (within Google's ~160-char limit). Keyword opens, brand mid-sentence, "בואו נדבר" CTA closes — same CTA as the contact section headline for cross-surface consistency.

---

## 3. Section 2 — Open Graph + Twitter Card

Added to `<head>`, after the meta description block.

```html
<!-- Open Graph (Facebook, WhatsApp, LinkedIn, iMessage) -->
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

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="עיצוב ובניית דפי נחיתה | BERLLA">
<meta name="twitter:description" content="עיצוב ובניית דפי נחיתה ממירים לעסקים שלא מסתפקים בגנרי.">
<meta name="twitter:image" content="https://berlla.site/img/og-cover.jpg">
<meta name="twitter:image:alt" content="BERLLA — סטודיו לעיצוב ובניית דפי נחיתה">
```

**Rationale:**
- `og:locale = he_IL` — platforms that show localized UI ("Visit Site" → "בקרו באתר") use this signal.
- OG description is intentionally *shorter* than the meta description (truncates well on mobile share previews ~110 chars).
- `summary_large_image` Twitter card = full-width hero image instead of small square thumbnail.

### OG cover image asset

**File:** `img/og-cover.jpg`

**Specs:**
- 1200×630 pixels exactly (Facebook spec; works on every platform)
- sRGB color space
- JPG format, < 300KB
- Background: site burgundy gradient `#7a2440 → #3a0f1d` (matches the body's gradient top stops)
- Foreground: existing `img/berlla-footer-logo.png` (navy ellipse + cream outline + burgundy "BERLLA" + cursor element top-right) centered horizontally, slightly upper-half
- Tagline below logo: `עיצוב ובניית דפי נחיתה ממירים` in cream `#F5ECE7`, RTL, large readable size

**Strategy:** option γ — generate a placeholder programmatically from the existing logo asset. Ella can replace the file later without any code change.

---

## 4. Section 3 — Canonical, favicon, theme-color, language

### Canonical URL

```html
<link rel="canonical" href="https://berlla.site/">
```

Prevents duplicate-content split if the site is accessed via `www.`, `?utm=...`, `/index.html`, etc.

### Theme color (mobile browser chrome tint)

```html
<meta name="theme-color" content="#7a2440" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#7a2440" media="(prefers-color-scheme: dark)">
```

Per memory note `feedback_ios_safari_webgl_safe_area`: iOS 26 Safari samples `body { background-color }`, NOT gradients. The body currently uses `background:` shorthand with a gradient. Implementation must split the shorthand so a solid `background-color: #7a2440` is set explicitly:

```css
body {
  background-color: #7a2440;  /* iOS 26 Safari samples THIS */
  background-image: linear-gradient(to bottom, #7a2440 0%, #7a2440 25%, #3a0f1d 60%, #120408 100%);
  /* ...rest of existing body rules unchanged... */
}
```

### Favicon set

```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="96x96" href="/favicon-96.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
```

**Source asset:** `berlla-footer-logo.png` cropped to a square (the navy ellipse contains plenty of padding to crop cleanly).

**Files generated as placeholders (option γ):**
- `favicon.svg` — vector version, scales perfectly at any size
- `favicon-96.png` — PNG fallback, 96×96
- `apple-touch-icon.png` — 180×180, iOS home screen format

Ella can replace any/all of these with custom designs later — no code change needed.

### Language signals

`<html lang="he" dir="rtl">` already correctly set on `index.html:2`. No change needed.

---

## 5. Section 4 — robots.txt + sitemap.xml

### `robots.txt` (new file at site root)

```
User-agent: *
Allow: /

# Block crawlers from internal/preview files
Disallow: /_*
Disallow: /preview-*

# Sitemap location
Sitemap: https://berlla.site/sitemap.xml
```

**Notes:**
- `Disallow: /_*` and `/preview-*` protect dev files like `_preview-index.html`, `_mobile-first-index.html`, `preview-portfolio.html` etc. that exist in the working directory and could leak into production deploys.
- AI crawlers (GPTBot, ClaudeBot, PerplexityBot, etc.) are intentionally NOT blocked — user explicitly chose maximum visibility including in AI search products.

### `sitemap.xml` (new file at site root)

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

**Notes:**
- Homepage gets `priority: 1.0` (the page that should rank).
- Legal pages get `priority: 0.3` (required by law, not meant to rank for anything substantive).
- `lastmod` should be updated each time the page meaningfully changes. Initial value = today's date.

---

## 6. Section 5 — JSON-LD Organization

Added to `<head>` as the last block.

```html
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

**Rationale:**
- `Organization` (not `LocalBusiness`) — user wants nationwide reach, not local-pack treatment.
- `alternateName: "ברלה"` — Hebrew transliteration; helps Google connect Hebrew searches for "ברלה" with the brand.
- All contact data (email/phone/address) pulled from the existing legal strip, single source of truth.
- `sameAs: []` empty array — easy to add social profile URLs later when they exist (Instagram, LinkedIn, Behance). Significantly strengthens entity recognition once populated.

---

## 7. Section 6 — H1 fix

**The problem:**
Current H1 at `index.html:2773`:
```html
<h1 class="hero-brand"><img src="img/berlla-wordmark.png" alt="BERLLA"></h1>
```
Google reads `alt="BERLLA"` as the H1 text. The most important heading on the page is just the brand name — no signal about what BERLLA *does*.

**The fix:**

```html
<h1 class="hero-brand">
  <img src="img/berlla-wordmark.png" alt="">
  <span class="visually-hidden">BERLLA — סטודיו לעיצוב ובניית דפי נחיתה ממירים</span>
</h1>
```

And add a `.visually-hidden` utility class to the existing `<style>` block in `index.html`:

```css
.visually-hidden {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

**Rationale:**
- `alt=""` on the image (was `alt="BERLLA"`) — the H1 text now contains the brand name, so the image becomes decorative for accessibility. Prevents screen readers from announcing "BERLLA BERLLA — סטודיו…".
- `<span class="visually-hidden">` — full keyword-rich H1 readable by Google and screen readers, invisible visually so the hero's wordmark-only design is preserved.
- The text shares keywords with the `<title>` and `og:title` (different surface phrasings of the same proposition) — Google rewards title/H1/description thematic alignment rather than literal duplication.
- WebAIM-standard `.visually-hidden` pattern (chosen over `display: none` or `visibility: hidden` because those hide from assistive tech AND from search engines).

**Implementation verification required:**
- The `.hero-brand` element may currently use flex/grid layout — adding a second child element could shift the wordmark image. During implementation, visually verify the hero looks identical to the current state at all breakpoints. If layout breaks, scope the visually-hidden span with `position: absolute` (already in the utility) which removes it from the flow entirely.

---

## 8. Out of scope (explicit, do not implement)

- Google Search Console verification meta tag
- Google Analytics 4 / any tracking script
- Cookie consent banner extension for analytics
- `LocalBusiness`, `ProfessionalService`, `Service` catalog, `AggregateRating`, `Person` (with sameAs/jobTitle) schemas
- `FAQPage` schema and any new FAQ content blocks
- Image alt-text audit beyond the H1 image (other alts like "תמונה של אלה" stay as-is for now — Approach B work)
- Internal linking audit / descriptive anchor improvements
- Heading hierarchy restructure to fit keywords into H2s
- Body copy additions for keyword density
- `/blog` directory or any new pages
- Per-project case-study pages
- Backlink building, directory submissions, guest posts
- Performance/Core Web Vitals optimization beyond what's already in place

---

## 9. Implementation changeset summary

### Files modified
| File | Change |
|------|--------|
| `index.html` head (replace lines ~14, add ~80 new lines) | New title, description, canonical, theme-color×2, OG×10, Twitter×5, favicon×3, JSON-LD block |
| `index.html:2773` (H1) | Add visually-hidden span; clear image `alt=""` |
| `index.html` `<style>` block | Add `.visually-hidden` utility class; split body `background:` shorthand into separate `background-color` + `background-image` |

### Files created
| File | Purpose |
|------|---------|
| `robots.txt` (root) | Crawler directives + sitemap pointer |
| `sitemap.xml` (root) | 5 URLs: homepage + 4 legal pages |
| `img/og-cover.jpg` | 1200×630 social share image (placeholder, swappable) |
| `favicon.svg` (root) | Modern browser tab icon (placeholder, swappable) |
| `favicon-96.png` (root) | Fallback favicon for older browsers (placeholder) |
| `apple-touch-icon.png` (root) | iOS home screen icon, 180×180 (placeholder) |

### Files NOT touched
- `legal/accessibility.html`, `legal/privacy.html`, `legal/terms.html`, `legal/cookies.html` — no SEO changes needed
- All `_preview-*.html`, `preview-*.html`, `*-preview.html` working files
- All `.css` files — utility class added inline to existing `<style>` block in `index.html` (matches the file's existing pattern)

### Pre-commit verification checklist
- [ ] `grep -r "{{DOMAIN}}" .` returns zero matches (all replaced with `berlla.site`)
- [ ] `<title>` no longer contains "תצוגה מקדימה"
- [ ] OG image renders correctly in [Facebook Debugger](https://developers.facebook.com/tools/debug/) (paste `https://berlla.site/`)
- [ ] OG image renders correctly in [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)
- [ ] JSON-LD passes [Google Rich Results Test](https://search.google.com/test/rich-results)
- [ ] Hero section visually identical to pre-change state at 375px / 768px / 1440px / 2560px
- [ ] Browser tab shows favicon (not blank) in Chrome, Safari, Firefox
- [ ] iOS Safari URL bar tint remains burgundy (theme-color and body bg-color match)
- [ ] No console errors on page load
- [ ] All 4 legal pages still reachable from footer (sitemap matches reality)

---

## 10. Open future work (not part of this spec)

These were considered and explicitly deferred. Listed here so they don't get lost:

- Wire up Google Search Console once the site is live on `berlla.site`
- Add GA4 (requires adding analytics consent to existing cookie banner — the site currently complies with PPL Amendment 13, adding analytics would extend that)
- Approach B work: richer schemas (ProfessionalService + AggregateRating from testimonials + FAQPage), alt-text audit, body copy keyword integration
- Replace placeholder OG cover and favicon assets with Ella's custom designs
- Populate `sameAs: []` once social profiles exist
