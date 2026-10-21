/* Key Room — beta layer (v0.29.2)
 * 1. Local usage log: screens, actions, time, progress, errors — stored ONLY on this device.
 * 2. "Share usage report": tester reviews it, then optionally attaches it to GitHub feedback.
 * 3. Beta feedback pill in the sidebar.
 * 4. 3-step welcome on first launch.
 * 5. One-question check-in after the 3rd session.
 * 6. Clear help when the microphone is blocked or missing.
 */
(function () {
  'use strict';

  var REPO = 'https://github.com/zjuv007/keyroom-beta';
  var FEEDBACK = REPO + '/issues/new?template=feedback.yml';
  var BUG = REPO + '/issues/new?template=bug.yml';
  var MIC_SETTINGS = 'ms-settings:privacy-microphone';
  var UA = navigator.userAgent || '';
  var IOS = /iPhone|iPad|iPod/.test(UA) || (/Macintosh/.test(UA) && navigator.maxTouchPoints > 1);
  var ANDROID = /Android/.test(UA);
  var MOBILE = IOS || ANDROID;
  var LK = 'kr-usage-v1';
  var VER = (typeof APP !== 'undefined' && APP.v) || '';
  var TABS = { weekly: 'Home · This week', learn: 'Scales', explore: 'Home · Any scale', chords: 'Chords', build: 'Builder' };
  var MAX_CLICK_KEYS = 400;
  var TICK = 10000; // active-time sampling (ms)

  // ---------------- storage ----------------
  function blank() {
    return { v: 1, on: true, firstRun: new Date().toISOString(), sessions: 0, days: {}, screens: {}, clicks: {},
      progress: null, firstPractice: null, welcome: false, checkin: { done: false, asked: 0, nextAt: 3, mood: '' },
      mic: { blocked: 0, missing: 0, busy: 0 }, errors: [] };
  }
  function load() {
    try { var d = JSON.parse(localStorage.getItem(LK) || 'null'); if (d && d.v === 1) return Object.assign(blank(), d); } catch (e) {}
    return blank();
  }
  var U = load();
  var dirty = false;
  function save() { dirty = false; try { localStorage.setItem(LK, JSON.stringify(U)); } catch (e) {} }
  function touch() { dirty = true; }
  setInterval(function () { if (dirty) save(); }, 5000);
  window.addEventListener('beforeunload', save);

  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function tabName() { try { return TABS[UI.tab] || UI.tab || 'Home'; } catch (e) { return 'Home'; } }

  // ---------------- session + active time ----------------
  U.sessions += 1; if (U.on) { var t0 = today(); U.days[t0] = U.days[t0] || 0; } touch(); save();
  var curScreen = tabName();
  // Count time while the window is visible and the user is around (focused, or interacted in the last 2 min —
  // e.g. playing along with the metronome without touching the keyboard).
  var lastAct = Date.now();
  ['pointerdown', 'keydown', 'wheel', 'pointermove'].forEach(function (ev) { window.addEventListener(ev, function () { lastAct = Date.now(); }, { passive: true, capture: true }); });
  setInterval(function () {
    if (!U.on || document.hidden || !(document.hasFocus() || Date.now() - lastAct < 120000)) return;
    var k = today(); U.days[k] = (U.days[k] || 0) + TICK / 1000;
    var s = U.screens[curScreen] || (U.screens[curScreen] = { visits: 0, sec: 0 }); s.sec += TICK / 1000;
    touch();
  }, TICK);

  // ---------------- screens + progress (hooked into the app's render) ----------------
  function noteScreen() {
    var t = tabName();
    if (t !== curScreen || !U.screens[t]) {
      curScreen = t;
      if (U.on) { var s = U.screens[t] || (U.screens[t] = { visits: 0, sec: 0 }); s.visits += 1; touch(); }
    }
  }
  function noteProgress() {
    try {
      var D = rmData();
      if (!U.progress || D.done >= (U.progress.done || 0)) { U.progress = { done: D.done, tot: D.tot, pct: D.pct, week: D.cur, at: today() }; touch(); }
    } catch (e) {}
  }
  function afterRender() { noteScreen(); noteProgress(); injectPill(); }
  if (typeof render === 'function') {
    var _render = render;
    render = function () { var r = _render.apply(this, arguments); try { afterRender(); } catch (e) {} return r; };
  }
  if (U.on) { var s0 = U.screens[curScreen] || (U.screens[curScreen] = { visits: 0, sec: 0 }); s0.visits += 1; }

  // ---------------- clicks ----------------
  function labelOf(el) {
    var t = el.getAttribute('aria-label') || el.getAttribute('title') || '';
    if (!t) t = ((el.innerText || el.textContent || '').split(/\n/).map(function (x) { return x.trim(); }).filter(Boolean)[0] || '');
    if (el.dataset && el.dataset.tab) t = 'Tab: ' + (t || TABS[el.dataset.tab] || el.dataset.tab);
    if (!t && el.id) t = '#' + el.id;
    if (!t && typeof el.className === 'string') t = '.' + el.className.split(' ')[0];
    t = t.replace(/\s+/g, ' ').trim();
    return t.length > 40 ? t.slice(0, 40) + '…' : t;
  }
  document.addEventListener('click', function (e) {
    if (!U.on) return;
    var el = e.target.closest && e.target.closest('button,[role=button],a,[data-tab],summary,select,label,.hit');
    if (!el || el.closest('.krb')) return; // ignore our own beta UI
    var lab = labelOf(el); if (!lab) return;
    var key = tabName() + ' › ' + lab;
    if (U.clicks[key] == null && Object.keys(U.clicks).length >= MAX_CLICK_KEYS) return;
    U.clicks[key] = (U.clicks[key] || 0) + 1;
    if (!U.firstPractice && /practi[cs]e/i.test(lab)) U.firstPractice = new Date().toISOString();
    touch();
  }, true);

  // ---------------- errors ----------------
  function logErr(msg) {
    if (!U.on) return;
    U.errors.push({ at: new Date().toISOString().slice(0, 16), tab: tabName(), msg: String(msg).slice(0, 160) });
    if (U.errors.length > 20) U.errors = U.errors.slice(-20);
    touch();
  }
  window.addEventListener('error', function (e) { logErr((e.message || 'Error') + (e.lineno ? ' @' + e.lineno : '')); });
  window.addEventListener('unhandledrejection', function (e) { logErr('Promise: ' + ((e.reason && (e.reason.message || e.reason.name)) || e.reason)); });

  // ---------------- report ----------------
  var FEATURES = [
    ['Home · This week', function () { return seen('Home · This week'); }],
    ['Home · Any scale', function () { return seen('Home · Any scale'); }],
    ['Scales', function () { return seen('Scales'); }],
    ['Chords', function () { return seen('Chords'); }],
    ['Builder', function () { return seen('Builder'); }],
    ['Practice button', function () { return clicked(/practi[cs]e/i); }],
    ['Metronome / tempo', function () { return clicked(/bpm|tempo|metronome|^\+$|^−$|^-$/i); }],
    ['Tuner', function () { return clicked(/\btune\b|tuner/i); }],
    ['Note listener', function () { return clicked(/listen/i); }],
    ['Chord detector', function () { return clicked(/^chord$|› chord$/i); }],
    ['Sounds (electric, acoustic…)', function () { return clicked(/electric|acoustic|bass|piano|synth/i); }],
    ['Piano view', function () { return clicked(/piano/i); }],
    ['Key picker', function () { return clicked(/› key\b(?! room)/i); }],
    ['Roadmap / Mastery', function () { return clicked(/roadmap|mastery/i); }],
    ['Backup / export', function () { return clicked(/backup|export/i); }],
  ];
  function seen(name) { return !!(U.screens[name] && U.screens[name].visits); }
  function clicked(re) { return Object.keys(U.clicks).some(function (k) { return re.test(k); }); }
  function mins(sec) { var m = Math.round(sec / 60); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60) + ' min'; }

  function report() {
    var days = Object.keys(U.days).sort();
    var total = days.reduce(function (a, k) { return a + U.days[k]; }, 0);
    var L = [];
    L.push('Key Room usage report — v' + VER + ' — ' + today());
    L.push('');
    L.push('Overview');
    L.push('- First opened: ' + U.firstRun.slice(0, 10) + ' · Sessions: ' + U.sessions + ' · Active days: ' + days.length + ' · Active time: ' + mins(total));
    if (U.progress) L.push('- Progress: Week ' + U.progress.week + ' of 11 · ' + U.progress.done + ' of ' + U.progress.tot + ' boxes (' + U.progress.pct + '%)');
    L.push('- First practice: ' + (U.firstPractice ? U.firstPractice.slice(0, 10) : 'not yet') + ' · Welcome finished: ' + (U.welcome ? 'yes' : 'no'));
    if (U.checkin.mood) L.push('- Check-in mood: ' + U.checkin.mood);
    L.push('');
    L.push('Screens (visits · time)');
    Object.keys(U.screens).sort(function (a, b) { return U.screens[b].sec - U.screens[a].sec; }).forEach(function (k) {
      L.push('- ' + k + ': ' + U.screens[k].visits + ' · ' + mins(U.screens[k].sec));
    });
    var top = Object.keys(U.clicks).sort(function (a, b) { return U.clicks[b] - U.clicks[a]; }).slice(0, 20);
    if (top.length) {
      L.push('');
      L.push('Top actions');
      top.forEach(function (k) { L.push('- ' + k + ': ' + U.clicks[k]); });
    }
    var unused = FEATURES.filter(function (f) { return !f[1](); }).map(function (f) { return f[0]; });
    L.push('');
    L.push('Not used yet: ' + (unused.length ? unused.join(', ') : 'none — tried everything'));
    if (U.mic.blocked || U.mic.missing || U.mic.busy) L.push('Mic problems: blocked ' + U.mic.blocked + ' · no mic ' + U.mic.missing + ' · busy ' + U.mic.busy);
    L.push('');
    L.push('Errors: ' + (U.errors.length || 'none'));
    U.errors.slice(-5).forEach(function (e) { L.push('- ' + e.at + ' [' + e.tab + '] ' + e.msg); });
    if (days.length) {
      L.push('');
      L.push('Active days: ' + days.slice(-30).map(function (k) { return k.slice(5) + ' (' + Math.round(U.days[k] / 60) + 'm)'; }).join(', '));
    }
    return L.join('\n');
  }

  function openUrl(url) { window.open(url, '_blank'); }
  function feedbackUrl(extraText, withReport) {
    var u = FEEDBACK;
    if (extraText) u += '&anything=' + encodeURIComponent(extraText);
    if (withReport) { var r = report(); if (r.length > 5500) r = r.slice(0, 5500) + '\n…(trimmed)'; u += '&usage=' + encodeURIComponent(r); }
    return u;
  }


  var IC = {
    copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
    chat: '<svg viewBox="0 0 24 24"><path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-4.5 3.5V17H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/></svg>',
    bug: '<svg viewBox="0 0 24 24"><rect x="7" y="8" width="10" height="12" rx="5"/><path d="M12 12v8M7 13H3.5M20.5 13H17M7.5 17.5L4.5 19.5M16.5 17.5l3 2M9 8.5L7.5 5.5M15 8.5l1.5-3"/></svg>',
    chart: '<svg viewBox="0 0 24 24"><path d="M4 20h16"/><rect x="6" y="11" width="3" height="6" rx="1"/><rect x="11" y="7" width="3" height="10" rx="1"/><rect x="16" y="13" width="3" height="4" rx="1"/></svg>',
    wave: '<svg viewBox="0 0 24 24"><path d="M12 3l2.2 5.3L20 9l-4.4 3.8L17 19l-5-3.1L7 19l1.4-6.2L4 9l5.8-.7z"/></svg>',
    info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
    guitar: '<svg viewBox="0 0 24 24"><path d="M9 18V5.5l11-2.5v12.5"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="15.5" r="3"/></svg>',
    loop: '<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 0 1 13.7-5.6L20 9"/><path d="M20 4v5h-5"/><path d="M20 12a8 8 0 0 1-13.7 5.6L4 15"/><path d="M4 20v-5h5"/></svg>',
    tools: '<svg viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>',
  };
  // ---------------- tiny UI kit ----------------
  function h(html) { var d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function modal(inner, opts) {
    closeModal();
    var m = h('<div class="krb krb-ovl" role="dialog" aria-modal="true"><div class="krb-card' + (opts && opts.wide ? ' wide' : '') + '">' + inner + '</div></div>');
    m.addEventListener('click', function (e) { if (e.target === m && !(opts && opts.sticky)) closeModal(); });
    shield(m, function () { if (!(opts && opts.sticky)) closeModal(); });
    document.body.appendChild(m);
    var f = m.querySelector('[data-focus]') || m.querySelector('button'); if (f) f.focus();
    return m;
  }
  function closeModal() { var m = document.querySelector('.krb-ovl'); if (m) m.remove(); }
  // Keep typing inside beta UI from triggering the app's keyboard shortcuts.
  function shield(el, onEsc) {
    el.addEventListener('keydown', function (e) { if (e.key === 'Escape' && onEsc) onEsc(); e.stopPropagation(); });
    el.addEventListener('keyup', function (e) { e.stopPropagation(); });
    el.addEventListener('keypress', function (e) { e.stopPropagation(); });
  }
  function say(msg) { try { toast(msg); } catch (e) {} }

  // ---------------- 3. feedback pill ----------------
  function injectPill() {
    var side = document.querySelector('.side');
    if (!side || side.querySelector('.krb-pill')) return;
    var b = h('<button class="krb krb-pill" type="button" aria-label="Beta feedback"><span class="krb-dot"></span><b>Beta</b><span>Feedback</span></button>');
    b.addEventListener('click', hub);
    var ver = side.querySelector('.ver');
    if (ver) side.insertBefore(b, ver); else side.appendChild(b);
  }
  function hub() {
    var m = modal(
      '<div class="krb-hd"><h2>Help shape Key Room</h2><button class="krb-x" data-x aria-label="Close"><svg class="gi" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6"/></svg></button></div>' +
      '<p class="krb-p">You\'re one of the first testers — thank you. Pick whatever is quickest:</p>' +
      '<div class="krb-list">' +
      '<button data-a="fb" data-focus><span class="krb-li">' + IC.chat + '</span><span><b>Send feedback</b><small>3-minute form · needs a GitHub account</small></span></button>' +
      '<button data-a="copy"><span class="krb-li">' + IC.copy + '</span><span><b>Copy feedback</b><small>No account needed — paste it on Reddit</small></span></button>' +
      '<button data-a="bug"><span class="krb-li">' + IC.bug + '</span><span><b>Report a bug</b><small>Something broke or looked wrong</small></span></button>' +
      '<button data-a="usage"><span class="krb-li">' + IC.chart + '</span><span><b>View my usage report</b><small>What you\'ve used — stays on this device unless you share it</small></span></button>' +
      '<button data-a="welcome"><span class="krb-li">' + IC.wave + '</span><span><b>Start here</b><small>The 2-minute tour of how Key Room works</small></span></button>' +
      ((window.krDesk && window.krDesk.about) || window.krGate ? '<button data-a="about"><span class="krb-li">' + IC.info + '</span><span><b>About Key Room &amp; license</b><small>Version, beta end date, terms</small></span></button>' : '') +
      '</div>');
    m.querySelector('[data-x]').onclick = closeModal;
    m.querySelectorAll('[data-a]').forEach(function (b) {
      b.onclick = function () {
        var a = b.dataset.a;
        if (a === 'fb') { openUrl(feedbackUrl('', false)); closeModal(); }
        if (a === 'copy') copyModal();
        if (a === 'bug') { openUrl(BUG + '&version=' + encodeURIComponent(VER)); closeModal(); }
        if (a === 'usage') usageModal();
        if (a === 'welcome') { if (window.krTutorial) { closeModal(); window.krTutorial(0); } else welcome(0); }
        if (a === 'about') { closeModal(); if (window.krDesk && window.krDesk.about) window.krDesk.about(); else if (window.krGate) window.krGate.about(); }
      };
    });
  }

  // ---------------- 2. usage report modal ----------------
  function usageModal() {
    var m = modal(
      '<div class="krb-hd"><h2>Your usage report</h2><button class="krb-x" data-x aria-label="Close"><svg class="gi" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6"/></svg></button></div>' +
      '<p class="krb-p">Key Room keeps this summary <b>only on this device</b> — which screens and buttons you use, for how long, and any errors. Nothing is sent anywhere unless you choose to share it below.</p>' +
      '<pre class="krb-pre">' + esc(report()) + '</pre>' +
      '<label class="krb-chk"><input type="checkbox" data-on' + (U.on ? ' checked' : '') + '> Keep recording usage on this device</label>' +
      '<div class="krb-row"><button class="krb-btn ghost" data-clear>Clear data</button><span class="krb-sp"></span>' +
      '<button class="krb-btn ghost" data-copy>Copy</button><button class="krb-btn" data-share data-focus>Share with feedback</button></div>', { wide: true });
    m.querySelector('[data-x]').onclick = closeModal;
    m.querySelector('[data-on]').onchange = function (e) { U.on = e.target.checked; save(); say(U.on ? 'Usage recording on' : 'Usage recording paused'); };
    m.querySelector('[data-copy]').onclick = function () {
      try { navigator.clipboard.writeText(report()).then(function () { say('Report copied'); }, function () { say('Could not copy'); }); } catch (e) { say('Could not copy'); }
    };
    m.querySelector('[data-share]').onclick = function () { openUrl(feedbackUrl('', true)); closeModal(); say('Opening the feedback form…'); };
    m.querySelector('[data-clear]').onclick = function () {
      if (!confirm('Clear your usage report? Your practice progress is not affected.')) return;
      var keep = { firstRun: U.firstRun, welcome: U.welcome, checkin: U.checkin, on: U.on };
      U = Object.assign(blank(), keep); save(); usageModal(); say('Usage report cleared');
    };
  }

  // ---------------- copy feedback (no account needed) ----------------
  function copyText(txt, okMsg) {
    try { navigator.clipboard.writeText(txt).then(function () { say(okMsg); }, function () { say('Could not copy'); }); } catch (e) { say('Could not copy'); }
  }
  function feedbackText(msg, withReport) {
    var t = 'Key Room v' + VER + ' feedback\n\n' + (msg || '').trim();
    if (withReport) t += '\n\n---\n' + report();
    return t;
  }
  function copyModal(prefill) {
    var m = modal(
      '<div class="krb-hd"><h2>Copy your feedback</h2><button class="krb-x" data-x aria-label="Close"><svg class="gi" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6"/></svg></button></div>' +
      '<p class="krb-p">No account needed. Write a few lines, copy, then paste it into the <b>Reddit thread</b> or a <b>DM</b>.</p>' +
      '<textarea class="krb-ta" rows="5" data-focus placeholder="What worked? What was confusing? What would you change?">' + esc(prefill || '') + '</textarea>' +
      '<label class="krb-chk"><input type="checkbox" data-inc checked> Include my usage report</label>' +
      '<div class="krb-row"><span class="krb-sp"></span><button class="krb-btn" data-copy>Copy to clipboard</button></div>', { wide: true });
    m.querySelector('[data-x]').onclick = closeModal;
    m.querySelector('[data-copy]').onclick = function () {
      copyText(feedbackText(m.querySelector('textarea').value, m.querySelector('[data-inc]').checked), 'Copied — paste it in the Reddit thread or a DM');
      closeModal();
    };
  }

  // ---------------- 4. welcome tour ----------------
  var STEPS = [
    { icon: 'guitar', t: 'Welcome to Key Room', b: 'One scale per week, in E, starting from the open position. Every new scale is shown as a change from <b>minor pentatonic</b> — the shape you\'ll learn first.' },
    { icon: 'loop', t: 'Your weekly loop', b: '<b>Home</b> shows this week\'s scale. Hit <b>Practice</b>, learn one neck box at a time, and watch the <b>Roadmap</b> fill up. 10 focused minutes a day is plenty.' },
    { icon: 'tools', t: 'Tools — and your input', b: (MOBILE ? 'Sounds, tempo, tuner and note listener live under <b>Sound</b> in the tab bar.' : 'Sounds, tempo, tuner and note listener live in the left sidebar.') + ' Tap <b>Beta · Feedback</b> anytime — it\'s the whole point of this beta. Your usage stays on this device unless you share it.' },
  ];
  function welcome(i) {
    var st = STEPS[i];
    var dots = STEPS.map(function (_, j) { return '<i class="' + (j === i ? 'on' : '') + '"></i>'; }).join('');
    var last = i === STEPS.length - 1;
    var m = modal(
      '<div class="krb-wel"><div class="krb-ico">' + IC[st.icon] + '</div><h2>' + st.t + '</h2><p>' + st.b + '</p></div>' +
      '<div class="krb-dots">' + dots + '</div>' +
      '<div class="krb-row">' + (i > 0 ? '<button class="krb-btn ghost" data-back>Back</button>' : '<button class="krb-btn ghost" data-skip>Skip</button>') +
      '<span class="krb-sp"></span><button class="krb-btn" data-next data-focus>' + (last ? 'Start Week 1' : 'Next') + '</button></div>', { sticky: true });
    m.classList.add('sticky');
    var done = function () { U.welcome = true; save(); closeModal(); };
    if (m.querySelector('[data-skip]')) m.querySelector('[data-skip]').onclick = done;
    if (m.querySelector('[data-back]')) m.querySelector('[data-back]').onclick = function () { welcome(i - 1); };
    m.querySelector('[data-next]').onclick = function () {
      if (!last) return welcome(i + 1);
      done();
      try { if (UI.tab !== 'weekly') { UI.tab = 'weekly'; render(); } } catch (e) {}
    };
  }

  // ---------------- 5. check-in after 3rd session ----------------
  function maybeCheckin() {
    var c = U.checkin;
    if (c.done || U.sessions < c.nextAt || c.asked >= 2 || document.querySelector('.krb-ovl')) return;
    c.asked += 1; save();
    var card = h('<div class="krb krb-ci" role="dialog" aria-label="Quick check-in">' +
      '<button class="krb-x" data-x aria-label="Not now"><svg class="gi" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6"/></svg></button>' +
      '<b>How\'s Key Room going so far?</b>' +
      '<div class="krb-moods"><button data-m="Loving it" aria-label="Loving it"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9 10v.5M15 10v.5"/><path d="M8 14.5c1 1.4 2.4 2 4 2s3-.6 4-2"/></svg><span>Loving it</span></button><button data-m="It\'s OK" aria-label="It\'s OK"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9 10v.5M15 10v.5"/><path d="M8.5 15h7"/></svg><span>It\'s OK</span></button><button data-m="Not for me" aria-label="Not for me"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9 10v.5M15 10v.5"/><path d="M8 16.5c1-1.4 2.4-2 4-2s3 .6 4 2"/></svg><span>Not for me</span></button></div>' +
      '<div class="krb-more" hidden><textarea rows="3" placeholder="What\'s the one thing you\'d change? (optional)"></textarea>' +
      '<label class="krb-chk"><input type="checkbox" checked data-inc> Include my usage report</label>' +
      '<div class="krb-row"><button class="krb-btn ghost" data-done>Done</button><span class="krb-sp"></span><button class="krb-btn ghost" data-copy>Copy</button><button class="krb-btn" data-send>GitHub</button></div></div>' +
      '</div>');
    document.body.appendChild(card);
    var close = function () { card.remove(); };
    shield(card, function () { c.nextAt = U.sessions + 2; save(); close(); });
    card.querySelector('[data-x]').onclick = function () { c.nextAt = U.sessions + 2; save(); close(); };
    card.querySelectorAll('[data-m]').forEach(function (b) {
      b.onclick = function () {
        c.mood = b.dataset.m; c.done = true; save();
        card.querySelectorAll('[data-m]').forEach(function (x) { x.classList.toggle('on', x === b); });
        card.querySelector('.krb-more').hidden = false; card.querySelector('textarea').focus();
      };
    });
    card.querySelector('[data-done]').onclick = function () { say('Thanks!'); close(); };
    card.querySelector('[data-copy]').onclick = function () {
      copyText(feedbackText('Check-in: ' + c.mood + '\n' + card.querySelector('textarea').value, card.querySelector('[data-inc]').checked), 'Copied — paste it in the Reddit thread or a DM'); close();
    };
    card.querySelector('[data-send]').onclick = function () {
      var txt = 'Check-in: ' + c.mood + '\n\n' + card.querySelector('textarea').value;
      openUrl(feedbackUrl(txt, card.querySelector('[data-inc]').checked)); close();
    };
  }

  // ---------------- 6. microphone help ----------------
  function micHelp(kind) {
    var copy = {
      blocked: IOS ? ['Microphone is blocked', 'Key Room needs the mic for the tuner and note listener:',
        '<ol><li>Open the <b>Settings</b> app → <b>Safari</b> → <b>Microphone</b></li><li>Choose <b>Ask</b> or <b>Allow</b></li><li>Come back, tap the mic again and choose <b>Allow</b></li></ol>', false]
      : ANDROID ? ['Microphone is blocked', 'Key Room needs the mic for the tuner and note listener:',
        '<ol><li>Tap the <b>lock / settings icon</b> next to the address (or long-press the app icon → <b>App info</b>)</li><li>Open <b>Permissions</b> → <b>Microphone</b> → <b>Allow</b></li><li>Come back and try again</li></ol>', false]
      : ['Microphone is turned off for apps', 'Windows is blocking Key Room from the mic. To use the tuner and note listener:',
        '<ol><li>Open <b>Settings → Privacy &amp; security → Microphone</b></li><li>Turn on <b>Microphone access</b></li><li>Turn on <b>Let desktop apps access your microphone</b></li><li>Come back and try again</li></ol>', !!window.krDesk],
      missing: ['No microphone found', MOBILE ? 'Key Room couldn\'t find a microphone. Check nothing else is using it, then try again.' : 'Key Room couldn\'t find an input. Plug in a mic or audio interface (or check it\'s enabled in Windows Sound settings), then try again.', '', false],
      busy: ['Microphone is busy', MOBILE ? 'Another app (a call, a recorder or a music app) is using the mic. Close it, then try again.' : 'Another app is using the mic in exclusive mode — often a DAW like Ableton. Close it or turn off exclusive mode, then try again.', '', false],
    }[kind];
    var m = modal('<div class="krb-hd"><h2>' + copy[0] + '</h2><button class="krb-x" data-x aria-label="Close"><svg class="gi" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6"/></svg></button></div>' +
      '<p class="krb-p">' + copy[1] + '</p>' + copy[2] +
      '<div class="krb-row"><span class="krb-sp"></span>' + (copy[3] ? '<button class="krb-btn ghost" data-set>Open microphone settings</button>' : '') +
      '<button class="krb-btn" data-x2 data-focus>OK</button></div>');
    m.querySelector('[data-x]').onclick = closeModal; m.querySelector('[data-x2]').onclick = closeModal;
    if (copy[3]) m.querySelector('[data-set]').onclick = function () { openUrl(MIC_SETTINGS); };
  }
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    var _gum = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = function (c) {
      return _gum(c).catch(function (err) {
        var n = err && err.name;
        var kind = (n === 'NotAllowedError' || n === 'SecurityError' || n === 'PermissionDeniedError') ? 'blocked'
          : (n === 'NotFoundError' || n === 'DevicesNotFoundError') ? 'missing'
          : (n === 'NotReadableError' || n === 'TrackStartError') ? 'busy' : null;
        if (kind && !(c && c.audio && c.audio.deviceId && n === 'NotFoundError')) { // a saved-mic fallback is handled by the app
          U.mic[kind] = (U.mic[kind] || 0) + 1; touch(); setTimeout(function () { micHelp(kind); }, 50);
        }
        throw err;
      });
    };
  }

  // ---------------- start ----------------
  afterRender();
  setInterval(injectPill, 2000);
  if (!U.welcome) setTimeout(function () { if (window.krTutorial) { U.welcome = true; save(); window.krTutorial(0); } else welcome(0); }, 600);
  else setTimeout(maybeCheckin, 45000);

  // Hidden hook for testing / support: window.__krBeta.report()
  window.__krBeta = { copy: copyModal, report: report, hub: hub, usage: usageModal, welcome: function () { welcome(0); }, checkin: maybeCheckin, mic: micHelp, data: function () { return U; } };
})();
