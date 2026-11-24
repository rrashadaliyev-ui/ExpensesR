/*
 * APP SHELL: routing, theme, navigation, automatic re-render after every data change.
 * To add a new page: create js/views/<name>.js registering App.views.<name> = { title, render(root) },
 * add a <script> tag in index.html and a nav link with href="#/<name>".
 */
(function () {
  'use strict';
  const UI = App.ui;
  const ROUTES = ['dashboard', 'expenses', 'budget', 'debts', 'breakdown', 'reports', 'categories', 'settings'];
  let current = null;

  function route() {
    const name = (location.hash.replace(/^#\/?/, '') || 'dashboard').split('?')[0];
    return ROUTES.includes(name) ? name : 'dashboard';
  }

  function render() {
    const name = route();
    const view = App.views[name];
    const root = document.getElementById('view');
    const sameView = current === name;
    const y = window.scrollY;
    current = name;
    UI.$$('.nav a, .tabbar a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#/' + name));
    const more = document.querySelector('.tabbar [data-more]');
    if (more) more.classList.toggle('on', !['dashboard', 'expenses', 'budget'].includes(name));
    const t = App.i18n.t;
    document.title = t(view.title) + ' · ' + t('Expense Manager');
    try { view.render(root); }
    catch (e) { console.error(e); root.innerHTML = '<div class="card"><h2>Something went wrong</h2><pre>' + App.U.esc(e.stack || e.message) + '</pre></div>'; }
    if (sameView) window.scrollTo(0, y); else window.scrollTo(0, 0);
    document.body.classList.remove('nav-open');
  }

  function applyTheme() {
    const t = App.data.settings.theme || 'system';
    const dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    const btn = document.getElementById('theme-toggle');
    if (btn) { btn.textContent = dark ? '☀️' : '🌙'; btn.title = dark ? 'Switch to light mode' : 'Switch to dark mode'; }
  }

  // Cloud mode: show a Google sign-in screen until the user is signed in.
  async function ensureSignedIn() {
    const S = App.storage;
    if (!S.requiresAuth) return true;
    const view = document.getElementById('view');
    try { await S.prepare(); }
    catch (e) { view.innerHTML = '<div class="card"><h2>Could not connect to the cloud</h2><p>' + App.U.esc(e.message) + '</p><button class="btn primary" onclick="location.reload()">Try again</button></div>'; return false; }
    if (S.user) return true;
    document.body.classList.add('signed-out');
    view.innerHTML = '<div class="login card"><div class="logo big">₼</div><h1>Expense Manager</h1>' +
      '<p class="muted">Sign in with your Google account. Your expenses are saved in your account and synced across your phone and computer.</p>' +
      '<button class="btn primary google-btn" data-signin>Sign in with Google</button>' +
      '<div class="lang-switch center-row"><button class="chip" data-lang="en">English</button><button class="chip" data-lang="az">Azərbaycan</button></div>' +
      '<div class="form-error" hidden>' + App.U.esc(S.lastError || '') + '</div></div>';
    const err = view.querySelector('.form-error');
    if (S.lastError) err.hidden = false;
    view.querySelector('[data-signin]').addEventListener('click', async () => {
      err.hidden = true;
      try { await S.signIn(); if (S.user) location.reload(); }
      catch (e) { err.textContent = e.message; err.hidden = false; }
    });
    return false;
  }

  // Language buttons (sidebar + sign-in screen). Delegated so buttons added later also work.
  function wireLanguage() {
    document.addEventListener('click', e => {
      const b = e.target.closest && e.target.closest('[data-lang]');
      if (b && b.dataset.lang !== App.i18n.lang) App.i18n.set(b.dataset.lang);
    });
    const mark = () => UI.$$('[data-lang]').forEach(b => b.classList.toggle('on', b.dataset.lang === App.i18n.lang));
    mark(); new MutationObserver(mark).observe(document.body, { childList: true, subtree: true });
  }

  // Offline support + "Add to Home Screen" (only on https or localhost).
  function registerServiceWorker() {
    if (!('serviceWorker' in navigator) || !(location.protocol === 'https:' || location.hostname === 'localhost')) return;
    navigator.serviceWorker.register('sw.js').catch(() => { /* app works without it */ });
  }

  async function start() {
    registerServiceWorker();
    wireLanguage();
    if (!(await ensureSignedIn())) return;
    try {
      await App.data.load();
    } catch (e) {
      document.getElementById('view').innerHTML = '<div class="card"><h2>Could not open the database</h2><p>' + App.U.esc(e.message) +
        '</p><p class="muted">Private/incognito windows and some browser settings block storage. Open this app in a normal Chrome, Edge or Firefox window.</p></div>';
      return;
    }
    // Use the language saved in settings (e.g. chosen on another device) if this device has no choice yet.
    const savedLang = App.data.settings.lang;
    if (savedLang && !App.i18n.hasLocal && savedLang !== App.i18n.lang) { App.i18n.set(savedLang); return; }
    // Ask the browser not to evict our data under storage pressure.
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

    applyTheme();
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { applyTheme(); render(); });
    App.data.on(reason => { if (reason === 'settings' || reason === 'restore') applyTheme(); render(); });
    window.addEventListener('hashchange', render);
    window.addEventListener('storage-error', e => UI.toast(e.detail, 'err'));
    // Cloud mode: pick up changes made on other devices when the app comes back to the foreground.
    if (App.storage.requiresAuth) {
      const sync = () => { if (document.visibilityState === 'visible' && !document.querySelector('.modal-backdrop')) App.data.reload().catch(() => {}); };
      document.addEventListener('visibilitychange', sync);
      setInterval(sync, 60000);
    }

    document.getElementById('theme-toggle').addEventListener('click', () => {
      App.data.saveSettings({ theme: document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark' });
    });
    UI.$$('[data-global-add]').forEach(b => b.addEventListener('click', () => UI.expenseForm()));
    document.getElementById('menu-toggle').addEventListener('click', () => document.body.classList.toggle('nav-open'));
    document.querySelector('.tabbar [data-more]').addEventListener('click', () => document.body.classList.toggle('nav-open'));
    document.getElementById('nav-scrim').addEventListener('click', () => document.body.classList.remove('nav-open'));
    // Keyboard shortcut: "n" adds an expense (when not typing in a field and no dialog is open).
    document.addEventListener('keydown', e => {
      if (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey && !/input|select|textarea/i.test(e.target.tagName) && !document.querySelector('.modal-backdrop')) {
        e.preventDefault(); UI.expenseForm();
      }
    });
    render();
  }

  document.addEventListener('DOMContentLoaded', start);
})();
