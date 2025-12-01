// ? ===============================
// ? NOTIFICATION SYSTEM
// ? ===============================
function showNotification(message, type = "info", duration = 3000) {
  const container = document.getElementById("notificationContainer");
  const notification = document.createElement("div");

  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <div class="flex items-center">
        <i class="fas ${getNotificationIcon(type)} mr-3"></i>
        <span>${message}</span>
    </div>
  `;
  container.appendChild(notification);

  // Show notification
  setTimeout(() => {
    notification.classList.add("show");
  }, 10);

  // Hide and remove after duration
  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, duration);
  return notification;
}

function getNotificationIcon(type) {
  switch (type) {
    case "success":
      return "fa-check-circle";
    case "warning":
      return "fa-exclamation-triangle";
    case "error":
      return "fa-times-circle";
    case "info":
      return "fa-info-circle";

    default:
      return "fa-info-circle";
  }
}

// ===============================
// LOCAL STORAGE FUNCTIONS
// ===============================
const STORAGE_KEY = "moneyManagerData";

function saveToLocalStorage() {
  try {
    const data = {
      transactions: state.transactions,
      lastSaved: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    updateStorageInfo();
    return true;
  } catch (error) {
    showNotification(error.message || "Save error:", "error");
    return false;
  }
}

function loadFromLocalStorage() {
  try {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      const data = JSON.parse(savedData);

      // Convert date strings back to Date objects
      data.transactions = data.transactions.map((t) => ({
        ...t,
        date: new Date(t.date),
      }));

      updateState({ transactions: data.transactions });
      return true;
    }
    return false;
  } catch (error) {
    console.error("Load error:", error);
    return false;
  }
}

function updateStorageInfo() {
  const savedData = localStorage.getItem(STORAGE_KEY);
  const infoEl = document.getElementById("storageInfo");

  if (savedData) {
    try {
      const data = JSON.parse(savedData);
      const lastSaved = new Date(data.lastSaved);
      const transactionCount = data.transactions.length;

      infoEl.innerHTML = `
              <div class="inline-flex items-center gap-2">
                <i class="fas fa-database text-indigo-500"></i>
                <span>Saved ${transactionCount} transactions</span>
                <span class="text-gray-400">•</span>
                <span>Last saved: ${lastSaved.toLocaleTimeString()}</span>
              </div>
            `;
    } catch (error) {
      infoEl.innerHTML =
        '<span class="text-red-500">Error reading saved data</span>';
    }
  } else {
    infoEl.innerHTML =
      '<span class="text-yellow-500"><i class="fas fa-exclamation-triangle mr-1"></i>No data saved yet</span>';
  }
}

// Auto-save function
function autoSave() {
  if (state.transactions.length > 0) {
    saveToLocalStorage();
  }
}

// ! ===============================
// ! STATE
// ! ===============================
let state = {
  transactions: [],
  filter: "all",
};

// ===============================
// DOM COLLECTORS
// ===============================
const el = {
  form: document.getElementById("transactionForm"),
  list: document.getElementById("transactionList"),
  categoryBreakdown: document.getElementById("categoryBreakdown"),
  monthlySummary: document.getElementById("monthlySummary"),
  balance: document.getElementById("totalBalance"),
  income: document.getElementById("totalIncome"),
  expenses: document.getElementById("totalExpenses"),
  filters: document.querySelectorAll(".filter-btn"),
};

// ===============================
// EVENT LISTENERS
// ===============================
el.form.addEventListener("submit", handleAddTransaction);

el.filters.forEach((btn) => btn.addEventListener("click", handleFilterChange));

// * ===============================
// * EVENT HANDLERS
// * ===============================
function handleAddTransaction(e) {
  // Stop page reload
  e.preventDefault();

  try {
    // Get form values
    const description = document.getElementById("description").value;
    const amount = parseFloat(document.getElementById("amount").value);
    const type = document.querySelector('input[name="type"]:checked').value;
    const category = document.getElementById("category").value;

    // Validate amount
    if (isNaN(amount) || amount <= 0) {
      showNotification("Please enter a valid amount greater than 0", "warning");
      return;
    }

    // Create transaction object
    const newTransaction = {
      id: Date.now(),
      description,
      amount,
      type,
      category,
      date: new Date(),
    };

    // Update state & re-render
    updateState({
      transactions: [...state.transactions, newTransaction],
    });

    // Show success notification
    const typeText = type === "income" ? "Income" : "Expense";
    showNotification(`${typeText} added: $${amount.toFixed(2)}`, "success");

    // Auto-save after adding transaction
    autoSave();

    // Reset form
    e.target.reset();
    // Set default type
    document.querySelector('input[value="income"]').checked = true;
  } catch (error) {
    // Show error notification
    showNotification(error.message || "Something went wrong!", "error");
  }
}

function handleFilterChange(e) {
  resetFilterButtons();
  activateFilterButton(e.target);
  const { filter } = e.target.dataset;
  updateState({ filter });
}

// ===============================
// UI HELPERS
// ===============================
function resetFilterButtons() {
  el.filters.forEach((b) =>
    b.classList.replace("bg-indigo-600", "bg-gray-200")
  );
  el.filters.forEach((b) => b.classList.replace("text-white", "text-gray-700"));
}

function activateFilterButton(btn) {
  btn.classList.replace("bg-gray-200", "bg-indigo-600");
  btn.classList.replace("text-gray-700", "text-white");
}

// ===============================
// STATE HELPERS
// ===============================
function deleteTransaction(id) {
  try {
    const transaction = state.transactions.find((t) => t.id === id);
    // Multiple condition checking with ternary operator ??
    transaction
      ? confirm(`Delete ${transaction.description}?`) &&
        (updateState({
          transactions: state.transactions.filter((t) => t.id !== id),
        }),
        showNotification("Transaction deleted!", "info"),
        autoSave())
      : null;
  } catch (error) {
    showNotification(
      error.message || "Failed to delete the transaction!",
      "error"
    );
  }
}

function getFilteredTransactions() {
  if (state.filter === "income") {
    return state.transactions.filter((t) => t.type === "income");
  }
  if (state.filter === "expense") {
    return state.transactions.filter((t) => t.type === "expense");
  }
  return state.transactions;
}

function calculateTotals() {
  try {
    const income = state.transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const expenses = state.transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalIncome: income,
      totalExpenses: expenses,
      totalBalance: income - expenses,
    };
  } catch (error) {
    showNotification(
      error.message || "Issue when trying to calculate totals!",
      "error"
    );
    return { totalIncome: 0, totalExpenses: 0, totalBalance: 0 };
  }
}

function getCategoryBreakdown() {
  return state.transactions.reduce((acc, t) => {
    acc[t.category] ??= { income: 0, expense: 0 };
    acc[t.category][t.type] += t.amount;
    return acc;
  }, {});
}

function getMonthlySummary() {
  return state.transactions.reduce((acc, t) => {
    const month = t.date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    acc[month] ??= { income: 0, expense: 0 };
    acc[month][t.type] += t.amount;
    return acc;
  }, {});
}

// ===============================
// RENDER FUNCTIONS
// ===============================
function renderTransactions() {
  const transactions = getFilteredTransactions();

  if (transactions.length === 0) {
    el.list.innerHTML = `
            <div class="text-center py-8 text-gray-500">
              <i class="fas fa-receipt text-4xl mb-3"></i>
              <p>No transactions found</p>
              <p class="text-sm mt-2">${
                state.filter === "all"
                  ? "Add your first transaction above!"
                  : `No ${state.filter} transactions found`
              }</p>
            </div>
          `;
    return;
  }

  const html = transactions
    .map((t) => {
      const isIncome = t.type === "income";
      return `
        <div class="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
          <div class="flex items-center space-x-4">
            <div class="w-10 h-10 rounded-full flex items-center justify-center ${
              isIncome
                ? "bg-green-100 text-green-600"
                : "bg-red-100 text-red-600"
            }">
              <i class="fas ${isIncome ? "fa-arrow-down" : "fa-arrow-up"}"></i>
            </div>
            <div>
              <p class="font-medium">${t.description}</p>
              <p class="text-sm text-gray-500 capitalize">${
                t.category
              } • ${t.date.toLocaleDateString()}</p>
            </div>
          </div>
          <div class="flex items-center space-x-3">
            <span class="font-bold ${
              isIncome ? "text-green-600" : "text-red-600"
            }">${isIncome ? "+" : "-"}$${t.amount.toFixed(2)}</span>
            <button onclick="deleteTransaction(${
              t.id
            })" class="hover:text-red-500 text-gray-400 transition-colors">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      `;
    })
    .join("");

  el.list.innerHTML = html;
}
function renderCategoryBreakdown() {
  const data = getCategoryBreakdown();
  const fragment = document.createDocumentFragment();

  if (Object.keys(data).length === 0) {
    el.categoryBreakdown.innerHTML = `
       <div class="text-center py-4 text-gray-500">
           <p>No category data yet</p>
       </div>
    `;
    return;
  }

  Object.entries(data).forEach(([category, totals]) => {
    const net = totals.income - totals.expense;
    const totalIncome = calculateTotals().totalIncome;
    const percent =
      totalIncome > 0 ? ((net / totalIncome) * 100).toFixed(1) : 0;

    const div = document.createElement("div");
    div.className = "flex items-center justify-between";
    div.innerHTML = `
      <div class="flex items-center space-x-3">
        <div class="w-3 h-3 rounded-full bg-indigo-500"></div>
        <span class="font-medium capitalize">${category}</span>
      </div>
      <div class="text-right">
        <p class="font-bold ${
          net >= 0 ? "text-green-600" : "text-red-600"
        }">$${net.toFixed(2)}</p>
        <p class="text-xs text-gray-500">${percent}%</p>
      </div>
    `;

    fragment.appendChild(div);
  });

  el.categoryBreakdown.innerHTML = "";
  el.categoryBreakdown.appendChild(fragment);
}

function renderMonthlySummary() {
  const data = getMonthlySummary();

  if (Object.keys(data).length === 0) {
    el.monthlySummary.innerHTML = `
            <div class="text-center py-4 text-gray-500">
              <p>No monthly data yet</p>
            </div>
          `;
    return;
  }

  el.monthlySummary.innerHTML = Object.entries(data)
    .map(([month, totals]) => {
      const net = totals.income - totals.expense;
      return `
        <div class="flex justify-between py-2 border-b">
          <span class="font-medium">${month}</span>
          <div class="text-right">
            <p class="${
              net >= 0 ? "text-green-600" : "text-red-600"
            } font-bold">
              $${net.toFixed(2)}
            </p>
            <p class="text-xs text-gray-500">+$${totals.income.toFixed(
              2
            )} / -$${totals.expense.toFixed(2)}</p>
          </div>
        </div>
      `;
    })
    .join("");
}

function updateSummaryCards() {
  const { totalIncome, totalExpenses, totalBalance } = calculateTotals();
  el.balance.textContent = `$${totalBalance.toFixed(2)}`;
  el.income.textContent = `$${totalIncome.toFixed(2)}`;
  el.expenses.textContent = `$${totalExpenses.toFixed(2)}`;

  // Add visual feedback for negative balance
  if (totalBalance < 0) {
    el.balance.classList.add("text-red-600");
    el.balance.classList.remove("text-gray-800");
  } else {
    el.balance.classList.remove("text-red-600");
    el.balance.classList.add("text-gray-800");
  }
}

function renderAll() {
  renderTransactions();
  renderCategoryBreakdown();
  renderMonthlySummary();
  updateSummaryCards();
  updateStorageInfo();
}
// ===============================
// STATE UPDATE
// ===============================
function updateState(newState) {
  state = { ...state, ...newState };
  renderAll();
}

// ===============================
// INIT
// ===============================
function init() {
  activateFilterButton(el.filters[0]);
  loadFromLocalStorage();
  renderAll();
  window.deleteTransaction = deleteTransaction;

  // Welcome notification
  setTimeout(() => {
    showNotification(
      "Money Manager loaded! Your data is automatically saved.",
      "info",
      4000
    );
  }, 5000);
}

// Initialize the app
init();
