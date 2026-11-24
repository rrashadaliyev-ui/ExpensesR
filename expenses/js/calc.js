/*
 * CALCULATIONS
 * ------------
 * Pure functions: given expenses + a filter, produce totals. No side effects, no DOM.
 *
 * Three levels, each expense counted exactly once per level (no double counting):
 *   Level 1  total           = sum of all filtered expenses
 *   Level 2  category total  = sum of expenses whose categoryId is that category
 *                            = (sum of its subcategory totals) + (direct expenses with no subcategory)
 *   Level 3  subcategory     = sum of expenses whose subcategoryId is that subcategory
 */
(function () {
  'use strict';
  const U = App.U;
  const C = {};

  /* ---------- Periods ----------
   * period = { type: 'day'|'week'|'month'|'year'|'custom'|'all', anchor: 'YYYY-MM-DD', from, to }
   */
  C.PERIOD_TYPES = [
    ['day', 'Daily'], ['week', 'Weekly'], ['month', 'Monthly'], ['year', 'Yearly'], ['custom', 'Custom range'], ['all', 'All time']
  ];

  C.defaultPeriod = (type) => ({ type: type || 'month', anchor: U.today(), from: U.startOfMonth(U.today()), to: U.today() });

  C.range = function (p) {
    const ws = App.data.settings.weekStart;
    const a = p.anchor || U.today();
    switch (p.type) {
      case 'day': return { from: a, to: a };
      case 'week': { const f = U.startOfWeek(a, ws); return { from: f, to: U.addDays(f, 6) }; }
      case 'month': return { from: U.startOfMonth(a), to: U.endOfMonth(a) };
      case 'year': return { from: U.startOfYear(a), to: U.endOfYear(a) };
      case 'custom': {
        let f = p.from || U.today(), t = p.to || U.today();
        if (f > t) [f, t] = [t, f];
        return { from: f, to: t };
      }
      default: return { from: null, to: null };
    }
  };

  C.label = function (p) {
    const r = C.range(p), t = U.today();
    switch (p.type) {
      case 'day': return r.from === t ? 'Today, ' + U.fmtDate(r.from) : (r.from === U.addDays(t, -1) ? 'Yesterday, ' + U.fmtDate(r.from) : U.fmtDate(r.from, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }));
      case 'week': return (C.range({ type: 'week', anchor: t }).from === r.from ? 'This week: ' : '') + U.fmtDate(r.from, { day: 'numeric', month: 'short' }) + ' – ' + U.fmtDate(r.to);
      case 'month': return (r.from === U.startOfMonth(t) ? 'This month: ' : '') + U.monthName(r.from);
      case 'year': return (r.from === U.startOfYear(t) ? 'This year: ' : '') + r.from.slice(0, 4);
      case 'custom': return U.fmtDate(r.from) + ' – ' + U.fmtDate(r.to);
      default: return 'All time';
    }
  };

  C.shift = function (p, dir) {
    const a = p.anchor || U.today();
    const n = Object.assign({}, p);
    switch (p.type) {
      case 'day': n.anchor = U.addDays(a, dir); break;
      case 'week': n.anchor = U.addDays(a, 7 * dir); break;
      case 'month': n.anchor = U.addMonths(U.startOfMonth(a), dir); break;
      case 'year': n.anchor = U.addMonths(U.startOfYear(a), 12 * dir); break;
      case 'custom': {
        const r = C.range(p), len = U.daysBetween(r.from, r.to) + 1;
        n.from = U.addDays(r.from, len * dir); n.to = U.addDays(r.to, len * dir); break;
      }
    }
    return n;
  };

  // The equivalent previous period (for "vs last period" comparisons).
  C.previous = p => (p.type === 'all' ? null : C.shift(p, -1));

  /* ---------- Filtering ----------
   * f = { from, to, categoryId, subcategoryId, paymentMethod, search }
   * subcategoryId may be '__direct' = only expenses in the category with no subcategory.
   */
  C.filter = function (expenses, f) {
    const q = U.norm(f.search);
    return expenses.filter(e => {
      if (f.from && e.date < f.from) return false;
      if (f.to && e.date > f.to) return false;
      if (f.categoryId && e.categoryId !== f.categoryId) return false;
      if (f.subcategoryId === '__direct') { if (e.subcategoryId) return false; }
      else if (f.subcategoryId && e.subcategoryId !== f.subcategoryId) return false;
      if (f.paymentMethod && e.paymentMethod !== f.paymentMethod) return false;
      if (q && !(U.norm(e.title).includes(q) || U.norm(e.notes).includes(q))) return false;
      return true;
    });
  };

  C.sum = list => list.reduce((s, e) => s + e.amountMinor, 0);

  /* ---------- Level 2 + 3 breakdown ----------
   * Returns categories sorted by total desc:
   * [{ id, name, color, icon, archived, total, count, pct,
   *    direct: { total, count },
   *    subs: [{ id, name, color, archived, total, count, pct (of grand total), pctOfCat }] }]
   */
  C.breakdown = function (list) {
    const D = App.data;
    const grand = C.sum(list);
    const cats = new Map();
    list.forEach(e => {
      let c = cats.get(e.categoryId);
      if (!c) {
        const cat = D.cat(e.categoryId);
        c = { id: e.categoryId, name: D.catName(e.categoryId), color: D.catColor(e.categoryId), icon: D.catIcon(e.categoryId),
          archived: !!(cat && cat.archived), total: 0, count: 0, direct: { total: 0, count: 0 }, subMap: new Map() };
        cats.set(e.categoryId, c);
      }
      c.total += e.amountMinor; c.count++;
      if (e.subcategoryId) {
        let s = c.subMap.get(e.subcategoryId);
        if (!s) {
          const sc = D.cat(e.subcategoryId);
          s = { id: e.subcategoryId, parentId: e.categoryId, name: D.catName(e.subcategoryId), archived: !!(sc && sc.archived), total: 0, count: 0 };
          c.subMap.set(e.subcategoryId, s);
        }
        s.total += e.amountMinor; s.count++;
      } else { c.direct.total += e.amountMinor; c.direct.count++; }
    });
    const out = Array.from(cats.values()).map(c => {
      const subs = Array.from(c.subMap.values()).sort((a, b) => b.total - a.total);
      subs.forEach((s, i) => { s.pct = U.pct(s.total, grand); s.pctOfCat = U.pct(s.total, c.total); s.color = U.shade(c.color, i, subs.length); });
      c.direct.pct = U.pct(c.direct.total, grand); c.direct.pctOfCat = U.pct(c.direct.total, c.total);
      delete c.subMap;
      return Object.assign(c, { subs, pct: U.pct(c.total, grand) });
    }).sort((a, b) => b.total - a.total);
    return out;
  };

  // Flat list of subcategories (plus "direct" buckets) across categories, sorted by total.
  C.subcategoryList = function (breakdown, includeDirect) {
    const rows = [];
    breakdown.forEach(c => {
      c.subs.forEach(s => rows.push(Object.assign({}, s, { parentName: c.name, parentColor: c.color, icon: c.icon })));
      if (includeDirect && c.direct.count) rows.push({ id: '__direct:' + c.id, parentId: c.id, name: c.name + ' (no subcategory)', parentName: c.name,
        color: c.color, parentColor: c.color, icon: c.icon, total: c.direct.total, count: c.direct.count, pct: c.direct.pct, pctOfCat: c.direct.pctOfCat, isDirect: true });
    });
    return rows.sort((a, b) => b.total - a.total);
  };

  // Integrity check: proves totals add up. Returns array of problems (empty = OK).
  C.verify = function (list, breakdown) {
    const problems = [];
    const grand = C.sum(list);
    const catSum = breakdown.reduce((s, c) => s + c.total, 0);
    if (catSum !== grand) problems.push('Category totals ' + catSum + ' != grand total ' + grand);
    breakdown.forEach(c => {
      const parts = c.subs.reduce((s, x) => s + x.total, 0) + c.direct.total;
      if (parts !== c.total) problems.push(c.name + ': subcategories + direct (' + parts + ') != category total (' + c.total + ')');
    });
    return problems;
  };

  /* ---------- Time series ----------
   * unit: 'day' | 'week' | 'month' | 'year'. Produces continuous buckets (zero-filled).
   */
  C.bucketKey = function (dateStr, unit) {
    switch (unit) {
      case 'day': return dateStr;
      case 'week': return U.startOfWeek(dateStr, App.data.settings.weekStart);
      case 'month': return dateStr.slice(0, 7);
      default: return dateStr.slice(0, 4);
    }
  };

  C.bucketLabel = function (key, unit) {
    switch (unit) {
      case 'day': return U.fmtDate(key, { day: 'numeric', month: 'short' });
      case 'week': return 'Wk of ' + U.fmtDate(key, { day: 'numeric', month: 'short' });
      case 'month': return U.parseDate(key + '-01').toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
      default: return key;
    }
  };

  C.series = function (list, unit, from, to) {
    if (!from || !to) {
      if (!list.length) return [];
      const dates = list.map(e => e.date).sort();
      from = from || dates[0]; to = to || dates[dates.length - 1];
    }
    // Guard against huge daily ranges (e.g. "all time" by day): cap at 3660 buckets.
    const map = new Map();
    let cursor = C.bucketKey(from, unit), guard = 0;
    const endKey = C.bucketKey(to, unit);
    const next = k => unit === 'day' ? U.addDays(k, 1) : unit === 'week' ? U.addDays(k, 7)
      : unit === 'month' ? U.addMonths(k + '-01', 1).slice(0, 7) : String(Number(k) + 1);
    while (cursor <= endKey && guard++ < 3660) { map.set(cursor, { key: cursor, label: C.bucketLabel(cursor, unit), total: 0, count: 0 }); cursor = next(cursor); }
    list.forEach(e => { const b = map.get(C.bucketKey(e.date, unit)); if (b) { b.total += e.amountMinor; b.count++; } });
    return Array.from(map.values());
  };

  // Pick a sensible chart granularity for a range.
  C.autoUnit = function (from, to, list) {
    if (!from || !to) {
      if (!list || !list.length) return 'month';
      const d = list.map(e => e.date).sort(); from = d[0]; to = d[d.length - 1];
    }
    const days = U.daysBetween(from, to) + 1;
    if (days <= 45) return 'day';
    if (days <= 200) return 'week';
    if (days <= 1100) return 'month';
    return 'year';
  };

  App.calc = C;
})();
