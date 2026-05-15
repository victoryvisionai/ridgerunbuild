// =====================================================================
// nav.js — Shared portal navigation
// Single source of truth for the topbar. Include on every page via:
//   <script src="/nav.js"></script>
// Then call:
//   RidgeRunNav.mount({ active: 'dashboard' });
// after the Supabase client is initialized.
// =====================================================================
//
// To add a new page to the nav: edit NAV_ITEMS below. That's it.
// To add a new shared design token: edit the CSS in injectStyles().

(function () {
  'use strict';

  // ===== Single source of truth: which pages exist in the nav =====
  const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', href: '/dashboard.html' },
    { id: 'dna',       label: 'Investor DNA', href: '/dna.html' },
    { id: 'uploads',   label: 'Uploads', href: '/uploads.html' },
    { id: 'watchlist', label: 'Watchlist', href: '/watchlist.html' }
    // Future pages get added here. Example for batch 3:
    // { id: 'performance', label: 'Performance', href: '/performance.html' },
  ];

  // ===== Style block injected once on first mount =====
  function injectStyles() {
    if (document.getElementById('rr-nav-styles')) return;
    const s = document.createElement('style');
    s.id = 'rr-nav-styles';
    s.textContent = `
      .rr-topbar {
        background: #ffffff;
        border-bottom: 1px solid #e2e8f0;
        padding: 0 24px;
        height: 56px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-family: 'Inter', -apple-system, sans-serif;
      }
      .rr-topbar-brand { display: flex; align-items: center; gap: 12px; }
      .rr-topbar-brand a { text-decoration: none; }
      .rr-brand-mark {
        font-family: 'Source Serif 4', Georgia, serif;
        font-size: 22px;
        font-weight: 600;
        color: #2563eb;
        letter-spacing: -0.02em;
      }
      .rr-brand-name {
        font-family: 'JetBrains Mono', monospace;
        font-size: 10px;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        color: #475569;
      }
      .rr-topbar-nav { display: flex; align-items: center; gap: 4px; }
      .rr-nav-link {
        padding: 8px 12px;
        border-radius: 4px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #475569;
        transition: all 0.15s;
        text-decoration: none;
      }
      .rr-nav-link:hover { background: #f8fafc; color: #0f172a; text-decoration: none; }
      .rr-nav-link.rr-active { background: #eff6ff; color: #1e40af; }
      .rr-topbar-user { display: flex; align-items: center; gap: 12px; }
      .rr-user-email {
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        color: #475569;
      }
      .rr-signout-btn {
        font-family: 'JetBrains Mono', monospace;
        font-size: 10px;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: #94a3b8;
        background: transparent;
        border: 1px solid #e2e8f0;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.15s;
      }
      .rr-signout-btn:hover { border-color: #94a3b8; color: #475569; }
    `;
    document.head.appendChild(s);
  }

  // ===== Build the topbar HTML =====
  function buildTopbar(activeId) {
    const nav = document.createElement('nav');
    nav.className = 'rr-topbar';
    nav.id = 'rr-topbar';

    // Brand (clickable home link)
    const brand = document.createElement('div');
    brand.className = 'rr-topbar-brand';
    brand.innerHTML = `
      <a href="/dashboard.html" style="display: flex; align-items: center; gap: 12px;">
        <span class="rr-brand-mark">RR</span>
        <span class="rr-brand-name">Ridge Run</span>
      </a>
    `;
    nav.appendChild(brand);

    // Nav links
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

    // User block (filled in after we know who they are)
    const user = document.createElement('div');
    user.className = 'rr-topbar-user';
    user.innerHTML = `
      <span class="rr-user-email" id="rr-user-email"></span>
      <button class="rr-signout-btn" id="rr-signout-btn">Sign out</button>
    `;
    nav.appendChild(user);

    return nav;
  }

  // ===== Mount: replace #rr-nav-container (or prepend to body) =====
  async function mount(opts) {
    opts = opts || {};
    const activeId = opts.active || autoDetectActive();
    const supabase = opts.supabase || (window.supabase && window.supabase.client) || null;

    injectStyles();

    const nav = buildTopbar(activeId);

    const container = document.getElementById('rr-nav-container');
    if (container) {
      container.replaceWith(nav);
    } else {
      // Fall back: prepend to body
      document.body.insertBefore(nav, document.body.firstChild);
    }

    // Wire user email + signout
    if (supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const emailEl = document.getElementById('rr-user-email');
          if (emailEl) emailEl.textContent = user.email;
        }
      } catch (e) { /* non-fatal */ }

      const signoutBtn = document.getElementById('rr-signout-btn');
      if (signoutBtn) {
        signoutBtn.addEventListener('click', async () => {
          await supabase.auth.signOut();
          window.location.href = '/';
        });
      }
    }
  }

  // ===== Auto-detect active page from URL if not passed =====
  function autoDetectActive() {
    const path = window.location.pathname.toLowerCase();
    for (const item of NAV_ITEMS) {
      const pageName = item.href.replace(/^\//, '').replace(/\.html$/, '');
      if (path.includes(pageName)) return item.id;
    }
    // Default to dashboard if we can't tell
    return 'dashboard';
  }

  // ===== Expose globally =====
  window.RidgeRunNav = { mount, NAV_ITEMS };
})();
