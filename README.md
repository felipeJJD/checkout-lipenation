# Checkout Lipenation

Monorepo do checkout Casa Leonora.

## Estrutura

- `pagamento_oficial/`: frontend Vite/React.
- `pagamento_oficial_v2/`: backend Next.js com rotas da Pagar.me.

## Railway

Crie dois services no mesmo projeto Railway usando este repositório:

### Frontend

- Root directory: `pagamento_oficial`
- Build command: `npm ci && npm run build`
- Start command: `npm run start`
- Variáveis:
  - `VITE_API_BASE_URL`: URL pública do backend Railway

### Backend

- Root directory: `pagamento_oficial_v2`
- Build command: `npm ci && npm run build`
- Start command: `node .next/standalone/server.js`
- Variáveis:
  - `PAGARME_API_KEY`: chave secreta da Pagar.me
  - `FRONTEND_URL_ALLOWED`: URL pública do frontend Railway
  - `NTFY_TOPIC`: opcional, para notificações

Arquivos `.env` locais não são versionados.
