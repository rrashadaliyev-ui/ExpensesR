/*
 * BREAKDOWN: the three calculation levels, each with its OWN independent filter.
 *   Level 1 – total expenses in a period
 *   Level 2 – category totals + % of total (with category comparison)
 *   Level 3 – subcategory totals grouped under parent categories
 */
(function () {
  'use strict';
  const U = App.U, C = App.calc, UI = App.ui;
  const state = {
    l1: { period: C.defaultPeriod('month') },
    l2: { period: C.defaultPeriod('month'), compare: null /* Set of category ids or null = all */ },
    l3: { period: C.defaultPeriod('month'), categoryId: '' }
  };

  function render(root) {
    root.innerHTML =
      '<div class="page-head"><div><h1>Breakdown</h1><p class="muted">Each level has its own period filter, so you can compare different time ranges side by side.</p></div>' +
      '<div class="head-actions"><button class="btn ghost" data-sync title="Copy the Level 1 period to Level 2 and 3">Use Level 1 period for all</button></div></div>' +
      '<section class="card level" data-l1></section>' +
      '<section class="card level" data-l2></section>' +
      '<section class="card level" data-l3></section>';
    UI.$('[data-sync]', root).addEventListener('click', () => {
      state.l2.period = Object.assign({}, state.l1.period); state.l3.period = Object.assign({}, state.l1.period); render(root);
    });
    level1(UI.$('[data-l1]', root));
    level2(UI.$('[data-l2]', root));
    level3(UI.$('[data-l3]', root));
  }

  function head(n, title, desc) {
    return '<div class="card-head"><div><span class="level-tag">Level ' + n + '</span><h2>' + title + '</h2><p class="muted small">' + desc + '</p></div><div data-pp></div></div>';
  }

  /* ---------------- Level 1 ---------------- */
  function level1(el) {
    const D = App.data, range = C.range(state.l1.period);
    const list = C.filter(D.expenses, range);
    const total = C.sum(list);
    const t = U.today();
    const days = range.from ? U.daysBetween(range.from, range.to > t && range.from <= t ? t : range.to) + 1 : null;
    const max = list.reduce((m, e) => (!m || e.amountMinor > m.amountMinor ? e : m), null);
    const prevP = C.previous(state.l1.period);
    const prev = prevP ? C.sum(C.filter(D.expenses, C.range(prevP))) : null;
    el.innerHTML = head(1, 'Total expenses', 'Sum of every expense in the selected period.') +
      '<div class="summary-row">' +
      '<div><div class="kpi-label">Total</div><div class="kpi-value" data-l1-total>' + U.money(total) + '</div><div class="kpi-sub">' + U.esc(C.label(state.l1.period)) + '</div></div>' +
      '<div><div class="kpi-label">Number of expenses</div><div class="kpi-value sm">' + list.length + '</div><div class="kpi-sub">Average ' + (list.length ? U.money(Math.round(total / list.length)) : '—') + ' each</div></div>' +
      '<div><div class="kpi-label">Daily average</div><div class="kpi-value sm">' + (days ? U.money(Math.round(total / days)) : '—') + '</div><div class="kpi-sub">' + (days ? days + ' days' : 'All time') + '</div></div>' +
      '<div><div class="kpi-label">Previous period</div><div class="kpi-value sm">' + (prev != null ? U.money(prev) : '—') + '</div><div class="kpi-sub">' + (prev ? ((total - prev) >= 0 ? '+' : '') + U.money(total - prev) + ' (' + ((total - prev) / prev * 100).toFixed(0) + '%)' : '') + '</div></div>' +
      '<div><div class="kpi-label">Largest expense</div><div class="kpi-value sm">' + (max ? U.money(max.amountMinor) : '—') + '</div><div class="kpi-sub">' + (max ? U.esc(max.title) + ' · ' + U.esc(U.fmtDate(max.date)) : '') + '</div></div>' +
      '</div>' + (list.length ? '<div class="chart-box" style="height:220px"><canvas></canvas></div>' : '');
    UI.periodPicker(UI.$('[data-pp]', el), state.l1.period, p => { state.l1.period = p; level1(el); });
    if (list.length) {
      const unit = C.autoUnit(range.from, range.to, list);
      UI.trend(UI.$('canvas', el), C.series(list, unit, range.from, range.to), { type: unit === 'day' ? 'bar' : 'line' });
    }
  }

  /* ---------------- Level 2 ---------------- */
  function level2(el) {
    const D = App.data, range = C.range(state.l2.period);
    const list = C.filter(D.expenses, range);
    const all = C.breakdown(list);
    const total = C.sum(list);
    const cmp = state.l2.compare;
    const shown = cmp ? all.filter(c => cmp.has(c.id)) : all;
    const shownTotal = shown.reduce((s, c) => s + c.total, 0);
    const problems = C.verify(list, all);
    el.innerHTML = head(2, 'Category expenses', 'Total per category and its share of all spending in the period.') +
      (all.length ? '<div class="compare"><span class="label">Compare:</span>' +
        '<button class="chip' + (!cmp ? ' on' : '') + '" data-allcats>All</button>' +
        all.map(c => '<button class="chip cat-chip' + (!cmp || cmp.has(c.id) ? ' on' : '') + '" data-cmp="' + c.id + '" style="--c:' + c.color + '"><span class="dot"></span>' + U.esc(c.name) + '</button>').join('') + '</div>' +
        '<div class="grid2 tight"><div class="table-scroll"><table class="data-table"><thead><tr><th>Category</th><th class="num">Expenses</th><th class="num">Total</th><th class="num">% of total</th></tr></thead><tbody>' +
        shown.map(c => '<tr><td>' + catCell(c) + '</td><td class="num">' + c.count + '</td><td class="num strong">' + U.money(c.total) + '</td><td class="num"><div class="pct-cell"><span class="mini-bar"><span style="width:' + c.pct.toFixed(2) + '%;background:' + c.color + '"></span></span>' + U.fmtPct(c.pct) + '</div></td></tr>').join('') +
        '</tbody><tfoot><tr><td>' + (cmp ? 'Selected categories' : 'Total') + '</td><td class="num">' + shown.reduce((s, c) => s + c.count, 0) + '</td><td class="num strong">' + U.money(shownTotal) + '</td><td class="num">' + U.fmtPct(U.pct(shownTotal, total)) + '</td></tr></tfoot></table></div>' +
        '<div class="chart-box" style="height:' + Math.max(180, shown.length * 38 + 40) + 'px"><canvas></canvas></div></div>' +
        check(problems, 'Sum of categories = Level 1 total (' + U.money(total) + ')')
        : '<div class="empty small"><p class="muted">No expenses in this period.</p></div>');
    UI.periodPicker(UI.$('[data-pp]', el), state.l2.period, p => { state.l2.period = p; level2(el); });
    const allBtn = UI.$('[data-allcats]', el);
    if (allBtn) allBtn.addEventListener('click', () => { state.l2.compare = null; level2(el); });
    UI.$$('[data-cmp]', el).forEach(b => b.addEventListener('click', () => {
      const ids = new Set(state.l2.compare || all.map(c => c.id));
      ids.has(b.dataset.cmp) ? ids.delete(b.dataset.cmp) : ids.add(b.dataset.cmp);
      state.l2.compare = ids.size === all.length || ids.size === 0 ? null : ids;
      level2(el);
    }));
    if (shown.length) UI.hbar(UI.$('canvas', el), shown.map(c => ({ name: c.name, total: c.total, color: c.color })));
  }

  /* ---------------- Level 3 ---------------- */
  function level3(el) {
    const D = App.data, range = C.range(state.l3.period);
    const list = C.filter(D.expenses, Object.assign({}, range, { categoryId: state.l3.categoryId }));
    const bd = C.breakdown(list);
    const total = C.sum(list);
    const problems = C.verify(list, bd);
    el.innerHTML = head(3, 'Subcategory expenses', 'Each subcategory under its parent. Category total = its subcategories + direct expenses (never double-counted).') +
      '<div class="compare"><label class="label" for="l3-cat">Category:</label><select id="l3-cat" class="inline-select"></select></div>' +
      (bd.length ? '<div class="table-scroll"><table class="data-table grouped"><thead><tr><th>Category / subcategory</th><th class="num">Expenses</th><th class="num">Total</th><th class="num">% of category</th><th class="num">% of total</th></tr></thead><tbody>' +
        bd.map(c => '<tr class="group"><td>' + catCell(c) + '</td><td class="num">' + c.count + '</td><td class="num strong">' + U.money(c.total) + '</td><td class="num">100%</td><td class="num">' + U.fmtPct(c.pct) + '</td></tr>' +
          c.subs.map(s => '<tr class="child"><td><span class="sub-dot" style="background:' + s.color + '"></span>' + U.esc(s.name) + '</td><td class="num">' + s.count + '</td><td class="num">' + U.money(s.total) + '</td><td class="num">' + U.fmtPct(s.pctOfCat) + '</td><td class="num">' + U.fmtPct(s.pct) + '</td></tr>').join('') +
          (c.direct.count ? '<tr class="child direct"><td><span class="muted">No subcategory (direct)</span></td><td class="num">' + c.direct.count + '</td><td class="num">' + U.money(c.direct.total) + '</td><td class="num">' + U.fmtPct(c.direct.pctOfCat) + '</td><td class="num">' + U.fmtPct(c.direct.pct) + '</td></tr>' : '')
        ).join('') +
        '</tbody><tfoot><tr><td>Total</td><td class="num">' + list.length + '</td><td class="num strong">' + U.money(total) + '</td><td></td><td class="num">100%</td></tr></tfoot></table></div>' +
        check(problems, 'Every category total = its subcategories + direct expenses')
        : '<div class="empty small"><p class="muted">No expenses in this period' + (state.l3.categoryId ? ' for this category' : '') + '.</p></div>');
    const sel = UI.$('#l3-cat', el);
    UI.fillCategorySelect(sel, state.l3.categoryId, { allLabel: 'All categories', includeArchived: true });
    sel.addEventListener('change', () => { state.l3.categoryId = sel.value; level3(el); });
    UI.periodPicker(UI.$('[data-pp]', el), state.l3.period, p => { state.l3.period = p; level3(el); });
  }

  function catCell(c) { return '<span class="cat-badge" style="--c:' + c.color + '"><span class="dot"></span>' + U.esc(c.icon + ' ' + c.name) + '</span>'; }
  function check(problems, okText) {
    return problems.length ? '<p class="check bad">⚠ ' + U.esc(problems.join('; ')) + '</p>' : '<p class="check ok">✓ Verified: ' + U.esc(okText) + '</p>';
  }

  App.views = App.views || {};
  App.views.breakdown = { title: 'Breakdown', render };
})();
