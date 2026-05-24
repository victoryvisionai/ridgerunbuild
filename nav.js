// =====================================================================
// nav.js — Shared portal navigation
// =====================================================================
(function () {
  'use strict';

  const NAV_ITEMS = [
    { id: 'dashboard',   label: 'Dashboard',     href: '/dashboard.html' },
    { id: 'dna',         label: 'Investor DNA',  href: '/dna.html' },
    { id: 'uploads',     label: 'Uploads',       href: '/uploads.html' },
    { id: 'performance', label: 'Performance',   href: '/performance.html' },
    { id: 'portfolio',   label: 'Portfolio',     href: '/portfolio.html' },
    { id: 'watchlist',   label: 'Watchlist',     href: '/watchlist.html' },
    { id: 'strategy',    label: 'Strategy',      href: '/strategy.html' },
    { id: 'stress',      label: 'Stress',        href: '/stress.html' },
    { id: 'research',    label: 'Research',      href: '/research.html' },
    { id: 'model',       label: 'Model',         href: '/model.html' },
    { id: 'screener',    label: 'Screener',      href: '/screener.html' },
    { id: 'ai',          label: 'Ask AI',        href: '/ai.html' }
  ];

  function injectStyles() {
    if (document.getElementById('rr-nav-styles')) return;
    const s = document.createElement('style');
    s.id = 'rr-nav-styles';
    s.textContent = `
      .rr-topbar { background:#fff; border-bottom:1px solid #e2e8f0; padding:0 24px; height:56px; display:flex; align-items:center; justify-content:space-between; font-family:'Inter',-apple-system,sans-serif; flex-wrap:wrap; }
      .rr-topbar-brand { display:flex; align-items:center; gap:12px; }
      .rr-topbar-brand a { text-decoration:none; display:flex; align-items:center; gap:12px; }
      .rr-brand-mark { font-family:'Source Serif 4',Georgia,serif; font-size:22px; font-weight:600; color:#2563eb; letter-spacing:-0.02em; }
      .rr-brand-name { font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:0.15em; text-transform:uppercase; color:#475569; }
      .rr-topbar-nav { display:flex; align-items:center; gap:2px; flex-wrap:wrap; }
      .rr-nav-link { padding:6px 10px; border-radius:4px; font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:0.08em; text-transform:uppercase; color:#475569; text-decoration:none; }
      .rr-nav-link:hover { background:#f8fafc; color:#0f172a; }
      .rr-nav-link.rr-active { background:#eff6ff; color:#1e40af; }
      .rr-topbar-user { display:flex; align-items:center; gap:12px; }
      .rr-user-email { font-family:'JetBrains Mono',monospace; font-size:11px; color:#475569; }
      .rr-signout-btn { font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:0.1em; text-transform:uppercase; color:#94a3b8; background:transparent; border:1px solid #e2e8f0; padding:6px 12px; border-radius:4px; cursor:pointer; }
      .rr-signout-btn:hover { border-color:#94a3b8; color:#475569; }
    `;
    document.head.appendChild(s);
  }

  function buildTopbar(activeId) {
    const nav = document.createElement('nav');
    nav.className = 'rr-topbar';
    nav.id = 'rr-topbar';
    const brand = document.createElement('div');
    brand.className = 'rr-topbar-brand';
    brand.innerHTML = `<a href="/dashboard.html"><span class="rr-brand-mark">RR</span><span class="rr-brand-name">Ridge Run</span></a>`;
    nav.appendChild(brand);
    const links = document.createElement('div');
    links.className = 'rr-topbar-nav';
    NAV_ITEMS.forEach(item => {
      const a = document.createElement('a');
      a.href = item.href;
      a.className = 'rr-nav-link' + (item.id === activeId ? ' rr-active' : '');
      a.textContent = item.label;
      links.appendChild(a);
    });
    nav.appendChild(links);
    const user = document.createElement('div');
    user.className = 'rr-topbar-user';
    user.innerHTML = `<span class="rr-user-email" id="rr-user-email"></span><button class="rr-signout-btn" id="rr-signout-btn">Sign out</button>`;
    nav.appendChild(user);
    return nav;
  }

  async function mount(opts) {
    opts = opts || {};
    const activeId = opts.active || autoDetectActive();
    const supabase = opts.supabase || (window.supabase && window.supabase.client) || null;
    injectStyles();
    const nav = buildTopbar(activeId);
    const container = document.getElementById('rr-nav-container');
    if (container) container.replaceWith(nav);
    else document.body.insertBefore(nav, document.body.firstChild);
    if (supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const e = document.getElementById('rr-user-email');
          if (e) e.textContent = user.email;
        }
      } catch (e) {}
      const b = document.getElementById('rr-signout-btn');
      if (b) b.addEventListener('click', async () => { await supabase.auth.signOut(); window.location.href='/'; });
    }
  }

  function autoDetectActive() {
    const path = window.location.pathname.toLowerCase();
    for (const item of NAV_ITEMS) {
      const pageName = item.href.replace(/^\//,'').replace(/\.html$/,'');
      if (path.includes(pageName)) return item.id;
    }
    return 'dashboard';
  }

  window.RidgeRunNav = { mount, NAV_ITEMS };
})();
