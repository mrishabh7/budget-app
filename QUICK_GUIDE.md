# Budget Planner - Quick Guide

## Health Thresholds & Feedback Logic

The budget health indicators use **percentage of income** to determine financial health status.

### Category Thresholds

| Category | ✅ Good | ⚠️ Warning | ❌ Danger |
|----------|---------|-----------|----------|
| **Essentials** | < 50% | 50-60% | > 60% |
| **EMIs** | < 20% | 20-30% | > 30% |
| **Non-Essentials** | < 15% | 15-25% | > 25% |
| **Savings** | > 20% | 10-20% | < 10% |

> **Note:** These thresholds add up to 85% max for expenses, leaving at least 15% for savings in a "green" scenario.

---

## Feedback Messages

### For Expense Categories (Lower is Better)

| Status | Feedback Template |
|--------|-------------------|
| ✅ Good | `"✅ {Category} at {X}%. Well managed!"` |
| ⚠️ Warning | `"⚠️ {X}% is slightly high. Aim for <{good_threshold}%."` |
| ❌ Danger | `"❌ {X}% is too high. Reduce to <{warning_threshold}%."` |

### For Savings (Higher is Better)

| Status | Feedback Template |
|--------|-------------------|
| ✅ Good | `"✅ Excellent! Saving {X}% of income."` |
| ⚠️ Warning | `"⚠️ Aim for >{good_threshold}%. Currently {X}%."` |
| ❌ Danger | `"❌ Low savings ({X}%). Target: >{good_threshold}%"` |

---

## Calculation Formulas

### Totals
```
Total Income = Your Income + Partner's Income
Total Expenses = Essentials + EMIs + Non-Essentials
Savings = Total Income - Total Expenses
Savings Rate = (Savings / Total Income) × 100
Net Worth = Total Assets - Total Liabilities
```

### Health Percentages
```
Essentials % = (Essentials Total / Total Income) × 100
EMIs % = (EMIs Total / Total Income) × 100
Non-Essentials % = (Non-Essentials Total / Total Income) × 100
Savings % = (Savings / Total Income) × 100
```

---

## Categories

### 🏠 Essentials
- Rent
- Electricity
- Water & Gas
- Groceries
- House Maintenance
- Phone & Wifi
- Healthcare
- Insurance Premiums
- Child's Education
- Other Essentials

### 🏦 EMIs
- Home Loan EMI
- Car Loan EMI
- 2-Wheeler Loan EMI
- Personal Loan EMI
- Education Loan EMI
- Credit Card Bills
- Other EMIs

### 🛍️ Non-Essentials
- Transportation
- Personal Care
- Shopping
- TV & OTT Subscriptions
- Dining Out
- Entertainment
- Gym Membership
- Other Non-Essentials

### 📈 Investments
- Mutual Funds SIP
- Stocks Investments
- NPS/PPF Investments
- SGB/Gold
- Other Investments

### 🏆 Assets
- Real Estate (House, Land)
- Car
- Cash, Bank, FDs & Liquid Funds
- Stocks, MFs, Gold
- NPS, PF, etc.
- FD/RDs
- Other Assets

### 💳 Liabilities
- Home Loan
- Car/Vehicle Loan
- Personal Loan
- Educational Loan
- Business Loan
- Other Loans

---

## Data Storage

- Data is stored in **localStorage** with key format: `budget_YYYY_MM`
- Custom categories saved as: `budget_custom_categories`
- Theme preference saved as: `budget_theme`

---

## Ideal Budget Distribution (50-30-20 Rule)

| Category | Ideal % |
|----------|---------|
| Needs (Essentials + EMIs) | 50% |
| Wants (Non-Essentials) | 30% |
| Savings & Investments | 20% |

This app uses a more granular version for better tracking.
