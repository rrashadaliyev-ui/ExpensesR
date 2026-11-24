/*
 * BUDGET & SAVINGS
 *   - Monthly budget: spent / left / per-day allowance for a chosen month
 *   - Savings: for every month that has a budget, saved = budget − spent (negative = overspent)
 *     Total savings counts finished months only; the current month is shown separately "so far".
 */
(function () {
  'use strict';
  const U = App.U, C = App.calc, UI = App.ui;
  const state = { month: U.today().slice(0, 7) };

  const nextMonth = m => U.addMonths(m + '-01', 1).slice(0, 7);
  const monthLabel = m => U.monthName(m + '-01');
  const spentIn = m => C.sum(C.filter(App.data.expenses, { from: m + '-01', to: U.endOfMonth(m + '-01') }));

  // All months from the first month that had a budget up to the current month.
  function savingsRows() {
    const D = App.data, s = D.settings, cur = U.today().slice(0, 7);
    const starts = Object.keys(s.monthlyBudgets || {}).concat(s.defaultBudgetFrom ? [s.defaultBudgetFrom] : []).filter(m => m <= cur).sort();
    if (!starts.length) return [];
    const rows = [];
    for (let m = starts[0]; m <= cur; m = nextMonth(m)) {
      const budget = D.budgetFor(m);
      if (budget == null) continue;
      const spent = spentIn(m);
      rows.push({ month: m, budget, spent, saved: budget - spent, finished: m < cur });
    }
    return rows;
  }

  function render(root) {
    const D = App.data;
    const m = state.month, cur = U.today().slice(0, 7);
    const budget = D.budgetFor(m);
    const list = C.filter(D.expenses, { from: m + '-01', to: U.endOfMonth(m + '-01') });
    const spent = C.sum(list);
    const left = budget != null ? budget - spent : null;
    const pctUsed = budget ? spent / budget * 100 : 0;
    const daysInMonth = U.parseDate(U.endOfMonth(m + '-01')).getDate();
    const daysLeft = m === cur ? U.daysBetween(U.today(), U.endOfMonth(m + '-01')) + 1 : (m > cur ? daysInMonth : 0);
    const isDefault = budget != null && !(D.settings.monthlyBudgets && D.settings.monthlyBudgets[m] != null);
    const bd = C.breakdown(list);
    const rows = savingsRows();
    const finished = rows.filter(r => r.finished);
    const totalSaved = finished.reduce((a, r) => a + r.saved, 0);
    const current = rows.find(r => !r.finished);
    const status = budget == null ? '' : left < 0 ? 'over' : pctUsed >= 80 ? 'warn' : 'ok';

    root.innerHTML =
      '<div class="page-head"><div><h1>Budget &amp; Savings</h1><p class="muted">Set a monthly budget, see what is left, and track how much you save.</p></div>' +
      '<div class="head-actions"><button class="btn primary" data-edit>' + (budget == null ? 'Set monthly budget' : 'Edit budget') + '</button></div></div>' +

      '<section class="card"><div class="card-head"><h2>Monthly budget</h2>' +
      '<div class="period-picker"><div class="pp-nav"><button class="icon-btn" data-prev aria-label="Previous month">‹</button><span class="pp-label">' + U.esc(monthLabel(m)) + '</span>' +
      '<button class="icon-btn" data-next aria-label="Next month">›</button>' + (m !== cur ? '<button class="btn small ghost" data-now>This month</button>' : '') + '</div></div></div>' +
      (budget == null
        ? '<div class="empty"><p>No budget set for ' + U.esc(monthLabel(m)) + '.</p><p class="muted small">Spent so far: <b>' + U.money(spent) + '</b></p><button class="btn primary" data-edit>Set budget</button></div>'
        : '<div class="budget-grid">' +
          '<div><div class="kpi-label">Budget' + (isDefault ? ' <span class="muted small">(every month)</span>' : '') + '</div><div class="kpi-value">' + U.money(budget) + '</div></div>' +
          '<div><div class="kpi-label">Spent</div><div class="kpi-value">' + U.money(spent) + '</div><div class="kpi-sub">' + list.length + ' expenses</div></div>' +
          '<div><div class="kpi-label">' + (left < 0 ? 'Over budget' : 'Left') + '</div><div class="kpi-value budget-' + status + '">' + U.money(Math.abs(left)) + '</div>' +
          '<div class="kpi-sub">' + (daysLeft > 0 && left > 0 ? 'You can spend <b>' + U.money(Math.floor(left / daysLeft)) + '</b> per day for ' + daysLeft + ' more day' + (daysLeft === 1 ? '' : 's') : (m < cur ? (left >= 0 ? 'Saved this month' : 'Overspent this month') : '')) + '</div></div>' +
          '</div>' +
          '<div class="budget-bar ' + status + '" role="progressbar" aria-valuenow="' + Math.round(pctUsed) + '" aria-valuemin="0" aria-valuemax="100"><span style="width:' + Math.min(100, pctUsed).toFixed(1) + '%"></span></div>' +
          '<div class="budget-bar-label"><span>' + U.fmtPct(pctUsed) + ' used</span><span>' + (left < 0 ? U.money(-left) + ' over' : U.money(left) + ' left') + '</span></div>' +
          (bd.length ? '<h3 class="sub-h">Where the money went</h3><ul class="legend">' + bd.map(c => '<li><span class="dot" style="background:' + c.color + '"></span><span class="name">' + U.esc(c.icon + ' ' + c.name) + '</span><span class="val">' + U.money(c.total) + '</span><span class="pct">' + U.fmtPct(U.pct(c.total, budget)) + '</span></li>').join('') + '</ul><p class="muted small">% = share of the monthly budget</p>' : '')) +
      '</section>' +

      '<section class="card"><div class="card-head"><div><h2>Savings</h2><p class="muted small">Saved = budget − spent, for every month that has a budget. Overspending counts as negative.</p></div></div>' +
      (rows.length
        ? '<div class="summary-row">' +
          '<div><div class="kpi-label">Total saved</div><div class="kpi-value ' + (totalSaved < 0 ? 'budget-over' : 'budget-ok') + '">' + U.money(totalSaved) + '</div><div class="kpi-sub">' + finished.length + ' finished month' + (finished.length === 1 ? '' : 's') + '</div></div>' +
          (current ? '<div><div class="kpi-label">This month so far</div><div class="kpi-value sm ' + (current.saved < 0 ? 'budget-over' : '') + '">' + U.money(current.saved) + '</div><div class="kpi-sub">left if you spend nothing more</div></div>' +
            '<div><div class="kpi-label">Total incl. this month</div><div class="kpi-value sm">' + U.money(totalSaved + current.saved) + '</div></div>' : '') +
          '</div>' +
          '<div class="chart-box" style="height:220px"><canvas data-savings></canvas></div>' +
          '<div class="table-scroll"><table class="data-table"><thead><tr><th>Month</th><th class="num">Budget</th><th class="num">Spent</th><th class="num">Saved</th></tr></thead><tbody>' +
          rows.slice().reverse().map(r => '<tr><td>' + U.esc(monthLabel(r.month)) + (r.finished ? '' : ' <span class="tag">in progress</span>') + '</td><td class="num">' + U.money(r.budget) + '</td><td class="num">' + U.money(r.spent) +
            '</td><td class="num strong ' + (r.saved < 0 ? 'budget-over' : 'budget-ok') + '">' + (r.saved < 0 ? '−' : '') + U.money(Math.abs(r.saved)) + '</td></tr>').join('') +
          '</tbody><tfoot><tr><td>Total (finished months)</td><td class="num">' + U.money(finished.reduce((a, r) => a + r.budget, 0)) + '</td><td class="num">' + U.money(finished.reduce((a, r) => a + r.spent, 0)) + '</td><td class="num">' + U.money(totalSaved) + '</td></tr></tfoot></table></div>'
        : '<div class="empty small"><p class="muted">Set a monthly budget to start tracking savings.</p></div>') +
      '</section>';

    UI.$$('[data-edit]', root).forEach(b => b.addEventListener('click', () => budgetDialog(m)));
    UI.$('[data-prev]', root).addEventListener('click', () => { state.month = U.addMonths(m + '-01', -1).slice(0, 7); render(root); });
    UI.$('[data-next]', root).addEventListener('click', () => { state.month = nextMonth(m); render(root); });
    const now = UI.$('[data-now]', root); if (now) now.addEventListener('click', () => { state.month = cur; render(root); });

    if (rows.length) {
      const css = getComputedStyle(document.documentElement);
      const ok = css.getPropertyValue('--ok').trim(), bad = css.getPropertyValue('--danger').trim();
      UI.chart(UI.$('[data-savings]', root), {
        type: 'bar',
        data: { labels: rows.map(r => U.fmtDate(r.month + '-01', { month: 'short', year: '2-digit' })),
          datasets: [{ data: rows.map(r => U.minorToNumber(r.saved)), backgroundColor: rows.map(r => U.alpha(r.saved < 0 ? bad : ok, r.finished ? 0.9 : 0.45)), borderRadius: 4, maxBarThickness: 40 }] },
        options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ' ' + App.i18n.t('Saved:') + ' ' + U.money(Math.round(ctx.parsed.y * 100)) } } },
          scales: { y: { ticks: { callback: UI.moneyTick } }, x: { grid: { display: false } } } }
      });
    }
  }

  function budgetDialog(month) {
    const D = App.data;
    const current = D.budgetFor(month);
    const body = UI.h('<form novalidate>' +
      '<div class="field"><label for="b-amt">Budget for ' + U.esc(monthLabel(month)) + '</label>' +
      '<div class="amount-wrap"><input id="b-amt" inputmode="decimal" autocomplete="off" placeholder="e.g. 1500" value="' + (current != null ? U.minorToInput(current) : '') + '"><span class="cur">' + U.esc(D.settings.currency) + '</span></div></div>' +
      '<label class="radio-card"><input type="radio" name="scope" value="onwards" checked><span><b>Every month from ' + U.esc(monthLabel(month)) + '</b><br><span class="muted small">Use this budget for this month and all future months. Earlier months keep their old budget.</span></span></label>' +
      '<label class="radio-card"><input type="radio" name="scope" value="month"><span><b>Only ' + U.esc(monthLabel(month)) + '</b><br><span class="muted small">A different budget just for this one month.</span></span></label>' +
      '<p class="muted small">Leave the amount empty to remove the budget.</p>' +
      '<div class="form-error" hidden></div></form>');
    const m = UI.modal({ title: 'Monthly budget', body, footer: '<button class="btn ghost" data-close>Cancel</button><button class="btn primary" data-ok>Save budget</button>' });
    let saving = false;
    const save = async () => {
      if (saving) return; saving = true;
      try {
        await D.setBudget(month, UI.$('#b-amt', body).value, body.querySelector('input[name=scope]:checked').value);
        UI.toast('Budget saved'); m.close();
      } catch (e) { const err = UI.$('.form-error', body); err.textContent = e.message; err.hidden = false; }
      saving = false;
    };
    UI.$('[data-ok]', m.el).addEventListener('click', save);
    body.addEventListener('submit', e => { e.preventDefault(); save(); });
  }

  App.views = App.views || {};
  App.views.budget = { title: 'Budget & Savings', render, savingsRows };
})();
