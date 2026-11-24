(function () {
  'use strict';
  const U = App.U, C = App.calc, UI = App.ui;
  const state = { period: C.defaultPeriod('month') };

  function kpi(label, minor, count, extra) {
    return '<div class="card kpi"><div class="kpi-label">' + label + '</div><div class="kpi-value">' + U.money(minor) + '</div>' +
      '<div class="kpi-sub">' + count + ' expense' + (count === 1 ? '' : 's') + (extra || '') + '</div></div>';
  }

  function change(cur, prev) {
    if (!prev) return '';
    const d = (cur - prev) / prev * 100;
    const cls = d > 0 ? 'up' : 'down';
    return ' · <span class="delta ' + cls + '" title="Compared with the previous period">' + (d > 0 ? '▲ ' : '▼ ') + Math.abs(d).toFixed(0) + '%</span>';
  }

  function render(root) {
    const D = App.data, all = D.expenses;
    const t = U.today();
    const r = p => C.range(p);
    const sumIn = range => { const l = C.filter(all, range); return { total: C.sum(l), count: l.length }; };
    const today = sumIn({ from: t, to: t });
    const week = sumIn(r({ type: 'week', anchor: t }));
    const month = sumIn(r({ type: 'month', anchor: t }));
    const lastMonth = sumIn(r(C.shift({ type: 'month', anchor: t }, -1)));
    const lastWeek = sumIn(r(C.shift({ type: 'week', anchor: t }, -1)));

    const range = C.range(state.period);
    const list = C.filter(all, range);
    const total = C.sum(list);
    const bd = C.breakdown(list);
    const subs = C.subcategoryList(bd, false);
    const prevP = C.previous(state.period);
    const prevTotal = prevP ? C.sum(C.filter(all, C.range(prevP))) : 0;
    const days = range.from ? U.daysBetween(range.from, range.to < t ? range.to : (range.from > t ? range.to : t)) + 1 : null;
    const topCat = bd[0], topSub = subs[0];
    const recent = all.slice().sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt)).slice(0, 8);

    root.innerHTML =
      '<div class="page-head"><div><h1>Dashboard</h1><p class="muted">Overview of your spending</p></div>' +
      '<button class="btn primary" data-add>+ Add expense</button></div>' +

      '<section class="kpis">' +
      kpi('Total expenses (all time)', C.sum(all), all.length) +
      kpi('Today', today.total, today.count) +
      kpi('This week', week.total, week.count, change(week.total, lastWeek.total)) +
      kpi('This month', month.total, month.count, change(month.total, lastMonth.total)) +
      '</section>' +

      '<section class="card"><div class="card-head"><h2>Analysis period</h2><div data-pp></div></div>' +
      '<div class="summary-row">' +
      '<div><div class="kpi-label">Total in period</div><div class="kpi-value">' + U.money(total) + '</div><div class="kpi-sub">' + list.length + ' expenses' + (prevP ? change(total, prevTotal) : '') + '</div></div>' +
      '<div><div class="kpi-label">Daily average</div><div class="kpi-value sm">' + (days && days > 0 ? U.money(Math.round(total / days)) : '—') + '</div><div class="kpi-sub">' + (days ? days + ' day' + (days === 1 ? '' : 's') : 'All time') + '</div></div>' +
      '<div><div class="kpi-label">Most expensive category</div><div class="kpi-value sm">' + (topCat ? U.esc(topCat.icon + ' ' + topCat.name) : '—') + '</div><div class="kpi-sub">' + (topCat ? U.money(topCat.total) + ' · ' + U.fmtPct(topCat.pct) : 'No data') + '</div></div>' +
      '<div><div class="kpi-label">Most expensive subcategory</div><div class="kpi-value sm">' + (topSub ? U.esc(topSub.name) : '—') + '</div><div class="kpi-sub">' + (topSub ? U.esc(topSub.parentName) + ' · ' + U.money(topSub.total) : 'No data') + '</div></div>' +
      '</div></section>' +

      '<section class="grid2">' +
      '<div class="card"><div class="card-head"><h2>By category</h2><a href="#/breakdown" class="link">Details →</a></div>' +
      (bd.length ? '<div class="donut-wrap"><div class="chart-box donut"><canvas data-donut></canvas><div class="donut-center"><span>' + U.money(total) + '</span><small>total</small></div></div>' +
        '<ul class="legend">' + bd.map(c => '<li><span class="dot" style="background:' + c.color + '"></span><span class="name">' + U.esc(c.icon + ' ' + c.name) + '</span><span class="val">' + U.money(c.total) + '</span><span class="pct">' + U.fmtPct(c.pct) + '</span></li>').join('') + '</ul></div>'
        : empty()) + '</div>' +
      '<div class="card"><div class="card-head"><h2>Top subcategories</h2></div>' +
      (subs.length ? '<div class="chart-box" style="height:' + Math.max(160, Math.min(10, subs.length) * 34 + 40) + 'px"><canvas data-subs></canvas></div>' : empty()) + '</div>' +
      '</section>' +

      '<section class="card"><div class="card-head"><h2>Spending trend</h2><span class="muted small" data-unit></span></div>' +
      (list.length ? '<div class="chart-box" style="height:260px"><canvas data-trend></canvas></div>' : empty()) + '</section>' +

      '<section class="card"><div class="card-head"><h2>Recent transactions</h2><a href="#/expenses" class="link">View all →</a></div>' +
      (recent.length ? '<ul class="tx-list">' + recent.map(e => '<li data-id="' + e.id + '" tabindex="0">' +
        '<span class="tx-icon" style="--c:' + D.catColor(e.categoryId) + '">' + U.esc(D.catIcon(e.subcategoryId || e.categoryId)) + '</span>' +
        '<span class="tx-main"><b>' + U.esc(e.title) + '</b><small>' + U.esc(D.catName(e.categoryId) + (e.subcategoryId ? ' › ' + D.catName(e.subcategoryId) : '')) + ' · ' + U.esc(U.fmtDate(e.date)) + '</small></span>' +
        '<span class="tx-amt">' + U.money(e.amountMinor) + '</span></li>').join('') + '</ul>'
        : '<div class="empty"><p>No expenses yet.</p><button class="btn primary" data-add>Add your first expense</button><p class="muted small">or load sample data in <a href="#/settings">Settings</a> to explore.</p></div>') +
      '</section>';

    UI.periodPicker(UI.$('[data-pp]', root), state.period, p => { state.period = p; render(root); });
    UI.$$('[data-add]', root).forEach(b => b.addEventListener('click', () => UI.expenseForm()));
    UI.$$('.tx-list li', root).forEach(li => {
      li.addEventListener('click', () => UI.expenseDetails(li.dataset.id));
      li.addEventListener('keydown', e => { if (e.key === 'Enter') UI.expenseDetails(li.dataset.id); });
    });
    if (bd.length) UI.doughnut(UI.$('[data-donut]', root), bd);
    if (subs.length) UI.hbar(UI.$('[data-subs]', root), subs.slice(0, 10).map(s => ({ name: s.name + ' (' + s.parentName + ')', total: s.total, color: s.color })));
    if (list.length) {
      const unit = C.autoUnit(range.from, range.to, list);
      UI.$('[data-unit]', root).textContent = { day: 'per day', week: 'per week', month: 'per month', year: 'per year' }[unit];
      UI.trend(UI.$('[data-trend]', root), C.series(list, unit, range.from, range.to), { type: unit === 'day' && (range.from ? U.daysBetween(range.from, range.to) > 14 : true) ? 'line' : 'bar' });
    }
  }

  function empty() { return '<div class="empty small"><p class="muted">No expenses in this period.</p></div>'; }

  App.views = App.views || {};
  App.views.dashboard = { title: 'Dashboard', render };
})();
