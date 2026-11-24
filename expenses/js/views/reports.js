(function () {
  'use strict';
  const U = App.U, C = App.calc, UI = App.ui;
  const TABS = [['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly'], ['category', 'By category'], ['subcategory', 'By subcategory'], ['trends', 'Trends & comparison']];
  const state = { tab: 'monthly', period: C.defaultPeriod('year'), categoryId: '', subcategoryId: '', hideEmpty: true };

  function filterObj() {
    return Object.assign({}, C.range(state.period), { categoryId: state.categoryId, subcategoryId: state.subcategoryId });
  }

  function filterLabel() {
    const D = App.data;
    let s = C.label(state.period);
    if (state.categoryId) s += ' · ' + D.catName(state.categoryId);
    if (state.subcategoryId === '__direct') s += ' › (no subcategory)';
    else if (state.subcategoryId) s += ' › ' + D.catName(state.subcategoryId);
    return s;
  }

  /* Each builder returns { columns, rows (display strings), raw (export values), chart(canvas), extra html } */
  function timeReport(list, unit, range) {
    let series = C.series(list, unit, range.from, range.to);
    const withChange = series.map((b, i) => Object.assign({}, b, { prev: i ? series[i - 1].total : null }));
    let rows = withChange;
    if (state.hideEmpty) rows = rows.filter(b => b.count);
    rows = rows.slice().reverse(); // newest first in table
    const columns = [{ unit: 'day', week: 'Week starting', month: 'Month' }[unit] || 'Period', 'Expenses', 'Total', 'Average', 'Change vs previous'];
    return {
      columns, numeric: [false, true, true, true, true],
      rows: rows.map(b => [b.label, b.count, U.money(b.total), b.count ? U.money(Math.round(b.total / b.count)) : '—', changeStr(b.total, b.prev)]),
      raw: rows.map(b => [b.key, b.count, U.minorToNumber(b.total), b.count ? U.minorToNumber(Math.round(b.total / b.count)) : 0, b.prev ? Number(((b.total - b.prev) / b.prev * 100).toFixed(1)) : '']),
      chart: cv => UI.trend(cv, series, { type: series.length > 40 ? 'line' : 'bar' })
    };
  }

  function changeStr(cur, prev) {
    if (prev == null) return '—';
    if (!prev) return cur ? 'new' : '—';
    const d = (cur - prev) / prev * 100;
    return '<span class="delta ' + (d > 0 ? 'up' : 'down') + '">' + (d > 0 ? '▲ ' : d < 0 ? '▼ ' : '') + Math.abs(d).toFixed(1) + '%</span>';
  }

  function categoryReport(list) {
    const bd = C.breakdown(list);
    return {
      columns: ['Category', 'Expenses', 'Total', '% of total', 'Average'], numeric: [false, true, true, true, true],
      rows: bd.map(c => ['<span class="cat-badge" style="--c:' + c.color + '"><span class="dot"></span>' + U.esc(c.icon + ' ' + c.name) + '</span>', c.count, U.money(c.total), U.fmtPct(c.pct), U.money(Math.round(c.total / c.count))]),
      raw: bd.map(c => [c.name, c.count, U.minorToNumber(c.total), Number(c.pct.toFixed(2)), U.minorToNumber(Math.round(c.total / c.count))]),
      html: true,
      chart: cv => UI.doughnut(cv, bd), chartHeight: 280
    };
  }

  function subcategoryReport(list) {
    const bd = C.breakdown(list);
    const rows = [], raw = [];
    bd.forEach(c => {
      c.subs.forEach(s => { rows.push([U.esc(c.name), U.esc(s.name), s.count, U.money(s.total), U.fmtPct(s.pctOfCat), U.fmtPct(s.pct)]); raw.push([c.name, s.name, s.count, U.minorToNumber(s.total), Number(s.pctOfCat.toFixed(2)), Number(s.pct.toFixed(2))]); });
      if (c.direct.count) { rows.push([U.esc(c.name), '<span class="muted">(no subcategory)</span>', c.direct.count, U.money(c.direct.total), U.fmtPct(c.direct.pctOfCat), U.fmtPct(c.direct.pct)]); raw.push([c.name, '(no subcategory)', c.direct.count, U.minorToNumber(c.direct.total), Number(c.direct.pctOfCat.toFixed(2)), Number(c.direct.pct.toFixed(2))]); }
    });
    const flat = C.subcategoryList(bd, true);
    return {
      columns: ['Category', 'Subcategory', 'Expenses', 'Total', '% of category', '% of total'], numeric: [false, false, true, true, true, true],
      rows, raw, html: true,
      chart: cv => UI.hbar(cv, flat.slice(0, 15).map(s => ({ name: s.isDirect ? s.name : s.name + ' (' + s.parentName + ')', total: s.total, color: s.color }))),
      chartHeight: Math.max(200, Math.min(15, flat.length) * 30 + 40)
    };
  }

  function trendsReport(list, range, root) {
    const D = App.data;
    const months = C.series(list, 'month', range.from, range.to);
    const bd = C.breakdown(list);
    const top = (unit, n) => C.series(list, unit, range.from, range.to).filter(b => b.count).sort((a, b) => b.total - a.total).slice(0, n);
    const rows = months.slice().reverse().map((m, i, arr) => {
      const prev = arr[i + 1];
      return [m.label, m.count, U.money(m.total), prev ? (m.total - prev.total >= 0 ? '+' : '−') + U.money(Math.abs(m.total - prev.total)) : '—', changeStr(m.total, prev ? prev.total : null)];
    });
    const raw = months.slice().reverse().map((m, i, arr) => { const p = arr[i + 1]; return [m.key, m.count, U.minorToNumber(m.total), p ? U.minorToNumber(m.total - p.total) : '', p && p.total ? Number(((m.total - p.total) / p.total * 100).toFixed(1)) : '']; });
    const peaks = [['Highest spending days', top('day', 5)], ['Highest spending weeks', top('week', 5)], ['Highest spending months', top('month', 5)]];
    const extra = '<div class="grid3">' + peaks.map(([t, items]) => '<div class="card inner"><h3>' + t + '</h3>' +
      (items.length ? '<ol class="rank">' + items.map(b => '<li><span>' + U.esc(b.label) + '</span><b>' + U.money(b.total) + '</b></li>').join('') + '</ol>' : '<p class="muted small">No data</p>') + '</div>').join('') + '</div>' +
      '<div class="card inner"><h3>Category comparison by month</h3><div class="chart-box" style="height:300px"><canvas data-stack></canvas></div></div>';
    return {
      columns: ['Month', 'Expenses', 'Total', 'Change', 'Change %'], numeric: [false, true, true, true, true],
      rows, raw, html: true, tableTitle: 'Month-to-month comparison', extraBefore: extra,
      chart: cv => UI.trend(cv, months, { type: 'line' }),
      after: () => {
        const cv = UI.$('[data-stack]', root);
        if (!cv) return;
        const keys = months.map(m => m.key);
        UI.chart(cv, {
          type: 'bar',
          data: { labels: months.map(m => m.label), datasets: bd.map(c => ({ label: c.name, backgroundColor: c.color, borderRadius: 2,
            data: keys.map(k => U.minorToNumber(C.sum(list.filter(e => e.categoryId === c.id && e.date.slice(0, 7) === k)))) })) },
          options: { plugins: { tooltip: { callbacks: { label: ctx => ' ' + ctx.dataset.label + ': ' + U.money(Math.round(ctx.parsed.y * 100)) } } },
            scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true, ticks: { callback: UI.moneyTick } } } }
        });
      }
    };
  }

  function build(root) {
    const D = App.data;
    const range = C.range(state.period);
    const list = C.filter(D.expenses, filterObj());
    let r;
    switch (state.tab) {
      case 'daily': r = timeReport(list, 'day', range); break;
      case 'weekly': r = timeReport(list, 'week', range); break;
      case 'monthly': r = timeReport(list, 'month', range); break;
      case 'category': r = categoryReport(list); break;
      case 'subcategory': r = subcategoryReport(list); break;
      default: r = trendsReport(list, range, root);
    }
    r.list = list; r.total = C.sum(list);
    return r;
  }

  function render(root) {
    const D = App.data;
    root.innerHTML =
      '<div class="page-head"><div><h1>Reports</h1><p class="muted">Analyse spending over time and export the results</p></div>' +
      '<div class="head-actions no-print"><button class="btn ghost" data-csv>CSV</button><button class="btn ghost" data-xlsx>Excel</button><button class="btn primary" data-print>Print / PDF</button></div></div>' +
      '<section class="card filters no-print"><div class="filter-grid">' +
      '<div class="field"><label for="r-cat">Category</label><select id="r-cat"></select></div>' +
      '<div class="field"><label for="r-sub">Subcategory</label><select id="r-sub"></select></div>' +
      '</div><div class="filter-period"><span class="label">Period</span><div data-pp></div></div></section>' +
      '<nav class="tabs no-print" role="tablist">' + TABS.map(([k, l]) => '<button role="tab" class="tab' + (state.tab === k ? ' on' : '') + '" aria-selected="' + (state.tab === k) + '" data-tab="' + k + '">' + l + '</button>').join('') + '</nav>' +
      '<div data-report></div>';
    const cat = UI.$('#r-cat', root), sub = UI.$('#r-sub', root);
    UI.fillCategorySelect(cat, state.categoryId, { allLabel: 'All categories', includeArchived: true });
    UI.fillSubcategorySelect(sub, state.categoryId, state.subcategoryId, { allLabel: 'All subcategories', includeArchived: true, withDirect: true });
    cat.addEventListener('change', () => { state.categoryId = cat.value; state.subcategoryId = ''; UI.fillSubcategorySelect(sub, cat.value, '', { allLabel: 'All subcategories', includeArchived: true, withDirect: true }); draw(root); });
    sub.addEventListener('change', () => { state.subcategoryId = sub.value; draw(root); });
    UI.periodPicker(UI.$('[data-pp]', root), state.period, p => { state.period = p; draw(root); });
    UI.$$('[data-tab]', root).forEach(b => b.addEventListener('click', () => { state.tab = b.dataset.tab; render(root); }));
    UI.$('[data-print]', root).addEventListener('click', () => window.print());
    UI.$('[data-csv]', root).addEventListener('click', () => {
      const r = build(root);
      UI.download('report-' + state.tab + '-' + U.today() + '.csv', UI.toCSV([r.columns].concat(r.raw)), 'text/csv;charset=utf-8');
    });
    UI.$('[data-xlsx]', root).addEventListener('click', () => {
      const r = build(root);
      const tabName = TABS.find(t => t[0] === state.tab)[1];
      UI.exportExcel('expense-report-' + state.tab + '-' + U.today() + '.xlsx', [
        { name: 'Summary', rows: [['Expense report', tabName], ['Filter', filterLabel().replace(/<[^>]+>/g, '')], ['Generated', new Date().toLocaleString()], ['Currency', D.settings.currency], [], ['Total', U.minorToNumber(r.total)], ['Number of expenses', r.list.length]] },
        { name: tabName, rows: [r.columns].concat(r.raw) },
        { name: 'Expenses', rows: [['Date', 'Title', 'Amount', 'Category', 'Subcategory', 'Payment Method', 'Notes']].concat(r.list.slice().sort((a, b) => a.date.localeCompare(b.date))
          .map(e => [e.date, e.title, U.minorToNumber(e.amountMinor), (D.cat(e.categoryId) || {}).name || '', e.subcategoryId ? (D.cat(e.subcategoryId) || {}).name || '' : '', e.paymentMethod, e.notes])) }
      ]);
    });
    draw(root);
  }

  function draw(root) {
    const r = build(root);
    const box = UI.$('[data-report]', root);
    const tabName = TABS.find(t => t[0] === state.tab)[1];
    const isTime = ['daily', 'weekly', 'monthly'].includes(state.tab);
    box.innerHTML =
      '<section class="card"><div class="card-head"><div><h2>' + tabName + ' report</h2><p class="muted small">' + U.esc(filterLabel()) + '</p></div>' +
      '<div class="report-total"><span class="muted small">Total</span><b>' + U.money(r.total) + '</b><span class="muted small">' + r.list.length + ' expenses</span></div></div>' +
      (r.list.length ? '<div class="chart-box" style="height:' + (r.chartHeight || 260) + 'px"><canvas data-main></canvas></div>' : '') + '</section>' +
      (r.extraBefore && r.list.length ? r.extraBefore : '') +
      '<section class="card"><div class="card-head"><h2>' + (r.tableTitle || 'Details') + '</h2>' +
      (isTime ? '<label class="check-label no-print"><input type="checkbox" data-hide' + (state.hideEmpty ? ' checked' : '') + '> Hide periods with no expenses</label>' : '') + '</div>' +
      (r.rows.length ? '<div class="table-scroll"><table class="data-table"><thead><tr>' + r.columns.map((c, i) => '<th' + (r.numeric[i] ? ' class="num"' : '') + '>' + c + '</th>').join('') + '</tr></thead><tbody>' +
        r.rows.map(row => '<tr>' + row.map((v, i) => '<td' + (r.numeric[i] ? ' class="num"' : '') + '>' + (r.html || i === 4 ? v : U.esc(v)) + '</td>').join('') + '</tr>').join('') +
        '</tbody></table></div>' : '<div class="empty small"><p class="muted">No expenses match this filter.</p></div>') + '</section>';
    if (r.list.length) r.chart(UI.$('[data-main]', box));
    if (r.after && r.list.length) r.after();
    const hide = UI.$('[data-hide]', box);
    if (hide) hide.addEventListener('change', () => { state.hideEmpty = hide.checked; draw(root); });
  }

  App.views = App.views || {};
  App.views.reports = { title: 'Reports', render };
})();
