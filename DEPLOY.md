# Deploy do Nekuma Finance

O app online oficial e:

```text
https://nekuma-finance.pages.dev/
```

## Fluxo recomendado

1. Suba este projeto para um repositorio no GitHub.
2. No Netlify, crie um site conectado a esse repositorio.
3. Use as configuracoes abaixo, ou deixe o Netlify ler o `netlify.toml` da raiz.

```text
Build command: node scripts/build-deploy.cjs
Publish directory: outputs/finance-pwa-online
```

Depois disso, cada alteracao enviada ao GitHub gera um deploy novo automaticamente.

## Fluxo manual

Quando quiser publicar manualmente:

```bash
npm run build
```

Depois envie a pasta abaixo para o Netlify Drop:

```text
outputs/finance-pwa-online
```

Nao envie `outputs/finance-pwa`, porque essa pasta contem arquivos de desenvolvimento, SQL e servidor local.

## O que o build faz

- Copia somente arquivos publicos do PWA.
- Remove servidor local, logs, SQL e backups zipados.
- Atualiza a versao do service worker automaticamente.
- Gera `deploy-info.json` com a data/versao publicada.

## Supabase

No Supabase, mantenha:

```text
Site URL: https://nekuma-finance.pages.dev
Redirect URL: https://nekuma-finance.pages.dev
Redirect URL: https://nekuma-finance.pages.dev/**
```

Se voce trocar o dominio no futuro, atualize esses campos antes de ativar confirmacao de e-mail, recuperacao de senha ou magic link.

## PayPal no Cloudflare

O card PayPal usa uma Cloudflare Pages Function em `functions/api/paypal/balance.js`.
Nunca coloque o `client_secret` dentro do `app.js`.

No Cloudflare Pages, configure as variaveis de ambiente:

```text
PAYPAL_CLIENT_ID=seu_client_id
PAYPAL_CLIENT_SECRET=seu_secret
PAYPAL_ENV=sandbox
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua_anon_key
PAYPAL_ALLOWED_EMAILS=seu-email@exemplo.com
```

Use `PAYPAL_ENV=sandbox` para testes. Troque para `live` somente depois de regenerar o secret e revisar as permissoes do app no PayPal.

Se publicar manualmente com Wrangler, rode o comando a partir da raiz do projeto. A pasta `functions/` precisa estar na raiz; Direct Upload pelo painel da Cloudflare nao publica Functions.

```bash
npx wrangler pages deploy outputs/finance-pwa-online --project-name=nekuma-finance --branch=main
```
