// =====================================================================
// assets/rr.js — Ridge Run shared page runtime
// Load order on every page: supabase-js, /config.js, /assets/rr.js, /nav.js, then the page's own script.
//  - One Supabase client (window.RR.sb) sharing the signed-in session.
//  - Every call to Supabase functions/REST and to the n8n webhooks carries the
//    signed-in user's token instead of the public key. The order endpoint, the
//    portfolio RPCs and the webhooks all refuse calls without it.
//  - Pages other than index.html require sign-in.
//  - Mounts the shared navigation if the page did not.
// =====================================================================
(function () {
  'use strict';
  const cfg = window.RR_CONFIG || {};
  if (!window.supabase || !cfg.SUPABASE_URL) { console.error('rr.js: load supabase-js and config.js first'); return; }

  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY);
  const N8N = 'https://victoryvision.app.n8n.cloud/webhook/';
  const isLogin = /\/(index\.html)?$/.test(location.pathname);

  async function token() {
    try { const { data } = await sb.auth.getSession(); return data && data.session ? data.session.access_token : null; }
    catch (_) { return null; }
  }

  // Attach the user's token to our own backend calls.
  const origFetch = window.fetch.bind(window);
  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const ours = url.startsWith(cfg.SUPABASE_URL + '/functions/') || url.startsWith(cfg.SUPABASE_URL + '/rest/') || url.startsWith(N8N);
    if (!ours) return origFetch(input, init);
    const t = await token();
    if (!t) return origFetch(input, init);
    init = Object.assign({}, init || {});
    const h = new Headers(init.headers || (typeof input !== 'string' && input.headers) || undefined);
    h.set('Authorization', 'Bearer ' + t);
    if (!url.startsWith(N8N) && !h.has('apikey')) h.set('apikey', cfg.SUPABASE_PUBLISHABLE_KEY);
    init.headers = h;
    return origFetch(input, init);
  };

  // Small helpers pages can use.
  async function edge(name, body) {
    const r = await fetch(cfg.SUPABASE_URL + '/functions/v1/' + name, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((j && (j.detail || j.error)) || ('HTTP ' + r.status));
    return j;
  }
  async function webhook(path, body) {
    const r = await fetch(N8N + path.replace(/^\//, ''), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
    const txt = await r.text();
    if (!r.ok) throw new Error('HTTP ' + r.status + (txt ? ' — ' + txt.slice(0, 160) : ''));
    try { return JSON.parse(txt); } catch (_) { return txt; }
  }
  // "as of" label with stale styling: freshness(el, isoTime, hoursUntilStale)
  function freshness(el, t, staleHours) {
    if (!el) return;
    if (!t) { el.textContent = 'no data'; el.dataset.stale = '1'; return; }
    const h = (Date.now() - new Date(t).getTime()) / 3.6e6;
    el.textContent = 'as of ' + (h < 1 ? Math.max(1, Math.round(h * 60)) + 'm ago' : h < 48 ? Math.round(h) + 'h ago' : Math.round(h / 24) + 'd ago');
    el.dataset.stale = h > (staleHours || 30) ? '1' : '';
    el.title = new Date(t).toLocaleString();
  }

  const ready = (async () => {
    const t = await token();
    if (!t && !isLogin) { location.href = '/index.html?next=' + encodeURIComponent(location.pathname); return null; }
    const { data } = await sb.auth.getUser().catch(() => ({ data: {} }));
    return data && data.user ? data.user : null;
  })();

  window.RR = { sb, cfg, edge, webhook, freshness, ready, token };

  // Shared stale-badge style.
  const st = document.createElement('style');
  st.textContent = '[data-stale="1"]{color:#b45309!important;font-weight:500}';
  document.head.appendChild(st);

  // Mount the shared nav if the page has a container and did not mount it itself.
  function autoMount() {
    if (isLogin) return;
    setTimeout(() => {
      if (document.getElementById('rr-topbar')) return;
      if (window.RidgeRunNav && document.getElementById('rr-nav-container')) window.RidgeRunNav.mount({ supabase: sb });
    }, 0);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoMount); else autoMount();
})();
