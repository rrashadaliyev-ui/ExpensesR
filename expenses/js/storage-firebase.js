/*
 * CLOUD STORAGE ADAPTER (Firebase Firestore + Google sign-in)
 * -----------------------------------------------------------
 * Same interface as the IndexedDB adapter in storage.js. Activated automatically
 * when js/firebase-config.js contains a config object.
 *
 * Data layout (each user can only read/write their own folder – see SETUP-CLOUD.md rules):
 *   users/{uid}/expenses/{id}
 *   users/{uid}/categories/{id}
 *   users/{uid}/settings/app
 *
 * Offline: Firestore keeps a local cache, so the app keeps working without internet
 * and uploads changes when the connection returns.
 */
(function () {
  'use strict';
  const SDK = '10.12.2';
  const SCRIPTS = ['app', 'auth', 'firestore'].map(n => 'https://www.gstatic.com/firebasejs/' + SDK + '/firebase-' + n + '-compat.js');
  const BATCH = 400; // Firestore allows max 500 writes per batch
  const ACK_WAIT = 2500; // ms to wait for the server before carrying on

  /*
   * Firestore applies a write to its local cache immediately, but the returned promise only
   * resolves when Google's server confirms it. On a slow or offline connection that can take
   * very long and the app looked frozen ("nothing happens when I tap Create").
   * So: wait briefly for the server, then continue; if the server later REJECTS the write,
   * show an error via the "storage-error" event (app.js turns it into a red message).
   */
  function confirmed(promise) {
    promise.catch(e => window.dispatchEvent(new CustomEvent('storage-error', { detail: friendly(e) })));
    // Offline: the change is already stored on this device and uploads later – don't wait at all.
    if (!navigator.onLine) return Promise.resolve();
    return Promise.race([promise, new Promise(r => setTimeout(r, ACK_WAIT))]);
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.onload = resolve;
      s.onerror = () => reject(new Error('Could not load the cloud library. Check your internet connection and reload.'));
      document.head.appendChild(s);
    });
  }

  class FirebaseAdapter {
    constructor(config) {
      this.config = config;
      this.name = 'Cloud – your Google account (Firebase)';
      this.requiresAuth = true;
      this.user = null;
      this.prepared = null;
    }

    // Loads the SDK and resolves once Firebase knows whether someone is signed in.
    prepare() {
      if (this.prepared) return this.prepared;
      this.prepared = (async () => {
        for (const src of SCRIPTS) await loadScript(src);
        firebase.initializeApp(this.config);
        this.auth = firebase.auth();
        this.db = firebase.firestore();
        this.db.settings({ ignoreUndefinedProperties: true, merge: true });
        try { await this.db.enablePersistence({ synchronizeTabs: true }); } catch (e) { /* private mode or other tab: works online-only */ }
        try { await this.auth.getRedirectResult(); } catch (e) { this.lastError = friendly(e); }
        this.user = await new Promise(resolve => { const off = this.auth.onAuthStateChanged(u => { off(); resolve(u); }); });
      })();
      return this.prepared;
    }

    async signIn() {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      try {
        const res = await this.auth.signInWithPopup(provider);
        this.user = res.user;
      } catch (e) {
        if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') {
          await this.auth.signInWithRedirect(provider); return;
        }
        if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') return;
        throw new Error(friendly(e));
      }
    }

    async signOut() { await this.auth.signOut(); this.user = null; }

    async init() {
      await this.prepare();
      if (!this.user) throw new Error('Not signed in.');
    }

    col(store) { return this.db.collection('users').doc(this.user.uid).collection(store); }

    async getAll(store) {
      const snap = await this.col(store).get();
      return snap.docs.map(d => d.data());
    }

    async put(store, record) { await confirmed(this.col(store).doc(record.id).set(record)); return record; }

    async putMany(store, records) {
      for (let i = 0; i < records.length; i += BATCH) {
        const b = this.db.batch();
        records.slice(i, i + BATCH).forEach(r => b.set(this.col(store).doc(r.id), r));
        await confirmed(b.commit());
      }
    }

    async remove(store, id) { await confirmed(this.col(store).doc(id).delete()); }

    async removeMany(store, ids) {
      for (let i = 0; i < ids.length; i += BATCH) {
        const b = this.db.batch();
        ids.slice(i, i + BATCH).forEach(id => b.delete(this.col(store).doc(id)));
        await confirmed(b.commit());
      }
    }

    // Used by Restore and "Delete all data". Firestore cannot do this in one transaction
    // for large data sets, so it deletes then writes in batches.
    async replaceAll(data) {
      for (const store of App.STORES) {
        const existing = (await this.col(store).get()).docs.map(d => d.id);
        await this.removeMany(store, existing);
        await this.putMany(store, (data.stores && data.stores[store]) || []);
      }
    }
  }

  function friendly(e) {
    const map = {
      'auth/unauthorized-domain': 'This web address is not allowed to sign in yet. In Firebase console → Authentication → Settings → Authorized domains, add this domain: ' + location.hostname,
      'auth/operation-not-allowed': 'Google sign-in is not enabled. In Firebase console → Authentication → Sign-in method, enable Google.',
      'auth/network-request-failed': 'No internet connection. Connect and try again.',
      'permission-denied': 'Google refused to save this change (permission denied). Sign out and sign in again; if it continues, check the Firestore security rules in SETUP-CLOUD.md.',
      'unavailable': 'Cannot reach Google right now. Your change is kept on this device and will upload when the connection is back.'
    };
    return map[e.code] || e.message || String(e);
  }

  App.FirebaseAdapter = FirebaseAdapter;
  if (window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.projectId) App.storage = new FirebaseAdapter(window.FIREBASE_CONFIG);
})();
