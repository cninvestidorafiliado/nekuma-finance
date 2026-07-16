# Nekuma Finance

PWA financeiro familiar para controlar Brasil, Japao, Wise, cripto, veiculo, cartoes, contas e rendas extras.

Site oficial:

```text
https://nekuma-finance.pages.dev/
```

## Desenvolvimento

Os arquivos fonte do app ficam em:

```text
outputs/finance-pwa
```

Para validar:

```bash
npm run check
```

Para gerar a pasta publica de deploy:

```bash
npm run build
```

O build cria:

```text
outputs/finance-pwa-online
```

## Deploy

O fluxo recomendado e GitHub + Netlify:

```text
Build command: node scripts/build-deploy.cjs
Publish directory: outputs/finance-pwa-online
```

Veja detalhes em `DEPLOY.md`.
