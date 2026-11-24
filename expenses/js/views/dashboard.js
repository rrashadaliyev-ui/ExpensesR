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
      (isHidden('quick') ? '' : quickRow()) +

      '<section class="kpis">' +
      kpi('Total expenses (all time)', C.sum(all), all.length) +
      kpi('Today', today.total, today.count) +
      kpi('This week', week.total, week.count, change(week.total, lastWeek.total)) +
      kpi('This month', month.total, month.count, change(month.total, lastMonth.total)) +
      '</section>' +
      (isHidden('budget') && isHidden('debts') ? '' :
        '<div class="mini-cards' + (isHidden('budget') || isHidden('debts') ? ' single' : '') + '">' +
        (isHidden('budget') ? '' : budgetCard(month.total)) + (isHidden('debts') ? '' : debtPanel()) + '</div>') +

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
    const bc = UI.$('.budget-card', root);
    if (bc) bc.addEventListener('click', e => { if (!e.target.closest('[data-hide-panel],a')) location.hash = '#/budget'; });
    UI.$$('[data-hide-panel]', root).forEach(b => b.addEventListener('click', async e => {
      e.stopPropagation();
      const key = b.dataset.hidePanel;
      await D.saveSettings({ hiddenPanels: (D.settings.hiddenPanels || []).concat([key]) });
      UI.toast('Hidden. Show it again in Settings → Dashboard.', 'ok', { label: 'Undo', fn: () => D.saveSettings({ hiddenPanels: (D.settings.hiddenPanels || []).filter(k => k !== key) }) });
    }));
    UI.$$('[data-new-debt]', root).forEach(b => b.addEventListener('click', () => App.views.debts.openDialog(null, b.dataset.newDebt)));
    UI.$$('[data-debt]', root).forEach(li => li.addEventListener('click', () => { location.hash = '#/debts'; }));
    UI.$$('[data-fav]', root).forEach(b => b.addEventListener('click', async ev => {
      if (ev.target.closest('.x')) {
        ev.stopPropagation();
        await D.removeFavourite(b.dataset.fav); UI.toast('Removed from favourites'); return;
      }
      if (b.disabled) return;
      b.disabled = true; // prevent double taps creating two expenses
      try {
        const rec = await D.quickAdd(b.dataset.fav);
        UI.toast('Expense saved: ' + U.money(rec.amountMinor), 'ok', { label: 'Undo', fn: async () => { await D.deleteExpenses([rec.id]); UI.toast('Removed'); } });
      } catch (e) { UI.toast(e.message, 'err'); }
      setTimeout(() => { b.disabled = false; }, 800);
    }));
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

  // One-tap buttons for favourite expenses (saved with today's date).
  function quickRow() {
    const D = App.data, favs = D.favourites();
    if (!favs.length) return '<div class="quick-hint-row"><p class="muted small quick-hint">⭐ Tip: tick “Also save as a quick-add favourite” when adding an expense to get one-tap buttons here.</p>' + hideBtn('quick') + '</div>';
    return '<div class="quick" aria-label="Quick add">' + hideBtn('quick') + '<span class="quick-label">Quick add</span>' + favs.map(f =>
      '<button class="fav" data-fav="' + f.id + '" title="' + U.esc(f.title) + '"><span>' + U.esc(D.catIcon(f.subcategoryId || f.categoryId)) + '</span><span>' + U.esc(f.title) + '</span><b>' + U.money(f.amountMinor) + '</b>' +
      '<span class="x" role="button" aria-label="Remove from favourites" title="Remove from favourites">✕</span></button>').join('') + '</div>';
  }

  // Panels the user can hide from the dashboard (Settings → Dashboard brings them back).
  const isHidden = key => (App.data.settings.hiddenPanels || []).includes(key);
  const hideBtn = key => '<button class="icon-btn sm panel-hide" data-hide-panel="' + key + '" title="Hide from dashboard" aria-label="Hide from dashboard">✕</button>';

  // Borrowed & lent panel: totals, open loans and buttons to add one.
  function debtPanel() {
    const D = App.data, t = D.debtTotals();
    const open = D.debts.filter(d => D.debtLeft(d) > 0)
      .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999') || b.date.localeCompare(a.date)).slice(0, 4);
    return '<section class="card debt-panel">' +
      '<div class="card-head"><h2><a href="#/debts" class="plain-link">🤝 Borrowed &amp; Lent</a></h2>' + hideBtn('debts') + '</div>' +
      '<div class="debt-sum"><span>Owed to you <b class="budget-ok">' + U.money(t.lent) + '</b></span><span>You owe <b class="budget-over">' + U.money(t.borrowed) + '</b></span></div>' +
      (open.length ? '<ul class="debt-mini">' + open.map(d => {
        const overdue = d.dueDate && d.dueDate < U.today();
        return '<li data-debt="' + d.id + '"><span class="dot ' + d.type + '"></span><span class="who">' + U.esc(d.person) + '</span>' +
          (d.dueDate ? '<span class="muted small ' + (overdue ? 'budget-over' : '') + '">' + (overdue ? 'Overdue since' : 'Due') + ' ' + U.esc(U.fmtDate(d.dueDate)) + '</span>' : '<span></span>') +
          '<b class="' + (d.type === 'lent' ? 'budget-ok' : 'budget-over') + '">' + U.money(D.debtLeft(d)) + '</b></li>';
      }).join('') + '</ul>' : '<p class="muted small">No open loans.</p>') +
      '<div class="btn-row"><button class="btn small primary" data-new-debt="lent">+ I lent</button><button class="btn small ghost" data-new-debt="borrowed">+ I borrowed</button>' +
      '<span class="spacer"></span><a href="#/debts" class="link">View all →</a></div></section>';
  }

  // "X left of Y" card for the current month's budget (or a prompt to set one).
  function budgetCard(spent) {
    const m = U.today().slice(0, 7);
    const budget = App.data.budgetFor(m);
    if (budget == null) return '<section class="card kpi budget-card" tabindex="0">' + hideBtn('budget') + '<div class="kpi-label">Monthly budget</div><div class="kpi-sub">No budget set for this month. <a href="#/budget">Set your monthly budget →</a></div></section>';
    const left = budget - spent, pct = spent / budget * 100;
    const status = left < 0 ? 'over' : pct >= 80 ? 'warn' : 'ok';
    const daysLeft = U.daysBetween(U.today(), U.endOfMonth(U.today())) + 1;
    return '<section class="card kpi budget-card" tabindex="0">' + hideBtn('budget') + '<div class="kpi-label">Monthly budget · ' + U.esc(U.monthName(m + '-01')) + '</div>' +
      '<div class="kpi-value budget-' + status + '">' + (left < 0 ? U.money(-left) + ' over budget' : U.money(left) + ' left') + '</div>' +
      '<div class="kpi-sub">Spent ' + U.money(spent) + ' of ' + U.money(budget) + ' (' + U.fmtPct(pct) + ')' + (left > 0 ? ' · ' + U.money(Math.floor(left / daysLeft)) + ' per day for ' + daysLeft + ' days' : '') + '</div>' +
      '<div class="budget-bar ' + status + '"><span style="width:' + Math.min(100, pct).toFixed(1) + '%"></span></div></section>';
  }

  function empty() { return '<div class="empty small"><p class="muted">No expenses in this period.</p></div>'; }

  App.views = App.views || {};
  App.views.dashboard = { title: 'Dashboard', render };
})();
