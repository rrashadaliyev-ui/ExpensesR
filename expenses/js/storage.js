/*
 * STORAGE LAYER
 * -------------
 * The ONLY file that knows where data physically lives.
 * Everything else in the app talks to `App.storage` through this interface:
 *
 *   init()                       -> Promise<void>
 *   getAll(store)                -> Promise<Array<object>>
 *   put(store, record)           -> Promise<object>      (insert or update by record.id)
 *   putMany(store, records)      -> Promise<void>
 *   remove(store, id)            -> Promise<void>
 *   removeMany(store, ids)       -> Promise<void>
 *   replaceAll(data)             -> Promise<void>        ({ stores: { name: [records] } } - used by restore)
 *
 * Stores: "expenses", "categories", "settings".
 *
 * To move to another backend (Supabase, Firebase, a REST API, SQLite server...),
 * write another adapter with the same methods and change the line at the bottom
 * of this file. No screen or calculation code needs to change.
 */
(function () {
  'use strict';
  window.App = window.App || {};

  const DB_NAME = 'expense-manager';
  const DB_VERSION = 1;
  const STORES = ['expenses', 'categories', 'settings'];

  function promisify(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  class IndexedDBAdapter {
    constructor() { this.db = null; this.name = 'Browser database (IndexedDB)'; }

    init() {
      return new Promise((resolve, reject) => {
        if (!window.indexedDB) { reject(new Error('This browser does not support IndexedDB.')); return; }
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
          const db = req.result;
          // Version 1 schema. Future versions: add `if (e.oldVersion < 2) {...}` blocks here.
          if (e.oldVersion < 1) {
            const ex = db.createObjectStore('expenses', { keyPath: 'id' });
            ex.createIndex('date', 'date');
            ex.createIndex('categoryId', 'categoryId');
            const cat = db.createObjectStore('categories', { keyPath: 'id' });
            cat.createIndex('parentId', 'parentId');
            db.createObjectStore('settings', { keyPath: 'id' });
          }
        };
        req.onsuccess = () => {
          this.db = req.result;
          // Another tab upgraded the DB: close so it can proceed.
          this.db.onversionchange = () => { this.db.close(); location.reload(); };
          resolve();
        };
        req.onerror = () => reject(req.error);
        req.onblocked = () => reject(new Error('Database is blocked by another open tab. Close other tabs of this app.'));
      });
    }

    tx(stores, mode) { return this.db.transaction(stores, mode); }

    done(tx) {
      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
      });
    }

    getAll(store) { return promisify(this.tx([store], 'readonly').objectStore(store).getAll()); }

    async put(store, record) {
      const t = this.tx([store], 'readwrite');
      t.objectStore(store).put(record);
      await this.done(t);
      return record;
    }

    async putMany(store, records) {
      const t = this.tx([store], 'readwrite');
      const os = t.objectStore(store);
      records.forEach(r => os.put(r));
      await this.done(t);
    }

    async remove(store, id) {
      const t = this.tx([store], 'readwrite');
      t.objectStore(store).delete(id);
      await this.done(t);
    }

    async removeMany(store, ids) {
      const t = this.tx([store], 'readwrite');
      const os = t.objectStore(store);
      ids.forEach(id => os.delete(id));
      await this.done(t);
    }

    // Atomic: either every store is replaced or nothing changes.
    async replaceAll(data) {
      const t = this.tx(STORES, 'readwrite');
      STORES.forEach(name => {
        const os = t.objectStore(name);
        os.clear();
        ((data.stores && data.stores[name]) || []).forEach(r => os.put(r));
      });
      await this.done(t);
    }
  }

  // ---- Change this line to switch backend ----
  App.storage = new IndexedDBAdapter();
  App.STORES = STORES;
})();
