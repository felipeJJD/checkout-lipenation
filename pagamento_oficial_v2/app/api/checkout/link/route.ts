import { NextResponse } from 'next/server';
import {
  CHECKOUT_OFFERS,
  createCompactCheckoutToken,
  DEFAULT_CHECKOUT_OFFER_ID,
} from '../payment-config';

const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL_ALLOWED,
  'https://checkout.ciganaleonora.online',
  'https://checkout-lipenation-production.up.railway.app',
  'https://gosafepay.com.br',
  'https://checkout-frontend-production-0626.up.railway.app',
].filter(Boolean) as string[];

const baseCorsHeaders = {
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400',
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  'Pragma': 'no-cache',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

function getCorsHeaders(requestOrigin: string | null) {
  const headers: Record<string, string> = {
    ...baseCorsHeaders,
    'Access-Control-Allow-Origin': '',
  };

  if (requestOrigin && ALLOWED_ORIGINS.some((allowed) => requestOrigin.includes(allowed))) {
    headers['Access-Control-Allow-Origin'] = requestOrigin;
  }

  return headers;
}

function parseAmountInCents(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value * 100);
  }

  if (typeof value !== 'string') return 0;

  const compact = value.trim().replace(/\s/g, '');
  const normalized = compact.includes(',')
    ? compact.replace(/\./g, '').replace(',', '.')
    : compact;

  const amount = Number.parseFloat(normalized);
  if (!Number.isFinite(amount)) return 0;

  return Math.round(amount * 100);
}

export async function OPTIONS(request: Request) {
  const headers = getCorsHeaders(request.headers.get('origin'));
  return new NextResponse(null, {
    status: headers['Access-Control-Allow-Origin'] ? 200 : 204,
    headers,
  });
}

export async function POST(request: Request) {
  const headers = getCorsHeaders(request.headers.get('origin'));

  try {
    const body = await request.json();
    const amountInCents = parseAmountInCents(body.amount);

    if (amountInCents < 100) {
      return NextResponse.json(
        { success: false, error: 'Informe um valor de pelo menos R$ 1,00.' },
        { status: 400, headers }
      );
    }

    if (amountInCents > 10000000) {
      return NextResponse.json(
        { success: false, error: 'Valor muito alto para um link de checkout.' },
        { status: 400, headers }
      );
    }

    const defaultOffer = CHECKOUT_OFFERS[DEFAULT_CHECKOUT_OFFER_ID];
    const token = createCompactCheckoutToken({
      amountInCents,
      offerId: DEFAULT_CHECKOUT_OFFER_ID,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          token,
          amountInCents,
          productName: body.productName || defaultOffer.productName,
        },
      },
      { status: 200, headers }
    );
  } catch (error) {
    if (error instanceof Error) {
      console.error('Erro ao gerar link de checkout:', error.name, error.message);
    } else {
      console.error('Erro ao gerar link de checkout: erro desconhecido');
    }

    const isMissingSecret = error instanceof Error && error.message.includes('CHECKOUT_LINK_SECRET');

    return NextResponse.json(
      {
        success: false,
        error: isMissingSecret
          ? 'Configuracao de links incompleta no servidor.'
          : 'Nao foi possivel gerar o link agora.',
      },
      { status: 500, headers }
    );
  }
}
