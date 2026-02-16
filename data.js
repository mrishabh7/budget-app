// Budget Categories Data Structure
const CATEGORIES = {
    essentials: {
        label: 'Essentials',
        icon: '🏠',
        color: '#4CAF50',
        items: {
            rent: { label: 'Rent', default: 0 },
            electricity: { label: 'Electricity', default: 0 },
            waterGas: { label: 'Water & Gas', default: 0 },
            groceries: { label: 'Groceries', default: 0 },
            houseMaintenance: { label: 'House Maintenance', default: 0 },
            phoneWifi: { label: 'Phone & Wifi', default: 0 },
            healthcare: { label: 'Healthcare', default: 0 },
            insurancePremiums: { label: 'Insurance Premiums', default: 0 },
            childEducation: { label: "Child's Education", default: 0 },
            otherEssentials: { label: 'Other Essentials', default: 0 }
        }
    },
    emis: {
        label: 'EMIs',
        icon: '🏦',
        color: '#FF9800',
        items: {
            homeLoanEmi: { label: 'Home Loan EMI', default: 0 },
            carLoanEmi: { label: 'Car Loan EMI', default: 0 },
            twoWheelerEmi: { label: '2-Wheeler Loan EMI', default: 0 },
            personalLoanEmi: { label: 'Personal Loan EMI', default: 0 },
            educationLoanEmi: { label: 'Education Loan EMI', default: 0 },
            creditCardBills: { label: 'Credit Card Bills', default: 0 },
            otherEmis: { label: 'Other EMIs', default: 0 }
        }
    },
    nonEssentials: {
        label: 'Non-Essentials',
        icon: '🛍️',
        color: '#E91E63',
        items: {
            transportation: { label: 'Transportation', default: 0 },
            personalCare: { label: 'Personal Care', default: 0 },
            shopping: { label: 'Shopping', default: 0 },
            tvOtt: { label: 'TV & OTT Subscriptions', default: 0 },
            diningOut: { label: 'Dining Out', default: 0 },
            entertainment: { label: 'Entertainment', default: 0 },
            gymMembership: { label: 'Gym Membership', default: 0 },
            otherNonEssentials: { label: 'Other Non-Essentials', default: 0 }
        }
    },
    investments: {
        label: 'Investments',
        icon: '📈',
        color: '#2196F3',
        items: {
            mutualFundsSip: { label: 'Mutual Funds SIP', default: 0 },
            stocksInvestments: { label: 'Stocks Investments', default: 0 },
            npsPpf: { label: 'NPS/PPF Investments', default: 0 },
            sgbGold: { label: 'SGB/Gold', default: 0 },
            otherInvestments: { label: 'Other Investments', default: 0 }
        }
    },
    assets: {
        label: 'Assets',
        icon: '🏆',
        color: '#9C27B0',
        items: {
            realEstate: { label: 'Real Estate (House, Land)', default: 0 },
            car: { label: 'Car', default: 0 },
            cashBankFd: { label: 'Cash, Bank, FDs & Liquid Funds', default: 0 },
            stocksMfsGold: { label: 'Stocks, MFs, Gold', default: 0 },
            npsPf: { label: 'NPS, PF, etc.', default: 0 },
            fdRds: { label: 'FD/RDs', default: 0 },
            otherAssets: { label: 'Other Assets', default: 0 }
        }
    },
    liabilities: {
        label: 'Liabilities',
        icon: '💳',
        color: '#f44336',
        items: {
            homeLoan: { label: 'Home Loan', default: 0 },
            carLoan: { label: 'Car/Vehicle Loan', default: 0 },
            personalLoan: { label: 'Personal Loan', default: 0 },
            educationalLoan: { label: 'Educational Loan', default: 0 },
            businessLoan: { label: 'Business Loan', default: 0 },
            otherLoans: { label: 'Other Loans', default: 0 }
        }
    }
};

// Health thresholds (percentage of income)
// Totals: 50% + 20% + 15% = 85% expenses max for green, leaving 15%+ for savings
const HEALTH_THRESHOLDS = {
    essentials: { good: 50, warning: 60 },     // < 50% is good, up to 60% is warning
    emis: { good: 20, warning: 30 },           // < 20% is good (lower than before)
    nonEssentials: { good: 15, warning: 25 },  // < 15% is good (more realistic)
    savings: { good: 20, warning: 10 }         // > 20% is good (including investments)
};

// Storage key prefix
const STORAGE_PREFIX = 'budget_';

// Create empty budget data object
function createEmptyBudget() {
    const data = {
        income: 0,
        myIncome: 0,
        partnerIncome: 0,
        essentials: {},
        emis: {},
        nonEssentials: {},
        investments: {},
        assets: {},
        liabilities: {}
    };

    // Initialize all items to 0
    Object.keys(CATEGORIES).forEach(category => {
        Object.keys(CATEGORIES[category].items).forEach(item => {
            data[category][item] = 0;
        });
    });

    return data;
}

// Get storage key for a month
function getStorageKey(year, month) {
    return `${STORAGE_PREFIX}${year}_${month.padStart(2, '0')}`;
}

// Save budget data for a specific month
function saveBudgetData(year, month, data) {
    const key = getStorageKey(year, month);
    localStorage.setItem(key, JSON.stringify(data));
    return true;
}

// Load budget data for a specific month
function loadBudgetData(year, month) {
    const key = getStorageKey(year, month);
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
}

// Get all saved months
function getSavedMonths() {
    const months = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(STORAGE_PREFIX)) {
            const parts = key.replace(STORAGE_PREFIX, '').split('_');
            if (parts.length === 2) {
                months.push({ year: parts[0], month: parts[1] });
            }
        }
    }
    // Sort by year and month descending
    return months.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
    });
}

// Delete budget data for a specific month
function deleteBudgetData(year, month) {
    const key = getStorageKey(year, month);
    localStorage.removeItem(key);
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount);
}

// Format currency compact (for charts)
function formatCurrencyCompact(amount) {
    if (amount >= 10000000) {
        return '₹' + (amount / 10000000).toFixed(1) + 'Cr';
    } else if (amount >= 100000) {
        return '₹' + (amount / 100000).toFixed(1) + 'L';
    } else if (amount >= 1000) {
        return '₹' + (amount / 1000).toFixed(1) + 'K';
    }
    return '₹' + amount;
}

// Get month name
function getMonthName(month) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    return months[parseInt(month) - 1];
}
