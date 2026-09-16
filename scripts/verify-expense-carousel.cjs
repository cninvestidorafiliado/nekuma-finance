const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**/*', route => route.abort());
    await page.route('**/supabase-config.js*', route => route.fulfill({ contentType: 'application/javascript', body: 'window.PONTE_SUPABASE_CONFIG = {};' }));
    await page.route('**/app.js*', route => {
      const source = fs.readFileSync('outputs/finance-pwa/app.js', 'utf8');
      return route.fulfill({ contentType: 'application/javascript', body: source.replace('  initApp();', 'window.testApp = { renderKeepingScroll, render, normalizeState, createInitialState, setState: value => { state = value; }, getState: () => state }; initApp();') });
    });
    await page.goto('http://127.0.0.1:4174/app.html');
    await page.evaluate(() => {
      const t = window.testApp, s = t.createInitialState(), month = s.ui.selectedMonth;
      s.bankAccounts = [{ id: 'br', country: 'brasil', bankName: 'Nubank', currency: 'BRL' }, { id: 'jp', country: 'japao', bankName: 'Yucho', currency: 'JPY' }];
      s.transactions = ['br', 'jp'].map((id, i) => ({ id, date: `${month}-01`, type: 'expense', title: 'Teste', category: 'Moradia', country: i ? 'japao' : 'brasil', currency: i ? 'JPY' : 'BRL', amount: i ? 5000 : 200, bankAccountId: id }));
      s.ui.dashboardLayouts = { desktopLanes: [['expenses-brasil', 'crypto-panel'], ['expenses-japao', 'housing-panel']] };
      s.web3Wallet = { address: '0x' + '12'.repeat(20), chainId: '0x89', balance: '0.09', status: 'connected', tokens: [{ symbol: 'USDC.e', balance: '3.4', contract: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', decimals: 6 }] };
      t.setState(t.normalizeState(s)); t.render();
    });
    assert.equal(await page.locator('.country-expenses-panel').count(), 1);
    assert.equal(await page.locator('[data-expense-country]:visible').count(), 1);
    const first = await page.locator('[data-expense-country]:visible').getAttribute('data-expense-country');
    await page.getByRole('button', { name: 'Próximo país', exact: true }).click();
    assert.notEqual(await page.locator('[data-expense-country]:visible').getAttribute('data-expense-country'), first);
    await page.locator('[data-expense-country]:visible summary').click();
    await page.evaluate(() => window.testApp.renderKeepingScroll());
    assert.equal(await page.locator('[data-expense-country]:visible .expense-details').getAttribute('open'), '');
    await page.waitForTimeout(150);
    const before = await page.locator('[data-dashboard-card]').evaluateAll(nodes => nodes.map(n => [n.dataset.dashboardCard, n.parentElement.dataset.testLane || [...n.parentElement.parentElement.children].indexOf(n.parentElement)]));
    await page.locator('.country-expenses-panel').evaluate(el => scrollTo({ top: el.getBoundingClientRect().top + scrollY - 80, behavior: 'instant' }));
    const top = await page.locator('.country-expenses-panel').evaluate(el => el.getBoundingClientRect().top);
    await page.evaluate(() => window.testApp.renderKeepingScroll());
    await page.waitForTimeout(100);
    assert.ok(Math.abs(await page.locator('.country-expenses-panel').evaluate(el => el.getBoundingClientRect().top) - top) < 2);
    assert.deepEqual(await page.locator('[data-dashboard-card]').evaluateAll(nodes => nodes.map(n => [n.dataset.dashboardCard, [...n.parentElement.parentElement.children].indexOf(n.parentElement)])), before);
    for (const width of [390, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(300);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.locator('.country-expenses-panel').screenshot({ path: path.resolve(`work/expense-carousel-${width}.png`) });
      await page.locator('.crypto-panel').screenshot({ path: path.resolve(`work/crypto-origins-${width}.png`) });
      assert.equal(await page.locator('.crypto-origins > .crypto-origin-group').count(), 3);
      assert.ok(await page.locator('.metamask-group .crypto-provider-logo').evaluate(img => img.complete && img.naturalWidth > 0));
      assert.ok(await page.locator('.binance-group .crypto-provider-logo').evaluate(img => img.complete && img.naturalWidth > 0));
      assert.equal(await page.locator('.manual-crypto-group [data-modal="crypto"]').count(), 1);
    }
    const country = await page.locator('[data-expense-country]:visible').getAttribute('data-expense-country');
    await page.locator('.expense-country-viewport').evaluate(el => {
      const start = new Touch({ identifier: 1, target: el, clientX: 250, clientY: 100 });
      const end = new Touch({ identifier: 1, target: el, clientX: 100, clientY: 105 });
      el.dispatchEvent(new TouchEvent('touchstart', { touches: [start], bubbles: true }));
      el.dispatchEvent(new TouchEvent('touchend', { changedTouches: [end], bubbles: true }));
    });
    assert.notEqual(await page.locator('[data-expense-country]:visible').getAttribute('data-expense-country'), country);
    await page.locator('[data-tab="crypto"]').click();
    await page.evaluate(() => window.testApp.renderKeepingScroll());
    assert.equal(await page.locator('.tab-stable-lane').count(), 3);
    assert.deepEqual(errors, []);
    console.log('PASS: unified card, legacy layout migration, country selection, swipe, details, scroll anchor and responsive columns.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
