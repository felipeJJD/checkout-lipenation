# PRD - Checkout do Felipe

## 1. Resumo

O Checkout do Felipe e uma aplicacao de pagamento composta por um frontend React/Vite e um backend Next.js que integra com a Pagar.me Core V5. O checkout deve vender um produto/servico com valor definido por link, aceitar Pix e cartao de credito, aplicar juros diluidos no cartao conforme tabela comercial vigente e impedir boleto no fluxo de compra.

## 2. Objetivo do Produto

Entregar um checkout direto, confiavel e simples de operar para links de pagamento personalizados.

Objetivos principais:

- Receber o valor via URL (`/checkout?amount=2997.00`).
- Coletar dados pessoais do comprador.
- Permitir pagamento por Pix ou cartao de credito.
- Permitir parcelamento no cartao somente de 1x a 5x.
- Aplicar a taxa correta nos parcelamentos do cartao a partir de 2x.
- Bloquear boleto no frontend e no backend.
- Preservar uma camada de simulacao local para desenvolvimento.

## 3. Publico e Casos de Uso

Publico primario:

- Compradores que recebem um link de pagamento.
- Operador interno que gera links por valor.
- Responsavel tecnico que precisa validar pagamentos e manutencao do fluxo.

Casos de uso:

- Comprar por Pix a partir de um link com valor fixo.
- Comprar por cartao em 1x a 5x.
- Gerar link de checkout com valor personalizado.
- Testar pagamentos localmente sem bater na Pagar.me, usando simulacao.

## 4. Escopo Atual

Incluido:

- Tela de checkout com dados pessoais.
- Abas de pagamento: Cartao e Pix.
- Validacao de CPF/CNPJ, telefone, email e dados de cartao.
- Calculo de juros do cartao no frontend para exibicao.
- Calculo de juros do cartao no backend para valor real enviado a Pagar.me.
- API `POST /api/checkout`.
- Modo `USE_PAYMENT_SIMULATION=true`.
- Notificacao opcional via `NTFY_TOPIC`.

Fora de escopo neste momento:

- Boleto como meio de pagamento.
- Multiplos produtos no carrinho.
- Recuperacao automatica de pagamento Pix expirado.
- Cadastro/login do comprador.
- Painel financeiro completo.
- Antifraude dedicado fora do fluxo da Pagar.me.

## 5. Regras de Negocio

### Valor

- O valor principal vem do parametro `amount` da URL.
- Se `amount` estiver ausente, invalido ou menor/igual a zero, o carrinho fica vazio e o envio e bloqueado.
- No backend, o valor e convertido para centavos antes de enviar para a Pagar.me.

### Meios de pagamento

- Meios permitidos: `card` no frontend, normalizado para `credit_card` no backend; e `pix`.
- `boleto` deve ser rejeitado pela UI e pela API.
- Qualquer metodo fora de `credit_card` e `pix` retorna erro 400.

### Parcelamento

O cartao permite apenas 1 a 5 parcelas.

| Parcelas | Taxa |
| --- | ---: |
| 1x | 0% |
| 2x | 8.39% |
| 3x | 9.64% |
| 4x | 10.89% |
| 5x | 12.14% |

Formula:

```txt
valor_final = valor_base * (1 + taxa)
valor_parcela = valor_final / numero_de_parcelas
```

O frontend usa a formula para mostrar o valor ao comprador. O backend repete a regra como fonte de verdade antes de criar o pedido na Pagar.me.

## 6. Fluxo do Usuario

1. O comprador acessa `/checkout?amount={valor}`.
2. O checkout monta o carrinho com um item unico.
3. O comprador preenche nome, email, telefone e CPF/CNPJ.
4. O comprador escolhe Cartao ou Pix.
5. Em Cartao, escolhe 1x a 5x e preenche numero, validade, CVV e nome impresso.
6. Em Pix, confirma os dados e gera o QR Code.
7. O frontend envia o payload para `POST /api/checkout`.
8. O backend valida metodo, valor, parcelas e dados de cartao.
9. O backend cria o pedido real ou simulado.
10. O frontend exibe sucesso, Pix copia-e-cola ou erro amigavel.

## 7. Arquitetura

Frontend:

- `pagamento_oficial/src/pages/CheckoutPage.tsx`: orquestra o checkout.
- `pagamento_oficial/src/components/checkout/*`: componentes de formulario, abas, resumo e resultado.
- `pagamento_oficial/src/config/checkout.ts`: regras do checkout usadas na UI.

Backend:

- `pagamento_oficial_v2/app/api/checkout/route.ts`: endpoint principal de pagamento.
- `pagamento_oficial_v2/app/api/checkout/payment-config.ts`: regras compartilhadas da API para metodo, parcelas, taxas e descriptor.

Variaveis importantes:

- `VITE_API_BASE_URL`: URL do backend usada pelo frontend.
- `PAGARME_API_KEY`: chave secreta da Pagar.me.
- `USE_PAYMENT_SIMULATION`: quando `true`, responde com pagamento simulado.
- `FRONTEND_URL_ALLOWED`: origem permitida no CORS.
- `NTFY_TOPIC`: topico opcional para notificacoes.

## 8. Seguranca e Conformidade

- O frontend nunca deve persistir numero de cartao ou CVV.
- O backend nao deve logar o body cru do checkout.
- O trafego em producao deve obrigatoriamente usar HTTPS.
- A API key da Pagar.me deve ficar somente no backend.
- Erros retornados ao comprador devem ser claros, sem expor detalhes sensiveis.
- Dados de cartao passam pelo backend atual; qualquer evolucao de PCI deve considerar tokenizacao/checkout transparente recomendado pela Pagar.me.

## 9. Contrato da API

Endpoint:

```http
POST /api/checkout
```

Payload minimo para Pix:

```json
{
  "name": "Cliente Exemplo",
  "email": "cliente@email.com",
  "ddi": "+55",
  "phone": "(41) 99999-9999",
  "cpfCnpj": "123.456.789-00",
  "paymentMethod": "pix",
  "items": [{ "id": "dshub-2997.00", "name": "DS HUB", "price": 2997, "quantity": 1 }]
}
```

Payload minimo para Cartao:

```json
{
  "name": "Cliente Exemplo",
  "email": "cliente@email.com",
  "ddi": "+55",
  "phone": "(41) 99999-9999",
  "cpfCnpj": "123.456.789-00",
  "paymentMethod": "card",
  "items": [{ "id": "dshub-2997.00", "name": "DS HUB", "price": 2997, "quantity": 1 }],
  "cardNumber": "4000 0000 0000 0010",
  "cardExpiry": "12/28",
  "cardCvc": "123",
  "cardName": "CLIENTE EXEMPLO",
  "installments": "3"
}
```

Respostas esperadas:

- `200`: pagamento criado/simulado com `success: true`.
- `400`: dados obrigatorios ausentes, metodo invalido, parcela invalida ou cartao invalido.
- `500`: configuracao incompleta ou erro interno.

## 10. Criterios de Aceite

- O checkout mostra somente Cartao e Pix.
- O seletor de parcelas mostra apenas 1x, 2x, 3x, 4x e 5x.
- Uma tentativa com `paymentMethod=boleto` retorna 400 no backend.
- Uma tentativa com cartao em 6x retorna 400 no backend.
- Cartao em 5x retorna sucesso no modo simulacao.
- Pix retorna sucesso no modo simulacao e mostra dados de QR/copia-e-cola.
- Build do frontend passa.
- Typecheck do backend passa.

## 11. Riscos e Pontos de Atencao

- A tabela de juros existe no frontend e no backend; os dois arquivos precisam ser atualizados juntos ate existir um pacote compartilhado.
- O dashboard ainda pode conter metricas historicas de boleto. Isso nao significa que boleto esteja ativo no checkout.
- Dados de cartao trafegam pelo backend; para escalar em producao, avaliar tokenizacao e conformidade PCI.
- CORS depende de `FRONTEND_URL_ALLOWED`; localhost e dominio final precisam estar alinhados por ambiente.

## 12. Roadmap Sugerido

- Criar pacote compartilhado de regras de pagamento para eliminar duplicacao entre front e back.
- Adicionar testes unitarios para calculo de juros e validacao de parcelas.
- Adicionar testes E2E do fluxo Pix e Cartao.
- Revisar naming visual/branding caso o checkout deixe de ser DS HUB.
- Separar dashboard administrativo do checkout publico.
- Melhorar observabilidade sem expor dados sensiveis.
