# Ponte Financeira

PWA inicial para controle financeiro familiar entre Brasil e Japao.

## Como rodar localmente

```bash
node server.cjs
```

Depois abra:

```text
http://127.0.0.1:4173
```

Esse servidor local e a senha basica sao apenas para teste no computador. Para ficar 24h online, publique os arquivos estaticos em Vercel, Netlify ou Cloudflare Pages.

## O que ja existe

- PWA instalavel com `manifest.webmanifest` e `service-worker.js`.
- Modo Global, Brasil e Japao.
- Lancamentos por pais, moeda, categoria e mes.
- Transferencias Wise com cotacao, taxa e valor recebido.
- Contas recorrentes com categorias predefinidas, vencimento por data, frequencia mensal/anual/unica e alerta.
- Financiamentos, consorcio, cartao e investimentos.
- Meus Cartoes com identificacao Brasil/Japao, fechamento, vencimento, fatura e compras parceladas.
- Calendario financeiro mensal com vencimentos, Wise, rendas, veiculo e cartoes.
- Carteira cripto com distribuicao circular, preco medio, lucro/prejuizo e cotacoes CoinGecko.
- Empresas e Rendas com tipos Fabrica, Amazon, Uber, Renda Extra e Outros, cores por fonte e pagamentos separados por empresa.
- Veiculo Japao com Shaken, seguro e historico de manutencoes.
- Edicao direta de lancamentos, Wise, contas fixas, contratos, investimentos, cartoes, compras parceladas, criptos, empresas, recebimentos e manutencoes.
- Graficos de comparativo mensal, categorias e Brasil x Japao.
- Relatorio mensal incluindo recebimentos extras e custos do veiculo.
- Backup e importacao em JSON.
- Dados salvos no navegador via `localStorage` quando o Supabase estiver desligado.
- Modo Supabase ativo com login real e sincronizacao por familia.
- Codigo de familia para convidar outro usuario e compartilhar os mesmos dados.
- Cards de cotacao USD/BRL, USD/JPY e BTC/USD com atualizacao automatica.
- Botao principal `+` com central de cadastros para empresas, pagamentos, veiculo, cartoes, criptos, contas e investimentos.

## Publicar 24h online

O Supabase ja esta configurado em `supabase-config.js`. O site oficial esta em:

```text
https://pontefinanceira.netlify.app/
```

Para gerar a pasta publica limpa:

```bash
npm run build
```

O build gera automaticamente:

```text
outputs/finance-pwa-online
```

Publique somente essa pasta. Nao publique `outputs/finance-pwa`, porque ela contem `server.cjs`, logs e arquivos `.sql`.

### Opcao manual: Netlify Drop

1. Entre em `https://app.netlify.com/drop`.
2. Arraste a pasta `outputs/finance-pwa-online`.
3. Abra o link HTTPS gerado.
4. No celular, abra o link e instale o PWA pela opcao do navegador.

### Opcao recomendada: GitHub + Netlify

1. Suba o projeto para um repositorio no GitHub.
2. Conecte esse repositorio no Netlify.
3. Build command: `node scripts/build-deploy.cjs`.
4. Publish directory: `outputs/finance-pwa-online`.
5. Depois disso, cada update no GitHub gera deploy automatico.

Tambem existe um guia completo em `DEPLOY.md`.

## Supabase

Exemplo de `supabase-config.js`:

```js
window.PONTE_SUPABASE_CONFIG = {
  url: "https://seu-projeto.supabase.co",
  anonKey: "sua-anon-key",
  enableSignup: true
};
```

Quando `url` e `anonKey` estiverem preenchidos, o app mostra a tela de login e salva o estado da familia na tabela `app_states`. Sem essa configuracao, ele continua funcionando localmente.

Se o Supabase mostrar `new row violates row-level security policy for table "app_states"`, rode `supabase-app-state-rls-fix.sql` no SQL Editor. Ele recria a politica RLS do estado da familia e adiciona a funcao segura `save_app_state`.

## Multiusuario

O schema cria uma familia (`households`) e salva os dados em `app_states`. Em **Ajustes > Nuvem**, o dono ve o codigo da familia. Outro usuario pode informar esse codigo no login, no cadastro ou em **Entrar em outra familia** para virar membro da mesma familia. As politicas RLS usam `household_members`, entao um usuario so acessa os dados das familias em que e membro.
