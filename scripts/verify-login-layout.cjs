const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const page = await browser.newPage({ serviceWorkers: 'block' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**/*', route => route.abort());
    await page.route('**/supabase-config.js*', route => route.fulfill({ contentType: 'application/javascript', body: 'window.PONTE_SUPABASE_CONFIG = {};' }));
    await page.route('**/app.js*', route => route.fulfill({ contentType: 'application/javascript', body: fs.readFileSync('outputs/finance-pwa/app.js', 'utf8').replace('  initApp();', 'window.testLogin = () => { remoteStore.enabled = true; remoteSession.status = "signedOut"; render(); }; initApp();') }));
    await page.goto('http://127.0.0.1:4174/app.html?auth=login');
    await page.evaluate(() => window.testLogin());
    for (const [width, height] of [[390, 844], [375, 667], [1440, 900], [844, 390]]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => window.testLogin());
      await page.waitForTimeout(250);
      await page.evaluate(() => window.testLogin());
      assert.equal(await page.locator('#loginEmail').count(), 1);
      assert.equal(await page.locator('#loginPassword').count(), 1);
      assert.equal(await page.locator('[data-action="install-login"]').count(), 1);
      assert.equal(await page.locator('.auth-visual').isVisible(), false);
      assert.equal(await page.locator('.auth-home-brand').getAttribute('href'), './index.html?home=1');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      if (height >= 667) assert.ok(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1));
      await page.screenshot({ path: `work/login-${width}.png`, fullPage: true });
    }
    const manifest = JSON.parse(fs.readFileSync('outputs/finance-pwa/manifest.webmanifest', 'utf8'));
    assert.equal(manifest.start_url, './app.html?auth=login');
    assert.equal(manifest.display, 'standalone');
    assert.deepEqual(errors, []);
    console.log('PASS: clean login, responsive sizes, install control, home link and PWA start URL.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
