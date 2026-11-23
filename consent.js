/*!
 * Rack Discipline - cookie consent for Google Analytics.
 *
 * One script for every Rack Discipline website and the blog. Published from the root site at
 * https://rackdisciplineusa.com/consent.js
 *
 * What it does
 *   - Analytics is OFF by default. The Google tag is not even loaded until the visitor clicks Accept.
 *   - Accept and Reject are equally prominent. The choice is remembered for 180 days, for every
 *     *.rackdisciplineusa.com site, in one first-party cookie (rd_consent = granted | denied).
 *   - A link to "#cookie-settings" (for example in a footer) reopens the banner so the choice can be changed.
 *     Withdrawing consent stops analytics and deletes the Google Analytics cookies.
 *   - A browser sending the Global Privacy Control signal is treated as "Reject" until the visitor chooses.
 *   - On any host that is not *.rackdisciplineusa.com (local testing, previews) nothing is sent to Google.
 *
 * Usage:  <script src="https://rackdisciplineusa.com/consent.js" defer></script>
 */
(function () {
  'use strict';

  var GA_ID = 'G-56CBRQ414Y';
  var COOKIE = 'rd_consent';
  var MAX_AGE = 15552000; // 180 days, in seconds
  var HOST = location.hostname;
  var PRODUCTION = /(^|\.)rackdisciplineusa\.com$/.test(HOST);
  var COOKIE_DOMAIN = PRODUCTION ? '; domain=.rackdisciplineusa.com' : '';

  // ---- Where the privacy policy lives, depending on which site this is -------------------------------
  function policyUrl() {
    if (HOST === 'blog.rackdisciplineusa.com') return '/privacy-policy/';
    if (HOST === 'rackdisciplineusa.com' || HOST === 'www.rackdisciplineusa.com') {
      return 'https://captainslog.rackdisciplineusa.com/privacy.html';
    }
    return 'privacy.html';
  }

  // ---- Google tag plumbing: consent defaults to denied before anything else ---------------------------
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied'
  });

  // ---- Stored choice ------------------------------------------------------------------------------------
  function readChoice() {
    var parts = document.cookie ? document.cookie.split('; ') : [];
    for (var i = 0; i < parts.length; i++) {
      var eq = parts[i].indexOf('=');
      if (parts[i].slice(0, eq) === COOKIE) {
        var v = decodeURIComponent(parts[i].slice(eq + 1));
        return v === 'granted' || v === 'denied' ? v : null;
      }
    }
    return null;
  }

  function writeChoice(value) {
    var secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = COOKIE + '=' + value + '; max-age=' + MAX_AGE + '; path=/; SameSite=Lax' + secure + COOKIE_DOMAIN;
  }

  var gpc = navigator.globalPrivacyControl === true;
  var memoryChoice = null; // used if the browser refuses to store the cookie

  function currentChoice() {
    return readChoice() || memoryChoice;
  }

  function effectiveChoice() {
    var stored = currentChoice();
    if (stored) return stored;
    return gpc ? 'denied' : null;
  }

  // ---- Analytics on / off ---------------------------------------------------------------------------------
  var analyticsLoaded = false;

  function startAnalytics() {
    window['ga-disable-' + GA_ID] = false;
    if (analyticsLoaded) return;
    analyticsLoaded = true;
    if (!PRODUCTION) {
      if (window.console) console.info('[rd-consent] analytics would load here (not a rackdisciplineusa.com host)');
      return;
    }
    window.gtag('consent', 'update', { analytics_storage: 'granted' });
    window.gtag('js', new Date());
    window.gtag('config', GA_ID);
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID);
    document.head.appendChild(s);
  }

  function clearAnalyticsCookies() {
    var names = document.cookie ? document.cookie.split('; ') : [];
    var domains = ['', '; domain=' + HOST, '; domain=.' + HOST, '; domain=.rackdisciplineusa.com'];
    for (var i = 0; i < names.length; i++) {
      var name = names[i].split('=')[0];
      if (name === '_ga' || name.indexOf('_ga_') === 0 || name === '_gid') {
        for (var d = 0; d < domains.length; d++) {
          document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + domains[d];
        }
      }
    }
  }

  function stopAnalytics() {
    window['ga-disable-' + GA_ID] = true;
    window.gtag('consent', 'update', { analytics_storage: 'denied' });
    clearAnalyticsCookies();
  }

  function apply(choice) {
    if (choice === 'granted') startAnalytics();
    else stopAnalytics();
  }

  // ---- Banner -------------------------------------------------------------------------------------------------
  var banner = null;
  var statusLine = null;

  function injectStyles() {
    if (document.getElementById('rd-consent-style')) return;
    var css = [
      '.rd-consent{position:fixed;left:1rem;right:1rem;bottom:1rem;z-index:2147483000;max-width:30rem;',
      'background:#fff;color:#1a1c1e;border:1px solid rgba(26,28,30,.18);border-radius:.75rem;',
      'box-shadow:0 18px 40px rgba(26,28,30,.22);padding:1rem 1.1rem;',
      'font:400 .95rem/1.5 var(--font-body,system-ui,-apple-system,"Segoe UI",sans-serif);}',
      '.rd-consent *{box-sizing:border-box;}',
      '.rd-consent__title{margin:0 0 .35rem;font:600 1rem/1.3 var(--font-display,system-ui,sans-serif);color:#1a1c1e;}',
      '.rd-consent__text{margin:0 0 .6rem;color:#33373d;}',
      '.rd-consent__text a{color:#9b1c1c;text-decoration:underline;}',
      '.rd-consent__status{margin:0 0 .6rem;font-size:.85rem;color:#4a5058;}',
      '.rd-consent__row{display:flex;gap:.6rem;}',
      '.rd-consent__btn{flex:1 1 0;min-height:2.75rem;padding:.5rem 1rem;border-radius:.5rem;cursor:pointer;',
      'font:600 .95rem/1 var(--font-body,system-ui,sans-serif);background:#9b1c1c;color:#fff;border:2px solid #9b1c1c;}',
      '.rd-consent__btn:hover{background:#6e1212;border-color:#6e1212;}',
      '.rd-consent__btn:focus-visible{outline:3px solid #1e4d3a;outline-offset:2px;}'
    ].join('');
    var style = document.createElement('style');
    style.id = 'rd-consent-style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }

  function closeBanner() {
    if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
    banner = null;
    statusLine = null;
  }

  function choose(value) {
    memoryChoice = value;
    writeChoice(value);
    apply(value);
    closeBanner();
  }

  function showBanner(reopened) {
    injectStyles();
    if (banner) return;

    banner = el('div', 'rd-consent');
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Cookie consent');
    banner.id = 'rd-consent';

    banner.appendChild(el('p', 'rd-consent__title', 'Cookies and analytics'));

    var text = el('p', 'rd-consent__text');
    text.appendChild(document.createTextNode(
      'We would like to use Google Analytics cookies to see how our sites are used. ' +
      'They stay off unless you accept. Your choice applies to all Rack Discipline sites. '));
    var link = el('a', '', 'Privacy Policy');
    link.href = policyUrl();
    text.appendChild(link);
    text.appendChild(document.createTextNode('.'));
    banner.appendChild(text);

    if (reopened) {
      var stored = effectiveChoice();
      statusLine = el('p', 'rd-consent__status',
        'Analytics is currently ' + (stored === 'granted' ? 'on' : 'off') + '.');
      statusLine.setAttribute('aria-live', 'polite');
      banner.appendChild(statusLine);
    }

    var row = el('div', 'rd-consent__row');
    var reject = el('button', 'rd-consent__btn', 'Reject');
    reject.type = 'button';
    reject.addEventListener('click', function () { choose('denied'); });
    var accept = el('button', 'rd-consent__btn', 'Accept');
    accept.type = 'button';
    accept.addEventListener('click', function () { choose('granted'); });
    row.appendChild(reject);
    row.appendChild(accept);
    banner.appendChild(row);

    document.body.appendChild(banner);
    if (reopened) reject.focus();
  }

  function openSettings() {
    closeBanner();
    showBanner(true);
  }

  // ---- Wiring -------------------------------------------------------------------------------------------------
  document.addEventListener('click', function (e) {
    var t = e.target;
    var a = t && t.closest ? t.closest('a[href$="#cookie-settings"], [data-cookie-settings]') : null;
    if (a) {
      e.preventDefault();
      openSettings();
    }
  });

  document.addEventListener('keydown', function (e) {
    // Escape closes the banner only when a choice already exists (never silently counts as consent).
    if (e.key === 'Escape' && banner && currentChoice()) closeBanner();
  });

  window.rdConsent = {
    open: openSettings,
    state: function () { return effectiveChoice() || 'unset'; }
  };

  function start() {
    var choice = effectiveChoice();
    if (choice) apply(choice);
    // No choice yet: remove any Google Analytics cookies left from before this banner existed.
    else clearAnalyticsCookies();
    if (!currentChoice() && !gpc) showBanner(false);
    if (location.hash === '#cookie-settings') openSettings();
  }

  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start);
})();
