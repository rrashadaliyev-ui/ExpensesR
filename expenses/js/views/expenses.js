(function () {
  'use strict';
  const U = App.U, C = App.calc, UI = App.ui;
  const state = {
    period: C.defaultPeriod('all'), categoryId: '', subcategoryId: '', paymentMethod: '', search: '',
    sort: { key: 'date', dir: 'desc' }, selected: new Set(), limit: 100
  };

  function filtered() {
    const D = App.data;
    const f = Object.assign({}, C.range(state.period), { categoryId: state.categoryId, subcategoryId: state.subcategoryId, paymentMethod: state.paymentMethod, search: state.search });
    const list = C.filter(D.expenses, f);
    const { key, dir } = state.sort, m = dir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      let r;
      if (key === 'amount') r = a.amountMinor - b.amountMinor;
      else if (key === 'title') r = a.title.localeCompare(b.title);
      else if (key === 'category') r = D.catName(a.categoryId).localeCompare(D.catName(b.categoryId));
      else r = a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt);
      return r * m;
    });
    return list;
  }

  function render(root) {
    const D = App.data;
    // Drop selections that no longer exist (deleted elsewhere).
    state.selected.forEach(id => { if (!D.expense(id)) state.selected.delete(id); });

    root.innerHTML =
      '<div class="page-head"><div><h1>Expenses</h1><p class="muted">Search, filter, edit and manage every transaction</p></div>' +
      '<div class="head-actions"><button class="btn ghost" data-export>Export CSV</button><button class="btn primary" data-add>+ Add expense</button></div></div>' +
      '<section class="card filters">' +
      '<div class="filter-grid">' +
      '<div class="field grow"><label for="x-search">Search</label><input id="x-search" type="search" placeholder="Title, description or notes…" value="' + U.esc(state.search) + '"></div>' +
      '<div class="field"><label for="x-cat">Category</label><select id="x-cat"></select></div>' +
      '<div class="field"><label for="x-sub">Subcategory</label><select id="x-sub"></select></div>' +
      '<div class="field"><label for="x-pm">Payment</label><select id="x-pm"><option value="">All methods</option>' + D.PAYMENT_METHODS.map(p => '<option>' + p + '</option>').join('') + '</select></div>' +
      '</div><div class="filter-period"><span class="label">Period</span><div data-pp></div><button class="btn small ghost" data-reset>Reset filters</button></div>' +
      '</section>' +
      '<div class="bulk-bar" hidden><span data-selinfo></span><span class="spacer"></span>' +
      '<button class="btn small ghost" data-bulk-move>Change category</button><button class="btn small ghost" data-bulk-export>Export selected</button><button class="btn small danger" data-bulk-del>Delete selected</button></div>' +
      '<section class="card table-card"><div data-table></div></section>';

    const cat = UI.$('#x-cat', root), sub = UI.$('#x-sub', root), pm = UI.$('#x-pm', root), search = UI.$('#x-search', root);
    UI.fillCategorySelect(cat, state.categoryId, { allLabel: 'All categories', includeArchived: true });
    UI.fillSubcategorySelect(sub, state.categoryId, state.subcategoryId, { allLabel: 'All subcategories', includeArchived: true, withDirect: true });
    pm.value = state.paymentMethod;

    cat.addEventListener('change', () => { state.categoryId = cat.value; state.subcategoryId = ''; UI.fillSubcategorySelect(sub, cat.value, '', { allLabel: 'All subcategories', includeArchived: true, withDirect: true }); refresh(); });
    sub.addEventListener('change', () => { state.subcategoryId = sub.value; refresh(); });
    pm.addEventListener('change', () => { state.paymentMethod = pm.value; refresh(); });
    search.addEventListener('input', U.debounce(() => { state.search = search.value; refresh(); }, 150));
    UI.periodPicker(UI.$('[data-pp]', root), state.period, p => { state.period = p; refresh(); });
    UI.$('[data-reset]', root).addEventListener('click', () => {
      Object.assign(state, { period: C.defaultPeriod('all'), categoryId: '', subcategoryId: '', paymentMethod: '', search: '', limit: 100 });
      render(root);
    });
    UI.$('[data-add]', root).addEventListener('click', () => UI.expenseForm(null, { categoryId: state.categoryId || undefined, subcategoryId: state.subcategoryId && state.subcategoryId !== '__direct' ? state.subcategoryId : undefined }));
    UI.$('[data-export]', root).addEventListener('click', () => exportCSV(filtered(), 'expenses'));
    UI.$('[data-bulk-export]', root).addEventListener('click', () => exportCSV(filtered().filter(e => state.selected.has(e.id)), 'expenses-selected'));
    UI.$('[data-bulk-del]', root).addEventListener('click', async () => {
      const ids = Array.from(state.selected);
      const sum = C.sum(ids.map(id => D.expense(id)).filter(Boolean));
      if (await UI.confirm({ title: 'Delete ' + ids.length + ' expenses?', message: 'This permanently deletes <b>' + ids.length + '</b> selected expenses totalling <b>' + U.money(sum) + '</b>. This cannot be undone. Tip: make a backup in Settings first.', okText: 'Delete ' + ids.length, danger: true })) {
        await D.deleteExpenses(ids); state.selected.clear(); UI.toast(ids.length + ' expenses deleted');
      }
    });
    UI.$('[data-bulk-move]', root).addEventListener('click', () => moveDialog(Array.from(state.selected)));

    function refresh() { state.limit = 100; drawTable(root); }
    drawTable(root);
  }

  function drawTable(root) {
    const D = App.data;
    const list = filtered();
    const total = C.sum(list);
    const shown = list.slice(0, state.limit);
    const arrow = k => state.sort.key === k ? (state.sort.dir === 'asc' ? ' ▲' : ' ▼') : '';
    const allSel = shown.length > 0 && shown.every(e => state.selected.has(e.id));
    const box = UI.$('[data-table]', root);
    box.innerHTML =
      '<div class="table-summary"><span><b>' + list.length + '</b> expense' + (list.length === 1 ? '' : 's') + ' · Total <b>' + U.money(total) + '</b></span>' +
      '<span class="muted small">' + U.esc(C.label(state.period)) + '</span></div>' +
      (list.length ? '<div class="table-scroll"><table class="data-table tx-table"><thead><tr>' +
        '<th class="chk"><input type="checkbox" data-all aria-label="Select all shown"' + (allSel ? ' checked' : '') + '></th>' +
        '<th><button class="sort" data-sort="date">Date' + arrow('date') + '</button></th>' +
        '<th><button class="sort" data-sort="title">Title' + arrow('title') + '</button></th>' +
        '<th><button class="sort" data-sort="category">Category' + arrow('category') + '</button></th>' +
        '<th>Payment</th>' +
        '<th class="num"><button class="sort" data-sort="amount">Amount' + arrow('amount') + '</button></th>' +
        '<th class="actions"><span class="sr-only">Actions</span></th></tr></thead><tbody>' +
        shown.map(e => '<tr data-id="' + e.id + '"' + (state.selected.has(e.id) ? ' class="sel"' : '') + '>' +
          '<td class="chk"><input type="checkbox" data-sel aria-label="Select"' + (state.selected.has(e.id) ? ' checked' : '') + '></td>' +
          '<td class="nowrap" data-label="Date">' + U.esc(U.fmtDate(e.date)) + '</td>' +
          '<td data-label="Title"><button class="linklike" data-view>' + U.esc(e.title) + '</button>' + (e.notes ? '<div class="muted small clamp">' + U.esc(e.notes) + '</div>' : '') + '</td>' +
          '<td data-label="Category">' + UI.catBadge(e.categoryId, e.subcategoryId) + '</td>' +
          '<td data-label="Payment">' + U.esc(e.paymentMethod) + '</td>' +
          '<td class="num strong" data-label="Amount">' + U.money(e.amountMinor) + '</td>' +
          '<td class="actions"><button class="icon-btn" data-edit title="Edit" aria-label="Edit">✎</button><button class="icon-btn danger" data-del title="Delete" aria-label="Delete">🗑</button></td></tr>').join('') +
        '</tbody></table></div>' +
        (list.length > shown.length ? '<div class="more"><button class="btn ghost" data-more>Show more (' + (list.length - shown.length) + ' remaining)</button></div>' : '')
        : '<div class="empty"><p>No expenses match these filters.</p></div>');

    updateBulk(root);

    UI.$$('[data-sort]', box).forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.sort;
      state.sort = { key: k, dir: state.sort.key === k && state.sort.dir === 'desc' ? 'asc' : (state.sort.key === k ? 'desc' : (k === 'title' || k === 'category' ? 'asc' : 'desc')) };
      drawTable(root);
    }));
    const all = UI.$('[data-all]', box);
    if (all) all.addEventListener('change', () => { shown.forEach(e => all.checked ? state.selected.add(e.id) : state.selected.delete(e.id)); drawTable(root); });
    UI.$$('tbody tr', box).forEach(tr => {
      const id = tr.dataset.id;
      UI.$('[data-sel]', tr).addEventListener('change', ev => { ev.target.checked ? state.selected.add(id) : state.selected.delete(id); tr.classList.toggle('sel', ev.target.checked); updateBulk(root); });
      UI.$('[data-view]', tr).addEventListener('click', () => UI.expenseDetails(id));
      UI.$('[data-edit]', tr).addEventListener('click', () => UI.expenseForm(D.expense(id)));
      UI.$('[data-del]', tr).addEventListener('click', async () => {
        const e = D.expense(id);
        if (await UI.confirm({ title: 'Delete expense?', message: 'Delete <b>' + U.esc(e.title) + '</b> (' + U.money(e.amountMinor) + ', ' + U.esc(U.fmtDate(e.date)) + ')? This cannot be undone.', okText: 'Delete', danger: true })) {
          await D.deleteExpenses([id]); state.selected.delete(id); UI.toast('Expense deleted');
        }
      });
    });
    const more = UI.$('[data-more]', box);
    if (more) more.addEventListener('click', () => { state.limit += 200; drawTable(root); });
  }

  function updateBulk(root) {
    const D = App.data;
    const bar = UI.$('.bulk-bar', root);
    const n = state.selected.size;
    bar.hidden = !n;
    if (n) UI.$('[data-selinfo]', bar).innerHTML = '<b>' + n + '</b> selected · ' + U.money(C.sum(Array.from(state.selected).map(id => D.expense(id)).filter(Boolean))) +
      ' <button class="linklike small" data-clear>Clear</button>';
    const clr = UI.$('[data-clear]', bar);
    if (clr) clr.addEventListener('click', () => { state.selected.clear(); drawTable(root); });
  }

  function moveDialog(ids) {
    const D = App.data;
    const body = UI.h('<div><p>Move <b>' + ids.length + '</b> selected expenses to:</p>' +
      '<div class="row2"><div class="field"><label>Category</label><select data-c></select></div><div class="field"><label>Subcategory</label><select data-s></select></div></div>' +
      '<div class="form-error" hidden></div></div>');
    const c = UI.$('[data-c]', body), s = UI.$('[data-s]', body);
    UI.fillCategorySelect(c, '');
    UI.fillSubcategorySelect(s, '', '');
    c.addEventListener('change', () => UI.fillSubcategorySelect(s, c.value, ''));
    const m = UI.modal({ title: 'Change category', body, footer: '<button class="btn ghost" data-close>Cancel</button><button class="btn primary" data-ok>Move</button>' });
    UI.$('[data-ok]', m.el).addEventListener('click', async () => {
      try { await D.recategorize(ids, c.value, s.value || null); UI.toast(ids.length + ' expenses moved'); m.close(); }
      catch (e) { const err = UI.$('.form-error', body); err.textContent = e.message; err.hidden = false; }
    });
  }

  function exportCSV(list, name) {
    const D = App.data;
    const rows = [['Date', 'Title', 'Amount', 'Currency', 'Category', 'Subcategory', 'Payment Method', 'Notes', 'Created', 'ID']]
      .concat(list.map(e => [e.date, e.title, U.minorToInput(e.amountMinor), D.settings.currency, (D.cat(e.categoryId) || {}).name || '', e.subcategoryId ? (D.cat(e.subcategoryId) || {}).name || '' : '', e.paymentMethod, e.notes, e.createdAt, e.id]));
    UI.download(name + '-' + U.today() + '.csv', UI.toCSV(rows), 'text/csv;charset=utf-8');
  }

  App.views = App.views || {};
  App.views.expenses = { title: 'Expenses', render, exportCSV };
})();
