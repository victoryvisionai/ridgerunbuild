// =====================================================================
// assets/rr-ui.js — formatters, RPC helper and small SVG charts for the
// wealth pages. Load after /assets/rr.js.
// =====================================================================
(function () {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = v => (v == null || v === '' || isNaN(Number(v))) ? null : Number(v);
  function usd(v, opts) {
    v = num(v); if (v == null) return '—';
    const o = opts || {};
    const a = Math.abs(v);
    if (o.compact && a >= 1e6) return (v < 0 ? '-$' : '$') + (a / 1e6).toFixed(2) + 'M';
    if (o.compact && a >= 1e4) return (v < 0 ? '-$' : '$') + (a / 1e3).toFixed(1) + 'K';
    const s = a.toLocaleString('en-US', { minimumFractionDigits: o.cents ? 2 : 0, maximumFractionDigits: o.cents ? 2 : 0 });
    return (v < 0 ? '-$' : (o.sign && v > 0 ? '+$' : '$')) + s;
  }
  // pct(x) where x is already in percent units (12.3 => 12.3%)
  function pct(v, d, sign) { v = num(v); if (v == null) return '—'; return (sign && v > 0 ? '+' : '') + v.toFixed(d == null ? 1 : d) + '%'; }
  // ratio(x) where x is a fraction (0.123 => 12.3%)
  function ratio(v, d, sign) { v = num(v); return v == null ? '—' : pct(v * 100, d, sign); }
  const cls = v => (num(v) == null || num(v) === 0) ? '' : (num(v) > 0 ? 'pos' : 'neg');
  function ago(t) {
    if (!t) return 'never';
    const h = (Date.now() - new Date(t).getTime()) / 3.6e6;
    if (h < 1) return Math.max(1, Math.round(h * 60)) + 'm ago';
    if (h < 48) return Math.round(h) + 'h ago';
    return Math.round(h / 24) + 'd ago';
  }
  const day = t => t ? new Date(String(t).length <= 10 ? t + 'T12:00:00' : t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—';

  async function rpc(name, args) {
    await window.RR.ready;
    const { data, error } = await window.RR.sb.rpc(name, args || {});
    if (error) {
      const msg = error.code === 'PGRST202' ? 'The backend for this page is not installed yet (' + name + ').' : (error.message || String(error));
      throw new Error(msg);
    }
    return data;
  }
  function fail(el, e) { if (el) el.innerHTML = '<div class="err">' + esc(e.message || e) + '</div>'; console.error(e); }

  const SLEEVE_COLOR = { core: 'var(--s-core)', option_selling: 'var(--s-opt)', special_sits_leaps: 'var(--s-spec)', real_assets: 'var(--s-real)', restricted: 'var(--s-restricted)', cash: 'var(--s-cash)' };
  const SLEEVE_NAME = { core: 'Core equity', option_selling: 'Option selling', special_sits_leaps: 'Special sits & LEAPs', real_assets: 'CRE & businesses', restricted: 'Restricted', cash: 'Cash' };

  // Sleeve bars: actual (fill) vs min–max band (shaded) and target (tick). Scale 0..max(40, values)
  function sleeveBars(el, sleeves) {
    if (!sleeves || !sleeves.length) { el.innerHTML = '<div class="rr-empty">No sleeve data</div>'; return; }
    const scale = Math.max(40, ...sleeves.map(s => Math.max(num(s.pct) || 0, num(s.max_pct) || 0))) * 1.05;
    const x = v => Math.min(100, (num(v) || 0) / scale * 100);
    el.innerHTML = sleeves.map(s => {
      const st = s.status === 'ok' ? '<span class="pill ok">On target</span>' : s.status === 'under' ? '<span class="pill warn">Under</span>' : s.status === 'over' ? '<span class="pill bad">Over</span>' : '';
      return `<div class="sleeve-row" title="${esc(s.name)}: ${pct(s.pct)} of investable (target ${pct(s.target_pct, 0)}, band ${pct(s.min_pct, 0)}–${pct(s.max_pct, 0)})">
        <div style="display:flex;gap:8px;align-items:center;min-width:0"><span class="dot" style="background:${SLEEVE_COLOR[s.code] || 'var(--text-dim)'}"></span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(s.name)}</span></div>
        <div class="sleeve-track">
          <div class="sleeve-band" style="left:${x(s.min_pct)}%;width:${x(s.max_pct) - x(s.min_pct)}%"></div>
          <div class="sleeve-fill" style="width:${x(s.pct)}%;background:${SLEEVE_COLOR[s.code] || 'var(--text-dim)'}"></div>
          <div class="sleeve-target" style="left:calc(${x(s.target_pct)}% - 1px)"></div>
        </div>
        <div style="text-align:right;font-variant-numeric:tabular-nums"><b>${pct(s.pct)}</b> <span class="rr-muted">/ ${pct(s.target_pct, 0)}</span><div style="margin-top:2px">${st}</div></div>
      </div>`;
    }).join('') + `<div class="rr-note" style="margin-top:8px">Bar = actual share of investable assets. Shaded = allowed band. Tick = target.</div>`;
  }

  // Line chart. series: [{name, color, points:[{x: Date|string, y: number}], fmt}]  opts: {height, yFmt, zero, area}
  function lineChart(el, series, opts) {
    opts = opts || {};
    const H = opts.height || 220, W = 760, padL = 56, padR = 12, padT = 10, padB = 24;
    const all = series.flatMap(s => s.points.filter(p => num(p.y) != null));
    if (all.length < 2) { el.innerHTML = '<div class="rr-empty">Not enough history yet</div>'; return; }
    const xs = all.map(p => +new Date(p.x));
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    let y0 = Math.min(...all.map(p => p.y)), y1 = Math.max(...all.map(p => p.y));
    if (opts.zero) { y0 = Math.min(0, y0); y1 = Math.max(0, y1); }
    if (y0 === y1) { y0 -= 1; y1 += 1; }
    const padY = (y1 - y0) * 0.08; y0 -= padY; y1 += padY;
    const X = t => padL + (+new Date(t) - x0) / Math.max(1, x1 - x0) * (W - padL - padR);
    const Y = v => padT + (1 - (v - y0) / (y1 - y0)) * (H - padT - padB);
    const yf = opts.yFmt || (v => v.toFixed(0));
    const ticks = 4, grid = [];
    for (let i = 0; i <= ticks; i++) { const v = y0 + (y1 - y0) * i / ticks; grid.push(`<line x1="${padL}" x2="${W - padR}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--grid)"/><text x="${padL - 8}" y="${Y(v) + 4}" text-anchor="end" font-size="10" fill="var(--text-dim)" font-family="var(--mono)">${esc(yf(v))}</text>`); }
    const xt = []; const nX = 5;
    for (let i = 0; i <= nX; i++) { const t = x0 + (x1 - x0) * i / nX; xt.push(`<text x="${X(t)}" y="${H - 6}" text-anchor="${i === 0 ? 'start' : i === nX ? 'end' : 'middle'}" font-size="10" fill="var(--text-dim)" font-family="var(--mono)">${new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</text>`); }
    const zero = (y0 < 0 && y1 > 0) ? `<line x1="${padL}" x2="${W - padR}" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--border-strong)"/>` : '';
    const paths = series.map(s => {
      const pts = s.points.filter(p => num(p.y) != null);
      const d = pts.map((p, i) => (i ? 'L' : 'M') + X(p.x).toFixed(1) + ',' + Y(p.y).toFixed(1)).join('');
      const area = opts.area && pts.length ? `<path d="${d}L${X(pts[pts.length - 1].x).toFixed(1)},${Y(Math.max(y0, Math.min(0, y1)))}L${X(pts[0].x).toFixed(1)},${Y(Math.max(y0, Math.min(0, y1)))}Z" fill="${s.color}" opacity=".12"/>` : '';
      return area + `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    }).join('');
    const legend = series.length > 1 ? `<div class="rr-legend">${series.map(s => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('')}</div>` : '';
    el.innerHTML = `${legend}<div class="rr-chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.label || series.map(s => s.name).join(' vs '))}">${grid.join('')}${zero}${xt.join('')}${paths}<line class="xh" y1="${padT}" y2="${H - padB}" stroke="var(--text-dim)" stroke-dasharray="3 3" visibility="hidden"/>${series.map((s, i) => `<circle class="pt${i}" r="4" fill="${s.color}" stroke="var(--bg)" stroke-width="2" visibility="hidden"/>`).join('')}<rect x="${padL}" y="${padT}" width="${W - padL - padR}" height="${H - padT - padB}" fill="transparent" class="hit"/></svg><div class="tip" hidden></div></div>`;
    const svg = el.querySelector('svg'), tip = el.querySelector('.tip'), xh = el.querySelector('.xh');
    const base = series[0].points.filter(p => num(p.y) != null);
    function move(ev) {
      const r = svg.getBoundingClientRect();
      const sx = (ev.clientX - r.left) / r.width * W;
      const t = x0 + (sx - padL) / (W - padL - padR) * (x1 - x0);
      let best = base[0]; for (const p of base) if (Math.abs(+new Date(p.x) - t) < Math.abs(+new Date(best.x) - t)) best = p;
      const bx = X(best.x);
      xh.setAttribute('x1', bx); xh.setAttribute('x2', bx); xh.setAttribute('visibility', 'visible');
      const rows = series.map((s, i) => {
        const p = s.points.find(q => String(q.x) === String(best.x));
        const c = el.querySelector('.pt' + i);
        if (p && num(p.y) != null) { c.setAttribute('cx', bx); c.setAttribute('cy', Y(p.y)); c.setAttribute('visibility', 'visible'); } else c.setAttribute('visibility', 'hidden');
        return `<div><span class="dot" style="background:${s.color};width:8px;height:8px"></span> ${esc(s.name)}: <b>${p && num(p.y) != null ? esc((s.fmt || yf)(p.y)) : '—'}</b></div>`;
      }).join('');
      tip.innerHTML = `<div class="rr-label" style="margin-bottom:3px">${day(best.x)}</div>${rows}`;
      tip.hidden = false;
      const px = bx / W * r.width;
      tip.style.left = Math.min(r.width - tip.offsetWidth - 4, Math.max(0, px + 12)) + 'px';
      tip.style.top = '8px';
    }
    const hit = el.querySelector('.hit');
    hit.addEventListener('mousemove', move);
    hit.addEventListener('mouseleave', () => { tip.hidden = true; xh.setAttribute('visibility', 'hidden'); series.forEach((s, i) => el.querySelector('.pt' + i).setAttribute('visibility', 'hidden')); });
  }

  function freshBadges(el, items) {
    el.innerHTML = items.map(([label, t, staleH]) => {
      const h = t ? (Date.now() - new Date(String(t).length <= 10 ? t + 'T20:00:00Z' : t).getTime()) / 3.6e6 : Infinity;
      return `<span class="f" data-stale="${h > staleH ? 1 : ''}" title="${t ? esc(new Date(String(t).length <= 10 ? t + 'T12:00:00' : t).toLocaleString()) : 'no data'}">${esc(label)} <b>${t ? ago(String(t).length <= 10 ? t + 'T20:00:00Z' : t) : 'none'}</b></span>`;
    }).join('');
  }

  window.RRUI = { esc, num, usd, pct, ratio, cls, ago, day, rpc, fail, sleeveBars, lineChart, freshBadges, SLEEVE_COLOR, SLEEVE_NAME };
})();
