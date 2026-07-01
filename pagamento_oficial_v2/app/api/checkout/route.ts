import { NextResponse } from 'next/server';
import {
  calculateCardAmountInCents,
  DEFAULT_STATEMENT_DESCRIPTOR,
  isValidCardInstallmentCount,
  MAX_CARD_INSTALLMENTS,
  normalizePaymentMethod,
  PIX_EXPIRES_IN_SECONDS,
  resolveCheckoutPayment,
} from './payment-config';

interface PagarMeError {
  message?: string;
  errors?: Array<{
    message?: string;
    parameter_name?: string;
  }>;
  [key: string]: any;
}

const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL_ALLOWED,
  'https://checkout.ciganaleonora.online',
  'https://checkout-lipenation-production.up.railway.app',
  'https://gosafepay.com.br',
  'https://checkout-frontend-production-0626.up.railway.app',
].filter(Boolean) as string[];

const isAllowedOrigin = (origin: string | null): boolean => {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes('*')) return true;
  return ALLOWED_ORIGINS.some((allowed) => origin.includes(allowed));
};

const baseCorsHeaders = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400',
};

const securityHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  'Pragma': 'no-cache',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

function getCorsHeaders(requestOrigin: string | null) {
  const headers: Record<string, string> = {
    ...baseCorsHeaders,
    ...securityHeaders,
    'Access-Control-Allow-Origin': '',
  };
  if (requestOrigin && (ALLOWED_ORIGINS.includes('*') || isAllowedOrigin(requestOrigin))) {
    headers['Access-Control-Allow-Origin'] = requestOrigin;
  } else if (ALLOWED_ORIGINS.includes('*') && !requestOrigin) {
    headers['Access-Control-Allow-Origin'] = '*';
  }
  return headers;
}

export async function OPTIONS(request: Request) {
  const requestOrigin = request.headers.get('origin');
  const currentCorsHeaders = getCorsHeaders(requestOrigin);
  if (currentCorsHeaders['Access-Control-Allow-Origin']) {
    return new NextResponse(null, { status: 200, headers: currentCorsHeaders });
  }
  return new NextResponse(null, { status: 204 });
}

const API_KEY = process.env.PAGARME_API_KEY;
const isApiKeyValid = !!API_KEY && API_KEY.startsWith('sk_') && API_KEY.length > 20;

const ENVIRONMENT = process.env.NODE_ENV || 'development';
const FORCE_SIMULATION = process.env.USE_PAYMENT_SIMULATION === 'true';

const API_BASE_URL = 'https://api.pagar.me/core/v5';
const ORDERS_ENDPOINT = `${API_BASE_URL}/orders`;

const HASH_REGEX = /^[A-HJ-NP-Za-km-z2-9]{6}$/;

// SEGURANÇA: o body do checkout contém cartão/CVV/CPF. Hoje NÃO há nenhum
// log do body nesta rota — mantenha assim. Se algum dia precisar logar o body
// para debug, passe SEMPRE por esta função antes (nunca `console.log(body)` cru).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function maskBodyForLog(body: any): any {
  if (!body || typeof body !== 'object') return body;
  const clone = JSON.parse(JSON.stringify(body));
  if (clone.cardNumber) {
    const cleaned = String(clone.cardNumber).replace(/\s/g, '');
    clone.cardNumber = cleaned.length >= 4 ? '****' + cleaned.slice(-4) : '****';
  }
  if (clone.cardCvc) clone.cardCvc = '***';
  if (clone.cardExpiry) clone.cardExpiry = '**/**';
  if (clone.cpfCnpj) {
    const c = String(clone.cpfCnpj).replace(/\D/g, '');
    clone.cpfCnpj = c.length >= 4 ? '***' + c.slice(-4) : '***';
  }
  return clone;
}

async function sendNtfyNotification(body: any, responseData: any) {
  try {
    const ntfyTopic = process.env.NTFY_TOPIC;
    if (!ntfyTopic) return;
    const ntfyUrl = `https://ntfy.sh/${ntfyTopic}`;

    const paymentMethodOriginal = body.paymentMethod || 'desconhecido';
    let paymentMethodFriendly = paymentMethodOriginal;
    if (paymentMethodOriginal === 'card' || paymentMethodOriginal === 'credit_card') paymentMethodFriendly = 'Cartao';
    else if (paymentMethodOriginal === 'pix') paymentMethodFriendly = 'PIX';

    const totalAmountInCents = responseData.amount || 0;
    const totalAmount = (totalAmountInCents / 100).toFixed(2);

    const customerFirstName = (responseData.customer?.name || body.name || 'Cliente').split(' ')[0];
    const orderId = responseData.id || 'sem-id';
    const orderIdDisplay = orderId.substring(0, 12);

    const notificationMessage = `Nova Venda! Cliente: ${customerFirstName}, Valor: R$${totalAmount}, Metodo: ${paymentMethodFriendly}. Pedido ID: ${orderIdDisplay}`;

    await fetch(ntfyUrl, {
      method: 'POST',
      body: notificationMessage,
      headers: {
        'Title': `Nova Venda #${orderIdDisplay}`,
        'Priority': '3',
        'Icon': 'https://i.imgur.com/iXA30s5.jpeg',
      },
    });
  } catch {
    // silencioso
  }
}

function validateCreditCardData(body: any) {
  if (!body.cardNumber || body.cardNumber.trim() === '') return false;
  const cleanNumber = body.cardNumber.replace(/\s/g, '');
  if (cleanNumber.length < 13 || cleanNumber.length > 19) return false;
  if (!body.cardName || body.cardName.trim() === '') return false;
  if (!body.cardExpiry || !body.cardExpiry.includes('/')) return false;
  const [expiryMonth, expiryYear] = body.cardExpiry.split('/');
  if (!expiryMonth || !expiryYear || isNaN(parseInt(expiryMonth, 10)) || isNaN(parseInt(expiryYear, 10))) return false;
  const expMonth = parseInt(expiryMonth, 10);
  if (expMonth < 1 || expMonth > 12) return false;
  if (!body.cardCvc || body.cardCvc.trim() === '') return false;
  const cvcLength = body.cardCvc.length;
  if (cvcLength < 3 || cvcLength > 4) return false;
  return true;
}

export async function POST(request: Request) {
  const requestOrigin = request.headers.get('origin') || '';
  const currentCorsHeaders = getCorsHeaders(requestOrigin);

  try {
    if (!API_KEY || !isApiKeyValid) {
      return NextResponse.json(
        { success: false, error: 'Configuracao do servidor incompleta. Contate o administrador.' },
        { status: 500, headers: currentCorsHeaders }
      );
    }

    const body = await request.json();

    const checkoutOffer = resolveCheckoutPayment({
      paymentToken: body.paymentToken,
      compactPaymentToken: body.compactPaymentToken,
      offerId: body.offerId,
      itemId: body.items?.[0]?.id,
    });
    if (!checkoutOffer) {
      return NextResponse.json({ success: false, error: 'Oferta de pagamento invalida.' }, { status: 400, headers: currentCorsHeaders });
    }

    const paymentAmount = checkoutOffer.amountInCents;
    if (paymentAmount <= 0) {
      return NextResponse.json({ success: false, error: 'Valor de pagamento invalido.' }, { status: 400, headers: currentCorsHeaders });
    }

    if (!body.name || !body.email || !body.paymentMethod) {
      return NextResponse.json({ success: false, error: 'Campos obrigatorios ausentes (nome, email, metodo de pagamento).' }, { status: 400, headers: currentCorsHeaders });
    }

    const normalizedPaymentMethod = normalizePaymentMethod(body.paymentMethod);
    if (!normalizedPaymentMethod) {
      return NextResponse.json({ success: false, error: 'Metodo de pagamento nao suportado.' }, { status: 400, headers: currentCorsHeaders });
    }

    const installments = parseInt(body.installments || '1', 10);
    if (normalizedPaymentMethod === 'credit_card' && !isValidCardInstallmentCount(installments)) {
      return NextResponse.json({ success: false, error: `Parcelamento permitido apenas de 1x a ${MAX_CARD_INSTALLMENTS}x.` }, { status: 400, headers: currentCorsHeaders });
    }

    if ((body.paymentMethod === 'credit_card' || body.paymentMethod === 'card') && !validateCreditCardData(body)) {
      return NextResponse.json({ success: false, error: 'Dados de cartao de credito invalidos.' }, { status: 400, headers: currentCorsHeaders });
    }

    const useSimulation = FORCE_SIMULATION;
    if (useSimulation) {
      return simulatePaymentResponse(body, currentCorsHeaders);
    }

    let finalAmount = paymentAmount;

    if (normalizedPaymentMethod === 'credit_card' && installments >= 1) {
      finalAmount = calculateCardAmountInCents(paymentAmount, installments);
    }

    const trackingHash = typeof body.trackingHash === 'string' && HASH_REGEX.test(body.trackingHash.trim())
      ? body.trackingHash.trim()
      : undefined;
    const checkoutCode = `leo-${Date.now().toString(36)}`;

    const requestBody: any = {
      closed: true,
      code: checkoutCode,
      metadata: JSON.stringify({
        offer_id: checkoutOffer.id,
        product_name: checkoutOffer.productName,
        base_amount_cents: String(paymentAmount),
        final_amount_cents: String(finalAmount),
        checkout_token: typeof body.compactPaymentToken === 'string' ? body.compactPaymentToken : '',
        payment_token: typeof body.paymentToken === 'string' ? body.paymentToken : '',
        tracking_hash: trackingHash || '',
        source: 'checkout-leonora',
      }),
      items: [{
        amount: finalAmount,
        description: checkoutOffer.productName,
        quantity: 1,
        code: checkoutOffer.id,
      }],
      customer: {
        name: body.name,
        email: body.email,
        type: body.cpfCnpj && body.cpfCnpj.replace(/\D/g, '').length > 11 ? 'corporation' : 'individual',
        document: body.cpfCnpj ? body.cpfCnpj.replace(/\D/g, '') : undefined,
        address: {
          line_1: body.address || 'Av. Brasil, 1000',
          line_2: body.addressComplement || '',
          zip_code: body.zipCode ? body.zipCode.replace(/\D/g, '') : '01000000',
          city: body.city || 'Sao Paulo',
          state: body.state || 'SP',
          country: 'BR',
        },
        phones: {},
      },
      payments: [{
        payment_method: normalizedPaymentMethod,
        amount: finalAmount,
      }],
    };

    if (body.ddi && body.phone) {
      const countryCode = body.ddi.replace(/\D/g, '');
      const justNumbersPhone = body.phone.replace(/\D/g, '');
      let areaCode = '';
      let phoneNumber = '';

      if (justNumbersPhone.length > 9) {
        areaCode = justNumbersPhone.substring(0, 2);
        phoneNumber = justNumbersPhone.substring(2);
      } else {
        phoneNumber = justNumbersPhone;
      }

      if (countryCode && areaCode && phoneNumber) {
        requestBody.customer.phones = {
          mobile_phone: {
            country_code: countryCode,
            area_code: areaCode,
            number: phoneNumber,
          },
        };
      } else {
        delete requestBody.customer.phones;
      }
    } else {
      delete requestBody.customer.phones;
    }

    if (normalizedPaymentMethod === 'credit_card') {
      const expiryDate = body.cardExpiry || '';
      const [expiryMonthStr, expiryYearStr] = expiryDate.split('/');
      const cardDetails: any = {
        number: body.cardNumber.replace(/\s/g, ''),
        holder_name: body.cardName,
        exp_month: parseInt(expiryMonthStr, 10),
        exp_year: parseInt(`20${expiryYearStr}`, 10),
        cvv: body.cardCvc,
      };
      if (requestBody.customer.document) {
        cardDetails.holder_document = requestBody.customer.document;
      }

      requestBody.payments[0].credit_card = {
        installments: installments,
        statement_descriptor: body.statement_descriptor || DEFAULT_STATEMENT_DESCRIPTOR,
        card: cardDetails,
      };
    } else if (normalizedPaymentMethod === 'pix') {
      requestBody.payments[0].pix = { expires_in: PIX_EXPIRES_IN_SECONDS };
    } else {
      return NextResponse.json({ success: false, error: 'Metodo de pagamento nao suportado.' }, { status: 400, headers: currentCorsHeaders });
    }

    const response = await fetch(ORDERS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(API_KEY + ':').toString('base64')}`,
      },
      body: JSON.stringify(requestBody),
    });

    const responseData: PagarMeError | any = await response.json();

    if (!response.ok) {
      let errorMessage = responseData.message || 'Erro ao processar pagamento.';
      if (responseData.errors && responseData.errors.length > 0) {
        errorMessage = responseData.errors.map((err: any) => `${err.parameter_name || 'field'}: ${err.message}`).join('; ');
      }
      return NextResponse.json({ success: false, error: errorMessage, details: responseData.errors }, { status: response.status, headers: currentCorsHeaders });
    }

    const formattedResponse = {
      success: true,
      data: {
        id: responseData.id,
        status: responseData.status,
        amount: responseData.amount,
        payment_method: normalizedPaymentMethod,
        is_approved: responseData.status === 'paid' || responseData.charges?.some((charge: any) => charge.status === 'paid'),
        ...(normalizedPaymentMethod === 'pix' && responseData.charges?.[0]?.last_transaction && {
          pixQrCodeData: responseData.charges[0].last_transaction.qr_code,
          pixCopyPasteData: responseData.charges[0].last_transaction.qr_code,
          pixExpirationDate: responseData.charges[0].last_transaction.expires_at,
        }),
        ...(normalizedPaymentMethod === 'credit_card' && responseData.charges?.[0]?.last_transaction?.card && {
          card_installments: installments,
          card_last_digits: responseData.charges[0].last_transaction.card.last_four_digits,
          card_brand: responseData.charges[0].last_transaction.card.brand,
        }),
      },
    };
    await sendNtfyNotification(body, responseData);
    return NextResponse.json(formattedResponse, { status: 200, headers: currentCorsHeaders });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Erro interno no servidor.' },
      { status: 500, headers: getCorsHeaders(request.headers.get('origin')) }
    );
  }
}

function simulatePaymentResponse(body: any, headers: any) {
  const normalizedPaymentMethod = normalizePaymentMethod(body.paymentMethod);
  const checkoutOffer = resolveCheckoutPayment({
    paymentToken: body.paymentToken,
    compactPaymentToken: body.compactPaymentToken,
    offerId: body.offerId,
    itemId: body.items?.[0]?.id,
  });
  const now = new Date();
  const orderId = `sim_order_${Date.now()}`;
  const chargeId = `sim_ch_${Date.now()}`;
  const transactionId = `sim_tran_${Date.now()}`;
  const customerId = `sim_cus_${Date.now()}`;

  if (!checkoutOffer) {
    return NextResponse.json({ success: false, error: 'Oferta de pagamento invalida.' }, { status: 400, headers });
  }

  const paymentAmount = checkoutOffer.amountInCents;
  const installments = parseInt(body.installments || '1', 10);
  let finalAmount = paymentAmount;

  if (normalizedPaymentMethod === 'credit_card' && installments >= 1) {
    finalAmount = calculateCardAmountInCents(paymentAmount, installments);
  }

  const simulatedApiResponse = {
    id: orderId,
    amount: finalAmount,
    currency: 'BRL',
    status: 'paid',
    customer: { id: customerId, name: body.name, email: body.email },
    items: [{ amount: finalAmount, description: checkoutOffer.productName, quantity: 1 }],
    charges: [{
      id: chargeId,
      amount: finalAmount,
      status: 'paid',
      payment_method: normalizedPaymentMethod,
      last_transaction: {
        id: transactionId,
        status: 'captured',
        ...(normalizedPaymentMethod === 'credit_card' && {
          card: {
            last_four_digits: body.cardNumber ? body.cardNumber.replace(/\s/g, '').slice(-4) : '1234',
            brand: 'visa',
            holder_name: body.cardName,
          },
          installments: installments,
        }),
        ...(normalizedPaymentMethod === 'pix' && {
          qr_code: 'SIMULATED_QR_CODE_TEXT_DATA_PAGARME_V5',
          expires_at: new Date(now.getTime() + PIX_EXPIRES_IN_SECONDS * 1000).toISOString(),
        }),
      },
    }],
  };

  const formattedResponse = {
    success: true,
    data: {
      id: simulatedApiResponse.id,
      status: simulatedApiResponse.status,
      amount: simulatedApiResponse.amount,
      payment_method: normalizedPaymentMethod,
      ...(normalizedPaymentMethod === 'pix' && {
        pixQrCodeData: simulatedApiResponse.charges[0].last_transaction.qr_code,
        pixCopyPasteData: simulatedApiResponse.charges[0].last_transaction.qr_code,
        pixExpirationDate: simulatedApiResponse.charges[0].last_transaction.expires_at,
      }),
      is_approved: simulatedApiResponse.status === 'paid' || simulatedApiResponse.charges.some((charge: any) => charge.status === 'paid'),
      ...(normalizedPaymentMethod === 'credit_card' && {
        card_installments: installments,
        card_last_digits: simulatedApiResponse.charges[0].last_transaction.card?.last_four_digits,
        card_brand: simulatedApiResponse.charges[0].last_transaction.card?.brand,
      }),
    },
  };
  sendNtfyNotification(body, simulatedApiResponse);
  return NextResponse.json(formattedResponse, { status: 200, headers });
}
