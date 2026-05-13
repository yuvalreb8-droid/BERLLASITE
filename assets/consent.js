/* ============================================================
   BERLLA — Cookie Consent Module
   PPL Amendment 13–compliant consent banner.
   Layout: centered modal with two screens (overview / customize).

   Public API (all exposed under window.BerllaConsent):
     getConsent()  → returns stored consent record or null
     show()        → opens banner in manage mode (current state)
     clear()       → wipes consent, clears GA cookies, reloads

   Event:
     window.dispatchEvent(new CustomEvent('berlla:consent-change', {
       detail: { previous, current }
     }))
     Phase 3 (GA4 wiring) listens for this to load/teardown gtag.
   ============================================================ */
(function () {
  'use strict';

  // ---- Configuration -----------------------------------------
  var STORAGE_KEY = 'berlla_consent_v1';
  var CONSENT_VERSION = 1;
  var EXPIRY_DAYS = 365;
  var SCROLL_REVEAL_RATIO = 0.8;
  var GA_MEASUREMENT_ID = 'G-BJMEC3BMC0';

  // ---- Hebrew copy (locked, audited 2026-05-13) --------------
  var COPY = {
    title: 'העדפות עוגיות',
    intro: 'אנחנו משתמשים בעוגיות כדי לשפר את חוויית הגלישה שלך ולנתח את התנועה באתר. תוכל לבחור איזה סוגי עוגיות לאפשר.',
    linksTemplate: 'למידע נוסף, ראה את <a href="{cookies}">מדיניות העוגיות</a> ואת <a href="{privacy}">מדיניות הפרטיות</a>.',
    manageTitle: 'ניהול העדפות עוגיות',
    backLabel: 'חזרה',
    chipLabel: 'ניהול עוגיות',
    closeLabel: 'סגור',
    requiredLabel: 'חובה',
    categories: {
      necessary: {
        title: 'עוגיות חיוניות',
        body: 'נדרשות לאבטחת האתר ולתפעולו התקין. כוללות עוגיות אבטחה של Cloudflare ושמירת בחירת ההסכמה שלך. לא ניתנות לכיבוי.'
      },
      analytics: {
        title: 'אנליטיקה',
        body: 'עוגיות של Google Analytics 4 (Google, ארה״ב) שעוזרות לנו להבין אילו עמודים פופולריים ואיפה אפשר לשפר. עוגיות עיקריות: _ga, _ga_*. תקופת שמירה: עד 24 חודשים. כתובת ה־IP שלך מעובדת במצב מקוצר.'
      },
      marketing: {
        title: 'שיווק',
        body: 'עוגיות לפרסום ממוקד ומדידת ביצועי קמפיינים. כרגע אין באתר עוגיות שיווק — קטגוריה זו זמינה למקרה שנפעיל כאלה בעתיד.'
      }
    },
    buttons: {
      accept: 'קבל הכל',
      reject: 'דחה הכל',
      customize: 'התאם אישית',
      save: 'שמור העדפות'
    }
  };

  // ---- Consent state -----------------------------------------
  function getStoredConsent() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (parsed.version !== CONSENT_VERSION) return null;
      if (!parsed.id || !parsed.timestamp || !parsed.expiresAt) return null;
      if (new Date(parsed.expiresAt).getTime() < Date.now()) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function generateId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 11);
  }

  function saveConsent(categories) {
    var now = new Date();
    var expiresAt = new Date(now.getTime() + EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    var record = {
      version: CONSENT_VERSION,
      id: generateId(),
      timestamp: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      categories: {
        necessary: true,
        analytics: !!categories.analytics,
        marketing: !!categories.marketing
      }
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    return record;
  }

  function clearGACookies() {
    var host = window.location.hostname;
    var domains = ['', host, '.' + host];
    document.cookie.split(';').forEach(function (cookie) {
      var name = cookie.split('=')[0].trim();
      if (name === '_ga' || name === '_gid' || name === '_gat' || name.indexOf('_ga_') === 0) {
        domains.forEach(function (d) {
          var prefix = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
          document.cookie = d ? prefix + '; domain=' + d : prefix;
        });
      }
    });
  }

  // ---- GA4 conditional loader --------------------------------
  // Injects gtag.js ONLY after explicit analytics consent.
  // Configured with the strictest available privacy flags:
  //   anonymize_ip:true                       — truncate last octet
  //   allow_google_signals:false              — no cross-device tracking
  //   allow_ad_personalization_signals:false  — no ad audiences
  function loadGA4() {
    if (window._berllaGA4Loaded) return;
    window._berllaGA4Loaded = true;

    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_MEASUREMENT_ID;
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID, {
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
  }

  // ---- Path resolution ---------------------------------------
  function legalHref(file) {
    return window.location.pathname.indexOf('/legal/') !== -1 ? file : 'legal/' + file;
  }

  // ---- SVG icons ---------------------------------------------
  var COOKIE_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M12 2a10 10 0 1 0 9 11 5 5 0 0 1-5-5 5 5 0 0 1-4-6z"/>' +
      '<circle cx="8" cy="13" r="0.9" fill="currentColor"/>' +
      '<circle cx="12" cy="16" r="0.9" fill="currentColor"/>' +
      '<circle cx="15.5" cy="10" r="0.9" fill="currentColor"/>' +
    '</svg>';

  var CHECK_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<polyline points="20 6 9 17 4 12"/>' +
    '</svg>';

  // ---- Banner DOM --------------------------------------------
  function buildBanner(current, startMode) {
    var analyticsOn = current ? !!current.categories.analytics : false;
    var marketingOn = current ? !!current.categories.marketing : false;
    var startInManage = startMode === 'manage';

    var banner = document.createElement('div');
    banner.id = 'berlla-consent-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-modal', 'true');
    banner.setAttribute('aria-labelledby', 'berlla-consent-title');
    banner.setAttribute('dir', 'rtl');
    banner.setAttribute('lang', 'he');

    var linksHtml = COPY.linksTemplate
      .replace('{cookies}', legalHref('cookies.html'))
      .replace('{privacy}', legalHref('privacy.html'));

    var ovHidden = startInManage ? ' hidden' : '';
    var mgHidden = startInManage ? '' : ' hidden';

    banner.innerHTML =
      '<div class="bc__modal" role="document">' +
        '<header class="bc__header">' +
          '<div class="bc__header-title">' +
            '<span class="bc__header-icon">' + COOKIE_SVG + '</span>' +
            '<h2 id="berlla-consent-title">' + COPY.title + '</h2>' +
          '</div>' +
          '<button type="button" class="bc__close" data-action="close" aria-label="' + COPY.closeLabel + '">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
              '<line x1="18" y1="6" x2="6" y2="18"/>' +
              '<line x1="6" y1="6" x2="18" y2="18"/>' +
            '</svg>' +
          '</button>' +
        '</header>' +

        // Overview screen
        '<section class="bc__body bc__body--overview"' + ovHidden + '>' +
          '<p class="bc__intro">' + COPY.intro + '</p>' +
          '<p class="bc__links">' + linksHtml + '</p>' +
        '</section>' +

        // Manage screen
        '<section class="bc__body bc__body--manage"' + mgHidden + '>' +
          '<div class="bc__manage-head">' +
            '<h3 class="bc__manage-title">' + COPY.manageTitle + '</h3>' +
            '<button type="button" class="bc__back" data-action="back">' +
              '<span aria-hidden="true">→</span> ' + COPY.backLabel +
            '</button>' +
          '</div>' +

          buildCategoryCard('necessary', true, true) +
          buildCategoryCard('analytics', analyticsOn, false) +
          buildCategoryCard('marketing', marketingOn, false) +
        '</section>' +

        // Action rows (one per screen)
        '<footer class="bc__actions bc__actions--overview"' + ovHidden + '>' +
          '<button type="button" class="bc__btn bc__btn--primary" data-action="accept">' +
            CHECK_SVG + '<span>' + COPY.buttons.accept + '</span>' +
          '</button>' +
          '<button type="button" class="bc__btn bc__btn--secondary" data-action="reject">' +
            '<span>' + COPY.buttons.reject + '</span>' +
          '</button>' +
          '<button type="button" class="bc__btn bc__btn--outline" data-action="manage">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
              '<circle cx="12" cy="12" r="3"/>' +
              '<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>' +
            '</svg>' +
            '<span>' + COPY.buttons.customize + '</span>' +
          '</button>' +
        '</footer>' +

        '<footer class="bc__actions bc__actions--manage"' + mgHidden + '>' +
          '<button type="button" class="bc__btn bc__btn--primary bc__btn--full" data-action="save">' +
            CHECK_SVG + '<span>' + COPY.buttons.save + '</span>' +
          '</button>' +
        '</footer>' +
      '</div>';

    banner.addEventListener('click', function (e) {
      var trigger = e.target.closest('[data-action]');
      if (!trigger) return;
      var action = trigger.dataset.action;
      if (action === 'accept') {
        finalize(banner, { analytics: true, marketing: true });
      } else if (action === 'reject') {
        finalize(banner, { analytics: false, marketing: false });
      } else if (action === 'save') {
        var a = banner.querySelector('input[data-category="analytics"]');
        var m = banner.querySelector('input[data-category="marketing"]');
        finalize(banner, { analytics: a.checked, marketing: m.checked });
      } else if (action === 'manage') {
        switchTo(banner, 'manage');
      } else if (action === 'back') {
        switchTo(banner, 'overview');
      } else if (action === 'close') {
        closeWithoutSaving(banner);
      }
    });

    // Esc closes (treated as defer, same as X button)
    banner._escHandler = function (e) {
      if (e.key === 'Escape') closeWithoutSaving(banner);
    };
    document.addEventListener('keydown', banner._escHandler);

    return banner;
  }

  function buildCategoryCard(key, checked, locked) {
    var cat = COPY.categories[key];
    var lockedClass = locked ? ' bc__category--locked' : '';
    var inputAttrs = locked
      ? 'checked disabled aria-disabled="true"'
      : 'data-category="' + key + '"' + (checked ? ' checked' : '');
    var requiredBadge = locked
      ? '<span class="bc__required">' + COPY.requiredLabel + '</span>'
      : '';

    return (
      '<div class="bc__category' + lockedClass + '">' +
        '<div class="bc__category-content">' +
          '<h4 class="bc__category-title">' + cat.title + '</h4>' +
          '<p class="bc__category-body">' + cat.body + '</p>' +
        '</div>' +
        '<div class="bc__category-toggle-wrap">' +
          '<label class="bc__toggle-label">' +
            '<input type="checkbox" class="bc__toggle" ' + inputAttrs + '>' +
            '<span class="bc__toggle-visual" aria-hidden="true"></span>' +
          '</label>' +
          requiredBadge +
        '</div>' +
      '</div>'
    );
  }

  function switchTo(banner, mode) {
    var ov = banner.querySelector('.bc__body--overview');
    var mg = banner.querySelector('.bc__body--manage');
    var ovActions = banner.querySelector('.bc__actions--overview');
    var mgActions = banner.querySelector('.bc__actions--manage');
    if (mode === 'manage') {
      ov.hidden = true; ovActions.hidden = true;
      mg.hidden = false; mgActions.hidden = false;
    } else {
      ov.hidden = false; ovActions.hidden = false;
      mg.hidden = true; mgActions.hidden = true;
    }
  }

  function teardownBanner(banner) {
    banner.classList.remove('bc--visible');
    if (banner._escHandler) {
      document.removeEventListener('keydown', banner._escHandler);
    }
    setTimeout(function () {
      if (banner.parentNode) banner.parentNode.removeChild(banner);
    }, 280);
  }

  function finalize(banner, categories) {
    var previous = getStoredConsent();
    var current = saveConsent(categories);

    teardownBanner(banner);
    setTimeout(ensureChip, 320);

    window.dispatchEvent(new CustomEvent('berlla:consent-change', {
      detail: { previous: previous, current: current }
    }));

    var wasOn = previous && previous.categories.analytics === true;
    var nowOff = current.categories.analytics === false;
    if (wasOn && nowOff) {
      clearGACookies();
      setTimeout(function () { window.location.reload(); }, 380);
    }
  }

  function closeWithoutSaving(banner) {
    // Treated as defer — no localStorage write, no event dispatch.
    // If consent already exists, restore chip. If not, banner returns next visit.
    teardownBanner(banner);
    if (getStoredConsent()) setTimeout(ensureChip, 320);
  }

  // ---- Floating chip -----------------------------------------
  function buildChip() {
    var chip = document.createElement('button');
    chip.type = 'button';
    chip.id = 'berlla-consent-chip';
    chip.setAttribute('aria-label', COPY.chipLabel);
    chip.setAttribute('lang', 'he');
    chip.setAttribute('dir', 'rtl');
    chip.innerHTML = COOKIE_SVG + '<span>' + COPY.chipLabel + '</span>';
    chip.addEventListener('click', openManageMode);
    return chip;
  }

  function ensureChip() {
    if (document.getElementById('berlla-consent-chip')) return;
    document.body.appendChild(buildChip());
    updateChipVisibility();
  }

  function isFooterInView() {
    // Hide chip when these elements approach the viewport
    var guards = document.querySelectorAll('.contact-legal, .legal-footer');
    for (var i = 0; i < guards.length; i++) {
      var rect = guards[i].getBoundingClientRect();
      // Trigger 60px before the guard enters the viewport bottom
      if (rect.top < window.innerHeight + 60 && rect.bottom > 0) return true;
    }
    return false;
  }

  function updateChipVisibility() {
    var chip = document.getElementById('berlla-consent-chip');
    if (!chip) return;
    var scrolledEnough = window.scrollY > window.innerHeight * SCROLL_REVEAL_RATIO;
    var footerNear = isFooterInView();
    if (scrolledEnough && !footerNear) {
      chip.classList.add('bcc--visible');
    } else {
      chip.classList.remove('bcc--visible');
    }
  }

  function openManageMode(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (document.getElementById('berlla-consent-banner')) return;

    var banner = buildBanner(getStoredConsent(), 'manage');
    document.body.appendChild(banner);
    requestAnimationFrame(function () { banner.classList.add('bc--visible'); });

    var chip = document.getElementById('berlla-consent-chip');
    if (chip) chip.classList.remove('bcc--visible');
  }

  // ---- Footer link handler -----------------------------------
  function bindFooterLinks() {
    document.addEventListener('click', function (e) {
      var link = e.target.closest('.berlla-manage-cookies, [data-berlla-manage]');
      if (!link) return;
      e.preventDefault();
      openManageMode();
    });
  }

  // ---- Styles ------------------------------------------------
  function injectStyles() {
    if (document.getElementById('berlla-consent-styles')) return;
    var style = document.createElement('style');
    style.id = 'berlla-consent-styles';
    style.textContent = [
      // Scoped tokens
      '#berlla-consent-banner,#berlla-consent-chip{',
        '--bc-cream:#F4F0EB;--bc-cream-2:#EFEAE3;',
        '--bc-dark:#0E1629;--bc-on-dark:#F4F0EB;',
        '--bc-accent:#8B2E4A;--bc-accent-deep:#6E2438;',
        '--bc-text:#0E1629;--bc-muted:rgba(14,22,41,0.65);',
        '--bc-border:rgba(14,22,41,0.10);',
        '--bc-radius:14px;--bc-radius-btn:6px;--bc-radius-pill:999px;',
        '--bc-ease:cubic-bezier(0.22,1,0.36,1);--bc-dur:280ms;',
        '--bc-font-ui:"Assistant","Heebo",system-ui,-apple-system,sans-serif;',
        '--bc-font-heading:"Fraunces","Heebo",serif;',
        'font-family:var(--bc-font-ui);box-sizing:border-box;',
      '}',
      '#berlla-consent-banner *,#berlla-consent-banner *::before,#berlla-consent-banner *::after,',
      '#berlla-consent-chip *,#berlla-consent-chip *::before,#berlla-consent-chip *::after{box-sizing:border-box;}',

      // Floating banner — top-positioned, no overlay, no page blur
      '#berlla-consent-banner{',
        'position:fixed;top:1.25rem;left:50%;z-index:1000;',
        'width:calc(100% - 2rem);max-width:760px;',
        'opacity:0;pointer-events:none;',
        'transform:translate(-50%,-14px);',
        'transition:opacity var(--bc-dur) var(--bc-ease),',
        'transform var(--bc-dur) var(--bc-ease);',
      '}',
      '#berlla-consent-banner.bc--visible{',
        'opacity:1;pointer-events:auto;transform:translate(-50%,0);',
      '}',

      // Modal box (banner card)
      '.bc__modal{',
        'position:relative;',
        'background:#FFFFFF;color:var(--bc-text);',
        'max-height:calc(100vh - 2.5rem);',
        'border-radius:var(--bc-radius);overflow:hidden;',
        'box-shadow:0 12px 40px rgba(14,22,41,0.22),0 2px 8px rgba(14,22,41,0.10);',
        'display:flex;flex-direction:column;',
      '}',

      // Header
      '.bc__header{',
        'background:var(--bc-dark);color:var(--bc-on-dark);',
        'padding:0.95rem 1.25rem;',
        'display:flex;align-items:center;justify-content:space-between;gap:1rem;',
        'flex-shrink:0;',
      '}',
      '.bc__header-title{display:flex;align-items:center;gap:0.6rem;}',
      '.bc__header-icon{color:var(--bc-accent);line-height:0;}',
      '.bc__header-icon svg{width:22px;height:22px;display:block;}',
      '.bc__header h2{',
        'font-family:var(--bc-font-ui);',
        'font-size:0.95rem;font-weight:700;',
        'letter-spacing:0.12em;text-transform:uppercase;',
        'margin:0;color:var(--bc-on-dark);',
      '}',
      '.bc__close{',
        'background:transparent;border:0;cursor:pointer;',
        'color:var(--bc-on-dark);opacity:0.7;',
        'width:32px;height:32px;border-radius:6px;',
        'display:inline-flex;align-items:center;justify-content:center;',
        'padding:0;transition:opacity 200ms,background 200ms;',
      '}',
      '.bc__close svg{width:18px;height:18px;display:block;}',
      '.bc__close:hover,.bc__close:focus-visible{opacity:1;background:rgba(244,240,235,0.10);}',

      // Body
      '.bc__body{',
        'padding:1.5rem 1.5rem 1rem;',
        'overflow-y:auto;-webkit-overflow-scrolling:touch;',
        'flex:1;min-height:0;',
      '}',
      '.bc__body[hidden]{display:none;}',

      // Overview screen
      '.bc__body--overview .bc__intro{',
        'font-size:0.97rem;line-height:1.65;margin:0 0 1rem;color:var(--bc-text);',
      '}',
      '.bc__body--overview .bc__links{',
        'font-size:0.85rem;margin:0;color:var(--bc-muted);',
      '}',
      '.bc__body--overview .bc__links a{',
        'color:var(--bc-accent);text-decoration:underline;text-underline-offset:0.2em;',
      '}',

      // Manage screen
      '.bc__manage-head{',
        'display:flex;align-items:center;justify-content:space-between;',
        'gap:1rem;margin-bottom:1rem;',
      '}',
      '.bc__manage-title{',
        'font-family:var(--bc-font-ui);font-size:0.85rem;font-weight:700;',
        'letter-spacing:0.10em;text-transform:uppercase;',
        'margin:0;color:var(--bc-text);',
      '}',
      '.bc__back{',
        'background:transparent;border:0;cursor:pointer;',
        'color:var(--bc-accent);font-family:var(--bc-font-ui);',
        'font-weight:700;font-size:0.85rem;',
        'padding:0.4rem 0.6rem;border-radius:6px;',
        'min-height:44px;',
        'transition:background 200ms;',
      '}',
      '.bc__back:hover,.bc__back:focus-visible{background:rgba(139,46,74,0.08);}',

      // Category card
      '.bc__category{',
        'background:var(--bc-cream);',
        'border-radius:10px;',
        'padding:1rem 1.1rem;',
        'margin-bottom:0.5rem;',
        'display:flex;align-items:flex-start;gap:1rem;',
      '}',
      '.bc__category:last-child{margin-bottom:0;}',
      '.bc__category--locked{background:rgba(244,240,235,0.55);border:1px dashed rgba(14,22,41,0.08);}',
      '.bc__category-content{flex:1;min-width:0;}',
      '.bc__category-title{',
        'font-family:var(--bc-font-ui);font-size:0.95rem;font-weight:700;',
        'letter-spacing:0.06em;text-transform:uppercase;',
        'margin:0 0 0.35rem;color:var(--bc-text);',
      '}',
      '.bc__category-body{',
        'font-size:0.82rem;line-height:1.55;color:var(--bc-muted);margin:0;',
      '}',
      '.bc__category-toggle-wrap{',
        'flex-shrink:0;display:flex;flex-direction:column;',
        'align-items:center;gap:0.35rem;padding-top:0.15rem;',
      '}',
      '.bc__required{',
        'font-size:0.65rem;font-weight:700;letter-spacing:0.10em;',
        'text-transform:uppercase;color:var(--bc-muted);',
      '}',

      // Toggle switch (custom-built from checkbox)
      '.bc__toggle-label{',
        'position:relative;display:inline-block;cursor:pointer;',
      '}',
      '.bc__toggle{',
        'position:absolute;opacity:0;pointer-events:none;',
        'width:0;height:0;',
      '}',
      '.bc__toggle-visual{',
        'display:block;width:42px;height:24px;',
        'background:#CFCCC7;border-radius:999px;',
        'position:relative;transition:background var(--bc-dur) var(--bc-ease);',
      '}',
      '.bc__toggle-visual::before{',
        'content:"";position:absolute;top:2px;right:2px;',
        'width:20px;height:20px;background:#FFF;border-radius:50%;',
        'box-shadow:0 1px 3px rgba(0,0,0,0.20);',
        'transition:transform var(--bc-dur) var(--bc-ease);',
      '}',
      '.bc__toggle:checked + .bc__toggle-visual{background:var(--bc-accent);}',
      '.bc__toggle:checked + .bc__toggle-visual::before{transform:translateX(-18px);}',
      '.bc__toggle:disabled + .bc__toggle-visual{opacity:0.65;cursor:default;}',
      '.bc__toggle:focus-visible + .bc__toggle-visual{',
        'outline:2px solid var(--bc-accent);outline-offset:3px;',
      '}',
      '.bc__category--locked .bc__toggle-label{cursor:default;}',

      // Action rows
      '.bc__actions{',
        'padding:0.85rem 1.5rem 1.25rem;',
        'display:flex;flex-wrap:wrap;gap:0.55rem;',
        'border-top:1px solid var(--bc-border);',
        'background:#FFFFFF;flex-shrink:0;',
      '}',
      '.bc__actions[hidden]{display:none;}',
      '.bc__actions--overview .bc__btn{flex:1;min-width:140px;}',
      '.bc__actions--manage{padding-top:0.85rem;}',

      // Buttons
      '.bc__btn{',
        'font-family:var(--bc-font-ui);font-weight:700;font-size:0.85rem;',
        'letter-spacing:0.04em;text-transform:uppercase;',
        'padding:0.8rem 1.1rem;border-radius:var(--bc-radius-btn);',
        'cursor:pointer;border:1.5px solid transparent;',
        'min-height:44px;',
        'display:inline-flex;align-items:center;justify-content:center;gap:0.45rem;',
        'transition:background var(--bc-dur) var(--bc-ease),',
        'color var(--bc-dur) var(--bc-ease),',
        'border-color var(--bc-dur) var(--bc-ease);',
      '}',
      '.bc__btn svg{width:14px;height:14px;flex-shrink:0;}',
      '.bc__btn--primary{background:var(--bc-accent);color:var(--bc-on-dark);border-color:var(--bc-accent);}',
      '.bc__btn--primary:hover,.bc__btn--primary:focus-visible{',
        'background:var(--bc-accent-deep);border-color:var(--bc-accent-deep);',
      '}',
      '.bc__btn--secondary{background:var(--bc-cream-2);color:var(--bc-text);border-color:transparent;}',
      '.bc__btn--secondary:hover,.bc__btn--secondary:focus-visible{',
        'background:var(--bc-dark);color:var(--bc-on-dark);',
      '}',
      '.bc__btn--outline{background:transparent;color:var(--bc-text);border-color:rgba(14,22,41,0.18);}',
      '.bc__btn--outline:hover,.bc__btn--outline:focus-visible{',
        'background:var(--bc-dark);color:var(--bc-on-dark);border-color:var(--bc-dark);',
      '}',
      '.bc__btn--full{flex:1 1 100%;width:100%;}',
      '.bc__btn:focus-visible{outline:2px solid var(--bc-accent);outline-offset:3px;}',

      // Floating chip — bottom-left
      '#berlla-consent-chip{',
        'position:fixed;bottom:1rem;left:1rem;z-index:999;',
        'display:inline-flex;align-items:center;gap:0.4rem;',
        'padding:0.55rem 0.9rem;',
        'background:var(--bc-cream);color:var(--bc-text);',
        'border:1px solid var(--bc-border);border-radius:var(--bc-radius-pill);',
        'font-family:var(--bc-font-ui);font-weight:600;font-size:0.8125rem;',
        'cursor:pointer;',
        'box-shadow:0 4px 12px rgba(14,22,41,0.12);',
        'opacity:0;transform:translateY(8px);pointer-events:none;',
        'transition:opacity var(--bc-dur) var(--bc-ease),',
        'transform var(--bc-dur) var(--bc-ease),',
        'background var(--bc-dur) var(--bc-ease),',
        'color var(--bc-dur) var(--bc-ease);',
      '}',
      '#berlla-consent-chip.bcc--visible{opacity:0.92;transform:translateY(0);pointer-events:auto;}',
      '#berlla-consent-chip:hover,#berlla-consent-chip:focus-visible{',
        'opacity:1;background:var(--bc-dark);color:var(--bc-on-dark);border-color:var(--bc-dark);',
      '}',
      '#berlla-consent-chip:focus-visible{outline:2px solid var(--bc-accent);outline-offset:3px;}',
      '#berlla-consent-chip svg{width:16px;height:16px;flex-shrink:0;}',

      // Mobile
      '@media (max-width:640px){',
        '#berlla-consent-banner{top:0.75rem;width:calc(100% - 1.25rem);}',
        '.bc__modal{max-height:calc(100vh - 1.5rem);}',
        '.bc__body{padding:1.25rem 1.1rem 0.85rem;}',
        '.bc__header{padding:0.85rem 1.1rem;}',
        '.bc__actions{padding:0.85rem 1.1rem 1.1rem;}',
        '.bc__actions--overview{flex-direction:column;}',
        '.bc__actions--overview .bc__btn{flex:1 1 100%;width:100%;}',
        '.bc__category{padding:0.85rem 0.95rem;}',
        '#berlla-consent-chip{bottom:0.75rem;left:0.75rem;}',
      '}',

      // Reduced motion
      '@media (prefers-reduced-motion:reduce){',
        '#berlla-consent-banner,#berlla-consent-chip,.bc__modal,.bc__toggle-visual,.bc__toggle-visual::before{',
          'transition:none !important;',
        '}',
      '}'
    ].join('');
    document.head.appendChild(style);
  }

  // ---- Public API --------------------------------------------
  window.BerllaConsent = {
    getConsent: getStoredConsent,
    show: openManageMode,
    clear: function () {
      localStorage.removeItem(STORAGE_KEY);
      clearGACookies();
      window.location.reload();
    }
  };

  // ---- Boot --------------------------------------------------
  function boot() {
    injectStyles();
    bindFooterLinks();

    // Wire GA4 loader to the consent-change event. Fires whenever
    // user saves with analytics enabled — first-time accept, re-accept
    // after withdrawal, or toggling analytics back on in manage mode.
    window.addEventListener('berlla:consent-change', function (e) {
      var c = e.detail && e.detail.current;
      if (c && c.categories && c.categories.analytics) loadGA4();
    });

    var consent = getStoredConsent();

    // If consent already records analytics on, fire GA4 immediately
    // (no event — this path covers every subsequent page load).
    if (consent && consent.categories && consent.categories.analytics) {
      loadGA4();
    }

    if (!consent) {
      var banner = buildBanner(null, 'overview');
      document.body.appendChild(banner);
      requestAnimationFrame(function () { banner.classList.add('bc--visible'); });
    } else {
      ensureChip();
    }

    var scrollTicking = false;
    window.addEventListener('scroll', function () {
      if (scrollTicking) return;
      scrollTicking = true;
      requestAnimationFrame(function () {
        updateChipVisibility();
        scrollTicking = false;
      });
    }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
