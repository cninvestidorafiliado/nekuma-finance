const fs = require('node:fs');
const assert = require('node:assert/strict');
(async () => {
  const source = fs.readFileSync('functions/api/binance.js', 'utf8');
  const api = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
  const permissions = { enableReading: true, enableWithdrawals: false, enableInternalTransfer: false, enableMargin: false, enableFutures: false, permitsUniversalTransfer: false, enableVanillaOptions: false, enableFixApiTrade: false, enableSpotAndMarginTrading: false, enablePortfolioMarginTrading: false };
  api.assertReadOnly(permissions);
  for (const name of Object.keys(permissions).filter(name => name !== 'enableReading')) {
    assert.throws(() => api.assertReadOnly({ ...permissions, [name]: true }));
  }
  assert.throws(() => api.assertReadOnly({ enableReading: true }));
  assert.equal(api.decimalSum('0.00000001', '0.00000002'), '0.00000003');
  assert.equal(api.decimalSum('1', '0.25'), '1.25');
  assert.equal(api.decimalSum('9007199254740993', '1'), '9007199254740994');
  assert.throws(() => api.decimalSum('NaN', '1'));
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  const encrypted = await api.encrypt({ apiKey: 'test-key', apiSecret: 'secret' }, key, 'user-a');
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: Buffer.from(encrypted.iv, 'base64'), additionalData: new TextEncoder().encode('user-a') }, key, Buffer.from(encrypted.ciphertext, 'base64'));
  assert.equal(JSON.parse(new TextDecoder().decode(decrypted)).apiSecret, 'secret');
  await assert.rejects(crypto.subtle.decrypt({ name: 'AES-GCM', iv: Buffer.from(encrypted.iv, 'base64'), additionalData: new TextEncoder().encode('user-b') }, key, Buffer.from(encrypted.ciphertext, 'base64')));
  let result = await api.onRequest({ request: new Request('https://example.com/api/binance'), env: {} });
  assert.equal(result.status, 401);
  assert.equal(result.headers.get('Cache-Control'), 'no-store');
  result = await api.onRequest({ request: new Request('https://example.com/api/binance', { method: 'POST', headers: { Origin: 'https://evil.test' } }), env: {} });
  assert.equal(result.status, 403);
  const originalFetch = global.fetch;
  let queriedUser = '';
  try {
    global.fetch = async url => { assert.ok(String(url).endsWith('/auth/v1/user')); return api.json({ id: 'user-a' }); };
    const env = { SUPABASE_URL: 'https://auth.example.com', SUPABASE_ANON_KEY: 'public', BINANCE_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64'), BINANCE_DB: { prepare(sql) { return { bind(user) { queriedUser = user; return this; }, async first() { return null; }, async run() { return { meta: { changes: 1 } }; } }; } } };
    result = await api.onRequest({ request: new Request('https://example.com/api/binance', { headers: { Authorization: 'Bearer test' } }), env });
    assert.equal(queriedUser, 'user-a');
    assert.equal((await result.json()).connected, false);
    result = await api.onRequest({ request: new Request('https://example.com/api/binance', { method: 'DELETE', headers: { Authorization: 'Bearer test' } }), env });
    assert.equal(result.status, 200);
    const secret = 'b'.repeat(64);
    global.fetch = async (url, input = {}) => {
      const parsed = new URL(url);
      if (parsed.pathname === '/auth/v1/user') return api.json({ id: 'user-a' });
      assert.equal(input.method, 'GET');
      if (parsed.pathname === '/api/v3/time') return api.json({ serverTime: Date.now() });
      if (parsed.pathname.startsWith('/sapi/') || parsed.pathname === '/api/v3/account') {
        const signature = parsed.searchParams.get('signature');
        parsed.searchParams.delete('signature');
        assert.equal(signature, require('node:crypto').createHmac('sha256', secret).update(parsed.searchParams.toString()).digest('hex'));
        assert.equal(input.headers['X-MBX-APIKEY'], 'a'.repeat(64));
      }
      if (parsed.pathname === '/sapi/v1/account/apiRestrictions') return api.json(permissions);
      if (parsed.pathname === '/api/v3/account') return api.json({ balances: [{ asset: 'BTC', free: '0.1', locked: '0.2' }, { asset: 'UNKNOWN', free: '2', locked: '0' }] });
      if (parsed.pathname === '/api/v3/ticker/24hr') return api.json([{ symbol: 'BTCUSDT', lastPrice: '110', openPrice: '100' }]);
      throw new Error('Unexpected endpoint');
    };
    result = await api.onRequest({ request: new Request('https://example.com/api/binance', { method: 'POST', headers: { Authorization: 'Bearer test', 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey: 'a'.repeat(64), apiSecret: secret }) }), env });
    assert.equal(result.status, 200);
    const connected = await result.json();
    assert.equal(connected.tokens[0].quantity, '0.3');
    assert.equal(connected.tokens[0].priceUsdt, 110);
    assert.equal(connected.tokens[1].priceUsdt, null, 'Unknown assets must be included without fabricated value');
    assert.ok(!JSON.stringify(connected).includes(secret));
  } finally { global.fetch = originalFetch; }
  assert.ok(!source.includes("method: 'POST', headers"), 'Binance requests must only use GET');
  console.log('Binance: read-only permissions, exact balances, encryption, user isolation, authentication, origin and removal passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
