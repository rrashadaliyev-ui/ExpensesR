(function () {
  'use strict';
  const U = App.U, UI = App.ui;
  const CURRENCIES = App.U.CURRENCIES;

  function render(root) {
    const D = App.data;
    const s = D.settings;
    const sampleCount = D.expenses.filter(e => e.notes === 'Sample data').length;
    root.innerHTML =
      '<div class="page-head"><div><h1>Settings & data</h1><p class="muted">Preferences, backup, restore and import</p></div></div>' +

      '<section class="card"><h2>Preferences</h2><div class="settings-grid">' +
      '<div class="field"><label for="s-lang">Language</label><select id="s-lang"><option value="en">English</option><option value="az">Azərbaycan dili</option></select></div>' +
      '<div class="field"><label for="s-theme">Theme</label><select id="s-theme"><option value="system">Follow system</option><option value="light">Light</option><option value="dark">Dark</option></select></div>' +
      '<div class="field"><label for="s-cur">Main currency</label><select id="s-cur">' + CURRENCIES.concat(CURRENCIES.includes(s.currency) ? [] : [s.currency]).map(c => '<option>' + c + '</option>').join('') + '</select></div>' +
      '<div class="field"><label for="s-week">Week starts on</label><select id="s-week"><option value="1">Monday</option><option value="0">Sunday</option></select></div>' +
      '</div><p class="muted small">All totals, budgets and reports use the main currency. To record a purchase in another currency, pick it next to the amount when adding the expense.</p></section>' +

      (App.storage.requiresAuth && App.storage.user
        ? '<section class="card"><h2>Cloud account</h2><p>Signed in as <b>' + U.esc(App.storage.user.email || App.storage.user.displayName || '') + '</b>. Your data is saved in your Google account (Firebase) and syncs across devices.</p>' +
          '<div class="btn-row"><button class="btn ghost" data-sync>Sync now</button><button class="btn ghost" data-signout>Sign out</button></div></section>'
        : '<section class="card"><h2>Cloud sync</h2><p class="muted">Off – data is stored only in this browser. To sync with your phone, follow <code>SETUP-CLOUD.md</code> in the app folder.</p></section>') +
      '<section class="card"><h2>Dashboard panels</h2><p class="muted small">Choose what to show on the Dashboard.</p><div class="panel-toggles">' +
      [['debts', 'Borrowed & Lent'], ['budget', 'Monthly budget'], ['quick', 'Quick add buttons']].map(([k, l]) =>
        '<label class="check-row"><input type="checkbox" data-panel="' + k + '"' + ((s.hiddenPanels || []).includes(k) ? '' : ' checked') + '> <span>' + l + '</span></label>').join('') +
      '</div></section>' +
      '<section class="card"><h2>Backup & restore</h2>' +
      '<p class="muted">' + (App.storage.requiresAuth ? 'Your data is stored in: ' + U.esc(App.storage.name) + '. An extra backup file is still a good idea.' : 'Your data is stored in this browser on this device (' + U.esc(App.storage.name) + ').') + ' Download a backup regularly – for example into your OneDrive or Google Drive folder – and restore it on any device.</p>' +
      '<div class="stat-line"><span><b>' + D.expenses.length + '</b> expenses</span><span><b>' + D.categories.filter(c => !c.parentId).length + '</b> categories</span><span><b>' + D.categories.filter(c => c.parentId).length + '</b> subcategories</span><span data-persist class="muted small"></span></div>' +
      '<div class="btn-row"><button class="btn primary" data-backup>Download backup (.json)</button><button class="btn ghost" data-restore>Restore from backup…</button><input type="file" accept=".json,application/json" data-restore-file hidden></div></section>' +

      '<section class="card"><h2>Import expenses</h2>' +
      '<p class="muted">Import from a CSV or Excel file. The first row must be headers: <code>Date</code>, <code>Title</code>, <code>Amount</code>, <code>Category</code>, <code>Subcategory</code> (optional), <code>Payment Method</code> (optional), <code>Notes</code> (optional). ' +
      'Dates can be <code>2026-11-24</code>, <code>24.11.2026</code> or <code>24/11/2026</code>. Missing categories are created automatically.</p>' +
      '<div class="btn-row"><button class="btn primary" data-import>Choose CSV / Excel file…</button><button class="btn ghost" data-template>Download template</button>' +
      '<input type="file" accept=".csv,.xlsx,.xls,text/csv" data-import-file hidden></div><div data-import-result></div></section>' +

      '<section class="card"><h2>Export all data</h2><div class="btn-row"><button class="btn ghost" data-exp-csv>All expenses (CSV)</button><button class="btn ghost" data-exp-xlsx>All expenses (Excel)</button></div></section>' +

      '<section class="card"><h2>Sample data</h2><p class="muted">Add about 120 days of realistic sample expenses to explore the dashboard and reports. They are marked “Sample data” and can be removed in one click.</p>' +
      '<div class="btn-row"><button class="btn ghost" data-sample>Add sample data</button><button class="btn ghost" data-unsample' + (sampleCount ? '' : ' disabled') + '>Remove sample data (' + sampleCount + ')</button></div></section>' +

      '<section class="card danger-zone"><h2>Danger zone</h2><p class="muted">Delete every expense and category and start again with the default categories.</p>' +
      '<button class="btn danger" data-clear>Delete all data…</button></section>' +
      '<p class="muted small center">Expense Manager · data schema v' + (s.schemaVersion || 1) + '</p>';

    const theme = UI.$('#s-theme', root), cur = UI.$('#s-cur', root), week = UI.$('#s-week', root);
    UI.$$('[data-panel]', root).forEach(cb => cb.addEventListener('change', () => {
      const hidden = new Set(D.settings.hiddenPanels || []);
      cb.checked ? hidden.delete(cb.dataset.panel) : hidden.add(cb.dataset.panel);
      D.saveSettings({ hiddenPanels: Array.from(hidden) });
    }));
    const lang = UI.$('#s-lang', root);
    lang.value = App.i18n.lang;
    lang.addEventListener('change', () => App.i18n.set(lang.value));
    theme.value = s.theme || 'system'; cur.value = s.currency; week.value = String(s.weekStart);
    theme.addEventListener('change', () => D.saveSettings({ theme: theme.value }));
    cur.addEventListener('change', () => { const to = cur.value; cur.value = s.currency; currencyDialog(s.currency, to); });
    week.addEventListener('change', () => D.saveSettings({ weekStart: Number(week.value) }));

    if (navigator.storage && navigator.storage.persisted) navigator.storage.persisted().then(p => {
      const el = UI.$('[data-persist]', root); if (el) el.textContent = p ? '✓ Protected from automatic browser cleanup' : 'Browser may clear data if disk is low – keep backups';
    }).catch(() => {});

    const so = UI.$('[data-signout]', root);
    if (so) so.addEventListener('click', async () => {
      if (await UI.confirm({ title: 'Sign out?', message: 'Your data stays safe in your Google account. Sign in again to see it.', okText: 'Sign out' })) { await App.storage.signOut(); location.reload(); }
    });
    const sy = UI.$('[data-sync]', root);
    if (sy) sy.addEventListener('click', async () => { await D.reload(); render(root); UI.toast('Up to date'); });

    UI.$('[data-backup]', root).addEventListener('click', () => {
      UI.download('expense-backup-' + U.today() + '.json', JSON.stringify(D.backupObject(), null, 1), 'application/json');
      UI.toast('Backup downloaded');
    });
    const rf = UI.$('[data-restore-file]', root);
    UI.$('[data-restore]', root).addEventListener('click', () => rf.click());
    rf.addEventListener('change', async () => {
      const file = rf.files[0]; rf.value = '';
      if (!file) return;
      let obj;
      try { obj = JSON.parse(await file.text()); } catch (e) { UI.toast('This file is not valid JSON.', 'err'); return; }
      const n = obj && obj.stores ? (obj.stores.expenses || []).length : 0;
      if (!(await UI.confirm({ title: 'Restore backup?', message: 'This <b>replaces all current data</b> (' + D.expenses.length + ' expenses) with the backup from <b>' + U.esc(obj.exportedAt ? new Date(obj.exportedAt).toLocaleString() : 'unknown date') + '</b> (' + n + ' expenses). Download a backup of the current data first if you might need it.', okText: 'Replace and restore', danger: true }))) return;
      try { const r = await D.restoreBackup(obj); UI.toast('Restored ' + r.expenses + ' expenses and ' + r.categories + ' categories'); }
      catch (e) { UI.toast(e.message, 'err'); }
    });

    const inf = UI.$('[data-import-file]', root);
    UI.$('[data-import]', root).addEventListener('click', () => inf.click());
    inf.addEventListener('change', async () => {
      const file = inf.files[0]; inf.value = '';
      if (!file) return;
      const out = UI.$('[data-import-result]', root);
      try {
        let rows;
        if (/\.xlsx?$/i.test(file.name)) {
          if (typeof XLSX === 'undefined') throw new Error('Excel import needs an internet connection to load its library. Save the file as CSV and import that instead.');
          const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false });
          rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: true });
        } else rows = UI.parseCSV(await file.text());
        if (!rows.length) throw new Error('The file has no data rows.');
        if (!(await UI.confirm({ title: 'Import ' + rows.length + ' rows?', message: 'Import expenses from <b>' + U.esc(file.name) + '</b>? Rows with problems are skipped and listed afterwards.', okText: 'Import' }))) return;
        const r = await D.importRows(rows);
        out.innerHTML = '<div class="import-result ' + (r.skipped ? 'warn' : 'ok') + '"><b>' + r.added + ' expenses imported</b>' + (r.createdCategories ? ', ' + r.createdCategories + ' new categories/subcategories created' : '') +
          (r.skipped ? '. ' + r.skipped + ' rows skipped:<ul>' + r.errors.map(e => '<li>' + U.esc(e) + '</li>').join('') + '</ul>' : '.') + '</div>';
        UI.toast(r.added + ' expenses imported');
      } catch (e) { out.innerHTML = '<div class="import-result err">' + U.esc(e.message) + '</div>'; }
    });
    UI.$('[data-template]', root).addEventListener('click', () => {
      const t = U.today();
      UI.download('expense-import-template.csv', UI.toCSV([['Date', 'Title', 'Amount', 'Category', 'Subcategory', 'Payment Method', 'Notes'],
        [t, 'Weekly groceries', '45.20', 'Food', 'Groceries', 'Card', ''], [U.addDays(t, -1), 'Taxi to office', '8.50', 'Transportation', 'Taxi', 'Cash', 'Rainy day']]), 'text/csv;charset=utf-8');
    });

    UI.$('[data-exp-csv]', root).addEventListener('click', () => App.views.expenses.exportCSV(D.expenses.slice().sort((a, b) => a.date.localeCompare(b.date)), 'all-expenses'));
    UI.$('[data-exp-xlsx]', root).addEventListener('click', () => UI.exportExcel('all-expenses-' + U.today() + '.xlsx', [{ name: 'Expenses',
      rows: [['Date', 'Title', 'Amount', 'Category', 'Subcategory', 'Payment Method', 'Notes', 'Created', 'ID']].concat(D.expenses.slice().sort((a, b) => a.date.localeCompare(b.date))
        .map(e => [e.date, e.title, U.minorToNumber(e.amountMinor), (D.cat(e.categoryId) || {}).name || '', e.subcategoryId ? (D.cat(e.subcategoryId) || {}).name || '' : '', e.paymentMethod, e.notes, e.createdAt, e.id])) }]));

    UI.$('[data-sample]', root).addEventListener('click', async () => {
      try { const n = await D.addSampleData(); UI.toast(n + ' sample expenses added'); } catch (e) { UI.toast(e.message, 'err'); }
    });
    UI.$('[data-unsample]', root).addEventListener('click', async () => {
      if (await UI.confirm({ title: 'Remove sample data?', message: 'Delete all ' + sampleCount + ' expenses marked “Sample data”? Your own expenses are not affected.', okText: 'Remove', danger: true })) {
        const n = await D.removeSampleData(); UI.toast(n + ' sample expenses removed');
      }
    });
    UI.$('[data-clear]', root).addEventListener('click', async () => {
      if (await UI.confirm({ title: 'Delete ALL data?', message: 'This permanently deletes <b>all ' + D.expenses.length + ' expenses and all categories</b>. It cannot be undone unless you have a backup file.', okText: 'Delete everything', danger: true })) {
        await D.clearAll(); UI.toast('All data deleted');
      }
    });
  }

  // Changing the main currency: convert every amount with a rate, or only fix the label.
  function currencyDialog(from, to) {
    const D = App.data;
    const body = UI.h('<form novalidate>' +
      '<p>' + U.esc(from) + ' → <b>' + U.esc(to) + '</b></p>' +
      '<label class="radio-card"><input type="radio" name="mode" value="convert" checked><span><b>Convert all amounts</b><br>' +
      '<span class="muted small">Every expense, budget, loan and favourite is converted with the rate below. Each expense also keeps its original amount.</span>' +
      '<span class="fx-line conv-rate"><span>1 ' + U.esc(from) + ' =</span><input name="rate" inputmode="decimal" autocomplete="off" aria-label="Exchange rate"><span>' + U.esc(to) + '</span></span>' +
      '<span class="muted small fx-note"></span></span></label>' +
      '<label class="radio-card"><input type="radio" name="mode" value="label"><span><b>Only change the symbol</b><br>' +
      '<span class="muted small">Use this if your amounts were already in ' + U.esc(to) + ' and only the symbol was wrong. Nothing is converted.</span></span></label>' +
      '<div class="form-error" hidden></div></form>');
    const m = UI.modal({ title: 'Change main currency', body, footer: '<button class="btn ghost" data-close>Cancel</button><button class="btn primary" data-ok>Change currency</button>' });
    const rate = body.elements.rate, note = UI.$('.fx-note', body);
    note.textContent = App.i18n.t('Getting today’s rate…');
    U.fetchRate(from, to).then(r => {
      if (r) { rate.value = U.fmtRate(r); note.textContent = App.i18n.t('Today’s rate – you can change it.'); }
      else note.textContent = App.i18n.t('Could not get the rate (offline?). Please type it.');
    });
    rate.addEventListener('focus', () => { body.querySelector('input[value=convert]').checked = true; });
    let busy = false;
    UI.$('[data-ok]', m.el).addEventListener('click', async () => {
      if (busy) return; busy = true;
      try {
        const mode = body.querySelector('input[name=mode]:checked').value;
        await D.changeMainCurrency(to, mode, rate.value);
        UI.toast(mode === 'convert' ? 'All amounts converted to ' + to : 'Currency changed to ' + to); m.close();
      } catch (e) { const err = UI.$('.form-error', body); err.textContent = e.message; err.hidden = false; }
      busy = false;
    });
  }

  App.views = App.views || {};
  App.views.settings = { title: 'Settings', render };
})();
