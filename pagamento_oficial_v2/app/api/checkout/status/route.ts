import { NextResponse } from 'next/server';

const API_KEY = process.env.PAGARME_API_KEY;
const isApiKeyValid = !!API_KEY && API_KEY.startsWith('sk_') && API_KEY.length > 20;
const API_BASE_URL = 'https://api.pagar.me/core/v5';
const FORCE_SIMULATION = process.env.USE_PAYMENT_SIMULATION === 'true';

const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL_ALLOWED,
  'https://gosafepay.com.br',
  'https://checkout-frontend-production-0626.up.railway.app',
].filter(Boolean) as string[];

const isAllowedOrigin = (origin: string | null): boolean => {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes('*')) return true;
  return ALLOWED_ORIGINS.some((allowed) => origin.includes(allowed));
};

function getCorsHeaders(requestOrigin: string | null) {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
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
  const headers = getCorsHeaders(request.headers.get('origin'));
  if (headers['Access-Control-Allow-Origin']) {
    return new NextResponse(null, { status: 200, headers });
  }
  return new NextResponse(null, { status: 204 });
}

export async function GET(request: Request) {
  const headers = getCorsHeaders(request.headers.get('origin'));
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get('orderId')?.trim();

  if (!orderId) {
    return NextResponse.json(
      { success: false, error: 'Pedido nao informado.' },
      { status: 400, headers }
    );
  }

  if (FORCE_SIMULATION || orderId.startsWith('sim_order_')) {
    return NextResponse.json({
      success: true,
      data: {
        id: orderId,
        status: 'paid',
        is_approved: true,
      },
    }, { status: 200, headers });
  }

  if (!API_KEY || !isApiKeyValid) {
    return NextResponse.json(
      { success: false, error: 'Configuracao do servidor incompleta. Contate o administrador.' },
      { status: 500, headers }
    );
  }

  try {
    const response = await fetch(`${API_BASE_URL}/orders/${encodeURIComponent(orderId)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(API_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json',
      },
    });

    const responseData = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: responseData.message || 'Nao foi possivel verificar o pagamento.' },
        { status: response.status, headers }
      );
    }

    const isApproved =
      responseData.status === 'paid' ||
      responseData.charges?.some((charge: any) => charge.status === 'paid');

    return NextResponse.json({
      success: true,
      data: {
        id: responseData.id,
        status: responseData.status,
        is_approved: isApproved,
        paid_at: responseData.charges?.find((charge: any) => charge.status === 'paid')?.paid_at,
      },
    }, { status: 200, headers });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Erro interno ao verificar pagamento.' },
      { status: 500, headers }
    );
  }
}
