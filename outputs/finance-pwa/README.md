# Nekuma Finance

PWA inicial para controle financeiro familiar entre Brasil e Japao.

## Como rodar localmente

```bash
node server.cjs
```

Depois abra:

```text
http://127.0.0.1:4173
```

Esse servidor local e a senha basica sao apenas para teste no computador. Para ficar 24h online, publique os arquivos estaticos em Cloudflare Pages.

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
https://nekuma-finance.pages.dev/
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

### Opcao manual: Cloudflare Pages

1. Entre no painel do Cloudflare Pages.
2. Publique a pasta `outputs/finance-pwa-online` ou use Wrangler a partir da raiz.
3. Abra o link HTTPS gerado.
4. No celular, abra o link e instale o PWA pela opcao do navegador.

### Opcao recomendada: GitHub + Cloudflare Pages

1. Suba o projeto para um repositorio no GitHub.
2. Conecte esse repositorio no Cloudflare Pages.
3. Build command: `node scripts/build-deploy.cjs`.
4. Publish directory: `outputs/finance-pwa-online`.
5. Depois disso, cada update no GitHub gera deploy automatico.

Tambem existe um guia completo em `DEPLOY.md`.

### PayPal

O card PayPal da Home consulta `/api/paypal/balance`, que deve rodar como Cloudflare Pages Function.
Configure as variaveis no Cloudflare, nunca no frontend:

```text
PAYPAL_CLIENT_ID
PAYPAL_CLIENT_SECRET
PAYPAL_ENV=sandbox
SUPABASE_URL
SUPABASE_ANON_KEY
PAYPAL_ALLOWED_EMAILS
```

O endpoint exige login Supabase e, quando `PAYPAL_ALLOWED_EMAILS` estiver preenchido, apenas esses emails podem consultar o saldo.

### Nekuma IA

O painel Nekuma IA usa a Cloudflare Pages Function `/api/ai` e o Qwen 3 no
Workers AI. A funcao valida a sessao do Supabase, aplica o limite de tres
perguntas por usuario/dia no D1 e envia ao modelo somente um resumo financeiro
do mes selecionado. A IA e somente leitura e nao executa pagamentos nem altera
cadastros.

O agente e hibrido. `assistant-help.js` responde localmente e sem limite as
duvidas sobre como usar o aplicativo e os calculos mais comuns: resumo mensal,
contas abertas, saldos, gastos, reserva e cenarios de economia. Somente analises
interpretativas livres chamam o Qwen e consomem a franquia diaria. Antes dessa
chamada, o servidor calcula os fatos financeiros; o modelo apenas os interpreta.

A aba Cripto inclui o Radar Cripto, com perfil de risco, nota educativa,
concentracao, diversificacao, exposicao especulativa e aprofundamento opcional
pela IA. O Radar usa somente saldos e cotacoes disponiveis no app; nao executa
operacoes nem emite ordem direta de compra ou venda.

A visao detalhada da carteira consolida os ativos manuais, MetaMask e Binance.
O topo converte o valor total estimado para BTC. Para cada posicao, mostra valor
investido quando informado, preco atual, variacoes de 24 horas e 7 dias,
rendimento desde a compra, grafico de sete dias e a carteira ou instituicao de
custodia. Dois paineis adicionais mostram as cinco maiores altas de 24 horas
entre ativos relevantes e entre memecoins. Os dados de mercado usam o endpoint
`coins/markets` da CoinGecko e sao apenas informativos, sem recomendacao de compra.

O `wrangler.toml` configura os bindings `AI` e `BINANCE_DB`. Mantenha no
Cloudflare Pages, em **Settings > Variables and Secrets**:

```text
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua_anon_key
AI_DAILY_LIMIT=3
```

`AI_DAILY_LIMIT` e opcional; quando ausente, o servidor permite tres perguntas.
`AI_MODEL` tambem e opcional e usa `@cf/qwen/qwen3-30b-a3b-fp8` por padrao. A
tabela `ai_daily_usage` e criada automaticamente no D1 no primeiro uso.

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

## MetaMask no celular

O botao Conectar MetaMask usa a extensao quando disponivel e o MetaMask Connect
no Safari, Chrome e PWA. No celular, autorize no aplicativo MetaMask e retorne ao
Nekuma. No PC sem extensao, utilize o QR code da janela de conexao. Publique em
HTTPS para testar no celular; localhost do PC nao e acessivel pelo telefone.

A conexao somente consulta saldos: nao solicita assinatura ou envio de fundos.
O SDK conserva a sessao no navegador e os ultimos saldos continuam disponiveis
quando uma consulta falha. As consultas RPC utilizam PublicNode; a conexao mobile
utiliza o relay da MetaMask. Telemetria opcional do SDK desativada. Esta integracao
nao descobre automaticamente todos os tokens: consulta moeda nativa, USDC e
USDC.e na Polygon. Tron e outras redes nao EVM nao fazem parte desta etapa.

O SDK e empacotado localmente, carregado apenas ao conectar ou atualizar uma
carteira sem extensao. Execute npm ci e npm run build para preparar o deploy.
O build inclui os ajustes de compatibilidade da interface do SDK 2.1.1.

## Multiusuario

O schema cria uma familia (`households`) e salva os dados em `app_states`. Em **Ajustes > Nuvem**, o dono ve o codigo da familia. Outro usuario pode informar esse codigo no login, no cadastro ou em **Entrar em outra familia** para virar membro da mesma familia. As politicas RLS usam `household_members`, entao um usuario so acessa os dados das familias em que e membro.
