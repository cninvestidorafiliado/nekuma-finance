(function () {
  'use strict';
  let options;
  let owner = '';
  let data = { connected: false, tokens: [] };
  let attemptedAt = 0;
  let busy = false;
  let currency = 'USD';
  let expanded = false;
  let epoch = 0;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const money = value => options.money(options.convert(value, 'USD', currency), currency);
  function paint() {
    document.querySelectorAll('[data-binance-group]').forEach(element => {
      const controlsOnly = element.hasAttribute('data-controls-only');
      element.innerHTML = `<div class="panel-head"><div><h3><img class="crypto-provider-logo" src="./assets/crypto/binance.png" alt="" width="28" height="28">Binance</h3><span class="row-meta">Spot · Somente leitura</span></div><div class="chips"><span class="metamask-currency-control"><select data-binance-currency aria-label="Moeda da carteira Binance">${['USD', 'BRL', 'EUR', 'JPY'].map(item => `<option ${item === currency ? 'selected' : ''}>${item}</option>`).join('')}</select><i data-lucide="chevron-down" aria-hidden="true"></i></span><button class="small-action" data-binance-action="${data.connected ? 'refresh' : 'connect'}" ${busy ? 'disabled' : ''}>${busy ? 'Conectando...' : data.connected ? 'Atualizar' : 'Conectar Binance'}</button></div></div>
        ${data.error ? `<p class="web3-error" role="status">${escape(data.error)}</p>` : ''}
        ${data.connected && !controlsOnly ? `<div class="metamask-token-list">${(data.tokens || []).map(token => `<div class="metamask-token-row">${options.icon(token.symbol)}<div class="metamask-token-market"><strong>${escape(token.symbol)}</strong><small>${token.priceUsdt == null ? 'Cotacao indisponivel' : escape(money(token.priceUsdt))} ${Number.isFinite(token.change24h) ? `<span class="${token.change24h >= 0 ? 'income' : 'expense'}">${escape(token.change24h.toFixed(2))}% · 24h</span>` : ''}</small></div><div class="metamask-token-position"><strong>${options.hidden() ? '••••' : token.priceUsdt == null ? '—' : escape(money(Number(token.quantity) * token.priceUsdt))}</strong><small>${options.hidden() ? '••••' : escape(token.quantity)} ${escape(token.symbol)}</small></div></div>`).join('') || '<p class="row-meta">Nenhum saldo positivo na conta Spot.</p>'}</div><details data-binance-details ${expanded ? 'open' : ''}><summary>Detalhamento da carteira Binance</summary><p class="row-meta">${escape(data.updatedAt ? new Date(data.updatedAt).toLocaleString('pt-BR') : '')}${data.stale ? ' · Ultimo saldo valido' : ''}</p><p class="row-meta">Referencia USDT aproximada em USD. Variacao de mercado em 24h; lucro desde a compra nao calculado.</p>${data.priceWarning ? `<p class="row-meta">${escape(data.priceWarning)}</p>` : ''}<button class="small-action ghost" data-binance-action="disconnect">Remover conexao Binance</button></details>` : ''}`;
    });
    options.icons();
  }
  async function identity() {
    const token = await options.token();
    let id = '';
    try { id = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub || ''; } catch {}
    if (owner !== id) { owner = id; data = { connected: false, tokens: [] }; attemptedAt = 0; busy = false; epoch++; paint(); }
    return token;
  }
  async function request(method = 'GET', body, force = false) {
    const token = await identity();
    if (!token) { data.error = 'Entre no app para conectar a Binance.'; paint(); return; }
    if (busy) return;
    if (method === 'GET' && !force && Date.now() - attemptedAt < 300000) return;
    const generation = epoch;
    busy = true;
    attemptedAt = Date.now();
    paint();
    try {
      const response = await fetch('/api/binance' + (force ? '?refresh=1' : ''), { method, cache: 'no-store', headers: { Authorization: 'Bearer ' + token, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(60000) });
      const result = await response.json().catch(() => { throw new Error('A conexao Binance precisa ser publicada com Cloudflare Functions.'); });
      if (!response.ok) {
        const code = /^[A-Z_]+$/.test(result.code || '') ? ` [${result.code}]` : '';
        throw new Error((result.error || 'Nao foi possivel consultar a Binance.') + code);
      }
      if (generation !== epoch) return;
      data = result;
      options.onUpdate?.();
      return true;
    } catch (error) {
      if (generation === epoch) data = { ...data, error: error.message, stale: data.connected };
      return false;
    } finally {
      if (generation === epoch) { busy = false; paint(); }
    }
  }
  function connectForm() {
    if (document.querySelector('[data-binance-dialog]')) return;
    const dialog = document.createElement('dialog');
    dialog.dataset.binanceDialog = '';
    dialog.className = 'binance-connect-dialog';
    dialog.innerHTML = `<form><h2>Conectar Binance</h2><label>API Key (HMAC)<input name="apiKey" type="password" autocomplete="off" required maxlength="128"></label><label>API Secret<input name="apiSecret" type="password" autocomplete="off" required maxlength="128"></label><label class="binance-consent"><input name="consent" type="checkbox" required>Autorizo enviar estas credenciais ao servidor Nekuma para armazenamento criptografado e consulta de saldos na Binance.</label><p class="row-meta">Chave somente de leitura. Negociacao, transferencias e saques devem estar desativados.</p><div class="chips"><button type="button" class="small-action ghost" data-cancel>Cancelar</button><button type="submit" class="small-action">Conectar</button></div></form>`;
    document.body.append(dialog);
    dialog.querySelector('[data-cancel]').onclick = () => dialog.close();
    dialog.addEventListener('close', () => dialog.remove());
    dialog.querySelector('form').onsubmit = event => {
      event.preventDefault();
      const values = new FormData(event.target);
      const credentials = { apiKey: values.get('apiKey'), apiSecret: values.get('apiSecret') };
      event.target.reset();
      dialog.close();
      request('POST', credentials);
    };
    dialog.showModal();
  }
  document.addEventListener('click', event => {
    const action = event.target.closest('[data-binance-action]')?.dataset.binanceAction;
    if (action === 'connect') connectForm();
    if (action === 'refresh') request('GET', null, true);
    if (action === 'disconnect' && confirm('Remover as credenciais Binance armazenadas e os saldos desta conexao?')) request('DELETE');
  });
  document.addEventListener('change', event => { if (event.target.matches('[data-binance-currency]')) { currency = event.target.value; paint(); } });
  document.addEventListener('toggle', event => { if (event.target.matches('[data-binance-details]')) expanded = event.target.open; }, true);
  setInterval(() => {
    if (options && !document.hidden && data.connected && Date.now() - Date.parse(data.updatedAt || '') >= 3600000) request();
  }, 60000);
  document.addEventListener('visibilitychange', () => { if (options && !document.hidden) request(); });
  window.NekumaBinance = {
    mount(config) { options = config; identity().then(() => { paint(); if (document.querySelector('[data-binance-group]')) request(); }); },
    snapshot() { return { connected: Boolean(data.connected), tokens: (data.tokens || []).map(token => ({ ...token })), updatedAt: data.updatedAt || '' }; },
    async reset() { if (!data.connected) return true; return Boolean(await request('DELETE')); },
    clear() { epoch++; owner = ''; busy = false; data = { connected: false, tokens: [] }; }
  };
})();
