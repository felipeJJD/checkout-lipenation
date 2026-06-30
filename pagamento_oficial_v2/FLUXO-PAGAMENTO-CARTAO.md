# Fluxo de Pagamento com Cartao de Credito — pagamento_oficial_v2

## Visao Geral

O sistema tem duas partes: um **frontend React (Vite)** que coleta os dados e um **backend Next.js** que processa o pagamento via API da Pagar.me V5.

---

## 1. Frontend — Coleta dos Dados do Cartao

**Arquivo:** `pedro-fejao-checkout/pedro-fejao-checkout/src/pages/CheckoutPage.tsx`

### 1.1 Campos coletados do usuario

| Campo | State | Mascara (IMask) | Validacao (Zod) |
|-------|-------|-----------------|-----------------|
| Numero do cartao | `cardNumber` | `0000 0000 0000 0000` | Algoritmo de Luhn |
| Validade | `cardExpiry` | `MM/YY` (MaskedRange 01-12 / ano atual-99) | Formato + nao expirado |
| CVV | `cardCvc` | `000[0]` (3 ou 4 digitos) | Regex `^\d{3,4}$` |
| Nome no cartao | `cardName` | Nenhuma | String nao vazia |
| Parcelas | `installments` | Nenhuma (Select 1-5) | Deve ser selecionado |

### 1.2 Dados pessoais (tambem coletados)

| Campo | State | Mascara |
|-------|-------|---------|
| Nome completo | `name` | Nenhuma |
| Email | `email` | Nenhuma |
| DDI | `ddi` | Padrao "+55" |
| Telefone | `phone` | `(00) 00000-0000` |
| CPF/CNPJ | `cpfCnpj` | `000.000.000-00` ou `00.000.000/0000-00` |

### 1.3 Validacao no frontend (Zod schema)

Quando o usuario clica "Finalizar", o `checkoutSchema.parse(formData)` roda:

1. Valida dados pessoais (nome, email, telefone com regex, CPF/CNPJ com lib `cpf-cnpj-validator`)
2. Se `paymentMethod === 'card'`, valida:
   - Numero do cartao via Luhn (`luhn.validate()`)
   - Formato da validade MM/YY e verifica se nao ta expirado
   - CVV 3-4 digitos
   - Nome do titular nao vazio
   - Parcelas selecionadas

Se a validacao falha, erros aparecem nos campos e um toast vermelho aparece.

### 1.4 Envio para o backend

```
POST ${VITE_API_BASE_URL}/api/checkout
```

**Payload enviado (via axios):**

```json
{
  "name": "Felipe Oliveira",
  "email": "felipe@email.com",
  "ddi": "+55",
  "phone": "(41) 98742-5246",
  "cpfCnpj": "123.456.789-00",
  "paymentMethod": "card",
  "items": [
    { "id": "prod_123", "name": "Produto A", "price": 55.75, "quantity": 1 }
  ],
  "cardNumber": "4000 0000 0000 0010",
  "cardExpiry": "12/28",
  "cardCvc": "123",
  "cardName": "FELIPE OLIVEIRA",
  "installments": "3"
}
```

> **Nota:** Os dados do cartao viajam em texto plano no JSON. A seguranca depende de HTTPS entre frontend e backend.

---

## 2. Backend — Processamento do Pagamento

**Arquivo:** `app/api/checkout/route.ts`

### 2.1 Recepcao e validacao

A funcao `POST()` recebe o request e faz:

1. **Verifica API key** — `PAGARME_API_KEY` deve comecar com `sk_` e ter mais de 20 chars
2. **Valida dados do cartao** (`validateCreditCardData()`):
   - `cardNumber` existe e tem 13-19 digitos
   - `cardName` existe e nao e vazio
   - `cardExpiry` existe e tem formato MM/YY valido
   - `cardCvc` existe e tem 3-4 digitos
3. **Calcula valor final** — se parcelado, aplica juros da tabela

### 2.2 Tabela de juros (parcelamento)

```
1x  →  0%
2x  →  8.39%
3x  →  9.64%
4x  → 10.89%
5x  → 12.14%
```

Formula: `finalAmount = paymentAmount * (1 + taxa)`

Exemplo: R$ 100,00 em 3x → R$ 100 * 1.0964 = R$ 109,64 (3x de R$ 36,55)

### 2.3 Montagem do payload para a Pagar.me

O backend monta o `requestBody` assim:

```json
{
  "closed": true,
  "items": [{
    "amount": 10501,
    "description": "Produto A",
    "quantity": 1,
    "code": "prod_123"
  }],
  "customer": {
    "name": "Felipe Oliveira",
    "email": "felipe@email.com",
    "type": "individual",
    "document": "12345678900",
    "address": {
      "line_1": "Av. Brasil, 1000",
      "zip_code": "01000000",
      "city": "Sao Paulo",
      "state": "SP",
      "country": "BR"
    },
    "phones": {
      "mobile_phone": {
        "country_code": "55",
        "area_code": "41",
        "number": "987425246"
      }
    }
  },
  "payments": [{
    "payment_method": "credit_card",
    "amount": 10501,
    "credit_card": {
      "installments": 3,
      "statement_descriptor": "DSHUB",
      "card": {
        "number": "4000000000000010",
        "holder_name": "FELIPE OLIVEIRA",
        "exp_month": 12,
        "exp_year": 2028,
        "cvv": "123",
        "holder_document": "12345678900"
      }
    }
  }]
}
```

**Transformacoes feitas no backend:**
- `amount` convertido para **centavos** (R$ 105,01 → 10501)
- `cardNumber` tem espacos removidos (`replace(/\s/g, '')`)
- `cardExpiry` "12/28" → `exp_month: 12`, `exp_year: 2028`
- `cpfCnpj` limpo (`replace(/\D/g, '')`)
- `phone` separado em `country_code`, `area_code`, `number`
- `paymentMethod` normalizado: `'card'` → `'credit_card'`

### 2.4 Envio para Pagar.me Core V5

```
POST https://api.pagar.me/core/v5/orders
Authorization: Basic {base64(API_KEY + ':')}
Content-Type: application/json
```

A autenticacao e Basic Auth: a API key (`sk_...`) seguida de `:` codificada em base64.

### 2.5 Resposta da Pagar.me

**Sucesso (HTTP 200):**

A Pagar.me retorna o pedido com `status: "paid"` e dados do charge:

```json
{
  "id": "or_abc123...",
  "status": "paid",
  "amount": 10501,
  "charges": [{
    "status": "paid",
    "last_transaction": {
      "status": "captured",
      "card": {
        "last_four_digits": "0010",
        "brand": "visa"
      }
    }
  }]
}
```

**Erro (HTTP 4xx/5xx):**

```json
{
  "message": "The request is invalid.",
  "errors": [
    { "message": "The card number is not a valid number.", "parameter_name": "card.number" }
  ]
}
```

### 2.6 Resposta formatada para o frontend

O backend formata e retorna:

```json
{
  "success": true,
  "data": {
    "id": "or_abc123...",
    "status": "paid",
    "amount": 10501,
    "payment_method": "credit_card",
    "card_installments": 3,
    "card_last_digits": "0010",
    "card_brand": "visa",
    "is_approved": true
  }
}
```

### 2.7 Notificacao

Apos sucesso, o backend envia notificacao via `POST https://ntfy.sh/{NTFY_TOPIC}` com dados da venda (cliente, valor, metodo).

---

## 3. Frontend — Exibicao do Resultado

### Sucesso (`PaymentSuccessDisplay`)
- Tela verde de sucesso
- Mostra: ultimos 4 digitos, bandeira, parcelas, valor
- Botoes: "Nova Compra" e "Voltar ao Inicio"

### Erro (`PaymentErrorDisplay`)
- Tipos visuais diferentes conforme o erro:
  - `card_declined` — cartao recusado
  - `insufficient_funds` — saldo insuficiente
  - `invalid_card` — dados invalidos
  - `network_error` — falha de conexao
  - `generic` — erro generico
- Botao "Tentar Novamente" (volta pro formulario com dados preenchidos)

---

## 4. Diagrama do Fluxo Completo

```
USUARIO                    FRONTEND (React/Vite)              BACKEND (Next.js)                  PAGAR.ME V5
  |                              |                                  |                                |
  |-- Preenche formulario ----->|                                  |                                |
  |                              |                                  |                                |
  |-- Clica "Finalizar" ------->|                                  |                                |
  |                              |-- Zod valida dados              |                                |
  |                              |   (Luhn, CPF, telefone)         |                                |
  |                              |                                  |                                |
  |                              |-- POST /api/checkout ---------->|                                |
  |                              |   {name, email, cardNumber,     |                                |
  |                              |    cardExpiry, cardCvc, ...}    |                                |
  |                              |                                  |                                |
  |                              |                                  |-- Valida dados               |
  |                              |                                  |-- Calcula juros              |
  |                              |                                  |-- Monta payload Pagar.me     |
  |                              |                                  |                                |
  |                              |                                  |-- POST /core/v5/orders ----->|
  |                              |                                  |   {items, customer,           |
  |                              |                                  |    payments.credit_card.card} |
  |                              |                                  |                                |
  |                              |                                  |<---- {status, charges} -------|
  |                              |                                  |                                |
  |                              |                                  |-- Envia ntfy.sh notification |
  |                              |                                  |                                |
  |                              |<-- {success, data} -------------|                                |
  |                              |                                  |                                |
  |<-- Mostra resultado --------|                                  |                                |
  |   (sucesso ou erro)         |                                  |                                |
```

---

## 5. Variaveis de Ambiente Relevantes

| Variavel | Onde | Descricao |
|----------|------|-----------|
| `PAGARME_API_KEY` | Backend | Chave secreta da Pagar.me (`sk_...`) |
| `VITE_API_BASE_URL` | Frontend | URL do backend (padrao: `http://localhost:3000`) |
| `NTFY_TOPIC` | Backend | Topico ntfy.sh para notificacoes. Usar um topico PRIVADO/aleatorio — qualquer um que saiba o nome do topico le todas as notificacoes de venda. Sem default no codigo: se ausente, as notificacoes sao simplesmente puladas. |
| `USE_PAYMENT_SIMULATION` | Backend | Se `'true'`, simula pagamento sem chamar Pagar.me |
| `FRONTEND_URL_ALLOWED` | Backend | Origem permitida no CORS das route handlers (padrao: `https://gosafepay.com.br`). Allowlist explicita — so reflete o `Origin` se ele bater; nunca responde `*` a menos que a var seja literalmente `*` |

---

## 6. Modo Simulacao

Se `USE_PAYMENT_SIMULATION=true`, o backend NAO chama a Pagar.me. Retorna dados fake simulando sucesso (`status: "paid"`, cartao Visa, ultimos 4 digitos do numero informado).

Util para testar o fluxo completo sem gastar chamadas reais na API.

---

## 7. Arquivos-Chave

| Arquivo | Responsabilidade |
|---------|-----------------|
| `pedro-fejao-checkout/.../CheckoutPage.tsx` | Formulario, validacao Zod, submit, exibicao resultado |
| `pedro-fejao-checkout/.../CardPaymentForm.tsx` | Campos de cartao com mascaras IMask |
| `pedro-fejao-checkout/.../PaymentSuccessDisplay.tsx` | Tela de sucesso apos pagamento aprovado |
| `pedro-fejao-checkout/.../PaymentErrorDisplay.tsx` | Tela de erro com tipos visuais |
| `app/api/checkout/route.ts` | Recebe dados, valida, monta payload, chama Pagar.me, retorna resultado |
| `server.js` | Servidor HTTP custom (so usado em `npm start` local). Producao usa `.next/standalone/server.js` gerado pelo Next via `railway.toml`. CORS fica por conta das route handlers, nao deste arquivo |
