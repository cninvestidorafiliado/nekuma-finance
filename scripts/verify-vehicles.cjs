const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/supabase-config.js*', r => r.fulfill({ contentType: 'application/javascript', body: 'window.PONTE_SUPABASE_CONFIG = {};' }));
  await page.route('https://**/*', r => r.abort());
  await page.route('**/app.js*', r => {
    const source = fs.readFileSync(path.resolve('outputs/finance-pwa/app.js'), 'utf8');
    const hooks = `window.testApp = { normalizeState, normalizeVehicles, createInitialState, reconcileRemoteState, vehicleBrandLogoAsset,
      resetDemo, flushRemoteState, pullRemoteStateIfNewer, loadRemoteStateForHousehold,
      remoteStore, remoteSession, getState: () => state, setState: value => { state = value; }, render };`;
    return r.fulfill({ contentType: 'application/javascript', body: source.replace('  initApp();', `${hooks}\n  initApp();`) });
  });
  await page.goto('http://127.0.0.1:4174/app.html');
  for (const [brand, model] of [['Daihatsu', 'Move'], ['Toyota', 'Prius'], ['Honda', 'Fit']]) {
    await page.locator('[data-action="open-modal"][data-modal="vehicle"]').first().click();
    await page.locator('#vehicleBrand').fill(brand);
    await page.locator('#vehicleModel').fill(model);
    await page.locator('form[data-form="vehicle"] button[type="submit"]').click();
  }
  await page.reload();
  const vehicles = await page.evaluate(() => JSON.parse(localStorage.getItem('ponte-financeira-state-v4')).vehicles);
  assert.equal(vehicles.length, 3);
  assert.equal(new Set(vehicles.map(v => v.id)).size, 3);
  console.log('Three vehicles persist:', vehicles.map(v => v.brand));
  await page.locator('.vehicle-brand-logo').first().scrollIntoViewIfNeeded();
  await page.waitForFunction(() => [...document.querySelectorAll('.vehicle-brand-logo')].every(i => i.complete));
  console.log('Logos:', await page.locator('.vehicle-brand-logo').evaluateAll(list => list.map(i => ({ src: i.getAttribute('src'), loaded: i.naturalWidth > 0, width: i.getBoundingClientRect().width }))));
  assert.equal(await page.locator('.vehicle-brand-logo').count(), 3);
  assert.ok(await page.locator('.vehicle-brand-logo').evaluateAll(list => list.every(i => i.naturalWidth > 0)));
  await page.locator('.vehicle-card-actions [data-modal="vehicle"]').nth(1).click();
  await page.locator('#vehicleModel').fill('Prius atualizado');
  await page.locator('form[data-form="vehicle"] button[type="submit"]').click();
  assert.deepEqual(await page.evaluate(() => window.testApp.getState().vehicles.map(v => v.model)), ['Move', 'Prius atualizado', 'Fit']);
  await page.locator('[data-action="set-tab"][data-tab="dashboard"]').click();
  await page.evaluate(() => {
    const t = window.testApp;
    const sample = t.getState();
    const month = sample.ui.selectedMonth;
    sample.vehicles.forEach(v => Object.assign(v, { plate: '12-34', shakenDueDate: `${month}-25`, insuranceAmount: 9000 }));
    sample.housingCards = [{ id: 'home', name: 'Moradia da familia', country: 'japao', currency: 'JPY', items: [{ key: 'rent', amount: 91300, dueDay: 25 }, { key: 'electricity', amount: 12500, dueDay: 25 }] }];
    sample.transactions = [{ id: 'salary', date: `${month}-01`, type: 'income', amount: 367505, currency: 'JPY', country: 'japao', category: 'salary', title: 'Salario' }, { id: 'expense', date: `${month}-02`, type: 'expense', amount: 125000, currency: 'JPY', country: 'japao', category: 'food', title: 'Supermercado' }];
    sample.cryptoAssets = [{ id: 'btc', symbol: 'BTC', quantity: '0.01', costAmount: 700, costCurrency: 'USD', purchaseDate: `${month}-01` }, { id: 'sol', symbol: 'SOL', quantity: '2', costAmount: 200, costCurrency: 'USD', purchaseDate: `${month}-01` }];
    sample.cryptoQuotes = { prices: { BTC: 79000, SOL: 130 }, updatedAt: new Date().toISOString(), status: 'ready' };
    t.setState(t.normalizeState(sample));
    t.render();
  });
  for (const width of [390, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 950 });
    await page.screenshot({ path: path.resolve(`work/vehicles-${width}.png`), fullPage: true });
    console.log('Layout', width, await page.evaluate(() => ({ viewport: innerWidth, page: document.documentElement.scrollWidth, overflow: [...document.querySelectorAll('#app *')].filter(e => e.getBoundingClientRect().right > innerWidth + 2 && !e.closest('.carousel-track, .account-carousel, .subscription-carousel-track, .card-stack')).slice(0, 10).map(e => e.className) })));
    assert.ok(await page.locator('.vehicle-card').evaluateAll(cards => cards.every(card => [...card.children].every(child => child.getBoundingClientRect().right <= card.getBoundingClientRect().right + 1))));
  }
  const checks = await page.evaluate(async () => {
    const t = window.testApp;
    const copy = value => JSON.parse(JSON.stringify(value));
    const original = copy(t.getState());
    const migrated = t.normalizeState({ vehicle: { brand: 'Daihatsu', model: 'Move' } });
    const stable = t.normalizeState(migrated);
    const empty = t.normalizeState({ vehicleSchemaVersion: 2, vehicles: [], vehicle: original.vehicles[0] });
    const intermediate = t.normalizeState({ vehicles: [], vehicle: original.vehicles[0] });
    const fullWidth = t.vehicleBrandLogoAsset({ brand: 'ＴＯＹＯＴＡ' });
    let cloud = copy(original);
    let releaseWrite;
    let writeStarted;
    const started = new Promise(resolve => { writeStarted = resolve; });
    const writes = [];
    t.remoteStore.enabled = true;
    Object.assign(t.remoteSession, { user: { id: 'test-user' }, householdId: 'test-household', status: 'ready' });
    t.remoteStore.client = {
      from: () => ({ select() { return this; }, eq() { return this; }, async maybeSingle() { return { data: { state: copy(cloud), updated_at: new Date().toISOString() }, error: null }; } }),
      async rpc(name, args) {
        if (writes.length === 0) {
          writeStarted();
          await new Promise(resolve => { releaseWrite = resolve; });
        }
        cloud = copy(args.app_state);
        writes.push(copy(cloud));
        return { data: new Date().toISOString(), error: null };
      }
    };
    const firstSave = t.flushRemoteState();
    await started;
    window.confirm = () => true;
    const reset = t.resetDemo();
    releaseWrite();
    await firstSave;
    await reset;
    const cleared = copy(t.getState());
    const staleMerge = t.reconcileRemoteState(original, cleared);
    const otherDevice = t.reconcileRemoteState(cleared, original);
    const uiState = copy(original);
    uiState.ui.activeTab = 'settings';
    const uiPreserved = t.reconcileRemoteState(original, uiState).state.ui.activeTab;
    t.setState(original);
    await t.flushRemoteState();
    const staleSaveBlocked = cloud.vehicles.length === 0 && t.getState().vehicles.length === 0;
    t.remoteStore.enabled = false;
    return {
      migrationCount: stable.vehicles.length,
      stableId: stable.vehicles[0].id === migrated.vehicles[0].id,
      emptyWins: empty.vehicles.length === 0,
      intermediateMigrated: intermediate.vehicles.length === 1,
      fullWidthLogo: fullWidth.file,
      savedInOrder: writes.length === 2 && writes[0].vehicles.length === 3 && writes[1].vehicles.length === 0,
      resetPersisted: Boolean(cloud.resetAt),
      allCollectionsCleared: ['vehicles', 'transactions', 'cryptoAssets', 'housingCards'].every(key => cloud[key].length === 0),
      staleMergeBlocked: staleMerge.state.vehicles.length === 0 && staleMerge.changed,
      otherDeviceCleared: otherDevice.state.vehicles.length === 0 && !otherDevice.changed,
      uiPreserved,
      staleSaveBlocked
    };
  });
  console.log('Sync and migration:', checks);
  assert.deepEqual(checks, { migrationCount: 1, stableId: true, emptyWins: true, intermediateMigrated: true, fullWidthLogo: 'toyota.png', savedInOrder: true, resetPersisted: true, allCollectionsCleared: true, staleMergeBlocked: true, otherDeviceCleared: true, uiPreserved: 'settings', staleSaveBlocked: true });
  await page.reload();
  assert.equal(await page.evaluate(() => window.testApp.getState().vehicles.length), 0);
  console.log('Runtime errors:', errors);
  assert.deepEqual(errors, []);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
