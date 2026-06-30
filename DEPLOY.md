# Deploy do Ponte Financeira

O app online oficial e:

```text
https://pontefinanceira.netlify.app/
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
Site URL: https://pontefinanceira.netlify.app
Redirect URL: https://pontefinanceira.netlify.app
Redirect URL: https://pontefinanceira.netlify.app/**
```

Se voce trocar o dominio no futuro, atualize esses campos antes de ativar confirmacao de e-mail, recuperacao de senha ou magic link.
