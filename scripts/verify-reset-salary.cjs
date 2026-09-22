const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");

(async () => {
  const browser = await chromium.launch({ headless: true, channel: "msedge" });
  const context = await browser.newContext({ serviceWorkers: "block" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/supabase-config.js*", (route) => route.fulfill({
    contentType: "application/javascript",
    body: "window.PONTE_SUPABASE_CONFIG = {};"
  }));
  await page.route("https://**/*", (route) => route.abort());
  await page.route("**/app.js*", (route) => {
    const source = fs.readFileSync(path.resolve("outputs/finance-pwa/app.js"), "utf8");
    const hooks = `window.resetSalaryTest = {
      createInitialState, normalizeState, activateRemoteStateStorage, dashboardSalaryCards, renderIncomeSourceModal,
      unreadAppNews, showAppNewsModal, render,
      remoteStore, remoteSession, getState: () => state, setState: (value) => { state = value; }
    };`;
    return route.fulfill({
      contentType: "application/javascript",
      body: source.replace("  initApp();", `${hooks}\n  initApp();`)
    });
  });

  await page.goto("http://127.0.0.1:4174/app.html");
  const result = await page.evaluate(() => {
    const test = window.resetSalaryTest;
    const empty = test.createInitialState();
    empty.resetAt = "2026-09-23T00:00:00.000Z";
    localStorage.setItem("nekuma-finance-state-v5:user-a:family-a", JSON.stringify(empty));

    const stale = test.createInitialState();
    stale.bankAccounts = [{ id: "old", bankName: "Conta antiga", active: true }];
    test.setState(stale);
    test.remoteStore.enabled = true;
    test.remoteSession.user = { id: "user-a" };
    test.activateRemoteStateStorage("family-a");
    const resetStayedEmpty = test.getState().bankAccounts.length === 0 && Boolean(test.getState().resetAt);
    const companyRequiresAccount = test.renderIncomeSourceModal().includes("Cadastre primeiro a conta que recebera o salario");

    const salary = test.createInitialState();
    salary.bankAccounts = [
      { id: "salary-bank", bankName: "Yucho", nickname: "Correio", country: "japao", currency: "JPY", active: true },
      { id: "extra-bank", bankName: "Nubank", nickname: "Nu", country: "brasil", currency: "BRL", active: true }
    ];
    salary.incomeSources = [{
      id: "factory-a",
      ownerId: "user-a",
      name: "Empresa teste",
      type: "factory",
      currency: "JPY",
      bankAccountId: "salary-bank"
    }];
    test.setState(test.normalizeState(salary));
    const cards = test.dashboardSalaryCards(test.getState().ui.selectedMonth);
    test.remoteStore.enabled = false;
    test.remoteSession.status = "local";
    test.render();
    return {
      resetStayedEmpty,
      companyRequiresAccount,
      unreadNews: test.unreadAppNews().length,
      salaryCardCount: cards.length,
      salaryNeedsConfig: cards[0]?.needsConfig,
      salaryAccountId: cards[0]?.bankAccountId,
      salaryStatus: cards[0]?.status
    };
  });

  assert.deepEqual(result, {
    resetStayedEmpty: true,
    companyRequiresAccount: true,
    unreadNews: 0,
    salaryCardCount: 1,
    salaryNeedsConfig: true,
    salaryAccountId: "salary-bank",
    salaryStatus: "Configure o salário"
  });
  await page.evaluate(() => window.resetSalaryTest.showAppNewsModal());
  assert.equal(await page.locator(".app-news-row").count(), 0);
  assert.equal(await page.getByText("Nenhuma nova atualizacao", { exact: true }).count(), 1);
  assert.equal(await page.locator("#app-news-badge").isHidden(), true);
  await page.locator(".app-news-modal [data-action='close-modal']").first().click();
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => window.resetSalaryTest.render());
    assert.equal(await page.getByRole("button", { name: "Configurar salário" }).count(), 1);
    assert.equal(await page.locator(".dashboard-finance-strip").isVisible(), true);
    assert.equal(await page.locator(".dashboard-account-tile").count(), 1);
    assert.equal(await page.locator(".dashboard-account-tile").getByText("Nu", { exact: true }).count(), 1);
    assert.equal(await page.locator(".dashboard-account-tile").getByText("Correio", { exact: true }).count(), 0);
    if (width === 390) {
      assert.equal(await page.locator(".balance-section-card").isVisible(), false);
      assert.equal(await page.locator(".overview-mini-card:visible").count(), 0);
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: path.resolve(`work/reset-salary-v218-${width}.png`), fullPage: true });
  }
  assert.deepEqual(errors, []);
  console.log("Reset and salary regression checks:", result);
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
