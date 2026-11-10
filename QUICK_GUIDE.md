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
- Cash & bank
- Stocks, MFs, Gold
- NPS, PF, etc.
- FDs & RDs
- Other Assets

Cash and bank balances are separate from FDs and RDs, so a deposit is entered on only one line. Older months that used “Cash, Bank, FDs & Liquid Funds” keep that amount on Cash & bank. If that month also had an FD/RDs amount, both numbers are kept and a note asks you to remove a deposit that was entered twice.

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

---

## Trends, repeating items, and files

Saved months show two parts of the money you did not spend on living costs: investments, and cash still left. Both are a percentage of that month’s income. The chart keeps the latest 12 months. On a phone, the header scrolls with the page.

Mark **Repeats** on income or any line that should come back next month. An empty month can apply just those items from the latest earlier month, or copy the whole month.

**CSV** downloads every saved month. Import still groups by REF. Choose **Replace** to overwrite a mapped line with the CSV total, or **Add** to stack that total on the amount already in the month. Refs that map to the same line are summed first.

**Download backup** is still the full JSON copy. Cloud pull removes local months that are no longer in the cloud snapshot.

The encryption password uses PBKDF2-SHA256. New cloud backups use 600,000 iterations. Backups written earlier keep working at 100,000 iterations. The open tab remembers the password until sign out or until the tab closes. Google sign-in opens a popup on every device. A full-page redirect cannot finish from GitHub Pages, because the browser will not share the Firebase helper’s storage with this site. If the popup is blocked, allow popups for the site and try again.

Install the planner from the browser to use it as an app. Firestore rules in `firestore.rules` allow each signed-in user to read and write only their own `users/{uid}` documents. Deploy them with `firebase deploy --only firestore:rules`.

`node --test` runs the calculation, migration, CSV, crypto, and rules checks.
