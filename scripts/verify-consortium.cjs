const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**/*', route => route.abort());
    await page.route('**/supabase-config.js*', route => route.fulfill({ contentType: 'application/javascript', body: 'window.PONTE_SUPABASE_CONFIG = {};' }));
    await page.route('**/app.js*', route => {
      const source = fs.readFileSync(path.resolve('outputs/finance-pwa/app.js'), 'utf8');
      return route.fulfill({ contentType: 'application/javascript', body: source.replace('  initApp();', 'window.testApp = { createInitialState, normalizeState, render, getState: () => state, setState: value => { state = value; }, debtInstallmentProgress, consortiumPaidAmount, consortiumPaidObjectPercent, consortiumRemainingAmount }; initApp();') });
    });
    await page.goto('http://127.0.0.1:4174/app.html');
    await page.evaluate(() => {
      const state = window.testApp.createInitialState();
      const month = state.ui.selectedMonth;
      state.bankAccounts = [{ id: 'bank', country: 'brasil', bankName: 'Caixa', nickname: 'Conta principal', currency: 'BRL', initialBalance: 100000, balanceDate: `${month}-01`, active: true }];
      state.creditCards = [{ id: 'card', country: 'brasil', issuer: 'Nubank', nickname: 'Roxinho', currency: 'BRL', dueDay: 25 }];
      state.debts = [{
        id: 'consortium', type: 'consortium', country: 'brasil', provider: 'Caixa', title: 'Carta do carro',
        groupNumber: '123', quotaNumber: '456', startDate: `${month}-01`, dueDay: 20, currency: 'BRL',
        originalAmount: 300000, currentAssetValue: 218113.22, installmentAmount: 784.55, contractedInstallments: 200,
        groupTermMonths: 200, adminFeeRate: 20, initialPaidInstallments: 86, initialPaidAmount: 148752.21,
        initialPaidObjectPercent: 61.7, initialAmountToPay: 88473, monthlyAmortizationRate: 0.345,
        commonFundAmount: 752.49, reserveFundAmount: 32.06
      }];
      window.testApp.setState(window.testApp.normalizeState(state));
      window.testApp.render();
    });

    const card = page.locator('.consortium-card');
    assert.equal(await card.count(), 1);
    assert.match(await card.innerText(), /87\/200/);
    assert.match(await card.innerText(), /R\$\s*218\.113/);
    assert.match(await card.innerText(), /61,7% pago/);
    await card.getByText('Detalhamento do Consórcio').click();
    assert.match(await card.innerText(), /148\.752/);
    assert.match(await card.innerText(), /88\.473/);
    assert.equal(await page.evaluate(() => window.testApp.consortiumPaidObjectPercent(window.testApp.getState().debts[0])), 61.7);

    await card.getByRole('button', { name: 'Pagar', exact: true }).click();
    await page.locator('#monthlyPaymentMethod').selectOption('bank');
    await page.locator('#monthlyPaymentBankAccountId').selectOption('bank');
    await page.locator('[data-form="monthly-payment"] button[type="submit"]').click();
    assert.match(await card.innerText(), /✓ Pago/);
    assert.match(await card.innerText(), /87 parcelas pagas/);
    assert.equal(await page.evaluate(() => window.testApp.consortiumPaidAmount(window.testApp.getState().debts[0])), 149536.76);
    assert.equal(await page.evaluate(() => window.testApp.consortiumPaidObjectPercent(window.testApp.getState().debts[0])), 62.045);
    assert.equal(await page.evaluate(() => window.testApp.consortiumRemainingAmount(window.testApp.getState().debts[0])), 87688.45);
    assert.equal(await page.evaluate(() => window.testApp.getState().transactions[0].category), 'Consórcio');

    await page.locator('[data-action="month-next"]').click();
    assert.match(await card.innerText(), /88\/200/);
    assert.match(await card.innerText(), /113 restantes/);

    await card.getByRole('button', { name: 'Pagar', exact: true }).click();
    await page.locator('#monthlyPaymentMethod').selectOption('card');
    await page.locator('#monthlyPaymentCardId').selectOption('card');
    await page.locator('[data-form="monthly-payment"] button[type="submit"]').click();
    assert.equal(await page.evaluate(() => window.testApp.getState().cardPurchases[0].category), 'Consórcio');
    assert.equal(await page.evaluate(() => window.testApp.getState().cardPurchases[0].totalAmount), 784.55);
    assert.equal(await page.evaluate(() => window.testApp.consortiumPaidAmount(window.testApp.getState().debts[0])), 150321.31);
    assert.equal(await page.evaluate(() => window.testApp.consortiumPaidObjectPercent(window.testApp.getState().debts[0])), 62.39);

    await page.locator('[data-action="open-modal"][data-modal="consortium"]').click();
    assert.equal(await page.locator('#debtType').inputValue(), 'consortium');
    assert.equal(await page.locator('.consortium-form-fields').isVisible(), true);
    assert.deepEqual(errors, []);
    console.log('PASS: consortium registration, details, bank payment, card payment and monthly progression.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
