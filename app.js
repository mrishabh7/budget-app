// ===== Application State =====
let currentData = createEmptyBudget();

// ===== DOM Elements =====
const monthSelect = document.getElementById('monthSelect');
const yearSelect = document.getElementById('yearSelect');
const saveBtn = document.getElementById('saveDataBtn');
const loadBtn = document.getElementById('loadDataBtn');
const myIncomeInput = document.getElementById('myIncome');
const partnerIncomeInput = document.getElementById('partnerIncome');
const totalIncomeDisplay = document.getElementById('totalIncomeDisplay');

// ===== Initialize App =====
document.addEventListener('DOMContentLoaded', () => {
    initializeYearSelector();
    initializeMonthSelector();
    generateInputFields();
    attachEventListeners();
    updateHistoryList();
    tryLoadCurrentMonth();
});

// ===== Year Selector =====
function initializeYearSelector() {
    const currentYear = new Date().getFullYear();
    for (let year = currentYear - 5; year <= currentYear + 2; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        if (year === currentYear) option.selected = true;
        yearSelect.appendChild(option);
    }
}

// ===== Month Selector =====
function initializeMonthSelector() {
    const currentMonth = new Date().getMonth() + 1;
    monthSelect.value = currentMonth.toString().padStart(2, '0');
}

// ===== Generate Input Fields =====
function generateInputFields() {
    Object.keys(CATEGORIES).forEach(categoryKey => {
        const category = CATEGORIES[categoryKey];
        const container = document.getElementById(`${categoryKey}-inputs`);
        if (!container) return;

        container.innerHTML = '';

        Object.keys(category.items).forEach(itemKey => {
            const item = category.items[itemKey];
            const inputItem = document.createElement('div');
            inputItem.className = 'input-item';
            inputItem.innerHTML = `
                <label for="${categoryKey}_${itemKey}">${item.label}</label>
                <div class="input-wrapper">
                    <span class="currency">₹</span>
                    <input type="number" 
                           id="${categoryKey}_${itemKey}" 
                           data-category="${categoryKey}" 
                           data-item="${itemKey}"
                           placeholder="0" 
                           min="0"
                           value="${currentData[categoryKey][itemKey] || 0}">
                </div>
            `;
            container.appendChild(inputItem);
        });
    });
}

// ===== Attach Event Listeners =====
function attachEventListeners() {
    // Income inputs
    myIncomeInput.addEventListener('input', updateIncomeFromInputs);
    partnerIncomeInput.addEventListener('input', updateIncomeFromInputs);

    // Category inputs
    document.querySelectorAll('.input-grid input').forEach(input => {
        input.addEventListener('input', (e) => {
            const category = e.target.dataset.category;
            const item = e.target.dataset.item;
            currentData[category][item] = parseFloat(e.target.value) || 0;
            updateCalculations();
        });
    });

    // Save button
    saveBtn.addEventListener('click', saveCurrentData);

    // Load button
    loadBtn.addEventListener('click', loadSelectedMonth);
}

// ===== Toggle Section =====
function toggleSection(categoryKey) {
    const section = document.querySelector(`[data-category="${categoryKey}"]`);
    if (section) {
        section.classList.toggle('collapsed');
    }
}

// ===== Income Calculation =====
function updateIncomeFromInputs() {
    currentData.myIncome = parseFloat(myIncomeInput.value) || 0;
    currentData.partnerIncome = parseFloat(partnerIncomeInput.value) || 0;
    currentData.income = currentData.myIncome + currentData.partnerIncome;
    updateIncomeDisplay();
    updateCalculations();
}

function updateIncomeDisplay() {
    const total = (currentData.myIncome || 0) + (currentData.partnerIncome || 0);
    totalIncomeDisplay.textContent = formatCurrency(total);
}

// ===== Calculate Category Total =====
function calculateCategoryTotal(categoryKey) {
    let total = 0;
    Object.keys(currentData[categoryKey]).forEach(item => {
        total += currentData[categoryKey][item] || 0;
    });
    return total;
}

// ===== Update All Calculations =====
function updateCalculations() {
    const income = currentData.income;

    // Calculate category totals
    const essentialsTotal = calculateCategoryTotal('essentials');
    const emisTotal = calculateCategoryTotal('emis');
    const nonEssentialsTotal = calculateCategoryTotal('nonEssentials');
    const investmentsTotal = calculateCategoryTotal('investments');
    const assetsTotal = calculateCategoryTotal('assets');
    const liabilitiesTotal = calculateCategoryTotal('liabilities');

    // Total expenses (excluding investments, assets, liabilities)
    const totalExpenses = essentialsTotal + emisTotal + nonEssentialsTotal;

    // Savings = Residual (income - expenses) + Investments
    const residualSavings = income - totalExpenses - investmentsTotal;
    const totalSavingsAndInvestments = residualSavings + investmentsTotal; // This equals income - expenses without investments
    const savingsRate = income > 0 ? ((income - totalExpenses) / income) * 100 : 0;

    // Net Worth
    const netWorth = assetsTotal - liabilitiesTotal;

    // Update category totals display
    document.getElementById('essentialsTotal').textContent = formatCurrency(essentialsTotal);
    document.getElementById('emisTotal').textContent = formatCurrency(emisTotal);
    document.getElementById('nonEssentialsTotal').textContent = formatCurrency(nonEssentialsTotal);
    document.getElementById('investmentsTotal').textContent = formatCurrency(investmentsTotal);
    document.getElementById('assetsTotal').textContent = formatCurrency(assetsTotal);
    document.getElementById('liabilitiesTotal').textContent = formatCurrency(liabilitiesTotal);

    // Update summary
    document.getElementById('summaryIncome').textContent = formatCurrency(income);
    document.getElementById('summaryExpenses').textContent = formatCurrency(totalExpenses);
    document.getElementById('summarySavings').textContent = formatCurrency(income - totalExpenses);
    document.getElementById('summarySavingsRate').textContent = savingsRate.toFixed(1) + '%';

    // Update chart
    updateExpenseChart(essentialsTotal, emisTotal, nonEssentialsTotal, investmentsTotal);

    // Update health indicators (pass savings as income - totalExpenses)
    updateHealthIndicators(income, essentialsTotal, emisTotal, nonEssentialsTotal, income - totalExpenses, investmentsTotal);

    // Update net worth
    document.getElementById('networthAssets').textContent = formatCurrency(assetsTotal);
    document.getElementById('networthLiabilities').textContent = formatCurrency(liabilitiesTotal);
    document.getElementById('networthTotal').textContent = formatCurrency(netWorth);
}

// ===== Update Expense Chart =====
function updateExpenseChart(essentials, emis, nonEssentials, investments) {
    const total = essentials + emis + nonEssentials + investments;
    const chart = document.getElementById('expenseChart');
    const legend = document.getElementById('chartLegend');

    // Calculate percentages
    const essentialsPercent = total > 0 ? (essentials / total) * 100 : 0;
    const emisPercent = total > 0 ? (emis / total) * 100 : 0;
    const nonEssentialsPercent = total > 0 ? (nonEssentials / total) * 100 : 0;
    const investmentsPercent = total > 0 ? (investments / total) * 100 : 0;

    // Calculate degrees for conic gradient
    const essentialsDeg = essentialsPercent * 3.6;
    const emisDeg = emisPercent * 3.6;
    const nonEssentialsDeg = nonEssentialsPercent * 3.6;
    const investmentsDeg = investmentsPercent * 3.6;

    // Update chart gradient
    let gradientParts = [];
    let currentDeg = 0;

    if (essentials > 0) {
        gradientParts.push(`var(--color-essentials) ${currentDeg}deg ${currentDeg + essentialsDeg}deg`);
        currentDeg += essentialsDeg;
    }
    if (emis > 0) {
        gradientParts.push(`var(--color-emis) ${currentDeg}deg ${currentDeg + emisDeg}deg`);
        currentDeg += emisDeg;
    }
    if (nonEssentials > 0) {
        gradientParts.push(`var(--color-non-essentials) ${currentDeg}deg ${currentDeg + nonEssentialsDeg}deg`);
        currentDeg += nonEssentialsDeg;
    }
    if (investments > 0) {
        gradientParts.push(`var(--color-investments) ${currentDeg}deg ${currentDeg + investmentsDeg}deg`);
        currentDeg += investmentsDeg;
    }

    if (gradientParts.length > 0) {
        // Fill remaining with background
        if (currentDeg < 360) {
            gradientParts.push(`var(--bg-secondary) ${currentDeg}deg 360deg`);
        }
        chart.style.background = `conic-gradient(${gradientParts.join(', ')})`;
    } else {
        chart.style.background = 'var(--bg-secondary)';
    }

    // Update chart center
    document.getElementById('chartTotal').textContent = formatCurrencyCompact(total);

    // Update legend
    legend.innerHTML = `
        <div class="legend-item">
            <div class="legend-color" style="background: var(--color-essentials)"></div>
            <span class="legend-label">Essentials</span>
            <span class="legend-value">${formatCurrencyCompact(essentials)}</span>
            <span class="legend-percentage">${essentialsPercent.toFixed(1)}%</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background: var(--color-emis)"></div>
            <span class="legend-label">EMIs</span>
            <span class="legend-value">${formatCurrencyCompact(emis)}</span>
            <span class="legend-percentage">${emisPercent.toFixed(1)}%</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background: var(--color-non-essentials)"></div>
            <span class="legend-label">Non-Essentials</span>
            <span class="legend-value">${formatCurrencyCompact(nonEssentials)}</span>
            <span class="legend-percentage">${nonEssentialsPercent.toFixed(1)}%</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background: var(--color-investments)"></div>
            <span class="legend-label">Investments</span>
            <span class="legend-value">${formatCurrencyCompact(investments)}</span>
            <span class="legend-percentage">${investmentsPercent.toFixed(1)}%</span>
        </div>
    `;
}

// ===== Update Health Indicators =====
function updateHealthIndicators(income, essentials, emis, nonEssentials, savings, investments) {
    if (income <= 0) {
        // Reset all indicators
        ['essentials', 'emis', 'nonEssentials', 'savings'].forEach(key => {
            const el = document.getElementById(`health-${key}`);
            el.className = 'health-item';
            el.querySelector('.health-percentage').textContent = '0%';
            el.querySelector('.health-progress').style.width = '0%';
            el.querySelector('.health-status').textContent = 'Enter income to see status';
        });
        return;
    }

    // Essentials (< 50% is ideal)
    const essentialsPercent = (essentials / income) * 100;
    updateHealthItem('essentials', essentialsPercent, HEALTH_THRESHOLDS.essentials, false, 'essentials');

    // EMIs (< 20% is ideal)
    const emisPercent = (emis / income) * 100;
    updateHealthItem('emis', emisPercent, HEALTH_THRESHOLDS.emis, false, 'emis');

    // Non-Essentials (< 15% is ideal)
    const nonEssentialsPercent = (nonEssentials / income) * 100;
    updateHealthItem('nonEssentials', nonEssentialsPercent, HEALTH_THRESHOLDS.nonEssentials, false, 'nonEssentials');

    // Savings/Investments (> 20% is ideal, higher is better)
    const savingsPercent = (savings / income) * 100;
    updateHealthItem('savings', savingsPercent, HEALTH_THRESHOLDS.savings, true, 'savings');
}

function updateHealthItem(key, percentage, thresholds, inverted, category) {
    const el = document.getElementById(`health-${key}`);
    const progress = el.querySelector('.health-progress');
    const percentageEl = el.querySelector('.health-percentage');
    const statusEl = el.querySelector('.health-status');

    percentageEl.textContent = percentage.toFixed(1) + '%';
    progress.style.width = Math.min(percentage, 100) + '%';

    let status, statusClass;

    if (inverted) {
        // For savings: higher is better
        if (percentage >= thresholds.good) {
            status = `✅ Excellent! Saving ${percentage.toFixed(0)}% of income.`;
            statusClass = 'good';
        } else if (percentage >= thresholds.warning) {
            status = `⚠️ Aim for >${thresholds.good}%. Currently ${percentage.toFixed(0)}%.`;
            statusClass = 'warning';
        } else {
            status = `❌ Low savings (${percentage.toFixed(0)}%). Target: >${thresholds.good}%`;
            statusClass = 'danger';
        }
    } else {
        // For expenses: lower is better
        const categoryLabels = {
            essentials: 'Essentials',
            emis: 'EMIs',
            nonEssentials: 'Non-essentials'
        };
        const label = categoryLabels[category] || category;

        if (percentage <= thresholds.good) {
            status = `✅ ${label} at ${percentage.toFixed(0)}%. Well managed!`;
            statusClass = 'good';
        } else if (percentage <= thresholds.warning) {
            status = `⚠️ ${percentage.toFixed(0)}% is slightly high. Aim for <${thresholds.good}%.`;
            statusClass = 'warning';
        } else {
            status = `❌ ${percentage.toFixed(0)}% is too high. Reduce to <${thresholds.warning}%.`;
            statusClass = 'danger';
        }
    }

    el.className = `health-item ${statusClass}`;
    statusEl.textContent = status;
}

// ===== Save Current Data =====
function saveCurrentData() {
    const year = yearSelect.value;
    const month = monthSelect.value;

    saveBudgetData(year, month, currentData);
    updateHistoryList();
    showToast(`Saved budget for ${getMonthName(month)} ${year}`);

    // Trigger cloud sync if enabled
    if (typeof CloudSync !== 'undefined' && CloudSync.syncEnabled) {
        CloudSync.pushToCloud();
    }
}

// ===== Load Selected Month =====
function loadSelectedMonth() {
    const year = yearSelect.value;
    const month = monthSelect.value;

    const data = loadBudgetData(year, month);
    if (data) {
        currentData = data;
        populateFormWithData();
        updateCalculations();
        showToast(`Loaded budget for ${getMonthName(month)} ${year}`);
    } else {
        showToast(`No data found for ${getMonthName(month)} ${year}`);
    }
}

// ===== Try Load Current Month =====
function tryLoadCurrentMonth() {
    const year = yearSelect.value;
    const month = monthSelect.value;

    const data = loadBudgetData(year, month);
    if (data) {
        currentData = data;
        populateFormWithData();
        updateCalculations();
    } else {
        updateCalculations();
    }
}

// ===== Populate Form with Data =====
function populateFormWithData() {
    // Set income fields
    myIncomeInput.value = currentData.myIncome || '';
    partnerIncomeInput.value = currentData.partnerIncome || '';
    updateIncomeDisplay();

    // Set category values
    Object.keys(CATEGORIES).forEach(categoryKey => {
        Object.keys(CATEGORIES[categoryKey].items).forEach(itemKey => {
            const input = document.getElementById(`${categoryKey}_${itemKey}`);
            if (input) {
                input.value = currentData[categoryKey][itemKey] || '';
            }
        });
    });
}

// ===== Update History List =====
function updateHistoryList() {
    const historyList = document.getElementById('historyList');
    const savedMonths = getSavedMonths();

    if (savedMonths.length === 0) {
        historyList.innerHTML = '<p class="no-data">No saved data yet</p>';
        return;
    }

    historyList.innerHTML = savedMonths.map(({ year, month }) => {
        const data = loadBudgetData(year, month);
        const income = data ? data.income : 0;
        return `
            <div class="history-item" onclick="loadHistoryMonth('${year}', '${month}')">
                <span class="history-month">${getMonthName(month)} ${year}</span>
                <span class="history-amount">${formatCurrency(income)}</span>
                <button class="history-delete" onclick="deleteHistoryMonth(event, '${year}', '${month}')" title="Delete">🗑️</button>
            </div>
        `;
    }).join('');
}

// ===== Load History Month =====
function loadHistoryMonth(year, month) {
    yearSelect.value = year;
    monthSelect.value = month;
    loadSelectedMonth();
}

// ===== Delete History Month =====
function deleteHistoryMonth(event, year, month) {
    event.stopPropagation();
    if (confirm(`Delete budget for ${getMonthName(month)} ${year}?`)) {
        deleteBudgetData(year, month);
        updateHistoryList();
        showToast(`Deleted budget for ${getMonthName(month)} ${year}`);
    }
}

// ===== Toast Notification =====
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.querySelector('.toast-message').textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ===== Theme Toggle =====
const themeToggle = document.getElementById('themeToggle');
const THEME_KEY = 'budget_theme';

function initializeTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        themeToggle.textContent = '☀️';
    }
}

function toggleTheme() {
    const isLight = document.body.classList.toggle('light-theme');
    themeToggle.textContent = isLight ? '☀️' : '🌙';
    localStorage.setItem(THEME_KEY, isLight ? 'light' : 'dark');
}

themeToggle.addEventListener('click', toggleTheme);

// Initialize theme on load
initializeTheme();

// ===== Category Manager =====
const settingsBtn = document.getElementById('settingsBtn');
const categoryModal = document.getElementById('categoryModal');
let editingCategories = null;
let activeTab = 'essentials';

settingsBtn.addEventListener('click', openCategoryModal);

function openCategoryModal() {
    // Create a deep copy of categories for editing
    editingCategories = JSON.parse(JSON.stringify(CATEGORIES));
    renderCategoryTabs();
    renderCategoryItems(activeTab);
    categoryModal.classList.add('show');
}

function closeCategoryModal() {
    categoryModal.classList.remove('show');
    editingCategories = null;
}

// Close modal on overlay click
categoryModal.addEventListener('click', (e) => {
    if (e.target === categoryModal) {
        closeCategoryModal();
    }
});

function renderCategoryTabs() {
    const tabsContainer = document.getElementById('categoryTabs');
    const tabs = [
        { key: 'essentials', label: '🏠 Essentials' },
        { key: 'emis', label: '🏦 EMIs' },
        { key: 'nonEssentials', label: '🛍️ Non-Essentials' },
        { key: 'investments', label: '📈 Investments' },
        { key: 'assets', label: '🏆 Assets' },
        { key: 'liabilities', label: '💳 Liabilities' }
    ];

    tabsContainer.innerHTML = tabs.map(tab => `
        <button class="tab ${tab.key === activeTab ? 'active' : ''}" 
                onclick="switchCategoryTab('${tab.key}')">
            ${tab.label}
        </button>
    `).join('');
}

function switchCategoryTab(tabKey) {
    activeTab = tabKey;
    renderCategoryTabs();
    renderCategoryItems(tabKey);
}

function renderCategoryItems(categoryKey) {
    const container = document.getElementById('categoryManagerContent');
    const category = editingCategories[categoryKey];

    container.innerHTML = `
        <div class="category-manager-section">
            <div class="category-list">
                ${Object.keys(category.items).map(itemKey => `
                    <div class="category-item" data-key="${itemKey}">
                        <input type="text" value="${category.items[itemKey].label}" 
                               onchange="updateCategoryItem('${categoryKey}', '${itemKey}', this.value)">
                        <div class="category-item-actions">
                            <button class="category-item-btn delete" 
                                    onclick="deleteCategoryItem('${categoryKey}', '${itemKey}')"
                                    title="Delete">🗑️</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            <button class="add-category-btn" onclick="addCategoryItem('${categoryKey}')">
                ➕ Add New Item
            </button>
        </div>
    `;
}

function updateCategoryItem(categoryKey, itemKey, newLabel) {
    editingCategories[categoryKey].items[itemKey].label = newLabel;
}

function deleteCategoryItem(categoryKey, itemKey) {
    if (Object.keys(editingCategories[categoryKey].items).length <= 1) {
        showToast('Cannot delete the last item in a category');
        return;
    }

    if (confirm('Delete this item?')) {
        delete editingCategories[categoryKey].items[itemKey];
        renderCategoryItems(categoryKey);
    }
}

function addCategoryItem(categoryKey) {
    // Generate a unique key
    const timestamp = Date.now();
    const newKey = `custom_${timestamp}`;

    editingCategories[categoryKey].items[newKey] = {
        label: 'New Item',
        default: 0
    };

    renderCategoryItems(categoryKey);

    // Focus the new input
    setTimeout(() => {
        const inputs = document.querySelectorAll('.category-item input[type="text"]');
        if (inputs.length > 0) {
            inputs[inputs.length - 1].focus();
            inputs[inputs.length - 1].select();
        }
    }, 50);
}

function saveCategories() {
    // Update the global CATEGORIES object
    Object.keys(editingCategories).forEach(key => {
        CATEGORIES[key] = editingCategories[key];
    });

    // Save custom categories to localStorage
    localStorage.setItem('budget_custom_categories', JSON.stringify(CATEGORIES));

    // Regenerate input fields with new categories
    generateInputFields();
    attachCategoryInputListeners();

    // Update the data structure for any new items
    Object.keys(CATEGORIES).forEach(categoryKey => {
        if (!currentData[categoryKey]) {
            currentData[categoryKey] = {};
        }
        Object.keys(CATEGORIES[categoryKey].items).forEach(itemKey => {
            if (currentData[categoryKey][itemKey] === undefined) {
                currentData[categoryKey][itemKey] = 0;
            }
        });
    });

    updateCalculations();
    closeCategoryModal();
    showToast('Categories saved successfully!');
}

// Attach listeners to category inputs (needed after regenerating)
function attachCategoryInputListeners() {
    document.querySelectorAll('.input-grid input').forEach(input => {
        input.addEventListener('input', (e) => {
            const category = e.target.dataset.category;
            const item = e.target.dataset.item;
            if (category && item) {
                currentData[category][item] = parseFloat(e.target.value) || 0;
                updateCalculations();
            }
        });
    });
}

// Load custom categories on startup
function loadCustomCategories() {
    const saved = localStorage.getItem('budget_custom_categories');
    if (saved) {
        try {
            const customCategories = JSON.parse(saved);
            Object.keys(customCategories).forEach(key => {
                if (CATEGORIES[key]) {
                    CATEGORIES[key] = customCategories[key];
                }
            });
        } catch (e) {
            console.error('Error loading custom categories:', e);
        }
    }
}

// Call loadCustomCategories before generating input fields
loadCustomCategories();
