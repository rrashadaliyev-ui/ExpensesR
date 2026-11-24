/*
 * DATA LAYER (business rules)
 * ---------------------------
 * Keeps an in-memory copy of all records, validates every change, writes it through
 * App.storage, then emits a "change" event so every screen recalculates immediately.
 *
 * Records
 *   Category    { id, name, parentId (null = top-level category, else id of parent),
 *                 color, icon, archived, archivedAt, createdAt, updatedAt }
 *   Expense     { id, title, amountMinor (integer cents), categoryId, subcategoryId (or null),
 *                 date "YYYY-MM-DD" (when it was spent), paymentMethod, notes,
 *                 createdAt (ISO, when it was entered), updatedAt }
 *   Settings    { id: "app", currency, weekStart, theme, schemaVersion }
 *
 * Historical safety
 *   Expenses reference categories by id, so renaming a category never changes history.
 *   A category that still has expenses is never physically deleted: it is "archived"
 *   (hidden from pickers, still shown in reports) unless the user moves its expenses first.
 */
(function () {
  'use strict';
  const U = App.U;

  const PAYMENT_METHODS = ['Cash', 'Card', 'Bank Transfer', 'Other'];
  const SCHEMA_VERSION = 1;
  const DEFAULT_SETTINGS = { id: 'app', currency: 'AZN', weekStart: 1, theme: 'system', schemaVersion: SCHEMA_VERSION };

  const PALETTE = ['#2563eb', '#16a34a', '#ea580c', '#9333ea', '#db2777', '#0891b2', '#ca8a04', '#dc2626',
    '#4f46e5', '#059669', '#c2410c', '#7c3aed', '#0d9488', '#be123c', '#65a30d', '#475569'];
  const ICONS = ['🍔', '🛒', '🍽️', '☕', '🛵', '🚗', '⛽', '🚕', '🚌', '🏠', '💡', '💧', '🌐', '🛍️', '👕', '💻',
    '🧴', '💊', '🏥', '🎓', '🎬', '🎮', '✈️', '🏨', '🎁', '🐾', '👶', '💼', '📱', '🏋️', '💇', '🔧', '📚', '💳', '🧾', '📦'];

  const DEFAULT_CATEGORIES = [
    ['Food', '🍔', ['Groceries', 'Restaurants', 'Coffee', 'Delivery']],
    ['Transportation', '🚗', ['Fuel', 'Taxi', 'Public Transport']],
    ['Home', '🏠', ['Rent', 'Electricity', 'Water', 'Internet']],
    ['Shopping', '🛍️', ['Clothes', 'Electronics', 'Personal Items']]
  ];

  const listeners = [];
  const D = {
    PAYMENT_METHODS, PALETTE, ICONS,
    expenses: [],
    categories: [],
    settings: Object.assign({}, DEFAULT_SETTINGS),
    catById: new Map(),

    on(fn) { listeners.push(fn); },
    emit(reason) { listeners.forEach(fn => { try { fn(reason); } catch (e) { console.error(e); } }); },

    async load() {
      await App.storage.init();
      const [expenses, categories, settings] = await Promise.all([
        App.storage.getAll('expenses'), App.storage.getAll('categories'), App.storage.getAll('settings')
      ]);
      this.expenses = expenses;
      this.categories = categories;
      this.settings = Object.assign({}, DEFAULT_SETTINGS, settings.find(s => s.id === 'app') || {});
      this.reindex();
      if (!settings.length && !categories.length && !expenses.length) {
        await this.seedDefaultCategories();
        await App.storage.put('settings', this.settings);
      }
    },

    // Re-read everything from storage (used to pick up changes made on another device).
    async reload() {
      const [expenses, categories, settings] = await Promise.all([
        App.storage.getAll('expenses'), App.storage.getAll('categories'), App.storage.getAll('settings')
      ]);
      const sig = l => l.length + ':' + l.reduce((m, r) => (r.updatedAt || '') > m ? r.updatedAt : m, '');
      const changed = sig(expenses) !== sig(this.expenses) || sig(categories) !== sig(this.categories);
      this.expenses = expenses; this.categories = categories;
      this.settings = Object.assign({}, DEFAULT_SETTINGS, settings.find(s => s.id === 'app') || {});
      this.reindex();
      if (changed) this.emit('sync');
    },

    reindex() { this.catById = new Map(this.categories.map(c => [c.id, c])); },

    /* ================= Categories ================= */

    cat(id) { return id ? this.catById.get(id) || null : null; },
    topCategories(includeArchived) {
      return this.categories.filter(c => !c.parentId && (includeArchived || !c.archived)).sort(byName);
    },
    subcategories(parentId, includeArchived) {
      return this.categories.filter(c => c.parentId === parentId && (includeArchived || !c.archived)).sort(byName);
    },
    catName(id) {
      const c = this.cat(id);
      if (!c) return '(unknown)';
      return c.name + (c.archived ? ' (deleted)' : '');
    },
    catColor(id) {
      const c = this.cat(id);
      if (!c) return '#94a3b8';
      return c.parentId ? (this.cat(c.parentId) || c).color : c.color;
    },
    catIcon(id) { const c = this.cat(id); return (c && c.icon) || (c && c.parentId && this.catIcon(c.parentId)) || '🏷️'; },
    expenseCountFor(catId) {
      return this.expenses.filter(e => e.categoryId === catId || e.subcategoryId === catId).length;
    },

    async saveCategory(input) {
      const name = String(input.name || '').trim();
      if (!name) throw new Error('Name is required.');
      if (name.length > 60) throw new Error('Name is too long (max 60 characters).');
      const parentId = input.parentId || null;
      if (parentId) {
        const p = this.cat(parentId);
        if (!p || p.parentId) throw new Error('Parent category not found.');
      }
      const clash = this.categories.find(c => (c.parentId || null) === parentId && !c.archived &&
        U.norm(c.name) === U.norm(name) && c.id !== input.id);
      if (clash) throw new Error((parentId ? 'A subcategory' : 'A category') + ' named "' + clash.name + '" already exists here.');

      const now = new Date().toISOString();
      let rec;
      if (input.id) {
        const old = this.cat(input.id);
        if (!old) throw new Error('Category not found.');
        rec = Object.assign({}, old, { name, color: input.color || old.color, icon: input.icon || old.icon, updatedAt: now });
      } else {
        const usedColors = this.topCategories(true).map(c => c.color);
        rec = {
          id: U.uid(), name, parentId,
          color: input.color || PALETTE.find(p => !usedColors.includes(p)) || PALETTE[this.categories.length % PALETTE.length],
          icon: input.icon || (parentId ? '' : '🏷️'),
          archived: false, archivedAt: null, createdAt: now, updatedAt: now
        };
      }
      await App.storage.put('categories', rec);
      upsert(this.categories, rec); this.reindex();
      this.emit('categories');
      return rec;
    },

    /*
     * Delete a category or subcategory.
     *   options.moveTo = { categoryId, subcategoryId }  -> move affected expenses first, then delete permanently
     *   no moveTo and expenses exist                     -> archive (soft delete, history preserved)
     *   no expenses at all                               -> delete permanently
     */
    async deleteCategory(id, options) {
      const c = this.cat(id);
      if (!c) throw new Error('Category not found.');
      const ids = [id].concat(c.parentId ? [] : this.categories.filter(s => s.parentId === id).map(s => s.id));
      const affected = this.expenses.filter(e => ids.includes(e.categoryId) || ids.includes(e.subcategoryId));
      const now = new Date().toISOString();

      if (options && options.moveTo) {
        const tgt = options.moveTo;
        this.validateCategoryPair(tgt.categoryId, tgt.subcategoryId || null, true);
        if (ids.includes(tgt.categoryId) || ids.includes(tgt.subcategoryId)) throw new Error('Choose a different target category.');
        const moved = affected.map(e => Object.assign({}, e, { categoryId: tgt.categoryId, subcategoryId: tgt.subcategoryId || null, updatedAt: now }));
        // Subcategory being deleted, moving to its own parent with no sub = keep category
        await App.storage.putMany('expenses', moved);
        moved.forEach(m => upsert(this.expenses, m));
        await App.storage.removeMany('categories', ids);
        this.categories = this.categories.filter(x => !ids.includes(x.id));
        this.reindex(); this.emit('categories');
        return { mode: 'moved', count: moved.length };
      }

      if (affected.length) {
        // Archive only the items that are actually referenced; delete unused subcategories.
        const used = new Set(); affected.forEach(e => { used.add(e.categoryId); if (e.subcategoryId) used.add(e.subcategoryId); });
        const toArchive = ids.filter(x => used.has(x) || x === id).map(x => Object.assign({}, this.cat(x), { archived: true, archivedAt: now, updatedAt: now }));
        const toDelete = ids.filter(x => !used.has(x) && x !== id);
        await App.storage.putMany('categories', toArchive);
        if (toDelete.length) await App.storage.removeMany('categories', toDelete);
        toArchive.forEach(r => upsert(this.categories, r));
        this.categories = this.categories.filter(x => !toDelete.includes(x.id));
        this.reindex(); this.emit('categories');
        return { mode: 'archived', count: affected.length };
      }

      await App.storage.removeMany('categories', ids);
      this.categories = this.categories.filter(x => !ids.includes(x.id));
      this.reindex(); this.emit('categories');
      return { mode: 'deleted', count: 0 };
    },

    async restoreCategory(id) {
      const c = this.cat(id);
      if (!c) return;
      const now = new Date().toISOString();
      const recs = [Object.assign({}, c, { archived: false, archivedAt: null, updatedAt: now })];
      const p = c.parentId && this.cat(c.parentId);
      if (p && p.archived) recs.push(Object.assign({}, p, { archived: false, archivedAt: null, updatedAt: now }));
      for (const r of recs) {
        const clash = this.categories.find(x => (x.parentId || null) === (r.parentId || null) && !x.archived && x.id !== r.id && U.norm(x.name) === U.norm(r.name));
        if (clash) throw new Error('An active category named "' + clash.name + '" already exists. Rename it first.');
      }
      await App.storage.putMany('categories', recs);
      recs.forEach(r => upsert(this.categories, r)); this.reindex();
      this.emit('categories');
    },

    validateCategoryPair(categoryId, subcategoryId, requireActive) {
      const c = this.cat(categoryId);
      if (!c || c.parentId) throw new Error('Please choose a category.');
      if (requireActive && c.archived) throw new Error('This category was deleted. Choose another one.');
      if (subcategoryId) {
        const s = this.cat(subcategoryId);
        if (!s || s.parentId !== categoryId) throw new Error('Subcategory does not belong to the selected category.');
        if (requireActive && s.archived) throw new Error('This subcategory was deleted. Choose another one.');
      }
    },

    async seedDefaultCategories() {
      const now = new Date().toISOString();
      const recs = [];
      DEFAULT_CATEGORIES.forEach(([name, icon, subs], i) => {
        const id = U.uid();
        recs.push({ id, name, parentId: null, color: PALETTE[i], icon, archived: false, archivedAt: null, createdAt: now, updatedAt: now });
        subs.forEach(s => recs.push({ id: U.uid(), name: s, parentId: id, color: PALETTE[i], icon: '', archived: false, archivedAt: null, createdAt: now, updatedAt: now }));
      });
      await App.storage.putMany('categories', recs);
      this.categories = this.categories.concat(recs); this.reindex();
    },

    /* ================= Expenses ================= */

    expense(id) { return this.expenses.find(e => e.id === id) || null; },

    // Validates and normalises raw form input. Throws Error with a user-friendly message.
    validateExpense(input, existing) {
      const title = String(input.title || '').trim();
      if (!title) throw new Error('Title is required.');
      if (title.length > 120) throw new Error('Title is too long (max 120 characters).');
      let amountMinor = input.amountMinor;
      if (amountMinor == null) {
        const p = U.parseAmount(input.amount);
        if (!p.ok) throw new Error(p.error);
        amountMinor = p.value;
      }
      if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) throw new Error('Amount must be greater than zero.');
      if (!U.isValidDateStr(input.date)) throw new Error('Please choose a valid date.');
      const categoryId = input.categoryId || null;
      const subcategoryId = input.subcategoryId || null;
      // Existing expenses may keep an archived category they already had; new choices must be active.
      const unchangedCats = existing && existing.categoryId === categoryId && (existing.subcategoryId || null) === subcategoryId;
      this.validateCategoryPair(categoryId, subcategoryId, !unchangedCats);
      const paymentMethod = PAYMENT_METHODS.includes(input.paymentMethod) ? input.paymentMethod : 'Other';
      const notes = String(input.notes || '').trim().slice(0, 1000);
      return { title, amountMinor, date: input.date, categoryId, subcategoryId, paymentMethod, notes };
    },

    async addExpense(input) {
      const clean = this.validateExpense(input);
      const now = new Date().toISOString();
      const rec = Object.assign({ id: U.uid() }, clean, { createdAt: now, updatedAt: now });
      await App.storage.put('expenses', rec);
      this.expenses.push(rec);
      this.emit('expenses');
      return rec;
    },

    async updateExpense(id, input) {
      const old = this.expense(id);
      if (!old) throw new Error('Expense not found. It may have been deleted.');
      const clean = this.validateExpense(input, old);
      const rec = Object.assign({}, old, clean, { updatedAt: new Date().toISOString() });
      await App.storage.put('expenses', rec);
      upsert(this.expenses, rec);
      this.emit('expenses');
      return rec;
    },

    async deleteExpenses(ids) {
      if (!ids.length) return;
      await App.storage.removeMany('expenses', ids);
      const set = new Set(ids);
      this.expenses = this.expenses.filter(e => !set.has(e.id));
      this.emit('expenses');
    },

    // Bulk move selected expenses to another category/subcategory.
    async recategorize(ids, categoryId, subcategoryId) {
      this.validateCategoryPair(categoryId, subcategoryId || null, true);
      const now = new Date().toISOString();
      const recs = ids.map(id => this.expense(id)).filter(Boolean)
        .map(e => Object.assign({}, e, { categoryId, subcategoryId: subcategoryId || null, updatedAt: now }));
      await App.storage.putMany('expenses', recs);
      recs.forEach(r => upsert(this.expenses, r));
      this.emit('expenses');
    },

    /* ================= Settings ================= */

    async saveSettings(patch) {
      this.settings = Object.assign({}, this.settings, patch, { id: 'app' });
      await App.storage.put('settings', this.settings);
      this.emit('settings');
    },

    /* ================= Backup / Restore ================= */

    backupObject() {
      return {
        app: 'expense-manager', schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(),
        stores: { expenses: this.expenses, categories: this.categories, settings: [this.settings] }
      };
    },

    async restoreBackup(obj) {
      if (!obj || obj.app !== 'expense-manager' || !obj.stores) throw new Error('This file is not an Expense Manager backup.');
      const cats = obj.stores.categories || [], exps = obj.stores.expenses || [];
      if (!Array.isArray(cats) || !Array.isArray(exps)) throw new Error('Backup file is damaged.');
      const catIds = new Set(cats.map(c => c.id));
      for (const c of cats) if (!c.id || !c.name) throw new Error('Backup contains an invalid category.');
      for (const e of exps) {
        if (!e.id || !Number.isSafeInteger(e.amountMinor) || !U.isValidDateStr(e.date) || !catIds.has(e.categoryId))
          throw new Error('Backup contains an invalid expense (id ' + (e.id || '?') + ').');
      }
      const settings = [Object.assign({}, DEFAULT_SETTINGS, (obj.stores.settings || [])[0] || {}, { id: 'app' })];
      await App.storage.replaceAll({ stores: { expenses: exps, categories: cats, settings } });
      this.expenses = exps; this.categories = cats; this.settings = settings[0];
      this.reindex();
      this.emit('restore');
      return { expenses: exps.length, categories: cats.length };
    },

    async clearAll() {
      await App.storage.replaceAll({ stores: { expenses: [], categories: [], settings: [this.settings] } });
      this.expenses = []; this.categories = []; this.reindex();
      await this.seedDefaultCategories();
      this.emit('restore');
    },

    /* ================= Import (CSV / Excel rows) ================= */

    /*
     * rows: array of objects keyed by column header. Recognised headers (case-insensitive):
     *   Date, Title (or Description), Amount, Category, Subcategory, Payment Method, Notes
     * Missing categories/subcategories are created automatically.
     */
    async importRows(rows) {
      const pick = (row, names) => {
        for (const k of Object.keys(row)) if (names.includes(U.norm(k).replace(/[\s_]+/g, ''))) return row[k];
        return '';
      };
      const result = { added: 0, skipped: 0, errors: [], createdCategories: 0 };
      const newCats = [], newExps = [];
      const now = new Date().toISOString();
      const findOrMake = (name, parentId) => {
        name = String(name || '').trim();
        if (!name) return null;
        let c = this.categories.concat(newCats).find(x => (x.parentId || null) === parentId && !x.archived && U.norm(x.name) === U.norm(name));
        if (!c) {
          const used = this.topCategories(true).concat(newCats.filter(x => !x.parentId)).map(x => x.color);
          const parent = parentId && (this.cat(parentId) || newCats.find(x => x.id === parentId));
          c = { id: U.uid(), name: name.slice(0, 60), parentId, color: parent ? parent.color : (PALETTE.find(p => !used.includes(p)) || PALETTE[newCats.length % PALETTE.length]),
            icon: parentId ? '' : '🏷️', archived: false, archivedAt: null, createdAt: now, updatedAt: now };
          newCats.push(c);
        }
        return c;
      };

      rows.forEach((row, i) => {
        const line = i + 2; // +1 header, +1 human counting
        try {
          const date = normaliseImportDate(pick(row, ['date', 'expensedate']));
          if (!date) throw new Error('invalid or missing date');
          const title = String(pick(row, ['title', 'description', 'expense', 'name']) || '').trim();
          const amountRaw = pick(row, ['amount', 'sum', 'value', 'cost']);
          const parsed = typeof amountRaw === 'number' ? U.parseAmount(amountRaw.toFixed(2)) : U.parseAmount(amountRaw);
          if (!parsed.ok) throw new Error(parsed.error.toLowerCase());
          const catName = pick(row, ['category']);
          if (!String(catName || '').trim()) throw new Error('missing category');
          const cat = findOrMake(catName, null);
          const sub = findOrMake(pick(row, ['subcategory', 'sub-category', 'sub']), cat.id);
          const pm = String(pick(row, ['paymentmethod', 'payment', 'method']) || '').trim();
          const paymentMethod = PAYMENT_METHODS.find(p => U.norm(p) === U.norm(pm)) || (pm ? 'Other' : 'Cash');
          newExps.push({
            id: U.uid(), title: (title || cat.name).slice(0, 120), amountMinor: parsed.value, date,
            categoryId: cat.id, subcategoryId: sub ? sub.id : null, paymentMethod,
            notes: String(pick(row, ['notes', 'note', 'comment']) || '').trim().slice(0, 1000),
            createdAt: now, updatedAt: now
          });
        } catch (e) {
          result.skipped++;
          if (result.errors.length < 20) result.errors.push('Row ' + line + ': ' + e.message);
        }
      });

      if (newCats.length) await App.storage.putMany('categories', newCats);
      if (newExps.length) await App.storage.putMany('expenses', newExps);
      this.categories = this.categories.concat(newCats); this.reindex();
      this.expenses = this.expenses.concat(newExps);
      result.added = newExps.length; result.createdCategories = newCats.length;
      this.emit('import');
      return result;
    },

    /* ================= Sample data (for trying the app) ================= */

    async addSampleData() {
      const pickSub = name => this.categories.find(c => c.parentId && !c.archived && c.name === name);
      const samples = [
        ['Groceries', 'Supermarket', 25, 70], ['Restaurants', 'Dinner out', 20, 60], ['Coffee', 'Coffee', 3, 7],
        ['Delivery', 'Food delivery', 12, 30], ['Fuel', 'Fuel', 30, 60], ['Taxi', 'Taxi ride', 4, 15],
        ['Public Transport', 'Metro card top-up', 5, 10], ['Electricity', 'Electricity bill', 25, 45],
        ['Internet', 'Internet subscription', 30, 30], ['Clothes', 'Clothes', 40, 120], ['Electronics', 'Gadget', 50, 300]
      ].map(([sub, title, min, max]) => ({ sub: pickSub(sub), title, min, max })).filter(s => s.sub);
      if (!samples.length) throw new Error('Sample data needs the default subcategories (e.g. Groceries, Fuel).');
      const rent = pickSub('Rent');
      const now = new Date().toISOString();
      const recs = [];
      const today = U.today();
      let seed = 42; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      for (let d = 0; d < 120; d++) {
        const date = U.addDays(today, -d);
        const n = Math.floor(rnd() * 3);
        for (let k = 0; k < n; k++) {
          const s = samples[Math.floor(rnd() * samples.length)];
          const amount = Math.round((s.min + rnd() * (s.max - s.min)) * 100);
          recs.push({ id: U.uid(), title: s.title, amountMinor: amount, date, categoryId: s.sub.parentId, subcategoryId: s.sub.id,
            paymentMethod: PAYMENT_METHODS[Math.floor(rnd() * 3)], notes: 'Sample data', createdAt: now, updatedAt: now });
        }
        if (rent && date.endsWith('-01')) recs.push({ id: U.uid(), title: 'Monthly rent', amountMinor: 50000, date, categoryId: rent.parentId,
          subcategoryId: rent.id, paymentMethod: 'Bank Transfer', notes: 'Sample data', createdAt: now, updatedAt: now });
      }
      await App.storage.putMany('expenses', recs);
      this.expenses = this.expenses.concat(recs);
      this.emit('import');
      return recs.length;
    },

    async removeSampleData() {
      const ids = this.expenses.filter(e => e.notes === 'Sample data').map(e => e.id);
      await this.deleteExpenses(ids);
      return ids.length;
    }
  };

  function byName(a, b) { return a.name.localeCompare(b.name); }
  function upsert(list, rec) { const i = list.findIndex(x => x.id === rec.id); if (i >= 0) list[i] = rec; else list.push(rec); }

  // Accepts YYYY-MM-DD, DD.MM.YYYY, DD/MM/YYYY, Excel date serials and JS Dates.
  function normaliseImportDate(v) {
    if (v instanceof Date && !isNaN(v)) return U.toDateStr(v);
    if (typeof v === 'number' && v > 20000 && v < 80000) { // Excel serial date
      const d = new Date(Math.round((v - 25569) * 86400000));
      return U.toDateStr(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    }
    const s = String(v || '').trim();
    let m;
    if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return check(m[1], m[2], m[3]);
    if ((m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/))) return check(m[3], m[2], m[1]);
    return null;
    function check(y, mo, d) { const r = y + '-' + String(mo).padStart(2, '0') + '-' + String(d).padStart(2, '0'); return U.isValidDateStr(r) ? r : null; }
  }

  App.data = D;
})();
