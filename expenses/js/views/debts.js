/*
 * BORROWED & LENT
 *   lent     = you gave money to someone, they owe you
 *   borrowed = someone gave you money, you owe them
 * Each record can be repaid in parts (payments). Left = amount − repayments.
 */
(function () {
  'use strict';
  const U = App.U, UI = App.ui;
  const state = { show: 'open' }; // open | repaid | all

  function render(root) {
    const D = App.data;
    const tot = D.debtTotals();
    const net = tot.lent - tot.borrowed;
    const keep = d => state.show === 'all' || (state.show === 'open' ? D.debtLeft(d) > 0 : D.debtLeft(d) === 0);
    const sortFn = (a, b) => (D.debtLeft(b) > 0) - (D.debtLeft(a) > 0) || (a.dueDate || '9999').localeCompare(b.dueDate || '9999') || b.date.localeCompare(a.date);
    const lent = D.debts.filter(d => d.type === 'lent' && keep(d)).sort(sortFn);
    const borrowed = D.debts.filter(d => d.type === 'borrowed' && keep(d)).sort(sortFn);

    root.innerHTML =
      '<div class="page-head"><div><h1>Borrowed &amp; Lent</h1><p class="muted">Keep track of money you lent to others and money you borrowed.</p></div>' +
      '<div class="head-actions"><button class="btn ghost" data-new="borrowed">+ I borrowed</button><button class="btn primary" data-new="lent">+ I lent</button></div></div>' +
      '<section class="kpis three">' +
      '<div class="card kpi"><div class="kpi-label">Owed to you</div><div class="kpi-value budget-ok">' + U.money(tot.lent) + '</div><div class="kpi-sub">' + countOpen('lent') + ' open</div></div>' +
      '<div class="card kpi"><div class="kpi-label">You owe</div><div class="kpi-value budget-over">' + U.money(tot.borrowed) + '</div><div class="kpi-sub">' + countOpen('borrowed') + ' open</div></div>' +
      '<div class="card kpi"><div class="kpi-label">Balance</div><div class="kpi-value ' + (net < 0 ? 'budget-over' : 'budget-ok') + '">' + (net < 0 ? '−' : '') + U.money(Math.abs(net)) + '</div><div class="kpi-sub">' + (net < 0 ? 'you owe more than you are owed' : 'you are owed more than you owe') + '</div></div>' +
      '</section>' +
      '<nav class="tabs" role="tablist">' + [['open', 'Open'], ['repaid', 'Repaid'], ['all', 'All']].map(([k, l]) => '<button role="tab" class="tab' + (state.show === k ? ' on' : '') + '" data-show="' + k + '">' + l + '</button>').join('') + '</nav>' +
      section('lent', 'Money you lent', 'They owe you', lent) +
      section('borrowed', 'Money you borrowed', 'You owe them', borrowed);

    UI.$$('[data-new]', root).forEach(b => b.addEventListener('click', () => debtDialog(null, b.dataset.new)));
    UI.$$('[data-show]', root).forEach(b => b.addEventListener('click', () => { state.show = b.dataset.show; render(root); }));
    UI.$$('[data-pay]', root).forEach(b => b.addEventListener('click', () => paymentDialog(b.dataset.pay)));
    UI.$$('[data-edit-debt]', root).forEach(b => b.addEventListener('click', () => debtDialog(D.debt(b.dataset.editDebt))));
    UI.$$('[data-del-debt]', root).forEach(b => b.addEventListener('click', async () => {
      const d = D.debt(b.dataset.delDebt);
      if (await UI.confirm({ title: 'Delete record?', message: U.esc(d.person) + ' · ' + U.money(d.amountMinor), okText: 'Delete', danger: true })) {
        await D.deleteDebt(d.id); UI.toast('Deleted');
      }
    }));
    UI.$$('[data-del-pay]', root).forEach(b => b.addEventListener('click', async () => {
      const [id, pid] = b.dataset.delPay.split('|');
      if (await UI.confirm({ title: 'Remove repayment?', message: U.esc(b.dataset.label), okText: 'Remove', danger: true })) { await D.removeDebtPayment(id, pid); UI.toast('Removed'); }
    }));
  }

  function countOpen(type) { return App.data.debts.filter(d => d.type === type && App.data.debtLeft(d) > 0).length; }

  function section(type, title, sub, list) {
    return '<section class="card"><div class="card-head"><div><h2>' + title + '</h2><p class="muted small">' + sub + '</p></div>' +
      '<button class="btn small ghost" data-new="' + type + '">' + (type === 'lent' ? '+ I lent' : '+ I borrowed') + '</button></div>' +
      (list.length ? '<div class="debt-list">' + list.map(card).join('') + '</div>' : '<div class="empty small"><p class="muted">Nothing here.</p></div>') +
      '</section>';
  }

  function card(d) {
    const D = App.data;
    const paid = D.debtPaid(d), left = D.debtLeft(d), pct = d.amountMinor ? paid / d.amountMinor * 100 : 0;
    const overdue = left > 0 && d.dueDate && d.dueDate < U.today();
    return '<article class="debt ' + d.type + (left === 0 ? ' done' : '') + '">' +
      '<div class="debt-head"><span class="debt-avatar">' + U.esc(d.person.slice(0, 1).toUpperCase()) + '</span>' +
      '<div class="debt-main"><b>' + U.esc(d.person) + '</b><span class="muted small">' + U.esc(U.fmtDate(d.date)) +
      (d.dueDate ? ' · <span class="' + (overdue ? 'budget-over' : '') + '">' + (overdue ? 'Overdue since' : 'Due') + ' ' + U.esc(U.fmtDate(d.dueDate)) + '</span>' : '') + '</span></div>' +
      '<div class="debt-amt"><b>' + (left === 0 ? '<span class="tag ok">Repaid</span>' : U.money(left)) + '</b><span class="muted small">of ' + U.money(d.amountMinor) + '</span></div></div>' +
      (d.note ? '<p class="muted small debt-note">' + U.esc(d.note) + '</p>' : '') +
      '<div class="budget-bar ok thin"><span style="width:' + Math.min(100, pct).toFixed(1) + '%"></span></div>' +
      ((d.payments || []).length ? '<ul class="pay-list">' + d.payments.slice().sort((a, b) => a.date.localeCompare(b.date)).map(p =>
        '<li><span>' + U.esc(U.fmtDate(p.date)) + '</span><span>' + U.money(p.amountMinor) + '</span><button class="icon-btn sm danger" data-del-pay="' + d.id + '|' + p.id + '" data-label="' + U.esc(U.fmtDate(p.date) + ' · ' + U.money(p.amountMinor)) + '" aria-label="Remove repayment">✕</button></li>').join('') + '</ul>' : '') +
      '<div class="cat-actions">' + (left > 0 ? '<button class="btn small primary" data-pay="' + d.id + '">+ Repayment</button>' : '') +
      '<span class="spacer"></span><button class="icon-btn" data-edit-debt="' + d.id + '" title="Edit" aria-label="Edit">✎</button>' +
      '<button class="icon-btn danger" data-del-debt="' + d.id + '" title="Delete" aria-label="Delete">🗑</button></div></article>';
  }

  function debtDialog(existing, type) {
    const D = App.data;
    const d = existing || { type: type || 'lent', date: U.today() };
    const body = UI.h('<form novalidate>' +
      '<div class="segmented two"><label><input type="radio" name="type" value="lent"' + (d.type === 'lent' ? ' checked' : '') + '><span>I lent money</span></label>' +
      '<label><input type="radio" name="type" value="borrowed"' + (d.type === 'borrowed' ? ' checked' : '') + '><span>I borrowed money</span></label></div>' +
      '<div class="field"><label for="d-person">Person <span class="req">*</span></label><input id="d-person" maxlength="60" autocomplete="off" placeholder="e.g. Elvin" value="' + U.esc(d.person || '') + '"></div>' +
      '<div class="row2"><div class="field"><label for="d-amt">Amount <span class="req">*</span></label><div class="amount-wrap"><input id="d-amt" inputmode="decimal" autocomplete="off" placeholder="0.00" value="' + (d.amountMinor ? U.minorToInput(d.amountMinor) : '') + '"><span class="cur">' + U.esc(D.settings.currency) + '</span></div></div>' +
      '<div class="field"><label for="d-date">Date <span class="req">*</span></label><input id="d-date" type="date" value="' + d.date + '"></div></div>' +
      '<div class="field"><label for="d-due">Due date <span class="muted">(optional)</span></label><input id="d-due" type="date" value="' + (d.dueDate || '') + '"></div>' +
      '<div class="field"><label for="d-note">Note <span class="muted">(optional)</span></label><textarea id="d-note" rows="2" maxlength="500">' + U.esc(d.note || '') + '</textarea></div>' +
      '<div class="form-error" hidden></div></form>');
    const m = UI.modal({ title: existing ? 'Edit record' : 'New record', body, footer: '<button class="btn ghost" data-close>Cancel</button><button class="btn primary" data-ok>Save</button>' });
    let saving = false;
    const save = async () => {
      if (saving) return; saving = true;
      try {
        await D.saveDebt({ id: existing && existing.id, type: body.querySelector('input[name=type]:checked').value, person: UI.$('#d-person', body).value,
          amount: UI.$('#d-amt', body).value, date: UI.$('#d-date', body).value, dueDate: UI.$('#d-due', body).value, note: UI.$('#d-note', body).value });
        UI.toast('Saved'); m.close();
      } catch (e) { const err = UI.$('.form-error', body); err.textContent = e.message; err.hidden = false; }
      saving = false;
    };
    UI.$('[data-ok]', m.el).addEventListener('click', save);
    body.addEventListener('submit', e => { e.preventDefault(); save(); });
  }

  function paymentDialog(id) {
    const D = App.data, d = D.debt(id), left = D.debtLeft(d);
    const body = UI.h('<form novalidate><p>' + U.esc(d.person) + ' · <b>' + U.money(left) + '</b> <span class="muted">left</span></p>' +
      '<div class="row2"><div class="field"><label for="p-amt">Amount repaid</label><div class="amount-wrap"><input id="p-amt" inputmode="decimal" autocomplete="off" value="' + U.minorToInput(left) + '"><span class="cur">' + U.esc(D.settings.currency) + '</span></div></div>' +
      '<div class="field"><label for="p-date">Date</label><input id="p-date" type="date" value="' + U.today() + '"></div></div>' +
      '<p class="muted small">Enter part of the amount for a partial repayment.</p><div class="form-error" hidden></div></form>');
    const m = UI.modal({ title: 'Add repayment', body, footer: '<button class="btn ghost" data-close>Cancel</button><button class="btn primary" data-ok>Save</button>' });
    let saving = false;
    const save = async () => {
      if (saving) return; saving = true;
      try {
        const rec = await D.addDebtPayment(id, UI.$('#p-amt', body).value, UI.$('#p-date', body).value);
        UI.toast(D.debtLeft(rec) === 0 ? 'Fully repaid 🎉' : 'Repayment saved'); m.close();
      } catch (e) { const err = UI.$('.form-error', body); err.textContent = e.message; err.hidden = false; }
      saving = false;
    };
    UI.$('[data-ok]', m.el).addEventListener('click', save);
    body.addEventListener('submit', e => { e.preventDefault(); save(); });
  }

  App.views = App.views || {};
  App.views.debts = { title: 'Borrowed & Lent', render, openDialog: debtDialog };
})();
