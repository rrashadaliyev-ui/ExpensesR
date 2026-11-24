(function () {
  'use strict';
  const U = App.U, C = App.calc, UI = App.ui;
  const state = { period: C.defaultPeriod('all'), showArchived: false, open: new Set() };

  function render(root) {
    const D = App.data;
    const range = C.range(state.period);
    const list = C.filter(D.expenses, range);
    const grand = C.sum(list);
    // Totals per category / subcategory id for the selected period
    const catTot = new Map(), subTot = new Map(), directTot = new Map();
    list.forEach(e => {
      add(catTot, e.categoryId, e.amountMinor);
      if (e.subcategoryId) add(subTot, e.subcategoryId, e.amountMinor); else add(directTot, e.categoryId, e.amountMinor);
    });
    // Deleted (archived) categories that still have spending in this period are listed too, so totals always add up.
    const cats = D.topCategories(false).concat(D.topCategories(true).filter(c => c.archived && catTot.get(c.id)));
    const archived = D.categories.filter(c => c.archived);

    root.innerHTML =
      '<div class="page-head"><div><h1>Categories</h1><p class="muted">Organise categories and subcategories. Totals respect the selected period.</p></div>' +
      '<div class="head-actions"><button class="btn primary" data-new>+ New category</button></div></div>' +
      '<section class="card filters"><div class="filter-period"><span class="label">Totals for</span><div data-pp></div>' +
      '<span class="spacer"></span><span class="muted">Period total: <b>' + U.money(grand) + '</b></span></div></section>' +
      (cats.length ? '<section class="cat-list">' + cats.map(c => catCard(c, catTot, subTot, directTot, grand)).join('') + '</section>'
        : '<div class="card empty"><p>No categories yet.</p><button class="btn primary" data-new>Create your first category</button></div>') +
      (archived.length ? '<section class="card"><button class="linklike" data-toggle-arch>' + (state.showArchived ? '▾' : '▸') + ' Deleted categories with history (' + archived.length + ')</button>' +
        (state.showArchived ? '<p class="muted small">These were deleted but still have expenses, so your history and reports stay accurate. They are hidden from the expense form. Restore one to use it again.</p>' +
          '<ul class="arch-list">' + archived.map(a => '<li><span>' + U.esc((a.parentId ? D.catName(a.parentId).replace(' (deleted)', '') + ' › ' : '') + a.name) + '</span><span class="muted small">' + D.expenseCountFor(a.id) + ' expenses · deleted ' + U.esc(U.fmtDate(a.archivedAt ? a.archivedAt.slice(0, 10) : '')) + '</span><button class="btn small ghost" data-restore="' + a.id + '">Restore</button></li>').join('') + '</ul>' : '') +
        '</section>' : '');

    UI.periodPicker(UI.$('[data-pp]', root), state.period, p => { state.period = p; render(root); });
    UI.$$('[data-new]', root).forEach(b => b.addEventListener('click', () => categoryDialog(null, null)));
    UI.$$('[data-edit]', root).forEach(b => b.addEventListener('click', () => categoryDialog(D.cat(b.dataset.edit))));
    UI.$$('[data-addsub]', root).forEach(b => b.addEventListener('click', () => { state.open.add(b.dataset.addsub); categoryDialog(null, b.dataset.addsub); }));
    UI.$$('[data-del]', root).forEach(b => b.addEventListener('click', () => deleteDialog(b.dataset.del)));
    UI.$$('[data-expand]', root).forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.expand; state.open.has(id) ? state.open.delete(id) : state.open.add(id); render(root);
    }));
    UI.$$('[data-addexp]', root).forEach(b => b.addEventListener('click', () => UI.expenseForm(null, { categoryId: b.dataset.addexp, subcategoryId: b.dataset.sub || undefined })));
    const tg = UI.$('[data-toggle-arch]', root);
    if (tg) tg.addEventListener('click', () => { state.showArchived = !state.showArchived; render(root); });
    UI.$$('[data-restore]', root).forEach(b => b.addEventListener('click', async () => {
      try { await D.restoreCategory(b.dataset.restore); UI.toast('Category restored'); } catch (e) { UI.toast(e.message, 'err'); }
    }));
  }

  function add(map, k, v) { map.set(k, (map.get(k) || 0) + v); }

  function catCard(c, catTot, subTot, directTot, grand) {
    const D = App.data;
    const subs = D.subcategories(c.id, false);
    const total = catTot.get(c.id) || 0;
    const direct = directTot.get(c.id) || 0;
    // Archived subcategories that still have spending in this period are shown so the parts add up.
    const archivedSubs = D.subcategories(c.id, true).filter(s => s.archived && subTot.get(s.id));
    const open = state.open.has(c.id) || subs.length <= 6;
    return '<article class="card cat-card" style="--c:' + c.color + '">' +
      '<div class="cat-head"><span class="cat-icon">' + U.esc(c.icon || '🏷️') + '</span>' +
      '<div class="cat-title"><h3>' + U.esc(c.name) + (c.archived ? ' <span class="tag">deleted</span>' : '') + '</h3><span class="muted small">' + subs.length + ' subcategor' + (subs.length === 1 ? 'y' : 'ies') + '</span></div>' +
      '<div class="cat-total"><b>' + U.money(total) + '</b><span class="muted small">' + U.fmtPct(U.pct(total, grand)) + ' of total</span></div></div>' +
      '<div class="bar"><span style="width:' + U.pct(total, grand).toFixed(2) + '%"></span></div>' +
      (open ? '<ul class="sub-list">' +
        subs.map(s => subRow(c, s, subTot.get(s.id) || 0, total, false)).join('') +
        archivedSubs.map(s => subRow(c, s, subTot.get(s.id) || 0, total, true)).join('') +
        (direct ? '<li class="direct"><span class="name muted">No subcategory (direct)</span><span class="val">' + U.money(direct) + '</span><span class="pct muted">' + U.fmtPct(U.pct(direct, total)) + '</span><span class="acts"></span></li>' : '') +
        '</ul>' : '<button class="linklike small" data-expand="' + c.id + '">Show ' + subs.length + ' subcategories</button>') +
      (c.archived ? '<div class="cat-actions"><span class="tag">deleted – kept for history</span><span class="spacer"></span><button class="btn small ghost" data-restore="' + c.id + '">Restore</button></div></article>' :
      '<div class="cat-actions"><button class="btn small ghost" data-addsub="' + c.id + '">+ Subcategory</button>' +
      '<button class="btn small ghost" data-addexp="' + c.id + '">+ Expense</button><span class="spacer"></span>' +
      '<button class="icon-btn" data-edit="' + c.id + '" title="Edit category" aria-label="Edit ' + U.esc(c.name) + '">✎</button>' +
      '<button class="icon-btn danger" data-del="' + c.id + '" title="Delete category" aria-label="Delete ' + U.esc(c.name) + '">🗑</button></div>' +
      '</article>');
  }

  function subRow(c, s, amt, catTotal, archived) {
    return '<li' + (archived ? ' class="archived"' : '') + '><span class="name">' + U.esc(s.name) + (archived ? ' <span class="tag">deleted</span>' : '') + '</span>' +
      '<span class="val">' + U.money(amt) + '</span><span class="pct muted">' + U.fmtPct(U.pct(amt, catTotal)) + '</span><span class="acts">' +
      (archived ? '' : '<button class="icon-btn sm" data-addexp="' + c.id + '" data-sub="' + s.id + '" title="Add expense here" aria-label="Add expense to ' + U.esc(s.name) + '">＋</button>' +
        '<button class="icon-btn sm" data-edit="' + s.id + '" title="Rename" aria-label="Rename ' + U.esc(s.name) + '">✎</button>' +
        '<button class="icon-btn sm danger" data-del="' + s.id + '" title="Delete" aria-label="Delete ' + U.esc(s.name) + '">🗑</button>') + '</span></li>';
  }

  /* -------- Create / edit dialog (category or subcategory) -------- */
  function categoryDialog(existing, parentId) {
    const D = App.data;
    const isSub = existing ? !!existing.parentId : !!parentId;
    const parent = isSub ? D.cat(existing ? existing.parentId : parentId) : null;
    let color = existing ? existing.color : (D.PALETTE.find(p => !D.topCategories(true).map(c => c.color).includes(p)) || D.PALETTE[0]);
    let icon = existing ? (existing.icon || '') : (isSub ? '' : '🏷️');

    const body = UI.h('<form novalidate>' +
      (isSub ? '<p class="muted">Subcategory of <b>' + U.esc(parent.name) + '</b></p>' : '') +
      '<div class="field"><label for="c-name">' + (isSub ? 'Subcategory' : 'Category') + ' name <span class="req">*</span></label><input id="c-name" maxlength="60" autocomplete="off" value="' + U.esc(existing ? existing.name : '') + '"></div>' +
      (isSub ? '' :
        '<div class="field"><span class="label">Colour</span><div class="swatches">' + D.PALETTE.map(p => '<button type="button" class="swatch" data-color="' + p + '" style="background:' + p + '" aria-label="Colour ' + p + '"></button>').join('') +
        '<input type="color" data-custom aria-label="Custom colour"></div></div>' +
        '<div class="field"><span class="label">Icon</span><div class="icons">' + D.ICONS.map(i => '<button type="button" class="icon-pick" data-icon="' + i + '">' + i + '</button>').join('') + '</div></div>' +
        '<div class="preview-row"><span class="muted small">Preview:</span> <span class="cat-badge prev"></span></div>') +
      (existing ? '<p class="muted small">Renaming updates every past expense automatically – history is linked by ID, never by name.</p>' : '') +
      '<div class="form-error" hidden></div></form>');

    function paint() {
      UI.$$('.swatch', body).forEach(s => s.classList.toggle('on', s.dataset.color === color));
      UI.$$('.icon-pick', body).forEach(s => s.classList.toggle('on', s.dataset.icon === icon));
      const custom = UI.$('[data-custom]', body); if (custom) custom.value = color;
      const pv = UI.$('.prev', body);
      if (pv) { pv.style.setProperty('--c', color); pv.innerHTML = '<span class="dot"></span>' + U.esc(icon + ' ' + (UI.$('#c-name', body).value || 'Category')); }
    }
    UI.$$('.swatch', body).forEach(s => s.addEventListener('click', () => { color = s.dataset.color; paint(); }));
    UI.$$('.icon-pick', body).forEach(s => s.addEventListener('click', () => { icon = s.dataset.icon; paint(); }));
    const custom = UI.$('[data-custom]', body); if (custom) custom.addEventListener('input', () => { color = custom.value; paint(); });
    UI.$('#c-name', body).addEventListener('input', paint);
    paint();

    const m = UI.modal({ title: (existing ? 'Edit ' : 'New ') + (isSub ? 'subcategory' : 'category'), body,
      footer: '<button class="btn ghost" data-close>Cancel</button><button class="btn primary" data-ok>' + (existing ? 'Save' : 'Create') + '</button>' });
    let saving = false;
    const save = async () => {
      if (saving) return; saving = true;
      try {
        await D.saveCategory({ id: existing && existing.id, name: UI.$('#c-name', body).value, parentId: isSub ? parent.id : null, color: isSub ? undefined : color, icon: isSub ? undefined : icon });
        UI.toast(existing ? 'Saved' : (isSub ? 'Subcategory created' : 'Category created'));
        m.close();
      } catch (e) { const err = UI.$('.form-error', body); err.textContent = e.message; err.hidden = false; }
      saving = false;
    };
    UI.$('[data-ok]', m.el).addEventListener('click', save);
    body.addEventListener('submit', e => { e.preventDefault(); save(); });
  }

  /* -------- Delete dialog with history protection -------- */
  async function deleteDialog(id) {
    const D = App.data;
    const c = D.cat(id);
    const isSub = !!c.parentId;
    const subs = isSub ? [] : D.categories.filter(s => s.parentId === id);
    const ids = [id].concat(subs.map(s => s.id));
    const affected = D.expenses.filter(e => ids.includes(e.categoryId) || ids.includes(e.subcategoryId));
    const what = (isSub ? 'subcategory' : 'category') + ' <b>' + U.esc(c.name) + '</b>' + (subs.length ? ' and its ' + subs.length + ' subcategories' : '');

    if (!affected.length) {
      if (await UI.confirm({ title: 'Delete ' + (isSub ? 'subcategory' : 'category') + '?', message: 'Delete the ' + what + '? No expenses use it, so nothing else is affected.', okText: 'Delete', danger: true })) {
        await D.deleteCategory(id); UI.toast('Deleted');
      }
      return;
    }

    const body = UI.h('<div><p>The ' + what + ' ' + (affected.length === 1 ? 'has <b>1 expense</b>' : 'has <b>' + affected.length + ' expenses</b>') + ' totalling <b>' + U.money(C.sum(affected)) + '</b>. What should happen to them?</p>' +
      '<label class="radio-card"><input type="radio" name="mode" value="archive" checked><span><b>Keep history (recommended)</b><br><span class="muted small">The ' + (isSub ? 'subcategory' : 'category') + ' is hidden from new expenses, but past expenses keep it and every report stays exactly the same. You can restore it later.</span></span></label>' +
      '<label class="radio-card"><input type="radio" name="mode" value="move"><span><b>Move expenses, then delete</b><br><span class="muted small">Reassign all ' + affected.length + ' expenses to another category, then delete permanently.</span>' +
      '<span class="row2 move-to"><select data-c aria-label="Target category"></select><select data-s aria-label="Target subcategory"></select></span></span></label>' +
      '<div class="form-error" hidden></div></div>');
    const cs = UI.$('[data-c]', body), ss = UI.$('[data-s]', body);
    UI.fillCategorySelect(cs, isSub ? c.parentId : '');
    if (!isSub) UI.$$('option', cs).forEach(o => { if (o.value === id) o.remove(); });
    UI.fillSubcategorySelect(ss, cs.value, '');
    if (isSub) UI.$$('option', ss).forEach(o => { if (o.value === id) o.remove(); });
    cs.addEventListener('change', () => { UI.fillSubcategorySelect(ss, cs.value, ''); UI.$$('option', ss).forEach(o => { if (o.value === id) o.remove(); }); body.querySelector('input[value=move]').checked = true; });
    ss.addEventListener('change', () => { body.querySelector('input[value=move]').checked = true; });

    const m = UI.modal({ title: 'Delete ' + (isSub ? 'subcategory' : 'category'), body,
      footer: '<button class="btn ghost" data-close>Cancel</button><button class="btn danger" data-ok>Delete</button>' });
    UI.$('[data-ok]', m.el).addEventListener('click', async () => {
      const mode = body.querySelector('input[name=mode]:checked').value;
      try {
        const res = mode === 'move'
          ? await D.deleteCategory(id, { moveTo: { categoryId: cs.value, subcategoryId: ss.value || null } })
          : await D.deleteCategory(id);
        UI.toast(res.mode === 'moved' ? res.count + ' expenses moved and category deleted' : 'Deleted – history kept for ' + res.count + ' expenses');
        m.close();
      } catch (e) { const err = UI.$('.form-error', body); err.textContent = e.message; err.hidden = false; }
    });
  }

  App.views = App.views || {};
  App.views.categories = { title: 'Categories', render };
})();
