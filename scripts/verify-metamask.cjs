const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const window = { addEventListener() {}, dispatchEvent() {} };
vm.runInNewContext(fs.readFileSync('outputs/finance-pwa/metamask.js', 'utf8'), { window, Event: class {} });
const api = window.NekumaMetaMask;
const address = '0x' + '12'.repeat(20);
function mock(chain = '0x1', failToken = false, changed = false) {
  const calls = [];
  let chainReads = 0;
  return { calls, async request(input) {
    calls.push(input);
    switch (input.method) {
      case 'eth_chainId': return changed && chainReads++ ? '0x89' : chain;
      case 'eth_blockNumber': return '0x123';
      case 'eth_getBalance': return '0xde0b6b3a7640000';
      case 'eth_call': if (failToken) throw new Error('RPC unavailable'); return '0x' + (1234567890n).toString(16);
      default: throw new Error('Unexpected method: ' + input.method);
    }
  } };
}
(async () => {
  assert.equal(api.decimalUnits('0xde0b6b3a7640000', 18), '1');
  assert.throws(() => api.decimalUnits('0x', 6));
  for (const chain of Object.keys(api.usdcContracts)) {
    const provider = mock(chain);
    const result = await api.snapshot(provider, address);
    assert.equal(result.balance, 1);
    assert.equal(result.tokens[0].balance, '1234.56789');
    const call = provider.calls.find(item => item.method === 'eth_call');
    assert.equal(call.params[0].to, api.usdcContracts[chain]);
    assert.equal(call.params[1], '0x123');
    assert.equal(call.params[0].data.length, 74);
    assert.equal(provider.calls.find(item => item.method === 'eth_getBalance').params[1], '0x123');
  }
  const unsupported = mock('0x38');
  const polygon = mock('0x89');
  const polygonSnapshot = await api.snapshot(polygon, address);
  assert.equal(polygonSnapshot.tokens.length, 2);
  assert.equal(polygonSnapshot.tokens[1].symbol, 'USDC.e');
  assert.equal(polygonSnapshot.tokens[1].contract.toLowerCase(), '0x2791bca1f2de4661ed88a30c99a7a9449aa84174');
  assert.equal(polygon.calls.filter(call => call.method === 'eth_call').length, 2);
  const distinct = mock('0x89');
  const request = distinct.request.bind(distinct);
  distinct.request = input => input.method === 'eth_call'
    ? Promise.resolve(input.params[0].to.toLowerCase().startsWith('0x2791') ? '0x' + (3426000n).toString(16) : '0x0')
    : request(input);
  const bridged = await api.snapshot(distinct, address);
  assert.equal(bridged.tokens[0].balance, '0');
  assert.equal(bridged.tokens[1].balance, '3.426');
  const unknown = await api.snapshot(unsupported, address);
  assert.equal(unknown.tokens.length, 0);
  assert.ok(unknown.tokenError);
  assert.ok(!unsupported.calls.some(item => item.method === 'eth_call'));
  const failed = await api.snapshot(mock('0x1', true), address);
  assert.equal(failed.tokens.length, 0);
  assert.ok(failed.tokenError);
  await assert.rejects(api.snapshot(mock('0x1', false, true), address), /rede mudou/);
  await assert.rejects(api.snapshot(mock(), 'invalid'), /invalido/);
  await assert.rejects(api.snapshot({ request: async () => { throw new Error('Offline'); } }, address), /Offline/);
  const metamask = { isMetaMask: true };
  window.ethereum = { providers: [{ isMetaMask: false }, metamask] };
  assert.equal(api.provider(), metamask);
  const source = fs.readFileSync('outputs/finance-pwa/app.js', 'utf8');
  const start = source.indexOf('  function storeWeb3Snapshot(');
  const state = { web3Wallet: { address, chainId: '0x89', tokens: [{ symbol: 'USDC.e', contract: '0x2791', balance: '3.426' }], wallets: [] } };
  const context = { state, normalizeWeb3Wallet: raw => ({ wallets: [], tokens: [], ...raw }) };
  vm.createContext(context);
  vm.runInContext(source.slice(start, source.indexOf('  function web3Provider()', start)), context);
  context.storeWeb3Snapshot({ address, chainId: '0x89', tokens: [], tokenError: 'RPC failed' });
  assert.equal(state.web3Wallet.tokens[0].balance, '3.426');
  assert.equal(state.web3Wallet.tokens[0].stale, true);
  context.storeWeb3Snapshot({ address, chainId: '0x1', tokens: [], tokenError: '' });
  assert.equal(state.web3Wallet.wallets.length, 2);
  assert.equal(state.web3Wallet.wallets.find(wallet => wallet.chainId === '0x89').tokens[0].balance, '3.426');
  console.log('MetaMask: networks, exact USDC units, fixed block, RPC failures and network change passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
