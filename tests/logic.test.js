const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const logic = require('../logic.js');

test('month metrics follow living expenses, investments, and 50:25:25', () => {
    const metrics = logic.monthMetrics({
        myIncome: 80000,
        partnerIncome: 20000,
        essentials: { rent: 40000 },
        emis: { home: 10000 },
        nonEssentials: { dining: 20000 },
        investments: { sip: 15000 },
        assets: { cashBank: 500000, fdRds: 100000 },
        liabilities: { homeLoan: 200000 }
    });

    assert.equal(metrics.income, 100000);
    assert.equal(metrics.living, 70000);
    assert.equal(metrics.savingsRate, 30);
    assert.equal(metrics.unallocated, 15000);
    assert.equal(metrics.needsPct, 50);
    assert.equal(metrics.wantsPct, 20);
    assert.equal(metrics.wealthPct, 30);
    assert.equal(metrics.netWorth, 400000);
});

test('legacy income is used when the split fields are empty', () => {
    const metrics = logic.monthMetrics({ income: 50000, essentials: { rent: 25000 } });
    assert.equal(metrics.income, 50000);
    assert.equal(metrics.savingsRate, 50);
});

test('asset migration splits the old combined cash and FD bucket', () => {
    const categories = {
        assets: {
            items: {
                cashBankFd: { label: 'Cash, Bank, FDs & Liquid Funds', default: 0 },
                fdRds: { label: 'FD/RDs', default: 0 }
            }
        }
    };
    assert.equal(logic.migrateCategoryDefinitions(categories).changed, true);
    assert.equal(categories.assets.items.cashBank.label, 'Cash & bank');
    assert.equal(categories.assets.items.fdRds.label, 'FDs & RDs');
    assert.equal(categories.assets.items.cashBankFd, undefined);
    assert.deepEqual(Object.keys(categories.assets.items), ['cashBank', 'fdRds']);

    const overlapped = {
        assets: { cashBankFd: 100, fdRds: 40 },
        notes: { assets: { cashBankFd: 'emergency fund' } }
    };
    const overlap = logic.migrateBudgetRecord(overlapped);
    assert.equal(overlap.changed, true);
    assert.equal(overlap.overlapped, true);
    assert.equal(overlapped.assets.cashBank, 100);
    assert.equal(overlapped.assets.fdRds, 40);
    assert.equal(overlapped.assets.cashBankFd, undefined);
    assert.equal(overlapped.notes.assets.cashBank, 'emergency fund');

    const cashOnly = { assets: { cashBankFd: 80, fdRds: 0 } };
    assert.equal(logic.migrateBudgetRecord(cashOnly).overlapped, false);
    assert.equal(cashOnly.assets.cashBank, 80);
    assert.equal(logic.migrateBudgetRecord(cashOnly).changed, false);
});

test('custom cash labels that do not mention FDs are kept', () => {
    const categories = {
        assets: { items: { cashBankFd: { label: 'Wallet', default: 0 }, fdRds: { label: 'FDs & RDs', default: 0 } } }
    };
    logic.migrateCategoryDefinitions(categories);
    assert.equal(categories.assets.items.cashBank.label, 'Wallet');
});

test('cloud pull lists only missing month keys', () => {
    const orphans = logic.orphanMonthKeys(
        ['budget_2026_01', 'budget_2026_02', 'budget_theme', 'budget_custom_categories'],
        { budget_2026_02: { income: 1 }, budget_theme: 'dark' }
    );
    assert.deepEqual(orphans, ['budget_2026_01']);
    assert.equal(logic.parseMonthKey('budget_theme'), null);
    assert.equal(logic.parseMonthKey('budget_2026_13'), null);
});

test('csv import sums refs that share a line and can add or replace', () => {
    const current = { essentials: { rent: 10 } };
    const mappings = { Rent: 'essentials.rent', House: 'essentials.rent', Skip: 'skip' };
    const groups = { Rent: { total: 5 }, House: { total: 7 }, Skip: { total: 100 } };
    assert.deepEqual(logic.applyCsvAmounts(current, mappings, groups, 'replace'), { 'essentials.rent': 12 });
    assert.deepEqual(logic.applyCsvAmounts(current, mappings, groups, 'add'), { 'essentials.rent': 22 });
});

test('recurring apply copies only flagged amounts and notes', () => {
    const target = {
        myIncome: 0,
        partnerIncome: 0,
        income: 0,
        essentials: { rent: 0, groceries: 0 },
        notes: { essentials: {} }
    };
    const source = {
        myIncome: 90000,
        essentials: { rent: 30000, groceries: 8000 },
        notes: { essentials: { rent: 'landlord' } }
    };
    const applied = logic.applyRecurring(target, source, {
        'income.myIncome': true,
        'essentials.rent': true,
        'essentials.groceries': false
    });
    assert.deepEqual(applied.sort(), ['essentials.rent', 'income.myIncome']);
    assert.equal(target.myIncome, 90000);
    assert.equal(target.income, 90000);
    assert.equal(target.essentials.rent, 30000);
    assert.equal(target.essentials.groceries, 0);
    assert.equal(target.notes.essentials.rent, 'landlord');
});

test('trend series is chronological and export rows quote commas', () => {
    const series = logic.trendSeries([
        { year: '2026', month: '03', label: 'Mar 26', data: { income: 100, essentials: { rent: 40 } } },
        { year: '2026', month: '01', label: 'Jan 26', data: { income: 100, essentials: { rent: 20 } } }
    ]);
    assert.deepEqual(series.map(point => point.month), ['01', '03']);
    assert.equal(series[0].savingsRate, 80);

    const rows = logic.monthExportRows('January 2026', {
        myIncome: 10,
        essentials: { rent: 5 },
        notes: { essentials: { rent: 'say "hi", please' } }
    }, {
        essentials: { label: 'Essentials', items: { rent: { label: 'Rent' } } }
    }, { 'essentials.rent': true });
    const csv = logic.toCsv([['Note'], ...rows.map(row => [row[4]])]);
    assert.match(csv, /"say ""hi"", please"/);
});

test('install and rules files keep the published boundaries', () => {
    const root = path.join(__dirname, '..');
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
    assert.equal(manifest.start_url, './');
    assert.equal(manifest.display, 'standalone');
    assert.equal(manifest.icons.length, 2);

    const worker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
    assert.match(worker, /request\.method !== 'GET'/);
    assert.match(worker, /request\.mode === 'navigate'/);
    assert.match(worker, /budget-planner-v9/);

    const sync = fs.readFileSync(path.join(root, 'sync.js'), 'utf8');
    assert.match(sync, /signInWithPopup/);
    assert.equal(sync.includes('signInWithRedirect'), false);

    const rules = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8');
    assert.match(rules, /request\.auth != null && request\.auth\.uid == userId/);
});
