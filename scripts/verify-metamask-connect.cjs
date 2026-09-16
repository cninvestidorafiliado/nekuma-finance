const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('outputs/finance-pwa/metamask.js', 'utf8');
const address = '0x' + '12'.repeat(20);
function harness(injected, failOnce = false) {
  let attempts = 0;
  const calls = [];
  const sdkProvider = { request() {} };
  const client = {
    getProvider: () => sdkProvider,
    async connect(options) { calls.push(options); return { accounts: [address] }; },
    async disconnect() { calls.push('disconnect'); }
  };
  const window = { ethereum: injected, location: { origin: 'https://nekuma-finance.pages.dev' }, addEventListener() {}, dispatchEvent() {} };
  vm.runInNewContext(source.replace("import('./assets/vendor/metamask-connect.js?v=177')", 'loadSdk()'), {
    window, Event: class {},
    async loadSdk() {
      attempts++;
      if (failOnce && attempts === 1) throw new Error('offline');
      return { async createEVMClient(options) { calls.push(options); return client; } };
    }
  });
  return { api: window.NekumaMetaMask, calls, sdkProvider, attempts: () => attempts };
}
(async () => {
  const injected = { isMetaMask: true, async request({ method }) { assert.equal(method, 'eth_requestAccounts'); return [address]; } };
  const desktop = harness(injected);
  assert.equal((await desktop.api.connectAccounts('0x89')).provider, injected);
  assert.equal(desktop.attempts(), 0, 'Extension connection must not download SDK');
  const mobile = harness();
  await Promise.all([mobile.api.prepareConnect(), mobile.api.prepareConnect()]);
  assert.equal(mobile.attempts(), 1, 'Initialization must be shared');
  assert.equal(mobile.calls[0].analytics.enabled, false);
  assert.equal(mobile.calls[0].skipAutoAnnounce, true);
  assert.equal(mobile.calls[0].dapp.url, 'https://nekuma-finance.pages.dev');
  assert.ok(mobile.calls[0].api.supportedNetworks['0x89']);
  const result = await mobile.api.connectAccounts('0x89');
  assert.equal(result.provider, mobile.sdkProvider);
  assert.equal(result.accounts[0], address);
  assert.equal(JSON.stringify(mobile.calls[1].chainIds), '["0x89","0x1"]');
  assert.equal(mobile.calls[1].forceRequest, true, 'Explicit connect must request authorization for the phone wallet');
  assert.equal(mobile.calls[1].account, undefined, 'Do not force the desktop account');
  await mobile.api.disconnect();
  assert.equal(mobile.calls.at(-1), 'disconnect');
  const retry = harness(null, true);
  await assert.rejects(retry.api.prepareConnect(), /offline/);
  await retry.api.prepareConnect();
  assert.equal(retry.attempts(), 2);
  console.log('MetaMask Connect: extension, lazy SDK, session initialization, Polygon, disconnect and retry passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
