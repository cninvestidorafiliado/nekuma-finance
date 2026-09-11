const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const key = 'ponte-financeira-state-v4';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const context = await browser.newContext({ serviceWorkers: 'block', hasTouch: true, viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('https://**/*', route => route.abort());
    await page.route('**/supabase-config.js*', route => route.fulfill({ contentType: 'application/javascript', body: 'window.PONTE_SUPABASE_CONFIG = {};' }));
    await page.route('**/app.js*', route => {
      const source = fs.readFileSync(path.resolve('outputs/finance-pwa/app.js'), 'utf8');
      return route.fulfill({ contentType: 'application/javascript', body: source.replace('  initApp();', 'window.testApp = { countryExpenseModels, normalizeState, createInitialState, render, getState: () => state, setState: value => { state = value; } }; initApp();') });
    });
    await page.goto('http://127.0.0.1:4174/app.html');
    const totals = await page.evaluate(() => {
      const t = window.testApp, state = t.createInitialState(), month = state.ui.selectedMonth;
      state.bankAccounts = [{ id: 'nu', country: 'brasil', bankName: 'Nubank', nickname: 'Nubank', currency: 'BRL' }, { id: 'cx', country: 'brasil', bankName: 'Caixa', nickname: 'Caixa', currency: 'BRL' }, { id: 'bb', country: 'brasil', nickname: 'BB', currency: 'BRL' }, { id: 'jp', country: 'japao', nickname: 'Yucho', currency: 'JPY' }];
      state.vehicles = ['Toyota', 'Honda', 'Daihatsu'].map((brand, i) => ({ id: `v${i}`, brand, model: 'Familia', plate: `12-${i}4`, insuranceAmount: 5000, insuranceDay: 10, insurancePaymentType: 'bank', shakenDueDate: `${month}-25` }));
      state.vehicleMaintenance = [{ id: 'oil', date: `${month}-10`, kind: 'Troca de oleo', amount: 3000, currency: 'JPY' }];
      state.housingCards = [{ id: 'house', country: 'japao', name: 'Casa', currency: 'JPY', items: [{ key: 'rent', amount: 80000, bankAccountId: 'jp', dueDay: 20 }, { key: 'electricity', amount: 10000, bankAccountId: 'jp', dueDay: 20 }] }];
      state.creditCards = [{ id: 'card', nickname: 'Roxinho', issuer: 'Nubank', currency: 'BRL', country: 'brasil', dueDay: 25 }];
      state.cardPurchases = [{ id: 'cp', cardId: 'card', category: 'Compras', totalAmount: 60, currency: 'BRL', installments: 1, firstBillMonth: month, purchaseDate: `${month}-01` }, { id: 'cp2', cardId: 'card', category: 'Moradia', totalAmount: 30, currency: 'BRL', installments: 1, firstBillMonth: month, purchaseDate: `${month}-01` }, { id: 'cp3', cardId: 'card', category: 'Veiculo', totalAmount: 10, currency: 'BRL', installments: 1, firstBillMonth: month, purchaseDate: `${month}-01` }];
      state.transactions = [{ id: 'bill', date: `${month}-25`, country: 'brasil', type: 'card', category: 'Cartao', title: 'Fatura Roxinho', amount: 100, currency: 'BRL', bankAccountId: 'nu' }, { id: 'invest-tx', date: `${month}-02`, country: 'brasil', type: 'investment', title: 'Fundo', amount: 20, currency: 'BRL', bankAccountId: 'nu' }];
      state.investments = [{ id: 'investment', country: 'brasil', title: 'Fundo', provider: 'Nubank', currency: 'BRL', currentAmount: 1000000, monthlyContribution: 50 }];
      state.debts = [{ id: 'debt', country: 'brasil', title: 'Casa', type: 'financing', provider: 'Nubank', currency: 'BRL', installmentAmount: 1000, dueDay: 25 }, { id: 'consortium', country: 'brasil', title: 'Consorcio', type: 'consortium', provider: 'Caixa', currency: 'BRL', installmentAmount: 500, dueDay: 25 }];
      state.cryptoAssets = [{ id: 'btc', symbol: 'BTC', country: 'brasil', bankAccountId: 'nu', quantity: '0.01', costAmount: 100, costCurrency: 'BRL', purchaseDate: `${month}-05` }];
      t.setState(t.normalizeState(state));
      localStorage.setItem('ponte-financeira-state-v4', JSON.stringify(t.getState()));
      t.render();
      return t.countryExpenseModels();
    });
    assert.equal(totals.length, 2);
    const br = totals.find(m => m.country === 'brasil'), jp = totals.find(m => m.country === 'japao');
    assert.equal(br.total, 1750);
    assert.equal(jp.total, 108000);
    assert.equal(jp.categories.find(c => c.key === 'vehicle').amount, 18000);
    assert.equal(br.categories.find(c => c.key === 'card').amount, 60);
    assert.equal(br.categories.find(c => c.key === 'investment').amount, 50);
    assert.equal(br.categories.find(c => c.key === 'consortium').banks[0].name, 'Caixa');
    assert.equal(await page.locator('.country-expenses-panel').count(), 2);
    const originalMonth = await page.evaluate(() => window.testApp.getState().ui.selectedMonth);
    await page.locator('[data-action="month-prev"]').click();
    assert.notEqual(await page.evaluate(() => window.testApp.getState().ui.selectedMonth), originalMonth);
    await page.locator('[data-action="month-next"]').click();
    assert.equal(await page.evaluate(() => window.testApp.getState().ui.selectedMonth), originalMonth);
    await page.locator('.expenses-brasil .expense-legend-row[data-category="card"]').click();
    assert.equal(await page.locator('.expenses-brasil .expense-sector.is-selected').getAttribute('data-category'), 'card');
    await page.locator('.expenses-brasil .expense-legend-row[data-category="housing"]').hover();
    assert.equal(await page.locator('.expenses-brasil .expense-sector.is-selected').getAttribute('data-category'), 'housing');
    await page.locator('[data-tab="settings"]').click();
    assert.equal(await page.locator('.vehicle-settings-row').count(), 0);
    await page.locator('[data-tab="dashboard"]').click();
    const handle = page.locator('[data-dashboard-card="vehicle-panel"] .dashboard-handle');
    await handle.focus();
    await handle.press('ArrowRight');
    const desktopOrder = await page.evaluate(() => window.testApp.getState().ui.dashboardLayouts.desktop);
    assert.ok(desktopOrder[1].includes('vehicle-panel'));
    await page.reload();
    assert.equal(await page.locator('[data-dashboard-card="vehicle-panel"]').evaluate(el => el.parentElement.dataset.dashboardColumn), '1');
    // Exercise the pointer drag path between columns as well as keyboard ordering.
    await page.evaluate(() => scrollTo(0, 0));
    const source = await page.locator('[data-dashboard-card="overview-card"] .dashboard-handle').boundingBox();
    const target = await page.locator('[data-dashboard-card="dashboard-trend-panel"] .dashboard-handle').boundingBox();
    await page.mouse.move(source.x + 20, source.y + 12);
    await page.mouse.down();
    await page.mouse.move(source.x + 35, source.y + 20, { steps: 5 });
    await page.waitForTimeout(150);
    console.log('Drag started:', await page.evaluate(() => window.NekumaDashboard.isDragging()), { source, target });
    await page.mouse.move(target.x + 20, target.y + 50, { steps: 25 });
    await page.waitForTimeout(250);
    await page.mouse.up();
    assert.equal(await page.locator('[data-dashboard-card="overview-card"]').evaluate(el => el.parentElement.dataset.dashboardColumn), '1');
    const savedDesktop = await page.evaluate(() => JSON.stringify(window.testApp.getState().ui.dashboardLayouts.desktop));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('[data-dashboard-card="vehicle-panel"] .dashboard-handle').press('ArrowUp');
    const mobileOrder = await page.evaluate(() => window.testApp.getState().ui.dashboardLayouts.mobile);
    assert.ok(mobileOrder.indexOf('vehicle-panel') < mobileOrder.indexOf('housing-panel'));
    assert.equal(await page.evaluate(() => JSON.stringify(window.testApp.getState().ui.dashboardLayouts.desktop)), savedDesktop);
    await page.reload();
    assert.deepEqual(await page.locator('.dashboard-mobile-zone > [data-dashboard-card]').evaluateAll(nodes => nodes.map(n => n.dataset.dashboardCard)), mobileOrder);
    await page.locator('.expenses-japao .expense-legend-row[data-category="vehicle"]').tap();
    assert.equal(await page.locator('.expenses-japao .expense-sector.is-selected').getAttribute('data-category'), 'vehicle');
    await page.locator('[data-dashboard-card="housing-panel"]').evaluate(el => window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 80));
    const touchSource = await page.locator('[data-dashboard-card="housing-panel"] .dashboard-handle').boundingBox();
    const touchTarget = await page.locator('[data-dashboard-card="subscriptions-panel"]').boundingBox();
    const cdp = await context.newCDPSession(page);
    const start = { x: touchSource.x + 20, y: touchSource.y + 12 };
    const end = { x: touchTarget.x + 80, y: touchTarget.y + touchTarget.height - 5 };
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
    for (let step = 1; step <= 18; step++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x + (end.x - start.x) * step / 18, y: start.y + (end.y - start.y) * step / 18 }] });
      await page.waitForTimeout(20);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(220);
    const touchOrder = await page.evaluate(() => window.testApp.getState().ui.dashboardLayouts.mobile);
    assert.ok(touchOrder.indexOf('housing-panel') > touchOrder.indexOf('subscriptions-panel'));
    for (const width of [390, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.screenshot({ path: path.resolve(`work/dashboard-${width}.png`), fullPage: true });
      if ([390, 1440].includes(width)) {
        await page.locator('.expenses-brasil').screenshot({ path: path.resolve(`work/despesas-brasil-${width}.png`) });
        await page.locator('.vehicle-panel').screenshot({ path: path.resolve(`work/veiculos-inline-${width}.png`) });
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    }
    await page.locator('.expenses-brasil').screenshot({ path: path.resolve('work/despesas-brasil.png') });
    assert.deepEqual(errors, []);
    console.log('PASS: country totals, invoice deduplication, vehicle grouping, investment contributions, banks, hover/touch, drag, keyboard, reload and separate mobile/desktop layouts.');
    console.log('Totals: Brasil R$1750; Japao JPY108000.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
