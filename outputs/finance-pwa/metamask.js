(function () {
  'use strict';
  let discoveredProvider = null;
  const usdcContracts = {
    '0x1': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    '0x89': '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    '0xa': '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    '0xa4b1': '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    '0xa86a': '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    '0x2105': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    '0xaa36a7': '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'
  };

  window.addEventListener('eip6963:announceProvider', event => {
    if (event.detail?.info?.rdns === 'io.metamask' && event.detail.provider?.request) {
      discoveredProvider = event.detail.provider;
    }
  });
  window.dispatchEvent(new Event('eip6963:requestProvider'));

  function provider() {
    const injected = window.ethereum;
    return discoveredProvider
      || injected?.providers?.find(item => item.isMetaMask)
      || (injected?.isMetaMask ? injected : null);
  }

  function decimalUnits(hex, decimals) {
    if (!/^0x[0-9a-f]+$/i.test(String(hex))) throw new Error('Resposta de saldo invalida.');
    const digits = BigInt(hex).toString().padStart(decimals + 1, '0');
    if (!decimals) return digits;
    const fraction = digits.slice(-decimals).replace(/0+$/, '');
    return digits.slice(0, -decimals) + (fraction ? '.' + fraction : '');
  }

  async function snapshot(walletProvider, address) {
    if (!/^0x[0-9a-f]{40}$/i.test(address)) throw new Error('Endereco de carteira invalido.');
    const chainId = String(await walletProvider.request({ method: 'eth_chainId' })).toLowerCase();
    const block = await walletProvider.request({ method: 'eth_blockNumber' });
    const balanceHex = await walletProvider.request({ method: 'eth_getBalance', params: [address, block] });
    const contract = usdcContracts[chainId];
    const tokens = [];
    let tokenError = '';
    const contracts = contract ? [{ symbol: 'USDC', contract }] : [];
    if (chainId === '0x89') contracts.push({ symbol: 'USDC.e', contract: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' });
    if (contracts.length) {
      for (const token of contracts) {
      try {
        // ERC-20 balanceOf(address), evaluated at the same block as the native balance.
        const result = await walletProvider.request({
          method: 'eth_call',
          params: [{ to: token.contract, data: '0x70a08231' + address.slice(2).toLowerCase().padStart(64, '0') }, block]
        });
        tokens.push({ symbol: token.symbol, contract: token.contract, decimals: 6, balance: decimalUnits(result, 6) });
      } catch (error) {
        tokenError += 'Nao foi possivel consultar ' + token.symbol + '. Tente atualizar novamente. ';
      }
      }
    } else {
      tokenError = 'USDC nativo ainda nao configurado nesta rede. Tokens bridged nao sao consultados neste teste.';
    }
    const finalChainId = String(await walletProvider.request({ method: 'eth_chainId' })).toLowerCase();
    if (finalChainId !== chainId) throw new Error('A rede mudou durante a consulta. Atualize novamente.');
    return { address, chainId, balance: Number(decimalUnits(balanceHex, 18)), tokens, tokenError, blockNumber: block, updatedAt: new Date().toISOString(), status: 'connected', error: '' };
  }

  window.NekumaMetaMask = { provider, snapshot, decimalUnits, usdcContracts };
})();
