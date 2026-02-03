// PWA Installation
let deferredPrompt;
const installBanner = document.getElementById("installBanner");
const installBtn = document.getElementById("installBtn");
const cancelInstallBtn = document.getElementById("cancelInstallBtn");

// Detect beforeinstallprompt event
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // Show install banner after 30 seconds
  setTimeout(() => {
    if (!localStorage.getItem("installDismissed")) {
      installBanner.style.display = "flex";
    }
  }, 30000);
});

// Install button click
installBtn.addEventListener("click", async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      console.log("User accepted the install prompt");
    }
    deferredPrompt = null;
    installBanner.style.display = "none";
  }
});

// Cancel button click
cancelInstallBtn.addEventListener("click", () => {
  installBanner.style.display = "none";
  localStorage.setItem("installDismissed", "true");
});

// Shopping List App
class ShoppingListApp {
  constructor() {
    this.currentMonth = new Date().getMonth();
    this.currentYear = new Date().getFullYear();
    this.lists = this.loadLists();
    this.items = this.loadItems();
    this.currentListId = null;
    this.initEventListeners();
    this.populateYearSelect();
    this.render();
  }

  initEventListeners() {
    // List management
    document
      .getElementById("newListBtn")
      .addEventListener("click", () => this.openNewListModal());
    document
      .getElementById("closeModal")
      .addEventListener("click", () => this.closeModal());
    document
      .getElementById("cancelListBtn")
      .addEventListener("click", () => this.closeModal());
    document
      .getElementById("listForm")
      .addEventListener("submit", (e) => this.saveList(e));

    // Item management
    document
      .getElementById("addItemBtn")
      .addEventListener("click", () => this.addItem());
    document.getElementById("itemInput").addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.addItem();
    });
    document
      .getElementById("markAllBtn")
      .addEventListener("click", () => this.markAllAsBought());
    document
      .getElementById("clearListBtn")
      .addEventListener("click", () => this.clearCurrentList());

    // Month navigation
    document
      .getElementById("prevMonth")
      .addEventListener("click", () => this.changeMonth(-1));
    document
      .getElementById("nextMonth")
      .addEventListener("click", () => this.changeMonth(1));

    // Month actions
    document
      .getElementById("clearMonthBtn")
      .addEventListener("click", () => this.clearMonth());
    document
      .getElementById("exportMonthBtn")
      .addEventListener("click", () => this.exportMonthExcel());

    // Edit item modal
    document
      .getElementById("closeEditModal")
      .addEventListener("click", () => this.closeEditModal());
    document
      .getElementById("cancelEditBtn")
      .addEventListener("click", () => this.closeEditModal());
    document
      .getElementById("itemForm")
      .addEventListener("submit", (e) => this.updateItem(e));
  }

  loadLists() {
    const saved = localStorage.getItem("shoppingLists");
    return saved ? JSON.parse(saved) : [];
  }

  saveLists() {
    localStorage.setItem("shoppingLists", JSON.stringify(this.lists));
  }

  loadItems() {
    const saved = localStorage.getItem("shoppingItems");
    return saved ? JSON.parse(saved) : [];
  }

  saveItems() {
    localStorage.setItem("shoppingItems", JSON.stringify(this.items));
  }

  populateYearSelect() {
    const yearSelect = document.getElementById("listYear");
    const currentYear = new Date().getFullYear();
    for (let year = currentYear - 2; year <= currentYear + 2; year++) {
      const option = document.createElement("option");
      option.value = year;
      option.textContent = year;
      if (year === currentYear) option.selected = true;
      yearSelect.appendChild(option);
    }
  }

  openNewListModal(editList = null) {
    const modal = document.getElementById("newListModal");
    const title = document.getElementById("modalTitle");
    const form = document.getElementById("listForm");
    form.reset();

    if (editList) {
      title.textContent = "Edit List";
      document.getElementById("listId").value = editList.id;
      document.getElementById("listName").value = editList.name;
      document.getElementById("listDescription").value =
        editList.description || "";
      document.getElementById("listMonth").value = editList.month;
      document.getElementById("listYear").value = editList.year;
    } else {
      title.textContent = "Create New List";
      document.getElementById("listId").value = "";
      document.getElementById("listMonth").value = this.currentMonth;
      document.getElementById("listYear").value = this.currentYear;
    }

    modal.classList.add("show");
  }

  closeModal() {
    document.getElementById("newListModal").classList.remove("show");
  }

  saveList(e) {
    e.preventDefault();
    const id = document.getElementById("listId").value;
    const name = document.getElementById("listName").value.trim();
    const description = document.getElementById("listDescription").value.trim();
    const month = parseInt(document.getElementById("listMonth").value);
    const year = parseInt(document.getElementById("listYear").value);

    if (!name) {
      showToast("List name is required", "error");
      return;
    }

    if (id) {
      const listIndex = this.lists.findIndex((l) => l.id === parseInt(id));
      if (listIndex !== -1) {
        this.lists[listIndex] = {
          ...this.lists[listIndex],
          name,
          description,
          month,
          year,
        };
        showToast("List updated!", "success");
      }
    } else {
      const newList = {
        id: Date.now(),
        name,
        description,
        month,
        year,
        createdAt: new Date().toISOString(),
      };
      this.lists.push(newList);
      this.currentListId = newList.id;
      showToast("List created!", "success");
    }

    this.saveLists();
    this.closeModal();
    this.render();
  }

  deleteList(id) {
    if (confirm("Delete this list and all its items?")) {
      this.lists = this.lists.filter((list) => list.id !== id);
      this.items = this.items.filter((item) => item.listId !== id);
      if (this.currentListId === id) this.currentListId = null;
      this.saveLists();
      this.saveItems();
      this.render();
      showToast("List deleted", "success");
    }
  }

  selectList(id) {
    this.currentListId = id;
    this.render();
  }

  addItem() {
    if (!this.currentListId) {
      showToast("Select or create a list first", "warning");
      return;
    }

    const input = document.getElementById("itemInput");
    const categorySelect = document.getElementById("categorySelect");
    const quantityInput = document.getElementById("quantityInput");
    const unitSelect = document.getElementById("unitSelect");
    const priceInput = document.getElementById("priceInput");

    const itemName = input.value.trim();
    const quantity = parseFloat(quantityInput.value) || 1;
    const unit = unitSelect.value;
    const price = priceInput.value ? parseFloat(priceInput.value) : null;

    if (!itemName) {
      showToast("Enter item name", "error");
      return;
    }

    if (quantity <= 0) {
      showToast("Quantity must be greater than 0", "error");
      return;
    }

    const list = this.lists.find((l) => l.id === this.currentListId);

    const newItem = {
      id: Date.now(),
      listId: this.currentListId,
      name: itemName,
      category: categorySelect.value,
      quantity: quantity,
      unit: unit,
      price: price,
      checked: false,
      createdAt: new Date().toISOString(),
      month: list.month,
      year: list.year,
    };

    this.items.push(newItem);
    this.saveItems();

    input.value = "";
    quantityInput.value = "1";
    priceInput.value = "";

    this.render();
    showToast("Item added!", "success");
  }

  deleteItem(id) {
    this.items = this.items.filter((item) => item.id !== id);
    this.saveItems();
    this.render();
    showToast("Item deleted", "success");
  }

  toggleItem(id) {
    const item = this.items.find((item) => item.id === id);
    if (item) {
      item.checked = !item.checked;
      this.saveItems();
      this.render();
    }
  }

  openEditItemModal(id) {
    const item = this.items.find((item) => item.id === id);
    if (!item) return;

    document.getElementById("editItemId").value = item.id;
    document.getElementById("editItemName").value = item.name;
    document.getElementById("editCategory").value = item.category;
    document.getElementById("editQuantity").value = item.quantity;
    document.getElementById("editUnit").value = item.unit;
    document.getElementById("editPrice").value = item.price || "";

    document.getElementById("editItemModal").classList.add("show");
  }

  closeEditModal() {
    document.getElementById("editItemModal").classList.remove("show");
  }

  updateItem(e) {
    e.preventDefault();
    const id = parseInt(document.getElementById("editItemId").value);
    const name = document.getElementById("editItemName").value.trim();
    const category = document.getElementById("editCategory").value;
    const quantity =
      parseFloat(document.getElementById("editQuantity").value) || 1;
    const unit = document.getElementById("editUnit").value;
    const price = document.getElementById("editPrice").value
      ? parseFloat(document.getElementById("editPrice").value)
      : null;

    const item = this.items.find((item) => item.id === id);
    if (item) {
      item.name = name;
      item.category = category;
      item.quantity = quantity;
      item.unit = unit;
      if (price !== null) item.price = price;
      this.saveItems();
      this.closeEditModal();
      this.render();
      showToast("Item updated!", "success");
    }
  }

  markAllAsBought() {
    if (!this.currentListId) return;

    const listItems = this.items.filter(
      (item) => item.listId === this.currentListId,
    );
    if (listItems.length === 0) {
      showToast("No items in list", "warning");
      return;
    }

    listItems.forEach((item) => (item.checked = true));
    this.saveItems();
    this.render();
    showToast("All marked as bought!", "success");
  }

  clearCurrentList() {
    if (!this.currentListId) return;

    if (confirm("Clear all items from this list?")) {
      this.items = this.items.filter(
        (item) => item.listId !== this.currentListId,
      );
      this.saveItems();
      this.render();
      showToast("List cleared", "success");
    }
  }

  getCurrentMonthItems() {
    return this.items.filter(
      (item) =>
        item.month === this.currentMonth && item.year === this.currentYear,
    );
  }

  getCurrentMonthLists() {
    return this.lists.filter(
      (list) =>
        list.month === this.currentMonth && list.year === this.currentYear,
    );
  }

  getStats() {
    const monthItems = this.getCurrentMonthItems();
    const completed = monthItems.filter((item) => item.checked).length;
    const pending = monthItems.length - completed;
    const totalSpent = monthItems
      .filter((item) => item.checked && item.price)
      .reduce((sum, item) => sum + item.price, 0);

    return {
      totalLists: this.getCurrentMonthLists().length,
      totalItems: monthItems.length,
      completed,
      pending,
      totalSpent,
    };
  }

  getCategoryBreakdown() {
    const monthItems = this.getCurrentMonthItems();
    const breakdown = {};

    monthItems.forEach((item) => {
      if (!breakdown[item.category]) {
        breakdown[item.category] = { count: 0, total: 0 };
      }
      breakdown[item.category].count++;
      if (item.checked && item.price) {
        breakdown[item.category].total += item.price;
      }
    });

    return breakdown;
  }

  getRecentItems(limit = 8) {
    const monthItems = this.getCurrentMonthItems();
    return monthItems
      .filter((item) => item.checked && item.price)
      .slice(-limit)
      .reverse();
  }

  changeMonth(direction) {
    this.currentMonth += direction;

    if (this.currentMonth > 11) {
      this.currentMonth = 0;
      this.currentYear++;
    } else if (this.currentMonth < 0) {
      this.currentMonth = 11;
      this.currentYear--;
    }

    const currentList = this.currentListId
      ? this.lists.find((l) => l.id === this.currentListId)
      : null;
    if (
      currentList &&
      (currentList.month !== this.currentMonth ||
        currentList.year !== this.currentYear)
    ) {
      this.currentListId = null;
    }

    this.render();
  }

  clearMonth() {
    if (
      confirm(
        `Clear ALL lists and items for ${this.getMonthName()} ${this.currentYear}?`,
      )
    ) {
      this.items = this.items.filter(
        (item) =>
          !(item.month === this.currentMonth && item.year === this.currentYear),
      );
      this.lists = this.lists.filter(
        (list) =>
          !(list.month === this.currentMonth && list.year === this.currentYear),
      );
      this.currentListId = null;
      this.saveLists();
      this.saveItems();
      this.render();
      showToast("Month cleared", "success");
    }
  }

  // Export to Excel using SheetJS
  exportMonthExcel() {
    const monthItems = this.getCurrentMonthItems();
    const monthLists = this.getCurrentMonthLists();
    const categoryBreakdown = this.getCategoryBreakdown();

    // Create worksheet data
    const ws_data = [
      // Header
      ["Bowec Shopping List - Monthly Report"],
      [`${this.getMonthName()} ${this.currentYear}`],
      [],
      // Summary
      ["Summary"],
      ["Total Lists", "Total Items", "Total Spent", "Pending Items"],
      [
        monthLists.length,
        monthItems.length,
        `₹${this.getStats().totalSpent.toFixed(2)}`,
        this.getStats().pending,
      ],
      [],
      // Lists
      ["Shopping Lists"],
      ["List Name", "Description", "Items Count", "Created Date"],
      ...monthLists.map((list) => {
        const listItems = this.items.filter((item) => item.listId === list.id);
        return [
          list.name,
          list.description || "",
          listItems.length,
          new Date(list.createdAt).toLocaleDateString(),
        ];
      }),
      [],
      // Items
      ["Shopping Items"],
      [
        "Item Name",
        "Category",
        "Quantity",
        "Unit",
        "Price (₹)",
        "Status",
        "List Name",
        "Date Added",
      ],
      ...monthItems.map((item) => {
        const list = this.lists.find((l) => l.id === item.listId);
        return [
          item.name,
          item.category,
          item.quantity,
          item.unit,
          item.price ? item.price.toFixed(2) : "N/A",
          item.checked ? "Bought" : "Pending",
          list ? list.name : "Unknown",
          new Date(item.createdAt).toLocaleDateString(),
        ];
      }),
      [],
      // Category Breakdown
      ["Category Breakdown"],
      ["Category", "Items Count", "Total Spent (₹)"],
      ...Object.entries(categoryBreakdown).map(([category, data]) => [
        category,
        data.count,
        data.total > 0 ? data.total.toFixed(2) : "0.00",
      ]),
      [],
      // Footer
      ["Exported on:", new Date().toLocaleString()],
    ];

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    // Add styles (optional - requires xlsx-style or similar)
    // For now, we'll just set column widths
    ws["!cols"] = [
      { wch: 25 }, // Item Name/List Name
      { wch: 15 }, // Category/Description
      { wch: 10 }, // Quantity
      { wch: 8 }, // Unit
      { wch: 12 }, // Price
      { wch: 10 }, // Status
      { wch: 20 }, // List Name
      { wch: 15 }, // Date
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "Monthly Report");

    // Generate Excel file
    XLSX.writeFile(
      wb,
      `Shopping_${this.getMonthName()}_${this.currentYear}.xlsx`,
    );

    showToast("Excel file exported!", "success");
  }

  getMonthName(month = this.currentMonth) {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return months[month];
  }

  formatQuantity(quantity, unit) {
    // Format quantity with proper decimal places based on unit
    if (unit === "kg" || unit === "L" || unit === "gal") {
      return quantity.toFixed(2);
    } else if (unit === "g" || unit === "mL") {
      return quantity.toFixed(0);
    } else {
      return quantity.toFixed(2).replace(/\.00$/, "");
    }
  }

  render() {
    this.renderLists();
    this.renderShoppingList();
    this.renderMonthlySummary();
    this.renderMonthDisplay();
  }

  renderLists() {
    const container = document.getElementById("listsContainer");
    const monthLists = this.getCurrentMonthLists();

    if (monthLists.length === 0) {
      container.innerHTML = `
                        <div class="no-lists">
                            <div style="font-size: 2.5rem; margin-bottom: 12px;">📋</div>
                            <p><strong>No lists yet</strong></p>
                            <p>Create your first list!</p>
                        </div>
                    `;
      document.getElementById("totalLists").textContent = "0";
      return;
    }

    container.innerHTML = monthLists
      .map((list) => {
        const isActive = this.currentListId === list.id;
        const listItems = this.items.filter((item) => item.listId === list.id);
        const boughtCount = listItems.filter((item) => item.checked).length;

        return `
                        <div class="list-item ${isActive ? "active" : ""}" data-id="${list.id}">
                            <div class="list-item-name">
                                <div class="list-name">${list.name}</div>
                                <div class="list-meta">
                                    <span>${boughtCount}/${listItems.length} bought</span>
                                </div>
                            </div>
                            <div class="list-item-actions">
                                <button class="list-btn edit" title="Edit" data-id="${list.id}">✏️</button>
                                <button class="list-btn delete" title="Delete" data-id="${list.id}">🗑️</button>
                            </div>
                        </div>
                    `;
      })
      .join("");

    document.getElementById("totalLists").textContent = monthLists.length;

    container.querySelectorAll(".list-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        if (!e.target.classList.contains("list-btn")) {
          const listId = parseInt(item.dataset.id);
          this.selectList(listId);
        }
      });
    });

    container.querySelectorAll(".list-btn.edit").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const listId = parseInt(btn.dataset.id);
        const list = this.lists.find((l) => l.id === listId);
        this.openNewListModal(list);
      });
    });

    container.querySelectorAll(".list-btn.delete").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const listId = parseInt(btn.dataset.id);
        this.deleteList(listId);
      });
    });
  }

  renderShoppingList() {
    const listElement = document.getElementById("shoppingList");
    const emptyState = document.getElementById("emptyState");
    const itemCount = document.getElementById("itemCount");

    if (!this.currentListId) {
      listElement.innerHTML = "";
      emptyState.style.display = "block";
      emptyState.innerHTML = `
                        <div>👉</div>
                        <p>Select a list to view items</p>
                        <p style="font-size: 1.1rem; margin-top: 5px;">Or create a new list</p>
                    `;
      itemCount.textContent = "0 items";
      return;
    }

    const listItems = this.items.filter(
      (item) => item.listId === this.currentListId,
    );
    itemCount.textContent = `${listItems.length} ${listItems.length === 1 ? "item" : "items"}`;

    if (listItems.length === 0) {
      listElement.innerHTML = "";
      emptyState.style.display = "block";
      return;
    }

    emptyState.style.display = "none";

    // Changed from 6 columns to 5 columns: checkbox | name/category | quantity | price | actions
    listElement.innerHTML = listItems
      .map((item) => {
        const formattedQty = this.formatQuantity(item.quantity, item.unit);
        return `
                        <li class="shopping-item ${item.checked ? "checked" : ""}" data-id="${item.id}">
                            <input type="checkbox" class="item-checkbox" ${item.checked ? "checked" : ""}>
                            <div>
                                <div class="item-name">${item.name}</div>
                                <div class="item-category">${item.category}</div>
                            </div>
                            <div class="item-quantity">${formattedQty} ${item.unit}</div>
                            <div class="item-price ${!item.price ? "empty" : ""}">
                                ${item.price ? `₹${item.price.toFixed(2)}` : "-"}
                            </div>
                            <div class="item-actions">
                                <button class="action-btn edit" title="Edit">✏️</button>
                                <button class="action-btn delete" title="Delete">🗑️</button>
                            </div>
                        </li>
                    `;
      })
      .join("");

    listElement.querySelectorAll(".item-checkbox").forEach((checkbox) => {
      checkbox.addEventListener("change", (e) => {
        const itemElement = e.target.closest(".shopping-item");
        const itemId = parseInt(itemElement.dataset.id);
        this.toggleItem(itemId);
      });
    });

    listElement.querySelectorAll(".action-btn.edit").forEach((button) => {
      button.addEventListener("click", (e) => {
        const itemElement = e.target.closest(".shopping-item");
        const itemId = parseInt(itemElement.dataset.id);
        this.openEditItemModal(itemId);
      });
    });

    listElement.querySelectorAll(".action-btn.delete").forEach((button) => {
      button.addEventListener("click", (e) => {
        const itemElement = e.target.closest(".shopping-item");
        const itemId = parseInt(itemElement.dataset.id);
        this.deleteItem(itemId);
      });
    });
  }

  renderMonthlySummary() {
    const stats = this.getStats();
    const categoryBreakdown = this.getCategoryBreakdown();
    const recentItems = this.getRecentItems();

    document.getElementById("totalItems").textContent = stats.totalItems;
    document.getElementById("totalSpent").textContent =
      `₹${stats.totalSpent.toFixed(2)}`;
    document.getElementById("pendingItems").textContent = stats.pending;

    const breakdownElement = document.getElementById("categoryBreakdown");
    if (Object.keys(categoryBreakdown).length === 0) {
      breakdownElement.innerHTML =
        '<p style="text-align: center; color: var(--gray); padding: 12px;">No data</p>';
    } else {
      breakdownElement.innerHTML = Object.entries(categoryBreakdown)
        .map(
          ([category, data]) => `
                            <div class="category-item">
                                <span class="category-name">
                                    <span>${category}</span>
                                    <span style="color: var(--gray); font-size: 0.9rem;">(${data.count} items)</span>
                                </span>
                                <span class="category-total">
                                    ${data.total > 0 ? `₹${data.total.toFixed(2)}` : "-"}
                                </span>
                            </div>
                        `,
        )
        .join("");
    }

    const recentElement = document.getElementById("recentItems");
    if (recentItems.length === 0) {
      recentElement.innerHTML =
        '<p style="text-align: center; color: var(--gray); padding: 8px;">No purchases</p>';
    } else {
      recentElement.innerHTML = recentItems
        .map((item) => {
          const formattedQty = this.formatQuantity(item.quantity, item.unit);
          return `
                            <div class="history-item">
                                <div style="display: flex; justify-content: space-between;">
                                    <div class="history-date">${new Date(item.createdAt).toLocaleDateString()}</div>
                                    <div class="history-price">₹${item.price.toFixed(2)}</div>
                                </div>
                                <div class="history-item-name">${item.name} (${formattedQty} ${item.unit})</div>
                                <div class="history-category">${item.category}</div>
                            </div>
                        `;
        })
        .join("");
    }
  }

  renderMonthDisplay() {
    document.getElementById("currentMonthDisplay").textContent =
      `${this.getMonthName()} ${this.currentYear}`;
  }
}

// Toast notification
function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  const toastMessage = document.getElementById("toastMessage");
  const toastIcon = document.getElementById("toastIcon");

  toastMessage.textContent = message;
  toast.className = `toast ${type} show`;

  if (type === "success") toastIcon.textContent = "✓";
  else if (type === "error") toastIcon.textContent = "✗";
  else if (type === "warning") toastIcon.textContent = "⚠️";

  setTimeout(() => toast.classList.remove("show"), 3000);
}

// Initialize app
document.addEventListener("DOMContentLoaded", () => {
  window.app = new ShoppingListApp();
});
