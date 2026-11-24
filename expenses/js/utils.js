/*
 * UTILITIES: ids, dates, money, html escaping.
 * Dates are always stored as local calendar strings "YYYY-MM-DD" (no time zone shifts).
 * Money is always stored as integer minor units (cents) to avoid floating point errors.
 */
(function () {
  'use strict';
  window.App = window.App || {};
  const U = {};

  U.uid = function () {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  };

  /* ---------- Dates ---------- */
  const pad = n => String(n).padStart(2, '0');
  U.toDateStr = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  U.parseDate = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  U.today = () => U.toDateStr(new Date());
  U.isValidDateStr = s => {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const d = U.parseDate(s);
    return U.toDateStr(d) === s;
  };
  U.addDays = (s, n) => { const d = U.parseDate(s); d.setDate(d.getDate() + n); return U.toDateStr(d); };
  U.addMonths = (s, n) => {
    const d = U.parseDate(s); const day = d.getDate();
    d.setDate(1); d.setMonth(d.getMonth() + n);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, last));
    return U.toDateStr(d);
  };
  U.startOfWeek = (s, weekStart) => {          // weekStart: 0 = Sunday, 1 = Monday
    const d = U.parseDate(s);
    const diff = (d.getDay() - weekStart + 7) % 7;
    d.setDate(d.getDate() - diff);
    return U.toDateStr(d);
  };
  U.startOfMonth = s => s.slice(0, 7) + '-01';
  U.endOfMonth = s => { const d = U.parseDate(s); return U.toDateStr(new Date(d.getFullYear(), d.getMonth() + 1, 0)); };
  U.startOfYear = s => s.slice(0, 4) + '-01-01';
  U.endOfYear = s => s.slice(0, 4) + '-12-31';
  U.daysBetween = (a, b) => Math.round((U.parseDate(b) - U.parseDate(a)) / 86400000);

  /*
   * Date display. English uses the browser's own formatting. Azerbaijani is formatted here by hand,
   * because many browsers ship without full Azerbaijani date data (they showed e.g. "2026 M11 1").
   * opts uses the same keys as toLocaleDateString: day, month ('short'|'long'), year ('numeric'|'2-digit'), weekday.
   */
  const AZ_MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];
  const AZ_MONTHS_SHORT = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek'];
  const AZ_DAYS = ['Bazar', 'Bazar ertəsi', 'Çərşənbə axşamı', 'Çərşənbə', 'Cümə axşamı', 'Cümə', 'Şənbə'];
  const AZ_DAYS_SHORT = ['B.', 'B.e.', 'Ç.a.', 'Ç.', 'C.a.', 'C.', 'Ş.'];
  const isAz = () => !!(App.i18n && App.i18n.lang === 'az');
  U.loc = () => undefined; // browser default locale for English formatting

  function fmtAz(d, o) {
    const parts = [];
    if (o.weekday) parts.push((o.weekday === 'long' ? AZ_DAYS : AZ_DAYS_SHORT)[d.getDay()] + ',');
    if (o.day) parts.push(String(d.getDate()));
    if (o.month) parts.push((o.month === 'long' ? AZ_MONTHS : AZ_MONTHS_SHORT)[d.getMonth()]);
    if (o.year) parts.push(o.year === '2-digit' ? "'" + String(d.getFullYear()).slice(2) : String(d.getFullYear()));
    return parts.join(' ');
  }
  U.fmtDate = (s, opts) => {
    if (!s) return '';
    const o = opts || { day: 'numeric', month: 'short', year: 'numeric' };
    const d = U.parseDate(s);
    return isAz() ? fmtAz(d, o) : d.toLocaleDateString(undefined, o);
  };
  U.fmtDateTime = iso => {
    if (!iso) return '';
    const d = new Date(iso);
    if (!isAz()) return d.toLocaleString();
    return fmtAz(d, { day: 1, month: 'long', year: 1 }) + ', ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  };
  U.monthName = s => U.fmtDate(s, { month: 'long', year: 'numeric' });

  /* ---------- Money ---------- */
  U.MAX_AMOUNT_MINOR = 100000000000; // 1,000,000,000.00

  // Parses user input like "12", "12.5", "1,234.56", "12,50". Returns { ok, value (minor units), error }.
  U.parseAmount = function (input) {
    let s = String(input == null ? '' : input).trim().replace(/\s/g, '');
    if (!s) return { ok: false, error: 'Amount is required.' };
    // Accept comma as decimal separator when there is no dot ("12,50").
    if (s.indexOf('.') === -1 && /,\d{1,2}$/.test(s)) s = s.replace(',', '.');
    s = s.replace(/,/g, '');
    if (!/^\d+(\.\d{0,2})?$/.test(s)) {
      if (/^-/.test(s)) return { ok: false, error: 'Amount must be greater than zero.' };
      if (/^\d+\.\d{3,}$/.test(s)) return { ok: false, error: 'Use at most 2 decimal places.' };
      return { ok: false, error: 'Enter a valid number, e.g. 12.50' };
    }
    const [whole, frac = ''] = s.split('.');
    const minor = Number(whole) * 100 + Number((frac + '00').slice(0, 2));
    if (!Number.isSafeInteger(minor)) return { ok: false, error: 'Amount is too large.' };
    if (minor <= 0) return { ok: false, error: 'Amount must be greater than zero.' };
    if (minor > U.MAX_AMOUNT_MINOR) return { ok: false, error: 'Amount is too large.' };
    return { ok: true, value: minor };
  };

  U.minorToInput = m => (m / 100).toFixed(2);
  U.minorToNumber = m => Math.round(m) / 100;

  const moneyFmts = {};
  const plain = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const SYMBOLS = { AZN: '₼', USD: '$', EUR: '€', GBP: '£', TRY: '₺', RUB: '₽' };
  U.CURRENCIES = ['AZN', 'USD', 'EUR', 'GBP', 'TRY', 'RUB', 'GEL', 'KZT', 'UAH', 'AED', 'SAR', 'INR', 'CNY', 'JPY', 'CAD', 'AUD', 'CHF'];
  U.mainCurrency = () => (App.data && App.data.settings && App.data.settings.currency) || 'AZN';

  // money(minor)       → amount in the MAIN currency (all totals, budgets, reports)
  // money(minor, 'USD') → amount in a specific currency (e.g. the original currency of a foreign expense)
  U.money = function (minor, currency) {
    const cur = currency || U.mainCurrency();
    const v = (minor || 0) / 100;
    if (isAz()) {
      // Azerbaijani style: 1 300,50 ₼  (space between thousands, comma for decimals, symbol after)
      const s = plain.format(Math.abs(v)).replace(/,/g, ' ').replace('.', ',');
      return (v < 0 ? '−' : '') + s + ' ' + (SYMBOLS[cur] || cur);
    }
    if (!moneyFmts[cur]) {
      try { moneyFmts[cur] = new Intl.NumberFormat(undefined, { style: 'currency', currency: cur }); }
      catch (e) { moneyFmts[cur] = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
    }
    return moneyFmts[cur].format(v);
  };

  /*
   * Exchange rates (free service open.er-api.com, no account needed; only currency codes are sent).
   * Returns how many `to` you get for 1 `from`, or null if offline / unavailable (the user can type it).
   */
  const rateCache = {};
  U.fetchRate = async function (from, to) {
    if (from === to) return 1;
    const key = from + '>' + to;
    if (rateCache[key] && Date.now() - rateCache[key].t < 3600000) return rateCache[key].v;
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/' + encodeURIComponent(from));
      const json = await res.json();
      const v = json && json.rates && json.rates[to];
      if (!v) return null;
      rateCache[key] = { v, t: Date.now() };
      return v;
    } catch (e) { return null; }
  };
  // Parses a rate typed by the user ("1.7", "1,7"). Returns a positive number or null.
  U.parseRate = s => { const v = Number(String(s == null ? '' : s).trim().replace(',', '.')); return isFinite(v) && v > 0 && v < 1e7 ? v : null; };
  U.fmtRate = v => String(Math.round(v * 1e6) / 1e6);
  U.pct = (part, whole) => whole ? (part / whole * 100) : 0;
  U.fmtPct = v => (Math.round(v * 10) / 10).toFixed(1) + '%';

  /* ---------- Misc ---------- */
  U.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  U.debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  U.norm = s => String(s || '').trim().toLowerCase();

  // Hex colour with alpha, for chart fills.
  U.alpha = (hex, a) => {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  };
  // Lighter/darker variants of a category colour for its subcategories.
  U.shade = (hex, i, count) => {
    const h = hex.replace('#', '');
    const n = parseInt(h, 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const t = count <= 1 ? 0 : (i / (count - 1)) * 0.6 - 0.25; // -0.25 (darker) .. +0.35 (lighter)
    const f = c => Math.round(t < 0 ? c * (1 + t) : c + (255 - c) * t);
    return '#' + [f(r), f(g), f(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  };

  App.U = U;
})();
