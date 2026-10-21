/* Key Room — mobile guardrails (iPhone / Android build only; Windows does this in its app shell).
 * Same rules as the Windows app: accept the beta license once, beta ends on the expiry date
 * (with a clock-rollback guard), About shows version + terms. Settings come from window.KR_CFG,
 * written by scripts/build-mobile.js from app/config.js so both builds always agree. */
(function () {
  'use strict';
  var C = window.KR_CFG || {};
  var EXP = Date.parse(C.expiryIso), DAY = 864e5, K = 'kr-gate-v1';
  function load() { try { return JSON.parse(localStorage.getItem(K) || '{}'); } catch (e) { return {}; } }
  function save(s) { try { localStorage.setItem(K, JSON.stringify(s)); } catch (e) {} }
  var st = load();
  var now = Math.max(Date.now(), Number(st.lastSeen) || 0); st.lastSeen = now; save(st);
  var left = Math.ceil((EXP - now) / DAY);

  function esc(t) { return String(t).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
  function sheet(html) {
    var d = document.createElement('div'); d.className = 'krg'; d.innerHTML = '<div class="krg-card">' + html + '</div>';
    document.body.appendChild(d); document.documentElement.classList.add('krg-open'); return d;
  }
  function head() {
    return '<div class="krg-hd"><div class="krg-badge">K</div><div><b>Key Room <i>BETA</i></b><small>Version ' + esc(C.version) + '</small></div></div>';
  }
  function licenseText() { return fetch('LICENSE.txt').then(function (r) { return r.text(); }).catch(function () { return 'License: see ' + C.repo; }); }

  function expired() {
    sheet(head() + '<h2>This beta has ended</h2><p>The Key Room beta ended on <b>' + esc(C.expiryLabel) + '</b>. Thanks for testing! Get the latest version to keep practicing — your progress carries over.</p>' +
      '<a class="krg-btn" href="' + C.repo + '#iphone--android" target="_blank" rel="noopener">Get the latest version</a><p class="krg-foot">' + esc(C.copyright) + '</p>');
  }
  function gate() {
    var d = sheet(head() + '<p class="krg-lead">Thanks for testing! Free for personal use until <b>' + esc(C.expiryLabel) + '</b>. Please read and accept the license to continue.</p>' +
      '<pre class="krg-pre">Loading…</pre><label class="krg-chk"><input type="checkbox"> I have read and agree to the Key Room Beta License.</label>' +
      '<button class="krg-btn" disabled>Accept &amp; open Key Room</button><p class="krg-foot">' + esc(C.copyright) + '</p>');
    licenseText().then(function (t) { d.querySelector('pre').textContent = t; });
    var cb = d.querySelector('input'), btn = d.querySelector('button');
    cb.onchange = function () { btn.disabled = !cb.checked; };
    btn.onclick = function () { st.license = C.licenseVersion; st.acceptedAt = new Date().toISOString(); save(st); d.remove(); document.documentElement.classList.remove('krg-open'); };
  }
  function about() {
    var d = sheet(head() + '<p>' + esc(C.copyright) + '</p><p>Free for personal use during the beta. Please share the download link, not the files.</p>' +
      '<p>Beta ends <b>' + esc(C.expiryLabel) + '</b> — ' + Math.max(0, left) + ' day' + (left === 1 ? '' : 's') + ' left. Runs on your device; no accounts or tracking.</p>' +
      '<details><summary>Read the license</summary><pre class="krg-pre">Loading…</pre></details><button class="krg-btn">Close</button>');
    licenseText().then(function (t) { d.querySelector('pre').textContent = t; });
    d.querySelector('button').onclick = function () { d.remove(); document.documentElement.classList.remove('krg-open'); };
  }
  window.krGate = { about: about };

  function start() {
    if (now >= EXP) return expired();
    if (st.license !== C.licenseVersion) return gate();
    if (left <= (C.warnDays || 14) && st.warned !== new Date(now).toISOString().slice(0, 10)) {
      st.warned = new Date(now).toISOString().slice(0, 10); save(st);
      setTimeout(function () { try { toast('Beta ends in ' + left + ' day' + (left === 1 ? '' : 's') + ' — grab the latest version soon'); } catch (e) {} }, 1500);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
