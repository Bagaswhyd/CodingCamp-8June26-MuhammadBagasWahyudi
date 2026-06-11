# Implementation Plan: Expense & Budget Visualizer

## Overview

Incrementally refactor the three static files (`index.html`, `css/style.css`, `js/app.js`) to satisfy all requirements. Work proceeds section-by-section in the order mandated by the 14-section `app.js` architecture. Chart.js is removed and replaced with a native Canvas API renderer. A separate `js/app.test.js` file covers all 17 correctness properties using fast-check, executed via `npx --yes vitest --run`.

---

## Tasks

- [x] 1. Update `index.html` structure
  - [x] 1.1 Add transaction-type select and transaction-date input to the form
    - Add `<select id="transaction-type">` with options `income` and `expense` inside the form, before the item-name group
    - Add `<input type="date" id="transaction-date">` form group after the amount group
    - Add inline `<span class="field-error">` placeholders (hidden by default) adjacent to every required form field for validation messages
    - _Requirements: 1.1, 1.3, 1.4_
  - [x] 1.2 Replace balance section and remove Chart.js script tag
    - Replace the single `#total-balance` paragraph with three labeled paragraphs: `<p id="total-income">`, `<p id="total-expenses">`, `<p id="net-balance">`
    - Add `<div id="error-container" class="error-notification" role="alert" aria-live="polite"></div>` just before the closing `</div>` of `.app-container`
    - Remove `<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>` from the bottom of `<body>`
    - _Requirements: 3.1, 3.3, 5.5, 2.5_

- [x] 2. Update `css/style.css`
  - [x] 2.1 Add new CSS custom properties and dark-theme overrides
    - Add `--income-color`, `--expense-color`, `--negative-color`, `--positive-color` to `:root` using the values from the design (`#16a34a` / `#dc2626`)
    - Mirror all four new properties in `[data-theme="dark"]` with the dark values (`#4ade80` / `#f87171`)
    - _Requirements: 2.8, 3.3, 3.4_
  - [x] 2.2 Add utility classes and responsive rules
    - Add `.amount-income { color: var(--income-color); }` and `.amount-expense { color: var(--expense-color); }` classes
    - Add `.negative { color: var(--negative-color); }` and `.positive { color: var(--positive-color); }` classes for net balance
    - Add `.field-error { color: var(--danger-color); font-size: 0.78rem; display: block; }` and `.error-notification { ... }` with appropriate padding, border-radius, and `var(--danger-color)` border
    - Update `button, input, select` rule to enforce `min-height: 44px; font-size: max(12px, 0.85rem)` for tap targets
    - Ensure `.transaction-list` uses `max-height: 320px; overflow-y: auto`
    - Add `@media (min-width: 960px)` rule confirming `.app-container { max-width: 960px; margin: 0 auto; }`
    - _Requirements: 2.8, 3.3, 3.4, 7.1, 7.2, 7.3, 7.5_

- [x] 3. Rewrite `js/app.js` — Section 1: STATE & CONSTANTS
  - [x] 3.1 Update state variables and storage key constants
    - Rename `STORAGE_KEY` to use the required key `"ebv_transactions"` and `THEME_KEY` to `"theme"`
    - Remove the `chart` variable (Canvas API renderer is stateless)
    - Confirm `let transactions = []`, `let currentSort = "date"`, `let highlightLimit = 0` are present
    - _Requirements: 5.1, 5.2, 6.2_

- [x] 4. Rewrite `js/app.js` — Section 2: DOM ELEMENTS
  - [x] 4.1 Add DOM references for all new elements
    - Add `const typeSelect = document.getElementById("transaction-type")`
    - Add `const dateInput = document.getElementById("transaction-date")`
    - Add `const totalIncomeEl = document.getElementById("total-income")`
    - Add `const totalExpensesEl = document.getElementById("total-expenses")`
    - Add `const netBalanceEl = document.getElementById("net-balance")`
    - Add `const errorContainer = document.getElementById("error-container")`
    - Remove any reference to the old `totalBalanceEl` (`#total-balance`)
    - _Requirements: 3.1_

- [ ] 5. Rewrite `js/app.js` — Section 3: LOCAL STORAGE
  - [x] 5.1 Implement schema-validating `loadFromStorage()`
    - Read `"ebv_transactions"` from localStorage; if absent, set `transactions = []` and return
    - Wrap `JSON.parse` in `try/catch`; on error set `transactions = []` and `console.error` with reason
    - After parsing, filter the array: keep only records where all 7 fields (`id`, `itemName`, `amount`, `type`, `category`, `date`, `createdAt`) are present and valid per the data model constraints (amount finite ≥ 0.01, type "income"|"expense", date parseable, createdAt finite number, itemName 1–100 chars, category 1–50 chars)
    - Discard invalid records silently; log a warning if any were discarded
    - _Requirements: 5.2, 5.3, 5.4_
  - [x] 5.2 Write property test for LocalStorage round-trip (Property 4)
    - **Property 4: LocalStorage round-trip preserves the transaction array**
    - **Validates: Requirements 5.1, 5.2**
  - [x] 5.3 Write property test for corrupt localStorage produces empty list (Property 5)
    - **Property 5: Corrupt or invalid localStorage data produces an empty list**
    - **Validates: Requirements 5.3**
  - [x] 5.4 Implement error-surfacing `saveToStorage()`
    - Wrap `localStorage.setItem` in `try/catch`
    - On error: call `showError("Data could not be saved.")`, do NOT modify `transactions`
    - On success: clear any existing storage error from `errorContainer`
    - _Requirements: 5.1, 5.5_

- [ ] 6. Rewrite `js/app.js` — Section 4: THEME
  - [x] 6.1 Update `loadTheme()` to fall back to light on invalid values
    - Read `localStorage.getItem("theme")`
    - Apply only if value is exactly `"light"` or `"dark"`; otherwise apply `"light"` as default
    - Call `updateThemeButton(theme)` after applying
    - _Requirements: 6.3, 6.4, 6.5_
  - [x] 6.2 Write property test for theme toggle round-trip (Property 15)
    - **Property 15: Theme toggle is a round trip**
    - **Validates: Requirements 6.1, 6.2**
  - [x] 6.3 Write property test for theme persistence round-trip (Property 16)
    - **Property 16: Theme persistence round-trip**
    - **Validates: Requirements 6.3, 6.6**
  - [x] 6.4 Write property test for theme button label (Property 17)
    - **Property 17: Theme button label matches active theme**
    - **Validates: Requirements 6.6**

- [x] 7. Rewrite `js/app.js` — Section 5: HELPERS
  - [x] 7.1 Replace `formatNumber` with `formatCurrency` and add `validateTransaction`
    - Rename `formatNumber` → `formatCurrency(amount)`: returns `"Rp " + new Intl.NumberFormat("id-ID", { minimumFractionDigits: Number.isInteger(amount) ? 0 : 2, maximumFractionDigits: 2 }).format(amount)`
    - Add `validateTransaction(fields)` that checks each field against the design validation rules and returns `{ valid: boolean, errors: { fieldName: string } }`
    - Add `showError(message)` and `clearError()` helpers that set/clear `errorContainer.textContent`
    - Keep `generateId()` and `parseAmount()` unchanged
    - _Requirements: 1.3, 1.4, 1.9, 3.5_
  - [x] 7.2 Write property test for currency formatting (Property 11)
    - **Property 11: Currency formatting matches Indonesian locale**
    - **Validates: Requirements 3.5**
  - [x] 7.3 Write property test for invalid inputs rejected (Property 2)
    - **Property 2: Invalid inputs are rejected without mutating state**
    - **Validates: Requirements 1.3, 1.4, 1.9**

- [x] 8. Rewrite `js/app.js` — Section 6: CATEGORY
  - [x] 8.1 Update category helpers to load custom categories from localStorage
    - Keep `addCustomCategoryOption(category)` and `ensureCategoryExists(category)` logic
    - In `init()` (Section 14), after `loadFromStorage()`, read a `"ebv_custom_categories"` key from localStorage (or derive from the loaded transactions) and call `ensureCategoryExists` for each
    - _Requirements: 1.7, 1.8_
  - [x] 8.2 Write property test for custom category idempotency (Property 3)
    - **Property 3: Custom category takes precedence and is idempotent in dropdown**
    - **Validates: Requirements 1.6, 1.7**

- [x] 9. Rewrite `js/app.js` — Section 7: TRANSACTIONS
  - [x] 9.1 Rewrite `addTransaction` with validation and new fields
    - Signature: `addTransaction(itemName, amount, category, type, date)`
    - Call `validateTransaction({ itemName, amount, type, category, date })`; on failure, render field-level errors via `showFieldErrors(errors)` and return early without mutating `transactions`
    - On success: push `{ id, itemName, amount: parseAmount(amount), type, category, date, createdAt: Date.now() }`, call `saveToStorage()`, `ensureCategoryExists(category)`, `render()`
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.9, 5.4_
  - [x] 9.2 Write property test for transaction addition grows the list (Property 1)
    - **Property 1: Transaction addition grows the list**
    - **Validates: Requirements 1.2**
  - [x] 9.3 Write property test for schema conformance (Property 6)
    - **Property 6: Every stored transaction conforms to the schema**
    - **Validates: Requirements 5.4**
  - [x] 9.4 Rewrite `deleteTransaction` with rollback on storage failure
    - Store `const snapshot = [...transactions]` before filtering
    - Filter out the target id, call `saveToStorage()`
    - In the `catch` block of `saveToStorage`, restore `transactions = snapshot`, re-render, show inline error
    - _Requirements: 2.4, 2.5_
  - [x] 9.5 Write property test for delete removes exactly the targeted transaction (Property 7)
    - **Property 7: Delete removes exactly the targeted transaction**
    - **Validates: Requirements 2.4**
  - [x] 9.6 Update `getTransactionsSorted` to sort by `date` field (ISO string) as secondary
    - "date" sort: `sorted.sort((a, b) => new Date(b.date) - new Date(a.date) || b.createdAt - a.createdAt)`
    - Keep "amount-asc" and "amount-desc" sorts unchanged
    - _Requirements: 2.1, 2.3_
  - [x] 9.7 Write property test for sort order invariant (Property 8)
    - **Property 8: Sort order invariant**
    - **Validates: Requirements 2.3**

- [ ] 10. Checkpoint — ensure sections 1–9 integrate cleanly
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Rewrite `js/app.js` — Section 8: RENDER LIST
  - [ ] 11.1 Update `renderList` to show type badge, date, and color-coded amounts
    - Empty-state message: `"No transactions yet."` inside a single `<li>`
    - Each `<li>`: show `itemName`, `category`, type badge (`<span class="type-badge type-income">income</span>` or `type-expense`), formatted amount via `formatCurrency`, and date formatted as DD/MM/YYYY
    - Apply `amount-income` or `amount-expense` CSS class to the amount `<span>` based on `t.type`
    - Apply `highlight-over-limit` class when `highlightLimit > 0 && t.amount >= highlightLimit`
    - _Requirements: 2.1, 2.2, 2.6, 2.7, 2.8_
  - [ ] 11.2 Write property test for highlight rows at or above limit (Property 9)
    - **Property 9: Highlight applies exactly to rows at or above the limit**
    - **Validates: Requirements 2.6, 2.7**

- [ ] 12. Rewrite `js/app.js` — Section 9: TOTAL BALANCE
  - [ ] 12.1 Rewrite `updateBalance` to compute and display all three summary values
    - `totalIncome = transactions.filter(t => t.type === "income").reduce((s,t) => s + t.amount, 0)`
    - `totalExpenses = transactions.filter(t => t.type === "expense").reduce((s,t) => s + t.amount, 0)`
    - `netBalance = totalIncome - totalExpenses`
    - Set `totalIncomeEl.textContent = formatCurrency(totalIncome)` etc.
    - Toggle CSS class `"negative"` / `"positive"` on `netBalanceEl` based on `netBalance < 0`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  - [ ] 12.2 Write property test for balance summary arithmetic (Property 10)
    - **Property 10: Balance summary values are arithmetically correct**
    - **Validates: Requirements 3.1, 3.2**

- [ ] 13. Rewrite `js/app.js` — Section 10: PIE CHART
  - [ ] 13.1 Implement `getExpenseChartData()`
    - Filter `transactions` where `type === "expense"`
    - Group by category, sum amounts; return `{ labels, values, total }`
    - Income transactions must be completely excluded
    - _Requirements: 4.7, 4.9_
  - [ ] 13.2 Write property test for income excluded from chart data (Property 13)
    - **Property 13: Income transactions do not appear in chart data**
    - **Validates: Requirements 4.7**
  - [ ] 13.3 Implement Canvas-based `renderChart()` — empty state
    - Get canvas element and `getContext("2d")`
    - Set `canvas.width = canvas.offsetWidth` and `canvas.height = canvas.offsetWidth` (square)
    - If no expense transactions: draw centered `"No expense data to display"` text using `--text-color` from `getComputedStyle`, then return
    - _Requirements: 4.1, 4.6_
  - [ ] 13.4 Implement Canvas-based `renderChart()` — slices and legend
    - Use `COLORS` array of 8 values: `["#FF6384","#36A2EB","#FFCE56","#4BC0C0","#9966FF","#FF9F40","#C9CBCF","#7BC8A4"]`
    - Draw pie slices with `ctx.arc()` starting at `-Math.PI / 2`, each `sliceAngle = (value / total) * 2 * Math.PI`
    - Use `ctx.strokeStyle = getComputedStyle(canvas).getPropertyValue("--card-bg")` with `lineWidth = 2` between slices
    - Draw legend below chart: color swatch (12×12px `fillRect`), category name, and percentage using largest remainder method so percentages sum to exactly `100.0%`
    - Attach a `ResizeObserver` (or `window` `resize` listener) to call `renderChart()` when container size changes
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.8_
  - [ ] 13.5 Write property test for arc angles sum to 2π (Property 12)
    - **Property 12: Pie chart arc angles sum to 2π for any non-empty expense set**
    - **Validates: Requirements 4.2, 4.8, 4.9**
  - [ ] 13.6 Write property test for legend percentages sum to 100.0% (Property 14)
    - **Property 14: Legend percentages sum to exactly 100.0%**
    - **Validates: Requirements 4.5**

- [ ] 14. Rewrite `js/app.js` — Section 11–13: MAIN RENDER, FORM HANDLER, SORT & LIMIT HANDLER
  - [ ] 14.1 Keep `render()` calling `renderList()`, `updateBalance()`, `renderChart()` in order
    - No changes needed beyond confirming `renderChart()` is the Canvas version
    - _Requirements: 3.2, 4.3_
  - [ ] 14.2 Rewrite `handleFormSubmit` to read type and date fields and show inline errors
    - Read `typeSelect.value`, `dateInput.value` in addition to existing fields
    - Derive `finalCategory = customCategoryInput.value.trim() || categorySelect.value`
    - Call `validateTransaction`; on failure render inline `<span class="field-error">` messages next to each offending field and return
    - On success call `addTransaction(itemName, parseAmount(amount), finalCategory, type, date)` then `form.reset()` and clear all field errors
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6, 1.9_
  - [ ] 14.3 Keep `handleSortChange` and `handleLimitChange` unchanged in behavior
    - Verify `handleLimitChange` sets `highlightLimit = parseAmount(limitInput.value)` and calls `renderList()`
    - Verify `handleSortChange` sets `currentSort = sortSelect.value` and calls `renderList()`
    - _Requirements: 2.3, 2.6, 2.7_

- [ ] 15. Rewrite `js/app.js` — Section 14: INIT
  - [ ] 15.1 Update `init()` to attach all required event listeners and bootstrap in correct order
    - Call order: `loadTheme()`, `loadFromStorage()`, `transactions.forEach(t => ensureCategoryExists(t.category))`, `render()`
    - Attach: `form "submit" → handleFormSubmit`, `themeToggleBtn "click" → toggleTheme`, `sortSelect "change" → handleSortChange`, `limitInput "input" → handleLimitChange`
    - Keep the DOMContentLoaded guard at the bottom of the file
    - _Requirements: 5.2, 6.3, 1.8_

- [ ] 16. Checkpoint — full integration test
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 17. Write property-based test file `js/app.test.js`
  - [ ] 17.1 Scaffold test file with fast-check arbitraries
    - Install test runner: add note that `npx --yes vitest --run` is used to execute
    - Define arbitraries: `arbitraryTransaction()`, `arbitraryTransactionArray()`, `arbitraryInvalidAmount()`, `arbitraryCorruptJson()`, `arbitraryTheme()`
    - Each test must set `numRuns: 100` and include a comment: `// Feature: expense-budget-visualizer, Property N: <title>`
    - _Requirements: all_
  - [ ] 17.2 Write property tests for transaction mutation (Properties 1, 2, 6, 7)
    - Property 1: addition grows list by exactly 1 and new item is present
    - Property 2: invalid inputs rejected, state unchanged
    - Property 6: created transaction contains all 7 required fields within valid ranges
    - Property 7: delete removes only the targeted transaction, others unchanged
    - _Requirements: 1.2, 1.3, 1.4, 1.9, 2.4, 5.4_
  - [ ] 17.3 Write property tests for localStorage (Properties 4, 5)
    - Property 4: save then load restores deeply equal array
    - Property 5: corrupt JSON / missing fields → empty list, no throw
    - _Requirements: 5.1, 5.2, 5.3_
  - [ ] 17.4 Write property tests for sort, highlight, and formatting (Properties 8, 9, 11)
    - Property 8: sorted result satisfies the correct ordering invariant for all three sort modes
    - Property 9: highlight class applied to exactly the rows with `amount >= limit`
    - Property 11: `formatCurrency(n)` starts with `"Rp "` and numeric portion matches `Intl.NumberFormat("id-ID")`
    - _Requirements: 2.3, 2.6, 2.7, 3.5_
  - [ ] 17.5 Write property tests for balance arithmetic (Property 10)
    - Property 10: `totalIncome`, `totalExpenses`, `netBalance` values are arithmetically correct
    - _Requirements: 3.1, 3.2_
  - [ ] 17.6 Write property tests for chart data (Properties 12, 13, 14)
    - Property 12: arc angles sum to 2π (within 1e-9 tolerance)
    - Property 13: income transactions produce no entries in chart data
    - Property 14: legend percentages (largest remainder method) sum to exactly 100.0
    - _Requirements: 4.2, 4.5, 4.7, 4.8, 4.9_
  - [ ] 17.7 Write property tests for theme (Properties 15, 16, 17)
    - Property 15: two toggles return to original theme in both DOM and localStorage
    - Property 16: `loadTheme()` with valid stored value sets `body.dataset.theme` and correct button label
    - Property 17: `updateThemeButton("light")` → `"🌙 Dark Mode"`, `updateThemeButton("dark")` → `"☀️ Light Mode"`
    - _Requirements: 6.1, 6.2, 6.3, 6.6_
  - [ ] 17.8 Write property test for custom category idempotency (Property 3)
    - Property 3: calling `ensureCategoryExists(cat)` multiple times leaves exactly one matching option in the dropdown
    - _Requirements: 1.6, 1.7_

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP; all 17 correctness properties are in these optional sub-tasks
- Core implementation tasks (unmarked) must all be completed for a fully functional app
- Each task references specific requirements for traceability
- The 14 `app.js` sections must remain in their prescribed order; never insert code outside of its named section
- Property-based tests live in `js/app.test.js` and require `npx --yes vitest --run` to execute
- The Canvas chart reads CSS custom property values at draw time via `getComputedStyle`, so theme changes are automatically reflected without special handling
- Amounts are always stored as integers (whole Rupiah) as per project conventions; `parseAmount` sanitizes the form input
- The `"ebv_transactions"` and `"theme"` localStorage keys are the canonical keys; the old `"expense_visualizer_transactions"` / `"expense_visualizer_theme"` keys must be replaced

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "2.2", "3.1"] },
    { "id": 2, "tasks": ["4.1", "5.1", "6.1"] },
    { "id": 3, "tasks": ["5.4", "7.1", "8.1", "9.1", "9.4", "9.6"] },
    { "id": 4, "tasks": ["5.2", "5.3", "6.2", "6.3", "6.4", "7.2", "7.3", "8.2", "9.2", "9.3", "9.5", "9.7"] },
    { "id": 5, "tasks": ["11.1", "12.1", "13.1", "14.1", "14.2", "14.3", "15.1"] },
    { "id": 6, "tasks": ["11.2", "12.2", "13.2", "13.3"] },
    { "id": 7, "tasks": ["13.4"] },
    { "id": 8, "tasks": ["13.5", "13.6"] },
    { "id": 9, "tasks": ["17.1"] },
    { "id": 10, "tasks": ["17.2", "17.3", "17.4", "17.5", "17.6", "17.7", "17.8"] }
  ]
}
```
