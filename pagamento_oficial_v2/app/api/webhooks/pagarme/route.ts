import { createHash } from 'crypto';
import { appendFile, mkdir, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const HASH_REGEX = /^[A-HJ-NP-Za-km-z2-9]{6}$/;
const REDZAP_API_URL = process.env.REDZAP_API_URL || 'https://redzap.online';
const BOTFAI_API_URL = process.env.BOTFAI_API_URL || 'https://chat.botfai.com.br/api';
const BOTFAI_TOKEN = process.env.BOTFAI_TOKEN || '';
const META_PIXEL_ID = process.env.META_PIXEL_ID || '';
const META_CAPI_TOKEN = process.env.META_CAPI_TOKEN || '';
const META_TEST_EVENT_CODE = process.env.META_TEST_EVENT_CODE || '';
const WEBHOOK_SECRET = process.env.PAGARME_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET || '';
const EVENTS_LOG = path.join(tmpdir(), 'checkout-leonora-pagarme-webhooks.jsonl');

type WebhookResult = {
  success: boolean;
  skipped?: string;
  error?: string;
  event_id?: string;
  order_id?: string;
  charge_id?: string;
  mode?: 'complete' | 'meta-basic' | 'missing-meta-env';
  hash_found?: boolean;
  tracking_found?: boolean;
  meta?: any;
};

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function hashEmail(raw?: string | null) {
  const value = String(raw || '').trim().toLowerCase();
  return value ? sha256(value) : null;
}

function hashName(raw?: string | null) {
  const value = String(raw || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return value ? sha256(value) : null;
}

function normalizePhone(raw?: string | null) {
  let digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (!digits.startsWith('55') && (digits.length === 10 || digits.length === 11)) {
    digits = `55${digits}`;
  }
  return digits;
}

function hashPhone(raw?: string | null) {
  const digits = normalizePhone(raw);
  return digits ? sha256(digits) : null;
}

function asObject(value: any): Record<string, any> {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof value === 'object' ? value : {};
}

function getEventType(payload: any) {
  return String(payload?.type || payload?.event || payload?.event_type || payload?.name || '').trim();
}

function getOrderAndCharge(payload: any) {
  const data = payload?.data || payload?.object || payload;
  const order = data?.charges || data?.items || data?.customer
    ? data
    : data?.order || payload?.order || {};
  const charge = data?.payment_method || data?.last_transaction
    ? data
    : data?.charge || data?.charges?.[0] || order?.charges?.[0] || {};
  return { data, order, charge };
}

function extractPhone(customer: any) {
  const phones = customer?.phones || {};
  const phone = phones.mobile_phone || phones.home_phone || phones.work_phone || {};
  if (phone.country_code || phone.area_code || phone.number) {
    return `${phone.country_code || ''}${phone.area_code || ''}${phone.number || ''}`;
  }
  return customer?.phone || customer?.mobile_phone || '';
}

function extractPaymentMethod(order: any, charge: any) {
  return charge?.payment_method || charge?.last_transaction?.payment_method || order?.payments?.[0]?.payment_method || 'pagarme';
}

function extractMetadata(data: any, order: any, charge: any) {
  return {
    ...asObject(data?.metadata),
    ...asObject(order?.metadata),
    ...asObject(charge?.metadata),
  };
}

function extractHash(metadata: Record<string, any>, order: any, charge: any, data: any) {
  const candidates = [
    metadata.tracking_hash,
    metadata.redzap_hash,
    metadata.hash,
    order?.tracking_hash,
    charge?.tracking_hash,
    data?.tracking_hash,
  ];
  for (const candidate of candidates) {
    const value = String(candidate || '').trim();
    if (HASH_REGEX.test(value)) return value;
  }
  return null;
}

async function hasProcessed(orderId: string, eventName: string) {
  try {
    const content = await readFile(EVENTS_LOG, 'utf8');
    return content
      .split('\n')
      .filter(Boolean)
      .some((line) => {
        try {
          const item = JSON.parse(line);
          return item.order_id === orderId && item.event_name === eventName && item.success !== false;
        } catch {
          return false;
        }
      });
  } catch {
    return false;
  }
}

async function appendWebhookLog(entry: Record<string, any>) {
  await mkdir(path.dirname(EVENTS_LOG), { recursive: true });
  await appendFile(EVENTS_LOG, `${JSON.stringify({ ts: new Date().toISOString(), ...entry })}\n`, 'utf8');
}

async function lookupBotfaiByPhone(phone: string) {
  if (!BOTFAI_TOKEN) return null;
  const digits = normalizePhone(phone);
  if (!digits) return null;

  try {
    for (let page = 1; page <= 50; page++) {
      const response = await fetch(`${BOTFAI_API_URL}/subscribers?limit=100&page=${page}`, {
        headers: { Authorization: `Bearer ${BOTFAI_TOKEN}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error(`BotfAI HTTP ${response.status}`);

      const json = await response.json();
      const items = json?.data || [];
      const subscriber = items.find((item: any) => normalizePhone(item?.phone).endsWith(digits.slice(-11)));
      if (subscriber) {
        const fields: Record<string, string> = {};
        for (const field of subscriber.user_fields || []) {
          fields[field.name] = field.value;
        }
        const hash = String(fields['Hash do usuario'] || '').trim();
        return {
          hash: HASH_REGEX.test(hash) ? hash : null,
          name: fields.nome || subscriber.first_name || subscriber.name || '',
          email: fields.gmail || subscriber.email || '',
        };
      }

      const lastPage = json?.meta?.last_page || page;
      if (!items.length || page >= lastPage) break;
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
  } catch (error) {
    console.warn('[pagarme-webhook] BotfAI lookup failed:', error instanceof Error ? error.message : error);
  }

  return null;
}

async function lookupRedzap(hash: string | null) {
  if (!hash) return null;
  try {
    const response = await fetch(`${REDZAP_API_URL}/api/track/${hash}`, {
      signal: AbortSignal.timeout(8000),
    });
    const json = await response.json();
    if (json?.success && json?.data) {
      return { ...json.data, hash };
    }
  } catch (error) {
    console.warn('[pagarme-webhook] Redzap lookup failed:', error instanceof Error ? error.message : error);
  }
  return null;
}

async function fireMetaPurchase(input: {
  orderId: string;
  chargeId: string;
  amount: number;
  name: string;
  email: string;
  phone: string;
  productName: string;
  hash: string | null;
  tracking: any;
}) {
  if (!META_PIXEL_ID || !META_CAPI_TOKEN) {
    return {
      success: false,
      mode: 'missing-meta-env' as const,
      error: 'META_PIXEL_ID/META_CAPI_TOKEN ausentes.',
    };
  }

  const eventId = `pagarme-${input.orderId}-purchase`;
  const userData: Record<string, any> = {};
  const phoneHash = hashPhone(input.phone);
  const nameHash = hashName(input.name);
  const emailHash = hashEmail(input.email);

  if (phoneHash) userData.ph = [phoneHash];
  if (nameHash) userData.fn = [nameHash];
  if (emailHash) userData.em = [emailHash];
  if (input.tracking?.fbp) userData.fbp = input.tracking.fbp;
  if (input.tracking?.fbc) userData.fbc = input.tracking.fbc;
  if (input.tracking?.ip) userData.client_ip_address = input.tracking.ip;
  if (input.tracking?.user_agent) userData.client_user_agent = input.tracking.user_agent;

  const payload: Record<string, any> = {
    data: [{
      event_name: 'Purchase',
      event_time: Math.floor(Date.now() / 1000),
      action_source: 'website',
      event_source_url: 'https://checkout.ciganaleonora.online/checkout',
      event_id: eventId,
      user_data: userData,
      custom_data: {
        currency: 'BRL',
        value: input.amount,
        content_name: input.productName || 'Materiais do Ritual Cigana Barina',
        content_category: 'tarot_ritual',
        content_ids: [input.hash || input.orderId],
        content_type: 'product',
        order_id: input.orderId,
      },
    }],
  };

  if (META_TEST_EVENT_CODE.trim()) {
    payload.test_event_code = META_TEST_EVENT_CODE.trim();
  }

  const response = await fetch(`https://graph.facebook.com/v21.0/${META_PIXEL_ID}/events?access_token=${META_CAPI_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const meta = await response.json();

  return {
    success: response.ok && Number(meta?.events_received || 0) > 0,
    mode: input.tracking ? 'complete' as const : 'meta-basic' as const,
    event_id: eventId,
    meta,
  };
}

function isAuthorized(request: Request, url: URL, payload: any) {
  if (!WEBHOOK_SECRET) return true;
  const sent =
    request.headers.get('x-webhook-secret') ||
    request.headers.get('x-pagarme-webhook-secret') ||
    url.searchParams.get('secret') ||
    payload?.secret;
  return sent === WEBHOOK_SECRET;
}

export async function POST(request: Request) {
  let payload: any = null;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'JSON invalido.' }, { status: 400 });
  }

  const url = new URL(request.url);
  if (!isAuthorized(request, url, payload)) {
    return NextResponse.json({ success: false, error: 'Secret invalido.' }, { status: 401 });
  }

  const eventType = getEventType(payload);
  if (!['order.paid', 'charge.paid'].includes(eventType)) {
    return NextResponse.json({ success: true, skipped: 'event_not_paid', event_type: eventType });
  }

  const { data, order, charge } = getOrderAndCharge(payload);
  const orderId = String(order?.id || charge?.order?.id || charge?.order_id || data?.id || payload?.id || '').trim();
  const chargeId = String(charge?.id || order?.charges?.[0]?.id || '').trim();
  const paid = order?.status === 'paid' || charge?.status === 'paid' || ['order.paid', 'charge.paid'].includes(eventType);

  if (!orderId || !paid) {
    return NextResponse.json({ success: false, error: 'Pedido pago nao identificado.' }, { status: 400 });
  }

  if (await hasProcessed(orderId, 'Purchase')) {
    return NextResponse.json({ success: true, skipped: 'duplicate', order_id: orderId });
  }

  const customer = order?.customer || charge?.customer || data?.customer || {};
  const metadata = extractMetadata(data, order, charge);
  const phone = extractPhone(customer);
  const botfai = await lookupBotfaiByPhone(phone);
  const hash = extractHash(metadata, order, charge, data) || botfai?.hash || null;
  const tracking = await lookupRedzap(hash);
  const amountInCents = Number(order?.amount || charge?.amount || data?.amount || 0);
  const amount = amountInCents > 0 ? amountInCents / 100 : 0;
  const productName =
    metadata.product_name ||
    order?.items?.[0]?.description ||
    order?.items?.[0]?.name ||
    data?.items?.[0]?.description ||
    'Materiais do Ritual Cigana Barina';

  const result = await fireMetaPurchase({
    orderId,
    chargeId,
    amount,
    name: customer?.name || botfai?.name || 'Cliente Leonora',
    email: customer?.email || botfai?.email || '',
    phone,
    productName,
    hash,
    tracking,
  });

  const response: WebhookResult = {
    success: result.success,
    order_id: orderId,
    charge_id: chargeId,
    event_id: result.event_id,
    mode: result.mode,
    hash_found: !!hash,
    tracking_found: !!tracking,
    meta: result.meta,
    error: result.error,
  };

  await appendWebhookLog({
    event_type: eventType,
    event_name: 'Purchase',
    order_id: orderId,
    charge_id: chargeId,
    payment_method: extractPaymentMethod(order, charge),
    amount,
    hash_found: !!hash,
    tracking_found: !!tracking,
    success: result.success,
    mode: result.mode,
    event_id: result.event_id,
    meta: result.meta || null,
    error: result.error || null,
  });

  if (!result.success) {
    return NextResponse.json(response, { status: result.mode === 'missing-meta-env' ? 500 : 502 });
  }

  return NextResponse.json(response);
}
