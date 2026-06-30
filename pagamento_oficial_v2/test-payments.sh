#!/bin/bash
URL=https://checkout-backend-production-d091.up.railway.app/api/checkout
HEADERS="Content-Type: application/json"
echo "===== TESTANDO PAGAMENTO COM CARTÃO ====="
echo "Enviando requisição para: $URL"
curl -s -X POST -H "$HEADERS" -d @card-payment-test.json "$URL" | jq .
echo -e "

===== TESTANDO PAGAMENTO COM PIX ====="
echo "Enviando requisição para: $URL"
curl -s -X POST -H "$HEADERS" -d @pix-payment-test.json "$URL" | jq .
echo -e "

===== TESTANDO PAGAMENTO COM BOLETO ====="
echo "Enviando requisição para: $URL"
curl -s -X POST -H "$HEADERS" -d @boleto-payment-test.json "$URL" | jq .
