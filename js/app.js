// ===== STATE & CONSTANTS =====
const STORAGE_KEY = "ebv_transactions";
const THEME_KEY = "theme";

let transactions = [];
let currentSort = "date";
let highlightLimit = 0;

// ===== DOM ELEMENTS =====
const form = document.getElementById("transaction-form");
const itemNameInput = document.getElementById("item-name");
const amountInput = document.getElementById("amount");
const typeSelect = document.getElementById("transaction-type");
const dateInput = document.getElementById("transaction-date");
const categorySelect = document.getElementById("category");
const customCategoryInput = document.getElementById("custom-category");
const listContainer = document.getElementById("transaction-list");
const totalIncomeEl = document.getElementById("total-income");
const totalExpensesEl = document.getElementById("total-expenses");
const netBalanceEl = document.getElementById("net-balance");
const errorContainer = document.getElementById("error-container");
const themeToggleBtn = document.getElementById("theme-toggle");
const sortSelect = document.getElementById("sort-by");
const limitInput = document.getElementById("limit-input");

// ===== LOCAL STORAGE =====
function isValidTransaction(record) {
  if (!record || typeof record !== "object") return false;

  // id: non-empty string
  if (typeof record.id !== "string" || record.id.trim() === "") return false;

  // itemName: string, 1–100 chars
  if (
    typeof record.itemName !== "string" ||
    record.itemName.trim().length < 1 ||
    record.itemName.trim().length > 100
  )
    return false;

  // amount: finite number >= 0.01
  if (
    typeof record.amount !== "number" ||
    !isFinite(record.amount) ||
    record.amount < 0.01
  )
    return false;

  // type: exactly "income" or "expense"
  if (record.type !== "income" && record.type !== "expense") return false;

  // category: string, 1–50 chars
  if (
    typeof record.category !== "string" ||
    record.category.trim().length < 1 ||
    record.category.trim().length > 50
  )
    return false;

  // date: parseable date string
  if (typeof record.date !== "string" || isNaN(Date.parse(record.date)))
    return false;

  // createdAt: finite number
  if (typeof record.createdAt !== "number" || !isFinite(record.createdAt))
    return false;

  return true;
}

function loadFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);

  // Key absent — start fresh
  if (raw === null) {
    transactions = [];
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    console.error("Gagal memuat data dari localStorage: JSON tidak valid", e);
    transactions = [];
    return;
  }

  // Top-level value must be an array
  if (!Array.isArray(parsed)) {
    console.error(
      "Gagal memuat data dari localStorage: data bukan array",
      parsed
    );
    transactions = [];
    return;
  }

  const valid = parsed.filter(isValidTransaction);
  const discardedCount = parsed.length - valid.length;

  if (discardedCount > 0) {
    console.warn(
      `loadFromStorage: ${discardedCount} record tidak valid dihapus dari data yang dimuat.`
    );
  }

  transactions = valid;
}

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    clearError();
    return true;
  } catch (e) {
    showError("Data could not be saved.");
    return false;
  }
}

// ===== THEME (DARK/LIGHT) =====
function loadTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const theme = (saved === "light" || saved === "dark") ? saved : "light";
  document.body.dataset.theme = theme;
  updateThemeButton(theme);
}

function toggleTheme() {
  const current = document.body.dataset.theme || "light";
  const next = current === "light" ? "dark" : "light";
  document.body.dataset.theme = next;
  localStorage.setItem(THEME_KEY, next);
  updateThemeButton(next);
}

function updateThemeButton(theme) {
  themeToggleBtn.textContent = theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";
}

// ===== HELPERS =====
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function formatCurrency(amount) {
  return (
    "Rp " +
    new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount)
  );
}

function parseAmount(value) {
  const num = parseInt(value, 10);
  return Number.isNaN(num) ? 0 : Math.max(0, num);
}

function validateTransaction(fields) {
  const errors = {};

  // itemName: required, 1–100 chars after trim
  const itemName = typeof fields.itemName === "string" ? fields.itemName.trim() : "";
  if (itemName.length === 0) {
    errors.itemName = "Item name is required.";
  } else if (itemName.length > 100) {
    errors.itemName = "Item name must be 100 characters or fewer.";
  }

  // amount: numeric, integer, >= 1, <= 999_999_999
  const rawAmount = fields.amount;
  const parsedAmount = typeof rawAmount === "number" ? rawAmount : parseInt(rawAmount, 10);
  if (rawAmount === "" || rawAmount === null || rawAmount === undefined) {
    errors.amount = "Amount is required.";
  } else if (Number.isNaN(parsedAmount) || !isFinite(parsedAmount)) {
    errors.amount = "Amount must be a valid number.";
  } else if (!Number.isInteger(parsedAmount)) {
    errors.amount = "Amount must be a whole number.";
  } else if (parsedAmount < 1) {
    errors.amount = "Amount must be greater than zero.";
  } else if (parsedAmount > 999_999_999) {
    errors.amount = "Amount exceeds the maximum allowed value.";
  }

  // type: required, exactly "income" or "expense"
  if (fields.type !== "income" && fields.type !== "expense") {
    errors.type = "Type must be income or expense.";
  }

  // category: required, 1–50 chars after trim
  const category = typeof fields.category === "string" ? fields.category.trim() : "";
  if (category.length === 0) {
    errors.category = "Category is required.";
  } else if (category.length > 50) {
    errors.category = "Category must be 50 characters or fewer.";
  }

  // date: required, valid date string
  if (!fields.date) {
    errors.date = "Date is required.";
  } else if (isNaN(Date.parse(fields.date))) {
    errors.date = "Date must be a valid date.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

function showError(message) {
  if (errorContainer) errorContainer.textContent = message;
}

function clearError() {
  if (errorContainer) errorContainer.textContent = "";
}

function showFieldErrors(errors) {
  // Clear all existing field errors first
  document.querySelectorAll(".field-error").forEach((el) => {
    el.textContent = "";
  });

  // Map each error key to its corresponding error span ID
  const fieldErrorMap = {
    type:     "error-transaction-type",
    itemName: "error-item-name",
    amount:   "error-amount",
    date:     "error-transaction-date",
    category: "error-category",
  };

  Object.entries(errors).forEach(([field, message]) => {
    const spanId = fieldErrorMap[field];
    if (spanId) {
      const span = document.getElementById(spanId);
      if (span) span.textContent = message;
    }
  });
}

// ===== CATEGORY & CUSTOM CATEGORY =====
function addCustomCategoryOption(category) {
  const opt = document.createElement("option");
  opt.value = category;
  opt.textContent = category;
  categorySelect.appendChild(opt);
}

function ensureCategoryExists(category) {
  if (!category) return;
  const existing = Array.from(categorySelect.options).some(
    (opt) => opt.value === category
  );
  if (!existing) {
    addCustomCategoryOption(category);
  }
}

// ===== TRANSACTIONS =====
function addTransaction(itemName, amount, category, type, date) {
  const { valid, errors } = validateTransaction({ itemName, amount, type, category, date });

  if (!valid) {
    showFieldErrors(errors);
    return;
  }

  transactions.push({
    id: generateId(),
    itemName,
    amount: parseAmount(amount),
    type,
    category,
    date,
    createdAt: Date.now(),
  });

  saveToStorage();
  ensureCategoryExists(category);
  render();
}

function deleteTransaction(id) {
  const snapshot = [...transactions];
  transactions = transactions.filter((t) => t.id !== id);
  const saved = saveToStorage();
  if (!saved) {
    transactions = snapshot;
    render();
    showError("Could not delete: data could not be saved.");
    return;
  }
  render();
}

function getTransactionsSorted() {
  const sorted = [...transactions];

  if (currentSort === "amount-asc") {
    sorted.sort((a, b) => a.amount - b.amount);
  } else if (currentSort === "amount-desc") {
    sorted.sort((a, b) => b.amount - a.amount);
  } else {
    // date (newest first by date field, then by createdAt for ties)
    sorted.sort((a, b) => new Date(b.date) - new Date(a.date) || b.createdAt - a.createdAt);
  }

  return sorted;
}

// ===== RENDER LIST =====
function formatDateDisplay(isoDate) {
  // Convert "2025-06-08" → "08/06/2025"
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

function renderList() {
  const sorted = getTransactionsSorted();
  listContainer.innerHTML = "";

  if (sorted.length === 0) {
    const empty = document.createElement("li");
    empty.className = "transaction-item";
    empty.textContent = "No transactions yet.";
    listContainer.appendChild(empty);
    return;
  }

  sorted.forEach((t) => {
    const li = document.createElement("li");
    li.className = "transaction-item";

    if (highlightLimit > 0 && t.amount >= highlightLimit) {
      li.classList.add("highlight-over-limit");
    }

    // Left info block
    const info = document.createElement("div");
    info.className = "transaction-info";

    const nameEl = document.createElement("span");
    nameEl.className = "transaction-name";
    nameEl.textContent = t.itemName;

    const metaEl = document.createElement("span");
    metaEl.className = "transaction-category";

    // Type badge
    const badge = document.createElement("span");
    badge.className = `type-badge type-${t.type}`;
    badge.textContent = t.type;

    metaEl.appendChild(badge);
    metaEl.appendChild(document.createTextNode(` ${t.category} · ${formatDateDisplay(t.date)}`));

    info.appendChild(nameEl);
    info.appendChild(metaEl);

    // Amount — color-coded by type
    const amountEl = document.createElement("span");
    amountEl.className = `transaction-amount amount-${t.type}`;
    amountEl.textContent = formatCurrency(t.amount);

    // Delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn-delete";
    deleteBtn.type = "button";
    deleteBtn.setAttribute("aria-label", `Delete ${t.itemName}`);
    deleteBtn.textContent = "🗑️";
    deleteBtn.addEventListener("click", () => deleteTransaction(t.id));

    li.appendChild(info);
    li.appendChild(amountEl);
    li.appendChild(deleteBtn);

    listContainer.appendChild(li);
  });
}

// ===== TOTAL BALANCE =====
function updateBalance() {
  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const netBalance = totalIncome - totalExpenses;

  totalIncomeEl.textContent = formatCurrency(totalIncome);
  totalExpensesEl.textContent = formatCurrency(totalExpenses);
  netBalanceEl.textContent = formatCurrency(netBalance);

  netBalanceEl.classList.toggle("negative", netBalance < 0);
  netBalanceEl.classList.toggle("positive", netBalance >= 0);
}

// ===== PIE CHART (Canvas API) =====
const COLORS = [
  "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0",
  "#9966FF", "#FF9F40", "#C9CBCF", "#7BC8A4",
];

function getExpenseChartData() {
  const groups = {};
  transactions
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      groups[t.category] = (groups[t.category] ?? 0) + t.amount;
    });

  const labels = Object.keys(groups);
  const values = Object.values(groups);
  const total = values.reduce((s, v) => s + v, 0);

  return { labels, values, total };
}

function computeLargestRemainderPercentages(values, total) {
  // Work in tenths to get 1-decimal accuracy, sum must equal 1000 (= 100.0%)
  const raw = values.map((v) => (v / total) * 1000);
  const floors = raw.map(Math.floor);
  const remainders = raw.map((r, i) => r - floors[i]);
  let deficit = 1000 - floors.reduce((a, b) => a + b, 0);

  // Give extra tenths to categories with largest fractional remainders
  const indices = remainders
    .map((r, i) => ({ r, i }))
    .sort((a, b) => b.r - a.r);

  for (let k = 0; k < deficit; k++) {
    floors[indices[k].i]++;
  }

  return floors.map((f) => f / 10); // convert tenths back to %
}

function renderChart() {
  const canvas = document.getElementById("expense-chart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const containerWidth = canvas.offsetWidth || 320;
  canvas.width = containerWidth;
  canvas.height = containerWidth; // square

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const { labels, values, total } = getExpenseChartData();

  const textColor = getComputedStyle(document.body).getPropertyValue("--text-color").trim() || "#222";
  const canvasBg  = getComputedStyle(canvas).getPropertyValue("--card-bg").trim() ||
                    getComputedStyle(document.body).getPropertyValue("--card-bg").trim() || "#fff";

  ctx.font = "13px system-ui, sans-serif";
  ctx.fillStyle = textColor;
  ctx.textAlign = "center";

  if (labels.length === 0) {
    // Empty state
    ctx.textBaseline = "middle";
    ctx.fillText("No expense data to display", canvas.width / 2, canvas.height / 2);
    return;
  }

  const centerX = canvas.width / 2;
  const centerY = canvas.width * 0.40;
  const radius  = canvas.width * 0.35;

  // Draw slices
  let startAngle = -Math.PI / 2;
  values.forEach((value, i) => {
    const sliceAngle = (value / total) * 2 * Math.PI;
    const endAngle = startAngle + sliceAngle;

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = COLORS[i % COLORS.length];
    ctx.fill();
    ctx.strokeStyle = canvasBg;
    ctx.lineWidth = 2;
    ctx.stroke();

    startAngle = endAngle;
  });

  // Draw legend
  const percentages = computeLargestRemainderPercentages(values, total);
  let legendY = centerY + radius + 20;
  const swatchSize = 12;
  const lineHeight = 22;

  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  labels.forEach((label, i) => {
    ctx.fillStyle = COLORS[i % COLORS.length];
    ctx.fillRect(10, legendY, swatchSize, swatchSize);

    ctx.fillStyle = textColor;
    ctx.fillText(`${label}: ${percentages[i].toFixed(1)}%`, 10 + swatchSize + 6, legendY);

    legendY += lineHeight;
  });
}

// Re-render chart when container resizes
if (typeof ResizeObserver !== "undefined") {
  const chartCanvas = document.getElementById("expense-chart");
  if (chartCanvas) {
    new ResizeObserver(() => renderChart()).observe(chartCanvas.parentElement || chartCanvas);
  }
}

// ===== MAIN RENDER =====
function render() {
  renderList();
  updateBalance();
  renderChart();
}

// ===== FORM HANDLER =====
function handleFormSubmit(event) {
  event.preventDefault();

  const itemName = itemNameInput.value.trim();
  const amount   = amountInput.value;
  const type     = typeSelect.value;
  const date     = dateInput.value;
  const customCategory = customCategoryInput.value.trim();
  const finalCategory  = customCategory || categorySelect.value;

  const { valid, errors } = validateTransaction({ itemName, amount, type, category: finalCategory, date });

  if (!valid) {
    showFieldErrors(errors);
    return;
  }

  // Clear field errors on success
  showFieldErrors({});

  addTransaction(itemName, parseAmount(amount), finalCategory, type, date);
  form.reset();
}

// ===== SORT & LIMIT HANDLER =====
function handleSortChange() {
  currentSort = sortSelect.value;
  renderList();
}

function handleLimitChange() {
  highlightLimit = parseAmount(limitInput.value);
  renderList();
}

// ===== INIT =====
function init() {
  loadTheme();
  loadFromStorage();

  // pastikan kategori yang sudah ada tersedia di dropdown
  transactions.forEach((t) => ensureCategoryExists(t.category));

  render();

  form.addEventListener("submit", handleFormSubmit);
  themeToggleBtn.addEventListener("click", toggleTheme);
  sortSelect.addEventListener("change", handleSortChange);
  limitInput.addEventListener("input", handleLimitChange);
}

// jalankan setelah DOM siap
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}