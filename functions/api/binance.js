const BASE = 'https://api.binance.com';
const HOUR = 3600000;
const encoder = new TextEncoder();
class ConnectionError extends Error {
  constructor(code, message, status = 400) { super(message); this.code = code; this.status = status; }
}
const failure = error => ({ error: error.message, code: error.code });
export function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}
export function assertReadOnly(permissions) {
  const forbidden = ['enableWithdrawals', 'enableInternalTransfer', 'enableMargin', 'enableFutures', 'permitsUniversalTransfer', 'enableVanillaOptions', 'enableFixApiTrade', 'enableSpotAndMarginTrading', 'enablePortfolioMarginTrading'];
  if (permissions.enableReading !== true || forbidden.some(name => permissions[name] !== false)) {
    const enabled = forbidden.filter(name => permissions[name] === true);
    const missing = forbidden.filter(name => typeof permissions[name] !== 'boolean');
    if (enabled.length || permissions.enableReading === false) throw new ConnectionError('READ_ONLY_REQUIRED', 'Use uma chave somente de leitura, sem negociacao, transferencias ou saques.');
    throw new ConnectionError('PERMISSIONS_UNVERIFIED', 'A Binance nao confirmou todas as permissoes desta chave. Por seguranca, a conexao foi recusada.' + (missing.length ? ` Campos: ${missing.join(', ')}.` : ''));
  }
}
async function signed(path, credentials, timestamp, params = {}) {
  const query = new URLSearchParams({ ...params, recvWindow: '5000', timestamp: String(timestamp) });
  const key = await crypto.subtle.importKey('raw', encoder.encode(credentials.apiSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(query.toString()));
  query.set('signature', [...new Uint8Array(signature)].map(byte => byte.toString(16).padStart(2, '0')).join(''));
  return binanceFetch(path + '?' + query, { 'X-MBX-APIKEY': credentials.apiKey });
}
async function binanceFetch(path, headers = {}) {
  let response;
  try { response = await fetch(BASE + path, { method: 'GET', headers, signal: AbortSignal.timeout(15000) }); }
  catch { throw new ConnectionError('BINANCE_NETWORK', 'O servidor nao conseguiu consultar a Binance. Tente novamente mais tarde.', 502); }
  if (!response.ok) {
    if ([418, 429].includes(response.status)) throw new ConnectionError('BINANCE_RATE_LIMIT', 'Limite da Binance atingido. Tente mais tarde.', 429);
    if ([403, 451].includes(response.status)) throw new ConnectionError('BINANCE_REGION_IP', 'A Binance bloqueou a consulta pela regiao ou pelo IP do servidor Cloudflare. Nao altere as permissoes da chave para contornar o bloqueio.', 502);
    // Never forward Binance messages: they can contain request or credential details.
    let code;
    try { code = Number((await response.json()).code); } catch {}
    if (code === -1022) throw new ConnectionError('BINANCE_SIGNATURE', 'API Secret nao corresponde a API Key, ou a assinatura foi recusada. Confira o par de chaves HMAC.');
    if (code === -2014) throw new ConnectionError('BINANCE_KEY_FORMAT', 'A Binance recusou o formato da API Key. Use uma chave HMAC gerada pelo sistema.');
    if (code === -2015) throw new ConnectionError('BINANCE_KEY_IP_PERMISSIONS', 'A Binance recusou a chave, as permissoes ou o IP do servidor. Confira se a API Key esta ativa e se o IP autorizado corresponde ao backend.');
    if (code === -1021) throw new ConnectionError('BINANCE_CLOCK', 'A Binance recusou o horario da assinatura. Tente novamente; se persistir, precisamos revisar a sincronizacao do servidor.', 502);
    throw new ConnectionError('BINANCE_REJECTED', 'A Binance recusou a consulta. Verifique chave, permissoes e restricao de IP.', 502);
  }
  try { return await response.json(); }
  catch { throw new ConnectionError('BINANCE_RESPONSE', 'A Binance retornou uma resposta invalida.', 502); }
}
export function decimalSum(a, b) {
  if (![a, b].every(value => /^\d+(\.\d+)?$/.test(value))) throw new Error('Saldo invalido retornado pela Binance.');
  const digits = Math.max((a.split('.')[1] || '').length, (b.split('.')[1] || '').length);
  const units = value => BigInt(value.replace('.', '').padEnd(value.replace('.', '').length + digits - (value.split('.')[1] || '').length, '0'));
  const total = (units(a) + units(b)).toString().padStart(digits + 1, '0');
  return digits ? total.slice(0, -digits) + '.' + total.slice(-digits) : total;
}
async function snapshot(credentials) {
  const time = await binanceFetch('/api/v3/time');
  const clockOffset = Number(time.serverTime) - Date.now();
  if (!Number.isFinite(clockOffset)) throw new Error('Horario da Binance invalido.');
  const permissions = await signed('/sapi/v1/account/apiRestrictions', credentials, Date.now() + clockOffset);
  assertReadOnly(permissions);
  const account = await signed('/api/v3/account', credentials, Date.now() + clockOffset, { omitZeroBalances: 'true' });
  if (!Array.isArray(account.balances)) throw new Error('Resposta de saldos invalida.');
  const balances = account.balances.map(item => ({ symbol: item.asset, free: item.free, locked: item.locked, quantity: decimalSum(item.free, item.locked) })).filter(item => Number(item.quantity) > 0);
  let tickers = [];
  let priceWarning = '';
  try { tickers = await binanceFetch('/api/v3/ticker/24hr?type=MINI'); } catch { priceWarning = 'Cotacoes indisponiveis. Quantidades atualizadas.'; }
  const prices = new Map(tickers.map(item => [item.symbol, item]));
  const tokens = balances.map(item => {
    const market = prices.get(item.symbol + 'USDT');
    const current = Number(market?.lastPrice);
    const opening = Number(market?.openPrice);
    return { ...item, priceUsdt: item.symbol === 'USDT' ? 1 : current > 0 ? current : null,
      change24h: current > 0 && opening > 0 ? (current / opening - 1) * 100 : null };
  });
  return { connected: true, tokens, updatedAt: new Date().toISOString(), priceWarning, scope: 'Spot' };
}
async function encryptionKey(env) {
  let bytes;
  try { bytes = Uint8Array.from(atob(env.BINANCE_ENCRYPTION_KEY || ''), char => char.charCodeAt(0)); } catch {}
  if (bytes?.length !== 32) throw new ConnectionError('SERVER_ENCRYPTION_CONFIG', 'A chave de criptografia do servidor esta ausente ou invalida. Corrija BINANCE_ENCRYPTION_KEY no Cloudflare.', 503);
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
export async function encrypt(credentials, key, userId) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: encoder.encode(userId) }, key, encoder.encode(JSON.stringify(credentials)));
  return { iv: btoa(String.fromCharCode(...iv)), ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))) };
}
async function decrypt(record, key, userId) {
  const bytes = value => Uint8Array.from(atob(value), char => char.charCodeAt(0));
  const clear = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(record.iv), additionalData: encoder.encode(userId) }, key, bytes(record.ciphertext));
  return JSON.parse(new TextDecoder().decode(clear));
}
export async function onRequest({ request, env }) {
  let stage = 'request';
  try {
    if (!['GET', 'POST', 'DELETE'].includes(request.method)) return json({ error: 'Metodo nao permitido.' }, 405);
    const origin = request.headers.get('Origin');
    if (origin && origin !== new URL(request.url).origin) return json({ error: 'Origem nao permitida.' }, 403);
    const authorization = request.headers.get('Authorization') || '';
    if (!authorization.startsWith('Bearer ')) return json({ error: 'Entre no app para conectar a Binance.' }, 401);
    const supabaseUrl = env.SUPABASE_URL || env.PONTE_SUPABASE_URL;
    const anonKey = env.SUPABASE_ANON_KEY || env.PONTE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey || !env.BINANCE_DB) return json({ error: 'Configure SUPABASE_URL, SUPABASE_ANON_KEY e BINANCE_DB no Cloudflare.' }, 503);
    stage = 'authentication';
    const auth = await fetch(supabaseUrl.replace(/\/$/, '') + '/auth/v1/user', { headers: { Authorization: authorization, apikey: anonKey }, signal: AbortSignal.timeout(10000) });
    if (!auth.ok) return json({ error: 'Sessao expirada. Entre novamente.' }, 401);
    const user = await auth.json();
    if (!user.id) return json({ error: 'Sessao invalida.' }, 401);
    const db = env.BINANCE_DB;
    stage = 'storage';
    if (request.method === 'DELETE') {
      await db.prepare('DELETE FROM binance_connections WHERE user_id = ?').bind(user.id).run();
      return json({ connected: false, tokens: [] });
    }
    const key = await encryptionKey(env);
    if (request.method === 'POST') {
      stage = 'request';
      if (!request.headers.get('Content-Type')?.includes('application/json')) return json({ error: 'Formato invalido.' }, 400);
      const bodyText = await request.text();
      if (bodyText.length > 2048) return json({ error: 'Dados excedem o limite.' }, 413);
      let body;
      try { body = JSON.parse(bodyText); } catch { return json({ error: 'Dados JSON invalidos.' }, 400); }
      if (!body || typeof body !== 'object') return json({ error: 'Dados invalidos.' }, 400);
      const credentials = { apiKey: String(body.apiKey || '').trim(), apiSecret: String(body.apiSecret || '').trim() };
      if (!Object.values(credentials).every(value => /^[a-zA-Z0-9]{32,128}$/.test(value))) return json({ error: 'Informe uma chave HMAC e seu segredo validos.' }, 400);
      stage = 'storage';
      const attempt = await db.prepare('INSERT INTO binance_connect_attempts (user_id, attempted_at) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET attempted_at=excluded.attempted_at WHERE binance_connect_attempts.attempted_at < ?').bind(user.id, Date.now(), Date.now() - 60000).run();
      if (!attempt.meta.changes) return json({ error: 'Aguarde um minuto antes de tentar conectar novamente.' }, 429);
      stage = 'binance';
      const result = await snapshot(credentials);
      const encrypted = await encrypt(credentials, key, user.id);
      stage = 'storage';
      await db.prepare('INSERT INTO binance_connections (user_id, iv, ciphertext, snapshot, updated_at, attempted_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET iv=excluded.iv, ciphertext=excluded.ciphertext, snapshot=excluded.snapshot, updated_at=excluded.updated_at, attempted_at=excluded.attempted_at').bind(user.id, encrypted.iv, encrypted.ciphertext, JSON.stringify(result), Date.now(), Date.now()).run();
      return json(result);
    }
    const record = await db.prepare('SELECT * FROM binance_connections WHERE user_id = ?').bind(user.id).first();
    if (!record) return json({ connected: false, tokens: [] });
    const cached = JSON.parse(record.snapshot);
    const force = new URL(request.url).searchParams.get('refresh') === '1';
    if ((!force && Date.now() - record.updated_at < HOUR) || Date.now() - record.attempted_at < 60000) return json(cached);
    const claim = await db.prepare('UPDATE binance_connections SET attempted_at = ? WHERE user_id = ? AND attempted_at = ?').bind(Date.now(), user.id, record.attempted_at).run();
    if (!claim.meta.changes) return json(cached);
    try {
      const result = await snapshot(await decrypt(record, key, user.id));
      // A concurrent removal/reconnection must not be resurrected by a late response.
      const saved = await db.prepare('UPDATE binance_connections SET snapshot = ?, updated_at = ? WHERE user_id = ? AND ciphertext = ?').bind(JSON.stringify(result), Date.now(), user.id, record.ciphertext).run();
      return saved.meta.changes ? json(result) : json({ connected: false, tokens: [] });
    } catch (error) { return json({ ...cached, stale: true, ...(error instanceof ConnectionError ? failure(error) : { error: 'Nao foi possivel atualizar. Ultimo saldo mantido; verifique permissoes, IP e disponibilidade da Binance.' }) }); }
  } catch (error) {
    if (error instanceof ConnectionError) return json(failure(error), error.status);
    const messages = {
      storage: 'Falha no banco da integracao Binance. Confira o binding BINANCE_DB e as duas tabelas D1.',
      authentication: 'Nao foi possivel validar sua sessao no Supabase. Tente entrar novamente.',
      binance: 'Falha ao processar os saldos retornados pela Binance.',
      request: 'Nao foi possivel processar a conexao Binance.'
    };
    return json({ error: messages[stage], code: `SERVER_${stage.toUpperCase()}` }, 500);
  }
}
