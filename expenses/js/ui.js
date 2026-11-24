/*
 * SHARED UI COMPONENTS: modal, confirm, toast, period picker, category selects,
 * expense form, charts, file download helpers.
 */
(function () {
  'use strict';
  const U = App.U, C = App.calc;
  const UI = {};
  const $ = (sel, root) => (root || document).querySelector(sel);
  UI.$ = $;
  UI.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  UI.h = function (html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

  /* ---------------- Toast ---------------- */
  // action (optional) = { label: 'Undo', fn: () => ... } shows a button inside the message.
  UI.toast = function (msg, type, action) {
    const el = UI.h('<div class="toast ' + (type || 'ok') + '" role="status"><span>' + U.esc(msg) + '</span></div>');
    const life = action ? 6000 : (type === 'err' ? 5000 : 2800);
    if (action) {
      const b = UI.h('<button class="toast-btn">' + U.esc(action.label) + '</button>');
      b.addEventListener('click', () => { el.remove(); action.fn(); });
      el.appendChild(b);
    }
    $('#toasts').appendChild(el);
    setTimeout(() => el.classList.add('hide'), life);
    setTimeout(() => el.remove(), life + 400);
  };

  // Delete expenses with a 6-second Undo (re-saves the exact same records, same ids and dates).
  UI.deleteWithUndo = async function (ids) {
    const D = App.data;
    const copies = ids.map(id => D.expense(id)).filter(Boolean).map(e => Object.assign({}, e));
    await D.deleteExpenses(ids);
    UI.toast(copies.length === 1 ? 'Expense deleted' : copies.length + ' expenses deleted', 'ok', { label: 'Undo', fn: async () => {
      await App.storage.putMany('expenses', copies);
      D.expenses = D.expenses.concat(copies.filter(c => !D.expense(c.id)));
      D.emit('expenses');
      UI.toast('Restored');
    } });
  };

  /* ---------------- Modal ---------------- */
  let openModals = 0;
  UI.modal = function ({ title, body, footer, wide, onClose }) {
    const wrap = UI.h('<div class="modal-backdrop"><div class="modal' + (wide ? ' wide' : '') + '" role="dialog" aria-modal="true" aria-label="' + U.esc(title) + '">' +
      '<div class="modal-head"><h2>' + U.esc(title) + '</h2><button class="icon-btn" data-close aria-label="Close">✕</button></div>' +
      '<div class="modal-body"></div><div class="modal-foot"></div></div></div>');
    const bodyEl = $('.modal-body', wrap), footEl = $('.modal-foot', wrap);
    if (typeof body === 'string') bodyEl.innerHTML = body; else if (body) bodyEl.appendChild(body);
    if (typeof footer === 'string') footEl.innerHTML = footer; else if (footer) footEl.appendChild(footer); else footEl.remove();
    const prevFocus = document.activeElement;
    const close = () => {
      if (!wrap.isConnected) return;
      wrap.remove(); openModals--; document.removeEventListener('keydown', onKey);
      if (!openModals) document.body.classList.remove('no-scroll');
      if (prevFocus && prevFocus.focus) prevFocus.focus();
      if (onClose) onClose();
    };
    const onKey = e => { if (e.key === 'Escape' && wrap === UI.$$('.modal-backdrop').pop()) close(); };
    wrap.addEventListener('mousedown', e => { if (e.target === wrap) close(); });
    UI.$$('[data-close]', wrap).forEach(b => b.addEventListener('click', close));
    document.addEventListener('keydown', onKey);
    document.body.appendChild(wrap); openModals++; document.body.classList.add('no-scroll');
    const first = wrap.querySelector('input:not([type=hidden]),select,textarea,button:not([data-close])');
    if (first) setTimeout(() => first.focus(), 30);
    return { el: wrap, body: bodyEl, foot: footEl, close };
  };

  UI.confirm = function ({ title, message, okText, danger }) {
    return new Promise(resolve => {
      let answered = false;
      const m = UI.modal({
        title: title || 'Are you sure?',
        body: '<p class="confirm-msg">' + message + '</p>',
        footer: '<button class="btn ghost" data-close>Cancel</button><button class="btn ' + (danger ? 'danger' : 'primary') + '" data-ok>' + U.esc(okText || 'OK') + '</button>',
        onClose: () => { if (!answered) resolve(false); }
      });
      $('[data-ok]', m.el).addEventListener('click', () => { answered = true; m.close(); resolve(true); });
    });
  };

  /* ---------------- Period picker ----------------
   * UI.periodPicker(container, period, onChange) -> { get(), set(p) }
   */
  UI.periodPicker = function (container, initial, onChange, opts) {
    opts = opts || {};
    let p = Object.assign({}, initial);
    const el = UI.h('<div class="period-picker">' +
      '<select class="pp-type" aria-label="Time period">' + C.PERIOD_TYPES.map(([v, l]) => '<option value="' + v + '">' + l + '</option>').join('') + '</select>' +
      '<div class="pp-nav"><button class="icon-btn pp-prev" aria-label="Previous period">‹</button>' +
      '<span class="pp-label"></span><button class="icon-btn pp-next" aria-label="Next period">›</button>' +
      '<button class="btn small ghost pp-now">Now</button></div>' +
      '<div class="pp-custom"><input type="date" class="pp-from" aria-label="From date"><span>to</span><input type="date" class="pp-to" aria-label="To date"></div>' +
      '</div>');
    container.innerHTML = ''; container.appendChild(el);
    const type = $('.pp-type', el), from = $('.pp-from', el), to = $('.pp-to', el);
    function render() {
      type.value = p.type;
      $('.pp-label', el).textContent = C.label(p);
      el.classList.toggle('is-custom', p.type === 'custom');
      el.classList.toggle('is-all', p.type === 'all');
      const r = C.range(p);
      if (p.type === 'custom') { from.value = r.from; to.value = r.to; }
    }
    function change(np) { p = np; render(); onChange(Object.assign({}, p)); }
    type.addEventListener('change', () => {
      const np = Object.assign({}, p, { type: type.value });
      if (type.value === 'custom') { const r = C.range(p.type === 'all' ? C.defaultPeriod('month') : p); np.from = r.from; np.to = r.to; }
      change(np);
    });
    $('.pp-prev', el).addEventListener('click', () => change(C.shift(p, -1)));
    $('.pp-next', el).addEventListener('click', () => change(C.shift(p, 1)));
    $('.pp-now', el).addEventListener('click', () => change(Object.assign({}, p, { anchor: U.today() })));
    [from, to].forEach(inp => inp.addEventListener('change', () => {
      if (!U.isValidDateStr(from.value) || !U.isValidDateStr(to.value)) return;
      change(Object.assign({}, p, { from: from.value, to: to.value }));
    }));
    render();
    return { get: () => Object.assign({}, p), set: np => { p = Object.assign({}, np); render(); }, el };
  };

  /* ---------------- Category selects ---------------- */
  // Fills a category <select>. includeArchived adds deleted categories (marked) for filtering history.
  UI.fillCategorySelect = function (sel, value, { allLabel, includeArchived, ensureId } = {}) {
    const D = App.data;
    let cats = D.topCategories(includeArchived);
    if (ensureId && !cats.find(c => c.id === ensureId) && D.cat(ensureId)) cats = cats.concat([D.cat(ensureId)]);
    sel.innerHTML = (allLabel ? '<option value="">' + U.esc(allLabel) + '</option>' : '<option value="" disabled>Choose category…</option>') +
      cats.map(c => '<option value="' + c.id + '">' + U.esc((c.icon ? c.icon + ' ' : '') + D.catName(c.id)) + '</option>').join('');
    sel.value = value || '';
    if (!allLabel && !value) sel.selectedIndex = 0;
  };

  UI.fillSubcategorySelect = function (sel, categoryId, value, { allLabel, includeArchived, ensureId, withDirect } = {}) {
    const D = App.data;
    if (!categoryId) {
      sel.innerHTML = '<option value="">' + U.esc(allLabel || '— None —') + '</option>';
      sel.disabled = !allLabel; sel.value = ''; return;
    }
    sel.disabled = false;
    let subs = D.subcategories(categoryId, includeArchived);
    if (ensureId && !subs.find(c => c.id === ensureId) && D.cat(ensureId)) subs = subs.concat([D.cat(ensureId)]);
    sel.innerHTML = '<option value="">' + U.esc(allLabel || '— None (directly in category) —') + '</option>' +
      (withDirect ? '<option value="__direct">Only expenses without subcategory</option>' : '') +
      subs.map(c => '<option value="' + c.id + '">' + U.esc(D.catName(c.id)) + '</option>').join('');
    sel.value = value || '';
    if (sel.value !== (value || '')) sel.value = '';
  };

  UI.catBadge = function (catId, subId) {
    const D = App.data;
    const color = D.catColor(catId);
    return '<span class="cat-badge" style="--c:' + color + '"><span class="dot"></span>' + U.esc(D.catIcon(catId) + ' ' + D.catName(catId)) +
      (subId ? '<span class="sub"> › ' + U.esc(D.catName(subId)) + '</span>' : '') + '</span>';
  };

  /* ---------------- Expense form (add / edit) ---------------- */
  UI.expenseForm = function (existing, opts) {
    opts = opts || {};
    const D = App.data;
    const isEdit = !!existing;
    const ex = existing || { date: U.today(), paymentMethod: (D.settings.lastPaymentMethod || 'Cash'),
      categoryId: opts.categoryId || D.settings.lastCategoryId || '', subcategoryId: opts.subcategoryId || '' };
    if (ex.categoryId && !D.cat(ex.categoryId)) ex.categoryId = '';
    if (!isEdit && ex.categoryId && D.cat(ex.categoryId).archived) ex.categoryId = '';

    const form = UI.h('<form class="expense-form" novalidate>' +
      '<div class="field"><label for="f-title">Title / description <span class="req">*</span></label>' +
      '<input id="f-title" name="title" maxlength="120" autocomplete="off" placeholder="e.g. Weekly groceries" required></div>' +
      '<div class="row2">' +
      '<div class="field"><label for="f-amount">Amount <span class="req">*</span></label>' +
      '<div class="amount-wrap has-select"><input id="f-amount" name="amount" inputmode="decimal" autocomplete="off" placeholder="0.00" required>' +
      '<select name="currency" class="cur-select" aria-label="Currency">' + U.CURRENCIES.concat(U.CURRENCIES.includes(D.settings.currency) ? [] : [D.settings.currency]).map(c => '<option>' + c + '</option>').join('') + '</select></div></div>' +
      '<div class="field"><label for="f-date">Date <span class="req">*</span></label>' +
      '<input id="f-date" name="date" type="date" required>' +
      '<div class="quick-dates"><button type="button" class="chip" data-d="0">Today</button><button type="button" class="chip" data-d="-1">Yesterday</button><button type="button" class="chip" data-d="-2">2 days ago</button></div></div>' +
      '</div>' +
      '<div class="fx-row" hidden><label for="f-rate" class="label">Exchange rate</label><div class="fx-line"><span class="fx-one"></span>' +
      '<input id="f-rate" name="rate" inputmode="decimal" autocomplete="off"><span class="fx-main"></span><span class="fx-eq"></span></div>' +
      '<p class="muted small fx-note"></p></div>' +
      '<div class="row2">' +
      '<div class="field"><label for="f-cat">Category <span class="req">*</span></label><select id="f-cat" name="categoryId" required></select></div>' +
      '<div class="field"><label for="f-sub">Subcategory</label><select id="f-sub" name="subcategoryId"></select></div>' +
      '</div>' +
      '<div class="field"><span class="label">Payment method</span><div class="segmented" role="radiogroup" aria-label="Payment method">' +
      D.PAYMENT_METHODS.map(m => '<label><input type="radio" name="paymentMethod" value="' + m + '"><span>' + m + '</span></label>').join('') + '</div></div>' +
      '<div class="field"><label for="f-notes">Notes <span class="muted">(optional)</span></label><textarea id="f-notes" name="notes" rows="2" maxlength="1000"></textarea></div>' +
      (isEdit ? '' : '<label class="check-row"><input type="checkbox" name="fav"> <span>⭐ Also save as a quick-add favourite</span></label>') +
      '<div class="form-error" role="alert" hidden></div>' +
      (isEdit ? '<p class="muted small">Created ' + U.esc(U.fmtDateTime(existing.createdAt)) + (existing.updatedAt !== existing.createdAt ? ' · Last edited ' + U.esc(U.fmtDateTime(existing.updatedAt)) : '') + '</p>' : '') +
      '</form>');

    const f = form.elements;
    const main = D.settings.currency;
    f.title.value = ex.title || '';
    f.amount.value = ex.origCurrency ? U.minorToInput(ex.origAmountMinor) : (ex.amountMinor ? U.minorToInput(ex.amountMinor) : '');
    f.currency.value = ex.origCurrency || main;
    if (ex.rate) f.rate.value = U.fmtRate(ex.rate);

    // Foreign currency: show the rate row, fetch today's rate, and preview the converted amount.
    const fxRow = $('.fx-row', form);
    let fxFor = ex.origCurrency || null;
    function fxPreview() {
      const cur = f.currency.value, foreign = cur !== main;
      fxRow.hidden = !foreign;
      if (!foreign) return;
      $('.fx-one', form).textContent = '1 ' + cur + ' =';
      $('.fx-main', form).textContent = main;
      const a = U.parseAmount(f.amount.value), r = U.parseRate(f.rate.value);
      $('.fx-eq', form).textContent = a.ok && r ? '→ ' + U.money(Math.round(a.value * r)) : '';
    }
    async function fxFetch() {
      const cur = f.currency.value;
      if (cur === main) { fxPreview(); return; }
      if (fxFor === cur && f.rate.value) { fxPreview(); return; }
      fxFor = cur; f.rate.value = ''; fxPreview();
      const note = $('.fx-note', form);
      note.textContent = App.i18n.t('Getting today’s rate…');
      const r = await U.fetchRate(cur, main);
      if (f.currency.value !== cur) return; // user changed it meanwhile
      if (r) { f.rate.value = U.fmtRate(r); note.textContent = App.i18n.t('Today’s rate – you can change it.'); }
      else note.textContent = App.i18n.t('Could not get the rate (offline?). Please type it.');
      fxPreview();
    }
    f.currency.addEventListener('change', fxFetch);
    f.amount.addEventListener('input', fxPreview);
    f.rate.addEventListener('input', fxPreview);
    fxPreview();
    f.date.value = ex.date;
    f.notes.value = ex.notes || '';
    UI.$$('input[name=paymentMethod]', form).forEach(r => { r.checked = r.value === ex.paymentMethod; });
    UI.fillCategorySelect(f.categoryId, ex.categoryId, { ensureId: isEdit ? ex.categoryId : null });
    UI.fillSubcategorySelect(f.subcategoryId, f.categoryId.value, ex.subcategoryId, { ensureId: isEdit ? ex.subcategoryId : null });
    f.categoryId.addEventListener('change', () => UI.fillSubcategorySelect(f.subcategoryId, f.categoryId.value, ''));
    UI.$$('.quick-dates .chip', form).forEach(b => b.addEventListener('click', () => { f.date.value = U.addDays(U.today(), Number(b.dataset.d)); }));

    const footer = UI.h('<div class="foot-btns">' + (isEdit ? '<button type="button" class="btn danger ghost" data-del>Delete</button><span class="spacer"></span>' : '<span class="spacer"></span>') +
      '<button type="button" class="btn ghost" data-close>Cancel</button>' +
      (isEdit ? '' : '<button type="button" class="btn ghost" data-again>Save &amp; add another</button>') +
      '<button type="submit" class="btn primary" data-save>' + (isEdit ? 'Save changes' : 'Save expense') + '</button></div>');

    const m = UI.modal({ title: isEdit ? 'Edit expense' : 'Add expense', body: form, footer });
    const errBox = $('.form-error', form);
    let saving = false; // prevents duplicate submissions (double clicks, Enter spam)

    async function save(again) {
      if (saving) return;
      errBox.hidden = true;
      const input = {
        title: f.title.value, amount: f.amount.value, date: f.date.value,
        currency: f.currency.value, rate: f.rate.value,
        categoryId: f.categoryId.value, subcategoryId: f.subcategoryId.value || null,
        paymentMethod: (form.querySelector('input[name=paymentMethod]:checked') || {}).value || 'Other', notes: f.notes.value
      };
      saving = true; UI.$$('button', footer).forEach(b => { b.disabled = true; });
      try {
        let rec;
        if (isEdit) rec = await D.updateExpense(existing.id, input);
        else {
          rec = await D.addExpense(input);
          if (f.fav && f.fav.checked) { await D.addFavourite(rec); f.fav.checked = false; }
        }
        D.saveSettings({ lastCategoryId: input.categoryId, lastPaymentMethod: input.paymentMethod }).catch(() => {});
        UI.toast(isEdit ? 'Expense updated' : 'Expense saved: ' + U.money(rec.amountMinor));
        if (again) {
          f.title.value = ''; f.amount.value = ''; f.notes.value = ''; f.title.focus(); fxPreview();
        } else m.close();
      } catch (err) {
        errBox.textContent = err.message; errBox.hidden = false;
      } finally {
        saving = false; UI.$$('button', footer).forEach(b => { b.disabled = false; });
      }
    }
    form.addEventListener('submit', e => { e.preventDefault(); save(false); });
    $('[data-save]', footer).addEventListener('click', e => { e.preventDefault(); save(false); });
    const again = $('[data-again]', footer); if (again) again.addEventListener('click', () => save(true));
    const del = $('[data-del]', footer);
    if (del) del.addEventListener('click', async () => {
      if (await UI.confirm({ title: 'Delete expense?', message: 'Delete <b>' + U.esc(existing.title) + '</b> (' + U.money(existing.amountMinor) + ')? This cannot be undone.', okText: 'Delete', danger: true })) {
        m.close(); await UI.deleteWithUndo([existing.id]);
      }
    });
    return m;
  };

  // Amount in the main currency, plus the original amount underneath for foreign-currency expenses.
  UI.amountHtml = function (e) {
    return U.money(e.amountMinor) + (e.origCurrency ? '<small class="orig-amt">' + U.esc(U.money(e.origAmountMinor, e.origCurrency)) + '</small>' : '');
  };

  UI.expenseDetails = function (id) {
    const D = App.data, e = D.expense(id);
    if (!e) return;
    const rows = [
      ['Amount', '<b class="amount-lg">' + U.money(e.amountMinor) + '</b>'],
      ...(e.origCurrency ? [['Original amount', U.esc(U.money(e.origAmountMinor, e.origCurrency)) + ' <span class="muted small">· 1 ' + U.esc(e.origCurrency) + ' = ' + U.esc(U.fmtRate(e.rate)) + ' ' + U.esc(D.settings.currency) + '</span>']] : []),
      ['Date', U.esc(U.fmtDate(e.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))],
      ['Category', UI.catBadge(e.categoryId, e.subcategoryId)],
      ['Payment method', U.esc(e.paymentMethod)],
      ['Notes', e.notes ? U.esc(e.notes).replace(/\n/g, '<br>') : '<span class="muted">—</span>'],
      ['Created', U.esc(U.fmtDateTime(e.createdAt))],
      ['Last updated', U.esc(U.fmtDateTime(e.updatedAt))],
      ['ID', '<code>' + U.esc(e.id) + '</code>']
    ];
    const m = UI.modal({
      title: e.title,
      body: '<dl class="details">' + rows.map(([k, v]) => '<dt>' + k + '</dt><dd>' + v + '</dd>').join('') + '</dl>',
      footer: '<button class="btn ghost" data-fav>⭐ Add to favourites</button><span class="spacer"></span><button class="btn ghost" data-close>Close</button><button class="btn primary" data-edit>Edit</button>'
    });
    $('[data-fav]', m.el).addEventListener('click', async () => {
      try { const added = await D.addFavourite(e); UI.toast(added ? 'Added to favourites' : 'Already in favourites'); }
      catch (err) { UI.toast(err.message, 'err'); }
    });
    $('[data-edit]', m.el).addEventListener('click', () => { m.close(); UI.expenseForm(e); });
  };

  /* ---------------- Charts (Chart.js wrapper) ---------------- */
  UI.chartsAvailable = () => typeof window.Chart !== 'undefined';
  UI.chart = function (canvas, config) {
    if (!canvas) return null;
    if (canvas._chart) { canvas._chart.destroy(); canvas._chart = null; }
    if (!UI.chartsAvailable()) {
      const box = canvas.parentElement;
      if (box && !box.querySelector('.no-chart')) box.insertAdjacentHTML('beforeend', '<p class="no-chart muted">Charts need an internet connection to load the chart library. All numbers below are still correct.</p>');
      return null;
    }
    const css = getComputedStyle(document.documentElement);
    Chart.defaults.color = css.getPropertyValue('--muted').trim();
    Chart.defaults.borderColor = css.getPropertyValue('--line').trim();
    Chart.defaults.font.family = css.getPropertyValue('--font').trim() || 'system-ui';
    config.options = Object.assign({ responsive: true, maintainAspectRatio: false, animation: { duration: 250 } }, config.options || {});
    canvas._chart = new Chart(canvas, config);
    return canvas._chart;
  };
  UI.moneyTick = v => {
    const cur = App.data.settings.currency;
    const n = Number(v);
    return (Math.abs(n) >= 1000 ? (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + 'k' : n) + ' ' + cur;
  };

  UI.doughnut = function (canvas, items) {
    return UI.chart(canvas, {
      type: 'doughnut',
      data: { labels: items.map(i => i.name), datasets: [{ data: items.map(i => U.minorToNumber(i.total)), backgroundColor: items.map(i => i.color), borderWidth: 2, borderColor: getComputedStyle(document.documentElement).getPropertyValue('--card').trim() }] },
      options: { cutout: '62%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ' ' + ctx.label + ': ' + U.money(Math.round(ctx.parsed * 100)) } } } }
    });
  };

  UI.hbar = function (canvas, items) {
    return UI.chart(canvas, {
      type: 'bar',
      data: { labels: items.map(i => i.name), datasets: [{ data: items.map(i => U.minorToNumber(i.total)), backgroundColor: items.map(i => i.color), borderRadius: 4, maxBarThickness: 22 }] },
      options: { indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ' ' + U.money(Math.round(ctx.parsed.x * 100)) } } },
        scales: { x: { ticks: { callback: UI.moneyTick } }, y: { grid: { display: false } } } }
    });
  };

  UI.trend = function (canvas, series, opts) {
    opts = opts || {};
    const css = getComputedStyle(document.documentElement);
    const accent = css.getPropertyValue('--accent').trim();
    return UI.chart(canvas, {
      type: opts.type || 'bar',
      data: { labels: series.map(s => s.label), datasets: [{ label: App.i18n.t(opts.label || 'Spent'), data: series.map(s => U.minorToNumber(s.total)),
        backgroundColor: opts.type === 'line' ? U.alpha(accent, 0.15) : accent, borderColor: accent, fill: true, tension: 0.3, pointRadius: series.length > 60 ? 0 : 3, borderRadius: 4, maxBarThickness: 36 }] },
      options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ' ' + U.money(Math.round(ctx.parsed.y * 100)) } } },
        scales: { y: { beginAtZero: true, ticks: { callback: UI.moneyTick } }, x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } } } }
    });
  };

  /* ---------------- Files ---------------- */
  UI.download = function (filename, content, mime) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  // rows: array of arrays (first row = header)
  UI.toCSV = rows => '﻿' + rows.map(r => r.map(v => {
    const s = v == null ? '' : String(v);
    return /[",\n\r;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(',')).join('\r\n');

  // sheets: [{ name, rows }]
  UI.exportExcel = function (filename, sheets) {
    if (typeof XLSX === 'undefined') { UI.toast('Excel export needs an internet connection (library not loaded). Use CSV instead.', 'err'); return; }
    const wb = XLSX.utils.book_new();
    sheets.forEach(s => {
      const ws = XLSX.utils.aoa_to_sheet(s.rows);
      ws['!cols'] = (s.rows[0] || []).map((_, i) => ({ wch: Math.min(40, Math.max(10, ...s.rows.map(r => String(r[i] == null ? '' : r[i]).length + 2))) }));
      XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
    });
    XLSX.writeFile(wb, filename);
  };

  UI.parseCSV = function (text) {
    text = text.replace(/^﻿/, '');
    const firstLine = text.split(/\r?\n/)[0] || '';
    const delim = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';
    const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) {
        if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; }
        else cur += ch;
      } else if (ch === '"') q = true;
      else if (ch === delim) { row.push(cur); cur = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
      else cur += ch;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    const nonEmpty = rows.filter(r => r.some(c => String(c).trim() !== ''));
    if (!nonEmpty.length) return [];
    const head = nonEmpty[0].map(h => h.trim());
    return nonEmpty.slice(1).map(r => Object.fromEntries(head.map((h, i) => [h, r[i] != null ? r[i] : ''])));
  };

  App.ui = UI;
})();
