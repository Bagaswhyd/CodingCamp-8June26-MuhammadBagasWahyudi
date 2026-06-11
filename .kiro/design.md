# Design Document — Expense & Budget Visualizer

## Overview

The Expense & Budget Visualizer is a client-side single-page application (SPA) delivered as three static files: `index.html`, `css/style.css`, and `js/app.js`. It runs entirely in the browser with no backend, no build step, and no external runtime dependencies (Chart.js is removed; the pie chart is rendered with the native Canvas API). All state is held in module-level JavaScript variables and persisted to `localStorage` under two keys: `ebv_transactions` and `theme`.

The application exposes five user-facing capabilities:

1. **Add transactions** — income or expense entries with name, amount, category, and date.
2. **Transaction list** — sortable, deletable, with per-row highlight when amount exceeds a user-defined limit.
3. **Balance summary** — live totals: total income, total expenses, net balance.
4. **Pie chart** — Canvas-rendered breakdown of expenses by category with legend and percentages.
5. **Theme toggle** — light/dark switch persisted across sessions.

### Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Chart library | Native Canvas API | Requirement 4.1 explicitly forbids external chart libraries |
| Module system | None (flat script) | Project constraint: no build tools, no ES modules |
| State shape | Module-level `let` variables | Consistent with existing codebase; no framework needed |
| Persistence format | JSON-serialized array in `localStorage` | Lightweight, works offline, browser-native |
| Currency | `Intl.NumberFormat("id-ID")` | Indonesian Rupiah locale formatting per requirements |
| Theming | `data-theme` attribute + CSS custom properties | Zero JS for colors; easy to extend |

---

## Architecture

The application follows a **flat, imperative SPA** pattern. There are no ES modules, no component classes, and no reactive framework. All logic lives in a single `app.js` file organized into named sections separated by banner comments.

```
┌─────────────────────────────────────────────────────┐
│                     index.html                      │
│  ┌──────────┐  ┌───────────┐  ┌───────────────────┐ │
│  │  header  │  │  sections │  │  <canvas> chart   │ │
│  └──────────┘  └───────────┘  └───────────────────┘ │
└─────────────────────────────────────────────────────┘
          ▲ DOM reads/writes
┌─────────────────────────────────────────────────────┐
│                      app.js                         │
│                                                     │
│  STATE ──► TRANSACTIONS ──► STORAGE                 │
│    │                                                │
│    └──► render() ──► renderList()                   │
│                  ├──► updateBalance()               │
│                  └──► renderChart()                 │
└─────────────────────────────────────────────────────┘
          ▲ read/write
┌─────────────────────────────────────────────────────┐
│                   localStorage                      │
│   ebv_transactions: JSON string                     │
│   theme: "light" | "dark"                           │
└─────────────────────────────────────────────────────┘
```

### Data Flow

1. `init()` loads `theme` and `ebv_transactions` from `localStorage`, hydrates the category dropdown, then calls `render()`.
2. User actions (form submit, delete button, sort/limit change, theme toggle) invoke the appropriate handler, which mutates module-level state, writes to `localStorage`, then calls `render()` or a targeted sub-renderer.
3. `render()` is the single orchestrating function: it calls `renderList()`, `updateBalance()`, and `renderChart()` in sequence.
4. No direct DOM access outside the render functions — all reads go through the cached DOM element constants.

---

## Components and Interfaces

The "components" are logical sections of `app.js` rather than classes or modules. The section order is fixed and must be preserved.

### 1. STATE & CONSTANTS

```js
const STORAGE_KEY = "ebv_transactions";  // localStorage key for transactions
const THEME_KEY   = "theme";             // localStorage key for theme

let transactions  = [];     // Transaction[]  — in-memory source of truth
let currentSort   = "date"; // "date" | "amount-asc" | "amount-desc"
let highlightLimit = 0;     // number — rows with amount >= this get highlighted
```

The `chart` variable used by the old Chart.js integration is removed. The Canvas API renderer is stateless — it clears and redraws on every `renderChart()` call.

### 2. DOM ELEMENTS

All DOM references are cached once at script parse time using `document.getElementById`. No dynamic queries inside render loops.

New elements required by the updated requirements (not yet in current HTML):

| ID | Element | Purpose |
|---|---|---|
| `transaction-type` | `<select>` | Income / Expense type selector |
| `transaction-date` | `<input type="date">` | Date picker |
| `total-income` | `<p>` | Displays total income |
| `total-expenses` | `<p>` | Displays total expenses |
| `net-balance` | `<p>` | Displays net balance (color-coded) |
| `error-container` | `<div>` | Inline error/notification area |

Existing elements retained: `transaction-form`, `item-name`, `amount`, `category`, `custom-category`, `transaction-list`, `theme-toggle`, `sort-by`, `limit-input`, `expense-chart`.

### 3. LOCAL STORAGE

**Interface:**

```
loadFromStorage() → void
  Reads "ebv_transactions" from localStorage.
  On success: parses JSON, validates each record against Transaction schema,
              filters out invalid records, assigns to transactions[].
  On failure (parse error, missing key): sets transactions = [], logs error.

saveToStorage() → void
  Serializes transactions[] to JSON, writes to "ebv_transactions".
  On failure (quota exceeded, security error): displays inline error notification,
              does NOT modify transactions[].
```

### 4. THEME

```
loadTheme() → void
  Reads "theme" from localStorage.
  If value is "light" or "dark": applies to body.dataset.theme and calls updateThemeButton().
  Otherwise: applies "light" as default.

toggleTheme() → void
  Reads current body.dataset.theme, computes opposite, applies it,
  writes to localStorage["theme"], calls updateThemeButton().

updateThemeButton(theme: "light"|"dark") → void
  Sets themeToggleBtn.textContent to:
    "🌙 Dark Mode"  when theme === "light"
    "☀️ Light Mode" when theme === "dark"
```

### 5. HELPERS

```
generateId() → string
  Returns Date.now().toString(36) + Math.random().toString(36).slice(2)

formatCurrency(amount: number) → string
  Returns "Rp " + new Intl.NumberFormat("id-ID").format(amount)
  Whole-number amounts: no decimal (e.g., "Rp 1.500.000")
  Fractional amounts: exactly 2 decimal places separated by comma (e.g., "Rp 1.500.000,50")

parseAmount(value: string) → number
  Parses to integer via parseInt(value, 10).
  Returns 0 if NaN. Returns Math.max(0, parsed).

validateTransaction(fields: object) → { valid: boolean, errors: object }
  Checks all required fields for presence, type, and range.
  Returns errors keyed by field name for inline display.
```

### 6. CATEGORY

```
addCustomCategoryOption(category: string) → void
  Creates <option> element and appends to categorySelect.

ensureCategoryExists(category: string) → void
  No-op if category is already in dropdown; otherwise calls addCustomCategoryOption.
```

### 7. TRANSACTIONS

```
addTransaction(itemName, amount, category, type, date) → void
  Calls validateTransaction; on failure, renders inline errors and returns.
  On success: pushes new Transaction to transactions[], calls saveToStorage(), render().

deleteTransaction(id: string) → void
  Stores snapshot of transactions[] for rollback.
  Filters out the transaction with matching id.
  Calls saveToStorage(); on storage failure: restores snapshot, shows inline error.
  On success: calls render().

getTransactionsSorted() → Transaction[]
  Returns a sorted copy of transactions[] per currentSort value.
```

### 8. RENDER LIST

```
renderList() → void
  Calls getTransactionsSorted().
  If empty: renders single <li> with empty-state message.
  For each transaction:
    - Creates <li class="transaction-item">
    - Adds "highlight-over-limit" class if amount >= highlightLimit > 0
    - Adds "income" or "expense" CSS class on amount element for color coding
    - Shows: itemName, category, type badge, formatted amount, date (DD/MM/YYYY)
    - Attaches delete button with click handler
```

### 9. TOTAL BALANCE

```
updateBalance() → void
  Calculates: totalIncome = sum of income transactions
              totalExpenses = sum of expense transactions
              netBalance = totalIncome - totalExpenses
  Updates #total-income, #total-expenses, #net-balance text content.
  Applies CSS class "negative" to #net-balance when netBalance < 0.
```

### 10. PIE CHART

```
renderChart() → void
  Gets the canvas element and its 2D context.
  If no expense transactions: draws centered "No expense data to display" text; returns.
  Otherwise:
    1. Calls getExpenseChartData() to aggregate expense amounts by category.
    2. Clears canvas (ctx.clearRect).
    3. Draws pie slices using ctx.arc() with proportional angles.
    4. Draws legend below chart area.

getExpenseChartData() → { labels: string[], values: number[], total: number }
  Filters transactions where type === "expense".
  Groups by category, sums amounts.
  Returns sorted labels, values, and grand total.
```

### 11. MAIN RENDER

```
render() → void
  Calls renderList(), updateBalance(), renderChart() in sequence.
```

### 12. FORM HANDLER

```
handleFormSubmit(event: Event) → void
  Prevents default. Reads all form field values.
  Derives finalCategory from customCategory || categorySelect.value.
  Calls validateTransaction; on error: renders field-level inline messages, returns.
  On valid: calls addTransaction(...), then form.reset().
```

### 13. SORT & LIMIT HANDLER

```
handleSortChange() → void    Sets currentSort, calls renderList().
handleLimitChange() → void   Parses limit input, sets highlightLimit, calls renderList().
```

### 14. INIT

```
init() → void
  1. loadTheme()
  2. loadFromStorage()
  3. transactions.forEach(t => ensureCategoryExists(t.category))
  4. render()
  5. Attaches all event listeners:
       form "submit"    → handleFormSubmit
       themeToggleBtn "click" → toggleTheme
       sortSelect "change"    → handleSortChange
       limitInput "input"     → handleLimitChange
```

---

## Data Models

### Transaction

```js
{
  id:        string,    // generateId() — unique per session
  itemName:  string,    // 1–100 characters, trimmed
  amount:    number,    // integer ≥ 1, ≤ 999_999_999 (whole Rupiah)
  type:      "income" | "expense",
  category:  string,    // 1–50 characters, non-empty
  date:      string,    // ISO 8601 date, e.g. "2025-06-08"
  createdAt: number,    // Date.now() Unix timestamp (ms) — used for "date" sort
}
```

### Validation Rules

| Field | Rule |
|---|---|
| `itemName` | Required; non-empty after trim; max 100 chars |
| `amount` | Required; numeric; integer; ≥ 1; ≤ 999,999,999 |
| `type` | Required; exactly "income" or "expense" |
| `category` | Required; non-empty after trim; max 50 chars |
| `date` | Required; valid ISO 8601 date string |

### LocalStorage Schema

```
Key: "ebv_transactions"
Value: JSON string → Transaction[]

Example:
[
  {
    "id": "lq1r2a3b4c",
    "itemName": "Makan Siang",
    "amount": 35000,
    "type": "expense",
    "category": "Food",
    "date": "2025-06-08",
    "createdAt": 1749379200000
  }
]

Key: "theme"
Value: "light" | "dark"
```

### Deserialization Guard

On `loadFromStorage()`, each parsed object is validated:
- All 7 required fields must be present.
- `amount` must be a finite number ≥ 0.
- `type` must be exactly `"income"` or `"expense"`.
- `date` must be parseable as a date.
- `createdAt` must be a finite number.

Records that fail validation are discarded (not loaded). If the top-level parse fails, `transactions` is reset to `[]`.

---

## Canvas-Based Pie Chart Algorithm

The pie chart is rendered entirely with the [HTML Canvas 2D API](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D). No external library is used.

### Layout

```
┌────────────────────────────────┐
│           canvas               │
│   ┌──────────────────────┐     │
│   │    pie circle area   │     │  ← top ~60% of canvas height
│   └──────────────────────┘     │
│   ┌──────────────────────┐     │
│   │  legend (color+text) │     │  ← bottom ~40%
│   └──────────────────────┘     │
└────────────────────────────────┘
```

### Drawing Algorithm

```
1. SIZING
   canvasWidth  = canvas.offsetWidth  (set canvas.width = canvasWidth for DPR clarity)
   canvasHeight = canvasWidth (square canvas for pie)
   radius       = canvasWidth * 0.35
   centerX      = canvasWidth / 2
   centerY      = canvasWidth * 0.40  (slightly above center to leave room for legend)

2. EMPTY STATE
   If expenseTransactions.length === 0:
     ctx.fillStyle = textColor (from CSS variable via getComputedStyle)
     ctx.font = "14px system-ui"
     ctx.textAlign = "center"
     ctx.textBaseline = "middle"
     ctx.fillText("No expense data to display", centerX, centerY)
     return

3. AGGREGATE
   groups = {}
   for each expense transaction t:
     groups[t.category] = (groups[t.category] ?? 0) + t.amount
   grandTotal = sum of all groups values

4. DRAW SLICES
   startAngle = -π/2   (start at 12 o'clock)
   COLORS = [
     "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0",
     "#9966FF", "#FF9F40", "#C9CBCF", "#7BC8A4"
   ]
   for each (category, amount) in groups, index i:
     sliceAngle = (amount / grandTotal) × 2π
     endAngle   = startAngle + sliceAngle

     ctx.beginPath()
     ctx.moveTo(centerX, centerY)
     ctx.arc(centerX, centerY, radius, startAngle, endAngle)
     ctx.closePath()
     ctx.fillStyle = COLORS[i % COLORS.length]
     ctx.fill()
     ctx.strokeStyle = canvasBg   // same as background to create gap between slices
     ctx.lineWidth = 2
     ctx.stroke()

     startAngle = endAngle

5. DRAW LEGEND
   legendY = centerY + radius + 20
   swatchSize = 12
   lineHeight = 22
   for each (category, amount) in groups, index i:
     pct = (amount / grandTotal × 100).toFixed(1)
     // Apply percentage rounding correction to last item so sum == 100.0%
     ctx.fillStyle = COLORS[i % COLORS.length]
     ctx.fillRect(10, legendY, swatchSize, swatchSize)
     ctx.fillStyle = textColor
     ctx.textAlign = "left"
     ctx.fillText(`${category}: ${pct}%`, 10 + swatchSize + 6, legendY + 10)
     legendY += lineHeight

6. PERCENTAGE ROUNDING ADJUSTMENT
   Raw percentages are computed as (amount / grandTotal * 100).
   To ensure displayed percentages sum to exactly 100.0%:
   - Compute floor of each percentage × 10 (i.e., work in tenths).
   - Sum the floors; difference from 1000 is distributed to the categories
     with the largest fractional remainders (largest remainder method).
```

### Responsiveness

The canvas width is derived from its CSS-constrained container width at draw time (`canvas.offsetWidth`). A `ResizeObserver` (or `window.resize` event) triggers a `renderChart()` redraw when the container changes size, ensuring the chart scales correctly on viewport change.

---

## Theming Approach

Theming uses a `data-theme` attribute on `<body>` combined with CSS custom properties. No JavaScript is involved in color computation at runtime.

### CSS Custom Properties

```css
:root {
  --bg-color:        #f5f5f7;
  --card-bg:         #ffffff;
  --text-color:      #222222;
  --primary-color:   #4f46e5;
  --danger-color:    #ef4444;
  --border-color:    #d1d5db;
  --highlight-bg:    #fef3c7;
  --income-color:    #16a34a;   /* green for income amounts */
  --expense-color:   #dc2626;   /* red for expense amounts */
  --negative-color:  #dc2626;   /* red for negative net balance */
  --positive-color:  #16a34a;   /* green for zero/positive net balance */
}

[data-theme="dark"] {
  --bg-color:        #111827;
  --card-bg:         #1f2937;
  --text-color:      #f9fafb;
  --primary-color:   #6366f1;
  --danger-color:    #f87171;
  --border-color:    #374151;
  --highlight-bg:    #431d08;
  --income-color:    #4ade80;
  --expense-color:   #f87171;
  --negative-color:  #f87171;
  --positive-color:  #4ade80;
}
```

### Theme Lifecycle

```
App Init
  ↓
loadTheme()                    Reads "theme" from localStorage
  ↓
body.dataset.theme = value     CSS custom properties switch instantly
  ↓
updateThemeButton(theme)       Button label updates

User clicks Theme_Toggle
  ↓
toggleTheme()
  ↓
body.dataset.theme = newTheme  All CSS vars re-resolve automatically
  ↓
localStorage.setItem("theme")  Persisted for next session
  ↓
updateThemeButton(newTheme)
```

The Canvas chart reads text and background colors via `getComputedStyle(document.body).getPropertyValue("--text-color")` and `--card-bg` at draw time, so it respects the active theme without special handling.

---

## Responsive Layout Strategy

All breakpoints are handled in `css/style.css` using `@media` queries. No JavaScript viewport detection.

### Breakpoints

| Viewport | Layout |
|---|---|
| < 600px (mobile) | Single column: all sections stack vertically |
| ≥ 600px | Transaction form switches to 2-column grid |
| ≥ 960px | `app-container` capped at `max-width: 960px`, centered |

### Key Responsive Rules

```css
/* Mobile-first base: single column */
.transaction-form {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}

/* 2-column form on wider screens */
@media (min-width: 600px) {
  .transaction-form {
    grid-template-columns: 1fr 1fr;
  }
}

/* Chart scales with container */
.chart-wrapper {
  position: relative;
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
}

#expense-chart {
  width: 100% !important;
  height: auto !important;
}

/* Minimum tap target size */
button, input, select {
  min-height: 44px;
  font-size: max(12px, 0.85rem);
}

/* Transaction list scrolls vertically */
.transaction-list {
  max-height: 320px;
  overflow-y: auto;
}
```

---

## Error Handling

| Scenario | Detection | Response |
|---|---|---|
| Form submitted with empty required fields | `validateTransaction()` on submit | Inline error message below each offending field; form not submitted |
| Amount is zero, negative, or non-numeric | `validateTransaction()` | Inline error: "Amount must be greater than zero." |
| Amount exceeds 999,999,999 | `validateTransaction()` | Inline error: "Amount exceeds the maximum allowed value." |
| `localStorage.setItem` fails (quota, security) | `try/catch` in `saveToStorage()` | Inline notification: "Data could not be saved."; in-memory list unchanged |
| `localStorage.getItem` returns corrupt JSON | `try/catch` in `loadFromStorage()` | `transactions = []`, `console.error` with reason |
| Transaction object missing required fields | Field-by-field check in `loadFromStorage()` | Invalid record silently discarded; valid records loaded |
| `localStorage` unavailable (private mode) | `try/catch` in all storage calls | Falls back to in-memory only; no crash |
| Theme stored as invalid value | Check in `loadTheme()` | Default to `"light"` |
| Delete fails to write to localStorage | `try/catch` in `deleteTransaction()` | Inline notification; rollback to snapshot |

### Inline Error / Notification Pattern

```html
<!-- Rendered by JS into the DOM adjacent to the offending field -->
<span class="field-error" role="alert">Amount must be greater than zero.</span>

<!-- Storage/system notifications -->
<div id="error-container" class="error-notification" role="alert" aria-live="polite">
  Data could not be saved.
</div>
```

Errors are cleared on the next successful operation or when the user edits the offending field.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

The following properties are derived from the acceptance criteria. Each is suitable for property-based testing using a library such as [fast-check](https://github.com/dubzzz/fast-check) (JavaScript). Each test must run a minimum of 100 iterations.

---

### Property 1: Transaction addition grows the list

*For any* valid transaction inputs (non-empty itemName, amount ≥ 1, valid type and category), calling `addTransaction` with those inputs results in `transactions.length` increasing by exactly 1 and the new transaction being present in the array.

**Validates: Requirements 1.2**

---

### Property 2: Invalid inputs are rejected without mutating state

*For any* combination of field values that fails validation — empty itemName, non-positive or non-numeric amount, missing type, missing category, missing date, or amount > 999,999,999 — `validateTransaction` must return `valid: false` and the `transactions` array must remain unchanged.

**Validates: Requirements 1.3, 1.4, 1.9**

---

### Property 3: Custom category takes precedence and is idempotent in dropdown

*For any* non-empty custom category string, after calling `ensureCategoryExists(category)` one or more times, the category dropdown contains that value as an option exactly once, regardless of how many times `ensureCategoryExists` is called.

**Validates: Requirements 1.6, 1.7**

---

### Property 4: LocalStorage round-trip preserves the transaction array

*For any* array of valid Transaction objects, calling `saveToStorage()` followed by `loadFromStorage()` must restore a `transactions` array that is deeply equal to the original (same length, same field values for each element in same order).

**Validates: Requirements 5.1, 5.2**

---

### Property 5: Corrupt or invalid localStorage data produces an empty list

*For any* string that is not valid JSON, or any JSON value that is not an array, or any array containing objects that are missing one or more required Transaction fields or have fields with wrong types, `loadFromStorage()` must result in `transactions` being set to `[]` without throwing.

**Validates: Requirements 5.3**

---

### Property 6: Every stored transaction conforms to the schema

*For any* valid form inputs passed to `addTransaction`, the resulting transaction object pushed to `transactions[]` and serialized to localStorage must contain exactly the 7 required fields (`id`, `itemName`, `amount`, `type`, `category`, `date`, `createdAt`) with values that satisfy their defined types and ranges.

**Validates: Requirements 5.4**

---

### Property 7: Delete removes exactly the targeted transaction

*For any* non-empty transactions array and any transaction `t` in that array, calling `deleteTransaction(t.id)` must result in a transactions array that no longer contains `t` and still contains all other transactions unchanged.

**Validates: Requirements 2.4**

---

### Property 8: Sort order invariant

*For any* non-empty transactions array:
- Sort "date" → `transactions[i].createdAt >= transactions[i+1].createdAt` for all `i`
- Sort "amount-asc" → `transactions[i].amount <= transactions[i+1].amount` for all `i`
- Sort "amount-desc" → `transactions[i].amount >= transactions[i+1].amount` for all `i`

**Validates: Requirements 2.3**

---

### Property 9: Highlight applies exactly to rows at or above the limit

*For any* transactions array and any positive integer limit, after calling `renderList()`, every rendered row with `amount >= limit` has the `highlight-over-limit` CSS class and every row with `amount < limit` does not.

**Validates: Requirements 2.6, 2.7**

---

### Property 10: Balance summary values are arithmetically correct

*For any* transactions array, after calling `updateBalance()`:
- `totalIncome` equals the sum of `amount` for all transactions with `type === "income"`
- `totalExpenses` equals the sum of `amount` for all transactions with `type === "expense"`
- `netBalance` equals `totalIncome − totalExpenses`

**Validates: Requirements 3.1, 3.2**

---

### Property 11: Currency formatting matches Indonesian locale

*For any* non-negative integer `n`, `formatCurrency(n)` must return a string that starts with `"Rp "` and whose numeric portion matches `new Intl.NumberFormat("id-ID").format(n)`.

**Validates: Requirements 3.5**

---

### Property 12: Pie chart arc angles sum to 2π for any non-empty expense set

*For any* non-empty set of expense transactions (grouped by category), the sum of all computed arc angles returned by `getExpenseChartData()` must equal `2π` (within floating-point tolerance of `1e-9`), and each individual arc angle must equal `(categoryTotal / grandTotal) × 2π`.

**Validates: Requirements 4.2, 4.8, 4.9**

---

### Property 13: Income transactions do not appear in chart data

*For any* transactions array containing at least one income transaction, `getExpenseChartData()` must return no labels or values corresponding to income-only categories, and the grand total must equal the sum of expense amounts only.

**Validates: Requirements 4.7**

---

### Property 14: Legend percentages sum to exactly 100.0%

*For any* non-empty expense transactions grouped by category, the displayed legend percentages (each rounded to 1 decimal place using the largest remainder method) must sum to exactly `100.0`.

**Validates: Requirements 4.5**

---

### Property 15: Theme toggle is a round trip

*For any* starting theme value `t ∈ {"light", "dark"}`, calling `toggleTheme()` twice must return `body.dataset.theme` to `t` and `localStorage.getItem("theme")` to `t`.

**Validates: Requirements 6.1, 6.2**

---

### Property 16: Theme persistence round-trip

*For any* valid theme value `t ∈ {"light", "dark"}` stored in `localStorage["theme"]`, calling `loadTheme()` must set `body.dataset.theme === t` and set the button label to the correct string for `t`.

**Validates: Requirements 6.3, 6.6**

---

### Property 17: Theme button label matches active theme

*For any* theme value `t ∈ {"light", "dark"}`, calling `updateThemeButton(t)` must set `themeToggleBtn.textContent` to `"🌙 Dark Mode"` when `t === "light"` and `"☀️ Light Mode"` when `t === "dark"`.

**Validates: Requirements 6.6**

---

*Properties 15 and 17 are partially overlapping with Property 16. After reflection: Property 16 subsumes Property 17 (loadTheme calls updateThemeButton). Property 15 is kept independently as it validates the toggle round-trip behavior specifically. The three together cover distinct aspects: label correctness in isolation (17 → subsumed), persistence on toggle (15), and initialization from storage (16).*

---

## Testing Strategy

### Dual Approach

Property-based tests handle universal correctness across the input space. Unit/example tests handle specific scenarios, edge cases, error conditions, and integration points that don't benefit from input variation.

### Property-Based Testing

**Library**: [fast-check](https://github.com/dubzzz/fast-check) for JavaScript.

- Minimum **100 iterations per property** (fast-check default is 100; set `numRuns: 100` explicitly).
- Each property test must include a comment referencing its design property:
  ```js
  // Feature: expense-budget-visualizer, Property 4: LocalStorage round-trip preserves the transaction array
  ```
- Tag format: `Feature: expense-budget-visualizer, Property {N}: {property_text}`

**Generators needed:**

| Generator | Produces |
|---|---|
| `arbitraryTransaction()` | Valid Transaction with random fields within constraints |
| `arbitraryTransactionArray()` | Array of 0–50 valid Transactions |
| `arbitraryInvalidAmount()` | 0, negative integer, NaN, non-numeric string |
| `arbitraryCorruptJson()` | Non-JSON string, JSON non-array, array with missing fields |
| `arbitraryTheme()` | "light" or "dark" |

### Unit / Example Tests

| Test | Covers |
|---|---|
| Form renders all 5 required fields | Req 1.1 |
| Empty-state message renders when transactions = [] | Req 2.2 |
| Negative net balance applies CSS class "negative" | Req 3.3 |
| Zero/positive net balance applies CSS class "positive" | Req 3.4 |
| Canvas shows "No expense data to display" when expense list is empty | Req 4.6 |
| `localStorage` write failure shows notification and leaves memory unchanged | Req 2.5, 5.5 |
| Initialization with no stored key renders empty state | Req 5.6 |
| Default light theme applies when no theme stored | Req 6.4 |
| Invalid stored theme falls back to light | Req 6.5 |

### Responsive / Visual Tests

Requirements 7.1–7.5 (layout breakpoints, tap targets, chart scaling) are validated through:
- Manual testing at 375px, 600px, and 960px viewport widths.
- Browser DevTools device emulation.
- No automated unit test is appropriate for CSS layout correctness.

### No Build System Note

Since the project has no test runner, tests can be run using:
```
npx fast-check   # not applicable without a runner
```
The recommended approach is to add a minimal test file `js/app.test.js` and run it with:
```
npx --yes vitest --run
```
or use a CDN-linked test harness loaded in a separate `test.html` page that runs in the browser directly, requiring zero build tooling.
