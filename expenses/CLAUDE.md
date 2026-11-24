# Expense Manager: notes for future development

A plain HTML/CSS/JS app with no build step and no framework. Classic `<script>` tags (not ES modules), so it also works when opened via `file://`. Everything hangs off a global `App` object. Script order in `index.html` matters.

## Architecture (layers, bottom → top)

| File | Responsibility |
|---|---|
| `js/utils.js` (`App.U`) | ids, date helpers (dates are local `"YYYY-MM-DD"` strings), money parsing/formatting |
| `js/storage.js` (`App.storage`) | **Only file that knows the backend.** IndexedDB adapter with `init/getAll/put/putMany/remove/removeMany/replaceAll`. To switch to Supabase, Firebase, a REST API, etc., write a new adapter with the same methods and change the last line |
| `js/firebase-config.js` + `js/storage-firebase.js` | Optional cloud mode. When `FIREBASE_CONFIG` is set, `App.storage` becomes a Firestore adapter (`users/{uid}/{store}/{id}`) with Google sign-in (`requiresAuth`, `prepare()`, `signIn()`, `signOut()`, `user`). `app.js` shows a sign-in screen and calls `App.data.reload()` when the tab regains focus. The user's setup steps are in `SETUP-CLOUD.md` |
| `js/data.js` (`App.data`) | In-memory state + business rules + validation. Every mutation: validate → `App.storage` → update memory → `emit(reason)` |
| `js/calc.js` (`App.calc`) | Pure functions: periods/ranges, `filter`, `sum`, `breakdown` (levels 2 and 3), `series`, `verify` |
| `js/ui.js` (`App.ui`) | Modal, confirm, toast, period picker, category selects, expense form, Chart.js wrappers, CSV/Excel helpers |
| `js/views/*.js` (`App.views.<name>`) | One page each: `{ title, render(root) }`. Views keep their filter state in a module-level `state` object |
| `js/app.js` | Hash router (`#/dashboard` …), theme, re-renders the current view on every data `emit` |

## Budget & languages

- **Budget & Savings** (`js/views/budget.js`, `App.data.budgetFor/setBudget`): budgets live in settings: `monthlyBudgets {"YYYY-MM": minor}` for one-month overrides, `defaultBudget` + `defaultBudgetFrom` for "every month from X". Saved per month = budget − spent. Total savings counts finished months only.
- **Languages** (`js/i18n.js`): the UI is written in English. In Azerbaijani mode a MutationObserver translates every on-screen text node and the placeholder/title/aria-label attributes, using the `AZ` dictionary (exact phrases) and `PATTERNS` (phrases with numbers). **When you add UI text, add its Azerbaijani translation to `AZ`.** Text drawn on charts (canvas) must go through `App.i18n.t()`. Azerbaijani dates and amounts are formatted by hand in `utils.js` (`fmtAz`, `money`), because browsers' Azerbaijani locale data is unreliable.

## Debts, favourites, phone app

- **Borrowed & Lent** (`js/views/debts.js`): a separate store `debts` (IndexedDB v2 / Firestore collection `debts`). Records are `{ id, type: 'lent'|'borrowed', person, amountMinor, date, dueDate, note, payments[] }`, and left = amount − sum(payments). Debts are **not** expenses and never affect expense totals.
- **Quick-add favourites**: `settings.favourites` (max 12). `App.data.quickAdd(id)` saves one as today's expense. Deleting expenses goes through `UI.deleteWithUndo` (a 6-second Undo that re-saves the same records).
- **Phone**: the bottom `.tabbar` shows at ≤860px. PWA: `manifest.json`, `icons/` (generated with PowerShell System.Drawing), and `sw.js` (network-first for app files, cache-first for the pinned CDN libraries). **Bump `CACHE` in sw.js only if you change the caching strategy**; normal updates show up without it.

- **Default categories** follow the language: `DEFAULT_NAMES_AZ` in `data.js`. `translateDefaultCategories(lang)` renames only names that are still exactly a default name. It runs when the language is switched, and on startup in Azerbaijani.
- **Dashboard panels** (budget, debts, quick add) can be hidden. They're stored in `settings.hiddenPanels` and toggled in Settings → Dashboard panels.

## Deployment

**Every release: bump the `?v=` value on all css/js links in `index.html`** (one value everywhere). GitHub Pages lets browsers cache files for 10 minutes; without the bump, phones mixed old and new files (a new page with old data code: it couldn't save debts and showed English).


The live site is GitHub Pages: repository `rrashadaliyev-ui/ExpensesR`, with the app in the **`expenses/` subfolder** (URL `https://rrashadaliyev-ui.github.io/ExpensesR/expenses/`). Firebase project `expenses-2a6dc`. To deploy, upload the changed files into `ExpensesR/expenses/` on GitHub.

## Data model (schema v1)

- **Category** `{ id, name, parentId|null, color, icon, archived, archivedAt, createdAt, updatedAt }`. A subcategory is a category with `parentId`. Only 2 levels.
- **Expense** `{ id, title, amountMinor, categoryId, subcategoryId|null, date, paymentMethod, notes, createdAt, updatedAt }`
- **Settings** `{ id:'app', currency, weekStart (0 Sun / 1 Mon), theme, schemaVersion, lastCategoryId, lastPaymentMethod }`

## Rules that must stay true

1. **Money is integer minor units** (`amountMinor`, cents). Never store floats. Convert only for display, charts and export.
2. Expenses reference categories **by id**, so renames never change history.
3. A category or subcategory with expenses is **never hard-deleted** unless its expenses are moved first. Otherwise it is archived: hidden from pickers but still shown in reports with a "(deleted)" label.
4. `expense.categoryId` is always the top-level parent, and `subcategoryId` must belong to it. Category total = sum of its subcategory totals + its direct expenses (`calc.verify` checks this).
5. `date` (when the money was spent) and `createdAt` (when it was entered) are separate fields.

## Adding things

- **New page:** create `js/views/foo.js` registering `App.views.foo`, add a `<script>` tag, add `'foo'` to `ROUTES` in `app.js` and a nav link.
- **New field on expenses:** add it to `validateExpense` in `data.js`, the form in `ui.js`, and the exports/import if relevant. Old records simply lack the field, so handle `undefined`.
- **Schema change needing migration:** bump `DB_VERSION` in `storage.js` and add an `if (e.oldVersion < N)` block. Bump `SCHEMA_VERSION` in `data.js` and make `restoreBackup` upgrade older backups.

## Testing

Run `serve.ps1` (http://localhost:8765, or the `expense-manager` entry in `.claude/launch.json`). The scenario checks were run in the browser console against `App.data` / `App.calc` on a cleared database: category CRUD, totals, filters, validation, edit/delete, archive/move on delete, backup round trip, CSV import. *Settings → Add sample data* creates ~120 days of data marked `notes: "Sample data"` (removable in one click).

External libraries come from cdnjs: Chart.js 4.4.1 and SheetJS xlsx 0.18.5. The app degrades gracefully without them.
