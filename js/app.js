// ===== STATE & CONSTANTS =====
const STORAGE_KEY = "expense_visualizer_transactions";
const THEME_KEY = "expense_visualizer_theme";

let transactions = [];
let chart = null;
let currentSort = "date";
let highlightLimit = 0;

// ===== DOM ELEMENTS =====
const form = document.getElementById("transaction-form");
const itemNameInput = document.getElementById("item-name");
const amountInput = document.getElementById("amount");
const categorySelect = document.getElementById("category");
const customCategoryInput = document.getElementById("custom-category");
const listContainer = document.getElementById("transaction-list");
const totalBalanceEl = document.getElementById("total-balance");
const themeToggleBtn = document.getElementById("theme-toggle");
const sortSelect = document.getElementById("sort-by");
const limitInput = document.getElementById("limit-input");

// ===== LOCAL STORAGE =====
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      transactions = JSON.parse(raw);
    }
  } catch (e) {
    console.error("Gagal memuat data dari localStorage", e);
    transactions = [];
  }
}

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  } catch (e) {
    console.error("Gagal menyimpan data ke localStorage", e);
  }
}

// ===== THEME (DARK/LIGHT) =====
function loadTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) {
    document.body.dataset.theme = saved;
    updateThemeButton(saved);
  }
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

function formatNumber(num) {
  return new Intl.NumberFormat("id-ID").format(num);
}

function parseAmount(value) {
  const num = parseInt(value, 10);
  return Number.isNaN(num) ? 0 : Math.max(0, num);
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
function addTransaction(itemName, amount, category) {
  const transaction = {
    id: generateId(),
    itemName,
    amount: parseAmount(amount),
    category,
    createdAt: Date.now(),
  };

  transactions.push(transaction);
  saveToStorage();
  ensureCategoryExists(category);
  render();
}

function deleteTransaction(id) {
  transactions = transactions.filter((t) => t.id !== id);
  saveToStorage();
  render();
}

function getTransactionsSorted() {
  const sorted = [...transactions];

  if (currentSort === "amount-asc") {
    sorted.sort((a, b) => a.amount - b.amount);
  } else if (currentSort === "amount-desc") {
    sorted.sort((a, b) => b.amount - a.amount);
  } else {
    // date (newest first)
    sorted.sort((a, b) => b.createdAt - a.createdAt);
  }

  return sorted;
}

// ===== RENDER LIST =====
function renderList() {
  const sorted = getTransactionsSorted();
  listContainer.innerHTML = "";

  if (sorted.length === 0) {
    const empty = document.createElement("li");
    empty.className = "transaction-item";
    empty.textContent = "Belum ada transaksi.";
    listContainer.appendChild(empty);
    return;
  }

  sorted.forEach((t) => {
    const li = document.createElement("li");
    li.className = "transaction-item";

    const isOverLimit = highlightLimit > 0 && t.amount >= highlightLimit;
    if (isOverLimit) {
      li.classList.add("highlight-over-limit");
    }

    const info = document.createElement("div");
    info.className = "transaction-info";

    const nameEl = document.createElement("span");
    nameEl.className = "transaction-name";
    nameEl.textContent = t.itemName;

    const categoryEl = document.createElement("span");
    categoryEl.className = "transaction-category";
    categoryEl.textContent = t.category;

    info.appendChild(nameEl);
    info.appendChild(categoryEl);

    const amountEl = document.createElement("span");
    amountEl.className = "transaction-amount";
    amountEl.textContent = "Rp " + formatNumber(t.amount);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn-delete";
    deleteBtn.type = "button";
    deleteBtn.textContent = "🗑️ Delete";
    deleteBtn.addEventListener("click", () => {
      deleteTransaction(t.id);
    });

    li.appendChild(info);
    li.appendChild(amountEl);
    li.appendChild(deleteBtn);

    listContainer.appendChild(li);
  });
}

// ===== TOTAL BALANCE =====
function updateBalance() {
  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  totalBalanceEl.textContent = "Rp " + formatNumber(total);
}

// ===== PIE CHART (Chart.js) =====
function getChartData() {
  const categories = {};
  transactions.forEach((t) => {
    if (!categories[t.category]) {
      categories[t.category] = 0;
    }
    categories[t.category] += t.amount;
  });

  const labels = Object.keys(categories);
  const data = Object.values(categories);

  const backgroundColors = [
    "rgb(255, 99, 132)",
    "rgb(54, 162, 235)",
    "rgb(255, 205, 86)",
    "rgb(75, 192, 192)",
    "rgb(153, 102, 255)",
    "rgb(255, 159, 64)",
  ];

  return {
    labels,
    datasets: [
      {
        label: "Spending by Category",
        data,
        backgroundColor: backgroundColors.slice(0, labels.length),
      },
    ],
  };
}

function renderChart() {
  const ctx = document.getElementById("expense-chart");

  if (!chart) {
    chart = new Chart(ctx, {
      type: "pie",
      data: getChartData(),
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "bottom",
          },
        },
      },
    });
  } else {
    chart.data = getChartData();
    chart.update();
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
  const amount = amountInput.value;
  const category = categorySelect.value;
  const customCategory = customCategoryInput.value.trim();

  if (!itemName || !amount || !category) {
    alert("Isi semua field yang wajib (Item Name, Amount, Category).");
    return;
  }

  const finalCategory = customCategory || category;

  addTransaction(itemName, amount, finalCategory);

  // reset form
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