const path = require('node:path');
const fs = require('node:fs');
const { rollup } = require('rollup');
const { nodeResolve } = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const json = require('@rollup/plugin-json');
// SDK 2.1.1 loads incomplete legacy translations and can render the QR before its container exists.
const walletUiCompatibility = {
  name: 'nekuma-wallet-ui-compatibility',
  transform(code, id) {
    if (!id.replaceAll('\\', '/').includes('/@metamask/multichain-ui/')) return null;
    let result = code;
    if (code.includes('const defaultTranslations')) {
      result = result.replace('await this.loadTranslations(locale);', 'this.translations = defaultTranslations;');
      const translations = {
        'Connect with Metamask': 'Conectar com MetaMask',
        'Use extension': 'Usar extensao',
        'Use mobile': 'Usar celular',
        'Scan to connect with the MetaMask mobile app.': 'Escaneie com a MetaMask no celular.',
        'Install MetaMask Extension': 'Instalar MetaMask',
        'Install and try the MetaMask browser extension.': 'Conecte usando a extensao MetaMask.',
        'Connect With Extension': 'Conectar extensao',
        'Open the MetaMask app to continue with your session.': 'Abra a MetaMask para continuar.',
        'Disconnect': 'Desconectar'
      };
      for (const [english, portuguese] of Object.entries(translations)) result = result.replaceAll("'" + english + "'", "'" + portuguese + "'");
    }
    if (code.includes('this.qrCodeContainer = el;')) {
      result = result.replaceAll('this.qrCodeContainer = el;', 'this.qrCodeContainer = el; if (el) queueMicrotask(() => this.generateQRCode(this.link));');
    }
    return result === code ? null : { code: result, map: null };
  }
};
(async () => {
  const bundle = await rollup({
    input: path.join(__dirname, 'metamask-connect-entry.js'),
    plugins: [walletUiCompatibility, nodeResolve({ browser: true, preferBuiltins: false }), commonjs(), json()],
    onwarn(warning) {
      if (['CIRCULAR_DEPENDENCY', 'THIS_IS_UNDEFINED'].includes(warning.code)) return;
      if (warning.code === 'UNRESOLVED_IMPORT') throw new Error(warning.message);
      console.warn(warning.message);
    }
  });
  const { output } = await bundle.generate({ format: 'es', inlineDynamicImports: true });
  if (output[0].imports.length) throw new Error('O SDK deve ser autocontido: ' + output[0].imports.join(', '));
  const result = require('esbuild').transformSync(output[0].code, {
    minify: true, format: 'esm', target: 'es2022', legalComments: 'external'
  });
  const target = path.join(__dirname, '../outputs/finance-pwa/assets/vendor/metamask-connect.js');
  fs.writeFileSync(target, result.code);
  fs.writeFileSync(target + '.LEGAL.txt', result.legalComments || '');
  await bundle.close();
  console.log('MetaMask Connect: pacote local gerado.');
})().catch(error => { console.error(error); process.exitCode = 1; });
