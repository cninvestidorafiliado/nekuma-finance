const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('outputs/finance-pwa/app.js', 'utf8');
const schedule = source.slice(source.indexOf('  function scheduleCryptoRefresh('), source.indexOf('  function scheduleCdiRefresh('));
const refresh = source.slice(source.indexOf('  async function refreshCryptoQuotes('), source.indexOf('  function scheduleFxRefresh('));
let requests = 0;
let now = 10 * 3600000;
const state = { cryptoAssets: [{ symbol: 'BTC' }], web3Wallet: {}, cryptoQuotes: { updatedAt: new Date(now).toISOString(), prices: {} } };
const context = vm.createContext({
  state, document: { hidden: false }, Date: class extends Date { static now() { return now; } },
  CRYPTO_QUOTE_INTERVAL: 3600000, CRYPTO_RETRY_INTERVAL: 300000,
  cryptoRefreshTimer: null, cryptoFetchInFlight: false, cryptoLastAttemptAt: 0, stateGeneration: 0,
  clearTimeout() {}, setTimeout() { return 1; },
  normalizeWeb3Wallet: () => ({ wallets: [] }), web3NetworkMeta: () => ({}),
  cryptoCatalog: { BTC: { id: 'bitcoin' } }, renderKeepingScroll() {}, saveState() {}, showToast() {},
  async fetch() { requests++; throw new Error('offline'); }
});
vm.runInContext(schedule + refresh, context);
(async () => {
  await context.refreshCryptoQuotes(false);
  assert.equal(requests, 0);
  now += 3599999;
  await context.refreshCryptoQuotes(false);
  assert.equal(requests, 0);
  now++;
  await context.refreshCryptoQuotes(false);
  assert.equal(requests, 1);
  assert.equal(state.cryptoQuotes.updatedAt, new Date(36000000).toISOString());
  await context.refreshCryptoQuotes(false);
  assert.equal(requests, 1, 'Failures must not cause a retry storm');
  await context.refreshCryptoQuotes(true);
  assert.equal(requests, 2, 'Manual refresh bypasses hourly freshness');
  now += 300000;
  context.document.hidden = true;
  context.scheduleCryptoRefresh(false);
  assert.equal(requests, 2, 'Background timer must not request quotes');
  context.document.hidden = false;
  await context.refreshCryptoQuotes(false);
  assert.equal(requests, 3);
  console.log('Crypto: hourly freshness, manual refresh, background pause, retry cooldown and preserved quotes passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
