const test = require('node:test');
const assert = require('node:assert/strict');

global.BudgetLogic = require('../logic.js');
const { CryptoUtils } = require('../crypto.js');

test('new backups record 600,000 PBKDF2 iterations and still open older backups', async () => {
    const password = 'budget-secret';
    const modern = await CryptoUtils.encrypt({ months: { a: 1 } }, password);
    const envelope = JSON.parse(modern);
    assert.equal(envelope.v, 2);
    assert.equal(envelope.iterations, 600000);
    assert.deepEqual(await CryptoUtils.decrypt(modern, password), { months: { a: 1 } });

    const legacy = await CryptoUtils.encryptLegacy({ months: { b: 2 } }, password);
    assert.equal(legacy.trim().startsWith('{'), false);
    assert.deepEqual(await CryptoUtils.decrypt(legacy, password), { months: { b: 2 } });
});

test('large payloads round-trip', async () => {
    const payload = { note: 'x'.repeat(120000) };
    const encrypted = await CryptoUtils.encrypt(payload, 'budget-secret');
    assert.deepEqual(await CryptoUtils.decrypt(encrypted, 'budget-secret'), payload);
});

test('the wrong password does not decrypt', async () => {
    const encrypted = await CryptoUtils.encrypt({ ok: true }, 'budget-secret');
    await assert.rejects(() => CryptoUtils.decrypt(encrypted, 'other-secret'), /Wrong password/);
});
