# Checkout Lipenation

Monorepo do checkout Casa Leonora.

## Estrutura

- `pagamento_oficial/`: frontend Vite/React.
- `pagamento_oficial_v2/`: backend Next.js com rotas da Pagar.me.

## Railway

Crie dois services no mesmo projeto Railway usando este repositório. Cada pasta ja tem seu proprio `railway.toml`, entao basta configurar o root directory certo.

Ordem recomendada:

1. Crie/deploye o backend.
2. Copie a URL publica do backend.
3. Crie/deploye o frontend usando essa URL em `VITE_API_BASE_URL`.
4. Copie a URL publica do frontend.
5. Volte no backend e preencha `FRONTEND_URL_ALLOWED` com a URL do frontend.
6. Redeploye backend e frontend depois de ajustar as variaveis.

### Frontend

- Root directory: `pagamento_oficial`
- Build command: usar o `railway.toml` da pasta (`npm run build`)
- Start command: usar o `railway.toml` da pasta (`npm run start`)
- Variáveis:
  - `VITE_API_BASE_URL`: URL pública do backend Railway

### Backend

- Root directory: `pagamento_oficial_v2`
- Build command: usar o `railway.toml` da pasta (`npm run build`)
- Start command: usar o `railway.toml` da pasta (`node .next/standalone/server.js`)
- Variáveis:
  - `PAGARME_API_KEY`: chave secreta da Pagar.me
  - `FRONTEND_URL_ALLOWED`: URL pública do frontend Railway
  - `NTFY_TOPIC`: opcional, para notificações

Arquivos `.env` locais não são versionados.
