# Expense Manager

A personal expense tracker that runs in your browser. Nothing to install, and it works offline (charts and Excel need internet the first time the libraries load).

## How to open it

- **Simplest:** double-click `index.html` (Chrome, Edge or Firefox).
- **Optional local server:** right-click `serve.ps1` → *Run with PowerShell*, then open http://localhost:8765

> The browser stores data separately for each address. Data saved while using `index.html` directly is **not** visible at `http://localhost:8765`, and the reverse is also true. Pick one and stick with it, or move data with Backup / Restore.

## Where your data is stored

Data lives in the browser's built-in database (IndexedDB) on this computer, in the browser profile you use.

- Clearing browser data, or using another browser or PC, means the data won't be there.
- **Download a backup regularly:** *Settings & data → Download backup*. Save it in OneDrive or Google Drive.
- *Restore from backup* loads it on any browser or device.

## Features

| Page | What it does |
|---|---|
| Dashboard | Totals for all time, today, this week and this month; selected-period summary; most expensive category and subcategory; charts; recent transactions |
| Expenses | Table of all expenses with search, category, subcategory, payment and period filters, sorting, view/edit/delete, multi-select (bulk delete, bulk move, export) |
| Breakdown | The 3 calculation levels (total, category, subcategory), each with its **own** period filter, plus automatic verification that the totals add up |
| Reports | Daily, weekly, monthly, by-category, by-subcategory, trends and month-to-month comparison, highest spending periods. Export to CSV or Excel, Print / Save as PDF |
| Categories | Create, rename, recolour and delete categories and subcategories, with totals per period. Deleting a category that has expenses keeps the history ("archived") or moves the expenses first |
| Settings & data | Theme (light, dark or system), currency, week start, backup and restore, CSV/Excel import, export all data, sample data, delete all data |

Keyboard shortcut: press **N** anywhere to add an expense.

## Import format

The first row holds the headers: `Date, Title, Amount, Category, Subcategory, Payment Method, Notes`. *Settings → Download template* gives you an example file. Dates can be `2026-11-24`, `24.11.2026` or `24/11/2026`. Missing categories are created automatically.
