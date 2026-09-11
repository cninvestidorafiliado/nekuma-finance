const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const context = await browser.newContext({ serviceWorkers: 'block', timezoneId: 'Asia/Tokyo' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.clock.setFixedTime(new Date('2026-09-10T15:30:00Z'));
    await page.route('https://**/*', r => r.abort());
    await page.route('**/supabase-config.js*', r => r.fulfill({ contentType: 'application/javascript', body: 'window.PONTE_SUPABASE_CONFIG = {};' }));
    await page.route('**/app.js*', r => r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync('outputs/finance-pwa/app.js', 'utf8').replace('  initApp();', 'window.testApp = { normalizeState, render, getState: () => state, setState: s => { state = s; } };\n  initApp();') }));
    await page.goto('http://127.0.0.1:4174/app.html');
    await page.evaluate(() => {
      const t = window.testApp;
      const s = t.getState();
      s.ui.selectedMonth = '2026-09';
      s.vehicles = [{ id: 'car', brand: 'Daihatsu', model: 'Move', plate: '21-59', shakenDueDate: '2026-09-29', insuranceAmount: 5000, insuranceDay: 11, insurancePaymentType: 'cash' }];
      s.incomeSources = [{ id: 'factory', type: 'factory', name: 'Fabrica', cycleStartDate: '2026-09-01' }];
      s.transactions = [{ id: 'income', title: 'Salario', type: 'income', amount: 416160, currency: 'JPY', country: 'japao', date: '2026-09-01' }, { id: 'expense', title: 'Mercado', type: 'expense', amount: 19000, currency: 'JPY', country: 'japao', date: '2026-09-02' }];
      t.setState(t.normalizeState(s));
      t.render();
    });
    for (const width of [320, 360, 390, 430]) {
      await page.setViewportSize({ width, height: 844 });
      const result = await page.evaluate(() => {
        const rect = e => e.getBoundingClientRect();
        const summaries = [...document.querySelectorAll('.emergency-reserve-panel .pro-summary-grid > div')];
        const car = document.querySelector('.vehicle-card');
        const parts = ['.vehicle-visual', '.vehicle-main', '.vehicle-insurance-check', '.vehicle-info-card'].map(s => car.querySelector(s));
        const event = document.querySelector('.calendar-item');
        return {
          summaryInline: summaries.length === 3 && summaries.every(e => Math.abs(rect(e).top - rect(summaries[0]).top) < 2),
          carInline: parts.every(e => getComputedStyle(e).gridRowStart === '1'),
          carFits: [...car.querySelectorAll('*')].every(e => rect(e).right <= rect(car).right + 1),
          calendarInline: rect(event.querySelector('.calendar-value')).right <= rect(event.querySelector('.chip')).left + 1,
          pageFits: document.documentElement.scrollWidth <= innerWidth,
          today: document.querySelector('.work-day-cell[aria-current="date"] strong')?.textContent,
          financialToday: Boolean(document.querySelector('.calendar-item.is-today [aria-current="date"]'))
        };
      });
      console.log(width, result);
      assert.deepEqual(result, { summaryInline: true, carInline: true, carFits: true, calendarInline: true, pageFits: true, today: '11', financialToday: true });
      if (width === 390) {
        await page.waitForTimeout(3500);
        const dismiss = page.locator('[data-action="dismiss-due-alert"]').first();
        if (await dismiss.isVisible()) await dismiss.click();
        for (const [name, selector] of [['reserve', '.emergency-reserve-panel'], ['vehicle', '.vehicle-panel'], ['calendar', '.financial-calendar-panel'], ['shifts', '.work-calendar-panel']]) {
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              await page.locator(selector).evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
              await page.locator(selector).screenshot({ path: `work/mobile-inline-${name}.png` });
              break;
            } catch (error) { if (attempt === 2) throw error; }
          }
        }
      }
    }
    await page.clock.setFixedTime(new Date('2026-09-11T15:30:00Z'));
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    assert.equal(await page.locator('.work-day-cell[aria-current="date"] strong').textContent(), '12');
    assert.equal(await page.locator('.calendar-item.is-today').count(), 0);
    assert.deepEqual(errors, []);
    console.log('Midnight rollover and mobile inline layouts passed.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
