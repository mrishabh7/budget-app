# Budget Planner - Quick Guide

## Health Thresholds & Feedback Logic

The budget health indicators use **percentage of income** and the **50:25:25** split. EMIs count inside essentials (needs). Savings counts investments plus any cash still unallocated, and never treats overspending as negative savings.

### Category Thresholds

| Category | ✅ Good | ⚠️ Warning | ❌ Danger |
|----------|---------|-----------|----------|
| **Essentials (including EMIs)** | ≤ 50% | > 50% and ≤ 60% | > 60% |
| **Non-Essentials** | ≤ 25% | > 25% and ≤ 30% | > 30% |
| **Savings / investments** | ≥ 25% | ≥ 15% and < 25% | < 15% |

> **Note:** Needs stay at or under half of income, wants at or under a quarter, and the last quarter is investments plus leftover cash.

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
Living Expenses = Essentials + EMIs + Non-Essentials
Invested = Investments total
Unallocated = Total Income - Living Expenses - Invested
Savings Rate = ((Total Income - Living Expenses) / Total Income) × 100
Net Worth = Total Assets - Total Liabilities
```

Unallocated is cash left after living expenses and investments. It can be negative when the month spends or invests more than income. The savings rate still uses living expenses only, so money already invested stays inside the rate.

### Health Percentages
```
Essentials % = ((Essentials + EMIs) / Total Income) × 100
Non-Essentials % = (Non-Essentials Total / Total Income) × 100
Savings % = ((Investments + max(0, Unallocated)) / Total Income) × 100
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
- Edits autosave to the open month after a short pause. Switching months flushes the month you are leaving.
- Custom categories saved as: `budget_custom_categories`
- CSV category mappings saved as: `budget_csv_mapping`
- Theme preference saved as: `budget_theme`
- **Download backup** exports saved months, custom categories, and CSV mappings as JSON
- Only `budget_YYYY_MM` keys are listed under Saved Months

---

## Ideal Budget Distribution (50:25:25)

| Category | Ideal % |
|----------|---------|
| Needs (Essentials + EMIs) | 50% |
| Wants (Non-Essentials) | 25% |
| Savings & Investments | 25% |

Health turns warning above 60% of income for needs and above 30% for wants. Savings turns warning below 25% and danger below 15%.
