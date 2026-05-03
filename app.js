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
            const hasNote = !!(currentData.notes && currentData.notes[categoryKey] && currentData.notes[categoryKey][itemKey]);
            const inputItem = document.createElement('div');
            inputItem.className = 'input-item';
            inputItem.innerHTML = `
                <label class="item-label" data-category="${categoryKey}" data-item="${itemKey}"
                       role="button" tabindex="0" title="Click to add a note">
                    <span class="item-label-text">${item.label}</span>
                    ${hasNote ? '<span class="note-indicator" aria-label="Has note">📝</span>' : ''}
                </label>
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

// ===== Note Indicator =====
function refreshNoteIndicator(category, item) {
    const label = document.querySelector(`.item-label[data-category="${category}"][data-item="${item}"]`);
    if (!label) return;
    const existing = label.querySelector('.note-indicator');
    const hasNote = !!(currentData.notes && currentData.notes[category] && currentData.notes[category][item]);
    if (hasNote && !existing) {
        const span = document.createElement('span');
        span.className = 'note-indicator';
        span.setAttribute('aria-label', 'Has note');
        span.textContent = '📝';
        label.appendChild(span);
    } else if (!hasNote && existing) {
        existing.remove();
    }
}

// ===== Note Popover =====
let activeNotePopover = null;

function closeNotePopover() {
    if (!activeNotePopover) return;
    document.removeEventListener('mousedown', handlePopoverOutsideClick, true);
    document.removeEventListener('keydown', handlePopoverKeydown, true);
    activeNotePopover.remove();
    activeNotePopover = null;
}

function handlePopoverOutsideClick(e) {
    if (activeNotePopover && !activeNotePopover.contains(e.target)) {
        closeNotePopover();
    }
}

function handlePopoverKeydown(e) {
    if (e.key === 'Escape') {
        e.preventDefault();
        closeNotePopover();
    }
}

function openNotePopover(category, item, anchorEl) {
    closeNotePopover();

    if (!currentData.notes) currentData.notes = {};
    if (!currentData.notes[category]) currentData.notes[category] = {};

    const existingNote = currentData.notes[category][item] || '';
    const itemLabel = (CATEGORIES[category] && CATEGORIES[category].items[item] && CATEGORIES[category].items[item].label) || item;

    const popover = document.createElement('div');
    popover.className = 'note-popover';
    popover.innerHTML = `
        <div class="note-popover-header">
            <span class="note-popover-title">📝 Note for ${itemLabel}</span>
            <button type="button" class="note-popover-close" aria-label="Close">✕</button>
        </div>
        <textarea class="note-popover-textarea"
                  maxlength="500"
                  placeholder="What was this for? (e.g. Haircut, gift for mom)"></textarea>
        <div class="note-popover-actions">
            <button type="button" class="note-popover-btn note-popover-clear">Clear</button>
            <button type="button" class="note-popover-btn note-popover-save">Save</button>
        </div>
    `;
    document.body.appendChild(popover);

    const textarea = popover.querySelector('.note-popover-textarea');
    textarea.value = existingNote;

    // Position the popover near the anchor element
    const rect = anchorEl.getBoundingClientRect();
    const popRect = popover.getBoundingClientRect();
    const margin = 8;
    let top = window.scrollY + rect.bottom + margin;
    let left = window.scrollX + rect.left;
    if (left + popRect.width > window.scrollX + window.innerWidth - margin) {
        left = window.scrollX + window.innerWidth - popRect.width - margin;
    }
    if (left < window.scrollX + margin) left = window.scrollX + margin;
    popover.style.top = `${top}px`;
    popover.style.left = `${left}px`;

    activeNotePopover = popover;
    setTimeout(() => textarea.focus(), 0);

    const save = () => {
        const value = textarea.value.trim();
        if (value) {
            currentData.notes[category][item] = value;
        } else {
            delete currentData.notes[category][item];
        }
        refreshNoteIndicator(category, item);
        closeNotePopover();
    };

    const clear = () => {
        textarea.value = '';
        textarea.focus();
    };

    popover.querySelector('.note-popover-save').addEventListener('click', save);
    popover.querySelector('.note-popover-clear').addEventListener('click', clear);
    popover.querySelector('.note-popover-close').addEventListener('click', closeNotePopover);

    // Save on Ctrl/Cmd + Enter
    textarea.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            save();
        }
    });

    // Defer outside click handler so the click that opened the popover doesn't immediately close it
    setTimeout(() => {
        document.addEventListener('mousedown', handlePopoverOutsideClick, true);
        document.addEventListener('keydown', handlePopoverKeydown, true);
    }, 0);
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

    // Note labels — delegated so it works for items added later
    document.body.addEventListener('click', handleLabelClick);
    document.body.addEventListener('keydown', handleLabelKeydown);

    // Save button
    saveBtn.addEventListener('click', saveCurrentData);

    // Load button
    loadBtn.addEventListener('click', loadSelectedMonth);
}

function handleLabelClick(e) {
    const label = e.target.closest('.item-label');
    if (!label) return;
    const category = label.dataset.category;
    const item = label.dataset.item;
    if (!category || !item) return;
    e.preventDefault();
    openNotePopover(category, item, label);
}

function handleLabelKeydown(e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const label = e.target.closest('.item-label');
    if (!label) return;
    const category = label.dataset.category;
    const item = label.dataset.item;
    if (!category || !item) return;
    e.preventDefault();
    openNotePopover(category, item, label);
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

    // Update chart (Essentials slice includes EMIs for the 50:25:25 view)
    updateExpenseChart(essentialsTotal + emisTotal, nonEssentialsTotal, investmentsTotal, income);

    // Update health indicators (Essentials includes EMIs; wealth metric credits actual investments)
    updateHealthIndicators(income, essentialsTotal + emisTotal, nonEssentialsTotal, investmentsTotal);

    // Update net worth
    document.getElementById('networthAssets').textContent = formatCurrency(assetsTotal);
    document.getElementById('networthLiabilities').textContent = formatCurrency(liabilitiesTotal);
    document.getElementById('networthTotal').textContent = formatCurrency(netWorth);
}

// ===== Update Income Allocation Chart =====
// Denominator adapts to context so the donut always sums to 100%:
//   - When outflow <= income: use Income; the residual fills a Savings slice.
//   - When outflow > income: use total Outflow; investing past savings is a
//     positive behavior, surfaced via a celebratory note (not a deficit).
//   - When expenses alone > income: real overspend, surfaced via a warning.
function updateExpenseChart(essentials, nonEssentials, investments, income) {
    const expensesOnly = essentials + nonEssentials;
    const totalOutflow = expensesOnly + investments;
    const usingIncomeDenominator = income > 0 && totalOutflow <= income;
    const chartDenominator = usingIncomeDenominator ? income : totalOutflow;
    const savings = usingIncomeDenominator ? (income - totalOutflow) : 0;
    const pastSavingsDeployed = (!usingIncomeDenominator && expensesOnly <= income && income > 0)
        ? (totalOutflow - income) : 0;
    const expenseOverspend = (income > 0 && expensesOnly > income) ? (expensesOnly - income) : 0;

    const chart = document.getElementById('expenseChart');
    const legend = document.getElementById('chartLegend');
    const note = document.getElementById('chartNote');
    const totalLabel = document.getElementById('chartTotalLabel');

    const pct = (v) => chartDenominator > 0 ? (v / chartDenominator) * 100 : 0;
    const pctOfIncome = (v) => income > 0 ? (v / income) * 100 : 0;
    const essentialsPercent = pct(essentials);
    const nonEssentialsPercent = pct(nonEssentials);
    const investmentsPercent = pct(investments);
    const savingsPercent = pct(savings);
    // When the donut denominator differs from income, also show "% of income"
    // so the user can sanity-check against the 50:25:25 targets.
    const showOfIncome = !usingIncomeDenominator && income > 0;
    const ofIncome = (v) => showOfIncome
        ? `<span class="legend-pct-secondary">${pctOfIncome(v).toFixed(1)}% of income</span>`
        : '';

    let gradientParts = [];
    let currentDeg = 0;
    const pushSlice = (value, color) => {
        if (value <= 0) return;
        const deg = pct(value) * 3.6;
        gradientParts.push(`${color} ${currentDeg}deg ${currentDeg + deg}deg`);
        currentDeg += deg;
    };
    pushSlice(essentials, 'var(--color-essentials)');
    pushSlice(nonEssentials, 'var(--color-non-essentials)');
    pushSlice(investments, 'var(--color-investments)');
    if (usingIncomeDenominator) pushSlice(savings, 'var(--color-savings)');

    if (gradientParts.length > 0) {
        if (currentDeg < 360) {
            gradientParts.push(`var(--bg-secondary) ${currentDeg}deg 360deg`);
        }
        chart.style.background = `conic-gradient(${gradientParts.join(', ')})`;
    } else {
        chart.style.background = 'var(--bg-secondary)';
    }

    document.getElementById('chartTotal').textContent = formatCurrencyCompact(chartDenominator);
    if (totalLabel) {
        totalLabel.textContent = usingIncomeDenominator ? 'Income' : 'Cash Deployed';
    }

    let legendHtml = `
        <div class="legend-item">
            <div class="legend-color" style="background: var(--color-essentials)"></div>
            <span class="legend-label">Essentials (incl. EMIs)</span>
            <span class="legend-value">${formatCurrencyCompact(essentials)}</span>
            <span class="legend-percentage">${essentialsPercent.toFixed(1)}%${ofIncome(essentials)}</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background: var(--color-non-essentials)"></div>
            <span class="legend-label">Non-Essentials</span>
            <span class="legend-value">${formatCurrencyCompact(nonEssentials)}</span>
            <span class="legend-percentage">${nonEssentialsPercent.toFixed(1)}%${ofIncome(nonEssentials)}</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background: var(--color-investments)"></div>
            <span class="legend-label">Investments</span>
            <span class="legend-value">${formatCurrencyCompact(investments)}</span>
            <span class="legend-percentage">${investmentsPercent.toFixed(1)}%${ofIncome(investments)}</span>
        </div>`;
    if (usingIncomeDenominator) {
        legendHtml += `
        <div class="legend-item">
            <div class="legend-color" style="background: var(--color-savings)"></div>
            <span class="legend-label">Savings (residual)</span>
            <span class="legend-value">${formatCurrencyCompact(savings)}</span>
            <span class="legend-percentage">${savingsPercent.toFixed(1)}%</span>
        </div>`;
    }
    legend.innerHTML = legendHtml;

    if (note) {
        note.classList.remove('warning', 'celebrate');
        const rows = [];
        let message = '';
        if (usingIncomeDenominator) {
            // Donut total = income; show how income was split.
            rows.push({ label: 'This month\'s income', value: income });
            rows.push({ label: 'Allocated (expenses + investments)', value: totalOutflow });
            rows.push({ label: 'Residual cash', value: savings });
        } else if (expenseOverspend > 0) {
            // Real overspend. Past savings funded BOTH the excess expenses AND
            // the investments, so the drawn amount is the full gap (not just
            // the expense overspend).
            rows.push({ label: 'Cash deployed (expenses + investments)', value: totalOutflow });
            rows.push({ label: 'This month\'s income', value: income });
            rows.push({ label: 'Drawn from past savings', value: totalOutflow - income });
            note.classList.add('warning');
            message = `⚠ Expenses alone (${formatCurrencyCompact(expensesOnly)}) exceed income by ${formatCurrencyCompact(expenseOverspend)}`;
        } else {
            // Aggressive investing — funded partly from past savings.
            rows.push({ label: 'Cash deployed (expenses + investments)', value: totalOutflow });
            rows.push({ label: 'This month\'s income', value: income });
            rows.push({ label: 'Drawn from past savings', value: pastSavingsDeployed });
            note.classList.add('celebrate');
            message = `💪 Investing aggressively — past savings being put to work`;
        }
        const rowsHtml = rows.map(r => `
            <div class="chart-note-row">
                <span class="chart-note-label">${r.label}</span>
                <span class="chart-note-value">${formatCurrencyCompact(r.value)}</span>
            </div>`).join('');
        note.innerHTML = `<div class="chart-note-rows">${rowsHtml}</div>` +
            (message ? `<div class="chart-note-message">${message}</div>` : '');
    }
}

// ===== Update Health Indicators (aligned with 50:25:25) =====
// Caller passes the merged Essentials (essentials + EMIs) since EMIs belong
// in the 50% needs bucket. The wealth bucket counts BOTH actual investments
// and any unspent residual cash, so a user who overspends on essentials but
// still invests aggressively gets correct credit for the investing.
function updateHealthIndicators(income, essentialsInclEmis, nonEssentials, investments) {
    if (income <= 0) {
        ['essentials', 'nonEssentials', 'savings'].forEach(key => {
            const el = document.getElementById(`health-${key}`);
            el.className = 'health-item';
            el.querySelector('.health-percentage').textContent = '0%';
            el.querySelector('.health-progress').style.width = '0%';
            el.querySelector('.health-status').textContent = 'Enter income to see status';
        });
        return;
    }

    const expenses = essentialsInclEmis + nonEssentials;
    const residualCash = Math.max(0, income - expenses - investments);
    const wealth = investments + residualCash;

    updateHealthItem('essentials', (essentialsInclEmis / income) * 100, HEALTH_THRESHOLDS.essentials, false, 'essentials');
    updateHealthItem('nonEssentials', (nonEssentials / income) * 100, HEALTH_THRESHOLDS.nonEssentials, false, 'nonEssentials');
    updateHealthItem('savings', (wealth / income) * 100, HEALTH_THRESHOLDS.savings, true, 'savings');
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
            essentials: 'Essentials (incl. EMIs)',
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
    // Ensure notes shape exists (loaded data is already migrated, but be defensive)
    if (typeof ensureNotesShape === 'function') ensureNotesShape(currentData);

    // Set income fields
    myIncomeInput.value = currentData.myIncome || '';
    partnerIncomeInput.value = currentData.partnerIncome || '';
    updateIncomeDisplay();

    // Set category values and refresh note indicators
    Object.keys(CATEGORIES).forEach(categoryKey => {
        Object.keys(CATEGORIES[categoryKey].items).forEach(itemKey => {
            const input = document.getElementById(`${categoryKey}_${itemKey}`);
            if (input) {
                input.value = currentData[categoryKey][itemKey] || '';
            }
            refreshNoteIndicator(categoryKey, itemKey);
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
    if (typeof ensureNotesShape === 'function') ensureNotesShape(currentData);
    Object.keys(CATEGORIES).forEach(categoryKey => {
        if (!currentData[categoryKey]) {
            currentData[categoryKey] = {};
        }
        if (!currentData.notes[categoryKey]) {
            currentData.notes[categoryKey] = {};
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

// ===== CSV Import =====
const CSV_MAPPING_KEY = 'budget_csv_mapping';
let csvImportGroups = {};
let csvRefKeys = [];
let csvCurrentMappings = {};

function parseCSVLine(line) {
    const result = [];
    let inQuotes = false;
    let current = '';
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += ch;
        }
    }
    result.push(current);
    return result;
}

function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return null;

    const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
    const amountIdx = headers.indexOf('amount');
    const refIdx = headers.indexOf('ref');

    if (amountIdx === -1 || refIdx === -1) return null;

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        if (!cols || cols.length <= Math.max(amountIdx, refIdx)) continue;

        const amount = parseFloat(cols[amountIdx]);
        const ref = (cols[refIdx] || '').trim();

        if (isNaN(amount) || amount <= 0 || !ref) continue;

        rows.push({ amount, ref });
    }
    return rows;
}

function normalizeRef(ref) {
    return ref.replace(/\p{Extended_Pictographic}/gu, '').trim();
}

function groupByRef(rows) {
    const groups = {};
    rows.forEach(({ amount, ref }) => {
        const normalized = normalizeRef(ref);
        if (!normalized) return;
        if (!groups[normalized]) {
            groups[normalized] = { total: 0, count: 0 };
        }
        groups[normalized].total += amount;
        groups[normalized].count++;
    });
    return groups;
}

function loadCsvMapping() {
    try {
        return JSON.parse(localStorage.getItem(CSV_MAPPING_KEY) || '{}');
    } catch { return {}; }
}

function saveCsvMapping(mapping) {
    localStorage.setItem(CSV_MAPPING_KEY, JSON.stringify(mapping));
}

function buildCategoryOptionsHTML(selectedValue) {
    const categoryOrder = ['essentials', 'emis', 'nonEssentials', 'investments', 'assets', 'liabilities'];
    let html = `<option value="skip"${selectedValue === 'skip' ? ' selected' : ''}>-- Skip (don't import) --</option>`;
    html += `<option value="new"${selectedValue === 'new' ? ' selected' : ''}>➕ Add as new item...</option>`;
    html += '<option disabled>──────────────────</option>';

    categoryOrder.forEach(catKey => {
        const cat = CATEGORIES[catKey];
        html += `<option disabled>── ${cat.icon || ''} ${cat.label} ──</option>`;
        Object.keys(cat.items).forEach(itemKey => {
            const value = `${catKey}.${itemKey}`;
            const selected = selectedValue === value ? ' selected' : '';
            html += `<option value="${value}"${selected}>&nbsp;&nbsp;${cat.items[itemKey].label}</option>`;
        });
    });
    return html;
}

function renderCsvRow(idx, normalizedRef, { total, count }, savedValue, isNew) {
    let selectVal = savedValue || 'skip';
    let newCategoryKey = 'essentials';
    let newLabel = normalizedRef;

    if (selectVal.startsWith('new:')) {
        const parts = selectVal.split(':');
        selectVal = 'new';
        newCategoryKey = parts[1] || 'essentials';
        newLabel = parts.slice(2).join(':') || normalizedRef;
    }

    const newFormDisplay = selectVal === 'new' ? '' : 'display:none';
    const rowClass = isNew ? 'csv-mapping-row csv-row-new' : 'csv-mapping-row';

    const catOptions = Object.keys(CATEGORIES).map(k =>
        `<option value="${k}"${k === newCategoryKey ? ' selected' : ''}>${CATEGORIES[k].label}</option>`
    ).join('');

    return `
        <div class="${rowClass}">
            <div class="csv-ref-info">
                <span class="csv-ref-name">${normalizedRef}</span>
                <span class="csv-ref-meta">${formatCurrency(total)} &middot; ${count} txn${count > 1 ? 's' : ''}</span>
            </div>
            <div class="csv-ref-mapping">
                <select id="csv-map-${idx}" onchange="onCsvMappingChange(${idx}, this.value)" class="csv-mapping-select">
                    ${buildCategoryOptionsHTML(selectVal)}
                </select>
                <div class="csv-new-item-form" id="csv-new-form-${idx}" style="${newFormDisplay}">
                    <select class="csv-new-cat-select" id="csv-new-cat-${idx}"
                            onchange="onCsvNewCatChange(${idx})">${catOptions}</select>
                    <input type="text" class="csv-new-label-input" id="csv-new-label-${idx}"
                           value="${newLabel}"
                           placeholder="Item label"
                           oninput="onCsvNewLabelChange(${idx}, this.value)">
                </div>
            </div>
        </div>
    `;
}

function renderCsvMappingRows() {
    const savedMapping = loadCsvMapping();
    const body = document.getElementById('csvModalBody');
    const groups = csvImportGroups;

    csvRefKeys = Object.keys(groups);
    csvCurrentMappings = {};
    csvRefKeys.forEach(k => {
        csvCurrentMappings[k] = savedMapping[k] || 'skip';
    });

    const unmapped = csvRefKeys.filter(k => !savedMapping[k]);
    const mapped = csvRefKeys.filter(k => !!savedMapping[k]);

    let html = `<p class="csv-summary">Found <strong>${csvRefKeys.length}</strong> expense ${csvRefKeys.length === 1 ? 'category' : 'categories'} in your CSV. Map each to a budget field.</p>`;

    if (unmapped.length > 0) {
        html += `<div class="csv-section-label csv-unmapped-label">⚠️ New categories (not in saved mapping)</div>`;
        unmapped.forEach(key => {
            html += renderCsvRow(csvRefKeys.indexOf(key), key, groups[key], 'skip', true);
        });
    }

    if (mapped.length > 0) {
        html += `<div class="csv-section-label">Previously mapped</div>`;
        mapped.forEach(key => {
            html += renderCsvRow(csvRefKeys.indexOf(key), key, groups[key], savedMapping[key], false);
        });
    }

    body.innerHTML = html;
}

function onCsvMappingChange(idx, value) {
    const normalizedRef = csvRefKeys[idx];
    const newForm = document.getElementById(`csv-new-form-${idx}`);

    if (value === 'new') {
        if (newForm) newForm.style.display = 'flex';
        const catSelect = document.getElementById(`csv-new-cat-${idx}`);
        const labelInput = document.getElementById(`csv-new-label-${idx}`);
        const catKey = catSelect ? catSelect.value : 'essentials';
        const label = labelInput ? labelInput.value : normalizedRef;
        csvCurrentMappings[normalizedRef] = `new:${catKey}:${label}`;
    } else {
        if (newForm) newForm.style.display = 'none';
        csvCurrentMappings[normalizedRef] = value;
    }
}

function onCsvNewCatChange(idx) {
    const normalizedRef = csvRefKeys[idx];
    const catSelect = document.getElementById(`csv-new-cat-${idx}`);
    const labelInput = document.getElementById(`csv-new-label-${idx}`);
    const catKey = catSelect ? catSelect.value : 'essentials';
    const label = labelInput ? labelInput.value : normalizedRef;
    csvCurrentMappings[normalizedRef] = `new:${catKey}:${label}`;
}

function onCsvNewLabelChange(idx, label) {
    const normalizedRef = csvRefKeys[idx];
    const catSelect = document.getElementById(`csv-new-cat-${idx}`);
    const catKey = catSelect ? catSelect.value : 'essentials';
    csvCurrentMappings[normalizedRef] = `new:${catKey}:${label}`;
}

function handleCsvFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const rows = parseCSV(e.target.result);
        if (!rows) {
            showToast('Invalid CSV: missing Amount or Ref columns');
            return;
        }
        if (rows.length === 0) {
            showToast('No expense data found in CSV');
            return;
        }
        csvImportGroups = groupByRef(rows);
        renderCsvMappingRows();
        document.getElementById('csvImportModal').classList.add('show');
    };
    reader.readAsText(file);
    event.target.value = '';
}

function closeCsvModal() {
    document.getElementById('csvImportModal').classList.remove('show');
    csvImportGroups = {};
    csvRefKeys = [];
    csvCurrentMappings = {};
}

function applyCsvImport() {
    const resolvedMappings = {};
    const mappingToSave = {};
    let addedNewItems = false;

    // Step 1: resolve new: mappings by creating items in CATEGORIES
    Object.entries(csvCurrentMappings).forEach(([normalizedRef, mapping]) => {
        if (!mapping || mapping === 'skip') {
            resolvedMappings[normalizedRef] = 'skip';
            return;
        }

        if (mapping.startsWith('new:')) {
            const parts = mapping.split(':');
            const catKey = parts[1];
            const label = parts.slice(2).join(':') || normalizedRef;

            if (!CATEGORIES[catKey]) {
                resolvedMappings[normalizedRef] = 'skip';
                return;
            }

            const newKey = `custom_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
            CATEGORIES[catKey].items[newKey] = { label, default: 0 };
            if (!currentData[catKey]) currentData[catKey] = {};
            currentData[catKey][newKey] = 0;
            if (!currentData.notes) currentData.notes = {};
            if (!currentData.notes[catKey]) currentData.notes[catKey] = {};

            const fullPath = `${catKey}.${newKey}`;
            resolvedMappings[normalizedRef] = fullPath;
            mappingToSave[normalizedRef] = fullPath;
            addedNewItems = true;
        } else {
            resolvedMappings[normalizedRef] = mapping;
            mappingToSave[normalizedRef] = mapping;
        }
    });

    // Step 2: if new items were added, persist categories and regenerate fields
    if (addedNewItems) {
        localStorage.setItem('budget_custom_categories', JSON.stringify(CATEGORIES));
        generateInputFields();
        attachCategoryInputListeners();
    }

    // Step 3: save mapping for future uploads
    saveCsvMapping(mappingToSave);

    // Step 4: apply amounts to currentData and form inputs
    let importedCount = 0;
    Object.entries(resolvedMappings).forEach(([normalizedRef, mapping]) => {
        if (mapping === 'skip') return;

        const [catKey, itemKey] = mapping.split('.');
        if (!catKey || !itemKey || !currentData[catKey]) return;

        const amount = csvImportGroups[normalizedRef]?.total || 0;
        currentData[catKey][itemKey] = amount;

        const input = document.getElementById(`${catKey}_${itemKey}`);
        if (input) input.value = amount || '';

        importedCount++;
    });

    updateCalculations();
    closeCsvModal();
    showToast(`Imported ${importedCount} expense ${importedCount === 1 ? 'category' : 'categories'} from CSV`);
}

// Wire up CSV import button and file input
document.getElementById('importCsvBtn').addEventListener('click', () => {
    document.getElementById('csvFileInput').click();
});
document.getElementById('csvFileInput').addEventListener('change', handleCsvFileSelect);
