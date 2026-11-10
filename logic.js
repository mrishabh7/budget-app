// Pure budget calculations shared by the page and the Node tests.
(function (root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    root.BudgetLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const PBKDF2_ITERATIONS = 600000;
    const LEGACY_PBKDF2_ITERATIONS = 100000;
    const SESSION_PASSWORD_KEY = 'budget_session_password';
    const RECURRING_STORAGE_KEY = 'budget_recurring';
    const FD_OVERLAP_ACK_KEY = 'budget_fd_overlap_ack';
    const DEFAULT_CASH_LABEL = 'Cash, Bank, FDs & Liquid Funds';

    function sumRecord(record) {
        if (!record || typeof record !== 'object') return 0;
        return Object.keys(record).reduce((total, key) => {
            const value = Number(record[key]);
            return total + (Number.isFinite(value) ? value : 0);
        }, 0);
    }

    function monthMetrics(data) {
        const source = data || {};
        const myIncome = Number(source.myIncome) || 0;
        const partnerIncome = Number(source.partnerIncome) || 0;
        const storedIncome = Number(source.income) || 0;
        const income = myIncome + partnerIncome || storedIncome;
        const essentials = sumRecord(source.essentials);
        const emis = sumRecord(source.emis);
        const nonEssentials = sumRecord(source.nonEssentials);
        const investments = sumRecord(source.investments);
        const assets = sumRecord(source.assets);
        const liabilities = sumRecord(source.liabilities);
        const living = essentials + emis + nonEssentials;
        const savingsRate = income > 0 ? ((income - living) / income) * 100 : 0;
        const unallocated = income - living - investments;
        const needsPct = income > 0 ? ((essentials + emis) / income) * 100 : 0;
        const wantsPct = income > 0 ? (nonEssentials / income) * 100 : 0;
        const wealthPct = income > 0 ? ((investments + Math.max(0, unallocated)) / income) * 100 : 0;
        return {
            income,
            living,
            essentials,
            emis,
            nonEssentials,
            investments,
            assets,
            liabilities,
            savingsRate,
            unallocated,
            needsPct,
            wantsPct,
            wealthPct,
            netWorth: assets - liabilities
        };
    }

    function migrateCategoryDefinitions(categories) {
        const items = categories && categories.assets && categories.assets.items;
        if (!items) return { changed: false };
        let changed = false;
        if (items.cashBankFd) {
            const previous = items.cashBankFd;
            const label = previous.label || '';
            const nextLabel = (!label || label === DEFAULT_CASH_LABEL || /fd/i.test(label))
                ? 'Cash & bank'
                : label;
            const rebuilt = {};
            Object.keys(items).forEach(key => {
                if (key === 'cashBankFd') {
                    if (!rebuilt.cashBank) rebuilt.cashBank = { label: nextLabel, default: previous.default || 0 };
                    return;
                }
                rebuilt[key] = items[key];
            });
            categories.assets.items = rebuilt;
            changed = true;
        } else if (items.cashBank && items.cashBank.label === DEFAULT_CASH_LABEL) {
            items.cashBank.label = 'Cash & bank';
            changed = true;
        }
        if (items.fdRds && items.fdRds.label === 'FD/RDs') {
            items.fdRds.label = 'FDs & RDs';
            changed = true;
        }
        return { changed };
    }

    // Move the old combined cash/FD bucket onto Cash & bank.
    // A month that also has FD/RDs keeps both amounts and is flagged so the
    // user can remove a deposit that was entered twice.
    function migrateBudgetRecord(data) {
        if (!data || typeof data !== 'object' || !data.assets || typeof data.assets !== 'object') {
            return { data, changed: false, overlapped: false };
        }
        if (!Object.prototype.hasOwnProperty.call(data.assets, 'cashBankFd')) {
            return { data, changed: false, overlapped: false };
        }
        const oldValue = Number(data.assets.cashBankFd) || 0;
        const fdValue = Number(data.assets.fdRds) || 0;
        data.assets.cashBank = (Number(data.assets.cashBank) || 0) + oldValue;
        delete data.assets.cashBankFd;
        if (data.notes && data.notes.assets && data.notes.assets.cashBankFd) {
            const note = String(data.notes.assets.cashBankFd);
            const existing = data.notes.assets.cashBank ? String(data.notes.assets.cashBank) : '';
            data.notes.assets.cashBank = existing ? `${existing} ${note}`.trim() : note;
            delete data.notes.assets.cashBankFd;
        }
        return { data, changed: true, overlapped: oldValue > 0 && fdValue > 0 };
    }

    function parseMonthKey(key) {
        if (!key || !key.startsWith('budget_')) return null;
        const match = /^(\d{4})_(\d{2})$/.exec(key.slice('budget_'.length));
        if (!match) return null;
        const monthNum = parseInt(match[2], 10);
        if (monthNum < 1 || monthNum > 12) return null;
        return { year: match[1], month: match[2], key };
    }

    // Month keys present on this device but absent from a cloud snapshot.
    function orphanMonthKeys(localKeys, cloudData) {
        const cloud = cloudData && typeof cloudData === 'object' ? cloudData : {};
        const cloudKeys = new Set(Object.keys(cloud));
        return (localKeys || []).filter(key => parseMonthKey(key) && !cloudKeys.has(key));
    }

    function aggregateCsvAmounts(mappings, groups) {
        const totals = {};
        Object.keys(mappings || {}).forEach(ref => {
            const mapping = mappings[ref];
            if (!mapping || mapping === 'skip' || mapping.indexOf('.') === -1) return;
            const amount = Number(groups && groups[ref] && groups[ref].total) || 0;
            totals[mapping] = (totals[mapping] || 0) + amount;
        });
        return totals;
    }

    function applyCsvAmounts(current, mappings, groups, mode) {
        const totals = aggregateCsvAmounts(mappings, groups);
        const next = {};
        Object.keys(totals).forEach(path => {
            const parts = path.split('.');
            const catKey = parts[0];
            const itemKey = parts.slice(1).join('.');
            const bucket = (current && current[catKey]) || {};
            const existing = Number(bucket[itemKey]) || 0;
            next[path] = mode === 'add' ? existing + totals[path] : totals[path];
        });
        return next;
    }

    function applyRecurring(target, source, rules) {
        const applied = [];
        if (!target || !source || !rules) return applied;
        Object.keys(rules).forEach(path => {
            if (!rules[path]) return;
            if (path === 'income.myIncome' || path === 'income.partnerIncome') {
                const field = path.split('.')[1];
                const amount = Number(source[field]) || 0;
                if (amount <= 0) return;
                target[field] = amount;
                target.income = (Number(target.myIncome) || 0) + (Number(target.partnerIncome) || 0);
                applied.push(path);
                return;
            }
            const dot = path.indexOf('.');
            if (dot === -1) return;
            const catKey = path.slice(0, dot);
            const itemKey = path.slice(dot + 1);
            if (!target[catKey]) return;
            const sourceBucket = source[catKey] || {};
            const amount = Number(sourceBucket[itemKey]) || 0;
            const sourceNotes = (source.notes && source.notes[catKey]) || {};
            if (amount <= 0 && !sourceNotes[itemKey]) return;
            target[catKey][itemKey] = amount;
            if (sourceNotes[itemKey]) {
                if (!target.notes) target.notes = {};
                if (!target.notes[catKey]) target.notes[catKey] = {};
                target.notes[catKey][itemKey] = sourceNotes[itemKey];
            }
            applied.push(path);
        });
        return applied;
    }

    function trendSeries(entries) {
        return (entries || [])
            .map(entry => Object.assign({
                year: String(entry.year),
                month: String(entry.month),
                label: entry.label || `${entry.year}-${entry.month}`
            }, monthMetrics(entry.data)))
            .sort((a, b) => (a.year === b.year ? a.month.localeCompare(b.month) : a.year.localeCompare(b.year)));
    }

    function csvCell(value) {
        const text = value === null || value === undefined ? '' : String(value);
        if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
        return text;
    }

    function toCsv(rows) {
        return rows.map(row => row.map(csvCell).join(',')).join('\r\n');
    }

    function monthExportRows(monthLabel, data, categories, rules) {
        const source = data || {};
        const activeRules = rules || {};
        const rows = [
            [monthLabel, 'Income', 'Your Income', Number(source.myIncome) || 0, '', activeRules['income.myIncome'] ? 'yes' : ''],
            [monthLabel, 'Income', "Partner's Income", Number(source.partnerIncome) || 0, '', activeRules['income.partnerIncome'] ? 'yes' : '']
        ];
        Object.keys(categories || {}).forEach(catKey => {
            const category = categories[catKey];
            if (!category || !category.items) return;
            Object.keys(category.items).forEach(itemKey => {
                const amount = Number(source[catKey] && source[catKey][itemKey]) || 0;
                const note = (source.notes && source.notes[catKey] && source.notes[catKey][itemKey]) || '';
                const path = `${catKey}.${itemKey}`;
                if (!amount && !note && !activeRules[path]) return;
                rows.push([
                    monthLabel,
                    category.label,
                    category.items[itemKey].label,
                    amount,
                    note,
                    activeRules[path] ? 'yes' : ''
                ]);
            });
        });
        return rows;
    }

    function prefersRedirectSignIn(hints) {
        const options = hints || {};
        if (options.coarsePointer || options.standalone) return true;
        return /Android|iPhone|iPad|iPod|Mobile/i.test(options.userAgent || '');
    }

    return {
        PBKDF2_ITERATIONS,
        LEGACY_PBKDF2_ITERATIONS,
        SESSION_PASSWORD_KEY,
        RECURRING_STORAGE_KEY,
        FD_OVERLAP_ACK_KEY,
        monthMetrics,
        migrateCategoryDefinitions,
        migrateBudgetRecord,
        parseMonthKey,
        orphanMonthKeys,
        aggregateCsvAmounts,
        applyCsvAmounts,
        applyRecurring,
        trendSeries,
        csvCell,
        toCsv,
        monthExportRows,
        prefersRedirectSignIn
    };
});
