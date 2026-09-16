# Binance somente leitura (v179)

Implementacao inicial: carteira Spot, saldo disponivel + bloqueado, cotacao por
par USDT e variacao em 24h. Todos os ativos Spot com saldo positivo aparecem,
inclusive sem par de cotacao (valor indisponivel, nao zero). Earn, Futures,
Funding, Binance Japan e Binance US nao fazem parte desta etapa. A variacao em
24h nao e lucro desde a compra. USDT e usado como referencia aproximada de USD.

## Preparar o Cloudflare

1. Crie um banco D1 chamado nekuma-binance e execute scripts/binance-schema.sql
   nele. Exemplo de comandos (exigem login Cloudflare):

```powershell
npx wrangler d1 create nekuma-binance
npx wrangler d1 execute nekuma-binance --remote --file scripts/binance-schema.sql
```

2. Copie o ID real retornado e adicione a vinculacao no wrangler.toml:

```toml
[[d1_databases]]
binding = "BINANCE_DB"
database_name = "nekuma-binance"
database_id = "ID_REAL_DO_BANCO"
```

Nao publique o exemplo com ID ficticio. Use banco separado para previews; nao
vincule builds de teste ao armazenamento de credenciais de producao.

3. Nas variaveis/secrets do projeto Pages configure SUPABASE_URL e
   SUPABASE_ANON_KEY conforme o Supabase existente. Configure como secret
   BINANCE_ENCRYPTION_KEY: chave aleatoria de 32 bytes em base64. Para gerar:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Nao coloque a chave de criptografia no GitHub, supabase-config.js ou conversa.
Preserve esta chave entre deploys: troca-la sem migracao invalida as conexoes.
Restrinja acesso ao D1 e aos secrets a administradores autorizados.

4. Execute npm ci, npm run check e npm run build. Publique o projeto com a pasta
   functions na raiz do repositorio, nao somente os arquivos estaticos.

## Conectar no aplicativo

Crie na Binance uma chave HMAC dedicada com leitura habilitada e todas as
permissoes de negociacao, transferencia, margem, futuros e saques desativadas.
O servidor valida as permissoes antes de armazenar e a cada atualizacao.
Informe API Key e API Secret exclusivamente no formulario Conectar Binance
do Nekuma publicado em HTTPS. Leia e marque a autorizacao de armazenamento.

As credenciais ficam criptografadas em AES-GCM no servidor, vinculadas ao ID
Supabase do usuario, nunca no estado compartilhado da familia ou localStorage.
O navegador envia as credenciais uma vez ao conectar e usa sua sessao Supabase
nas consultas seguintes. A consulta Binance usa apenas endpoints GET fixos.

O cache de saldo/cotacao e atualizado a cada hora com o app aberto. O botao
Atualizar permite antecipar (limite minimo de um minuto no servidor). Falhas
mantem o ultimo saldo e indicam consulta pendente. Remover conexao exclui as
credenciais e o cache no servidor; nao revoga a chave na propria Binance.

## Restricoes de operacao

O Cloudflare pode sair por IPs variaveis ou regioes bloqueadas pela Binance.
Nao desative restricoes de seguranca para contornar um bloqueio: para chaves
com allowlist de IP, utilize backend/egress autorizado com IP fixo. A integracao
retorna erro em caso de bloqueio; nao utiliza proxy para contornar restricoes.

Localhost 4174 serve somente os arquivos estaticos. Para testar o backend,
utilize wrangler pages dev com bindings e variaveis de desenvolvimento, ou
uma publicacao HTTPS. Nao foi realizado teste com credenciais reais.

Referencias oficiais:
- https://developers.binance.com/en/docs/products/spot/rest-api
- https://developers.binance.com/en/docs/catalog/core-trading-wallet/api/rest-api/account
- https://developers.cloudflare.com/pages/functions/wrangler-configuration/
