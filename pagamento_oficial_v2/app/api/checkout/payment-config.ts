import { createHmac, timingSafeEqual } from 'crypto';

export const MAX_CARD_INSTALLMENTS = 5;
export const DEFAULT_STATEMENT_DESCRIPTOR = 'DSHUB';
export const PIX_EXPIRES_IN_SECONDS = 3 * 24 * 60 * 60;
export const DEFAULT_CHECKOUT_OFFER_ID = 'ritual-leonora';
export const CHECKOUT_LINK_EXPIRES_IN_SECONDS = 30 * 24 * 60 * 60;

export interface CheckoutOfferConfig {
  id: string;
  amountInCents: number;
  productName: string;
}

export interface SignedCheckoutPayload {
  offerId: string;
  amountInCents: number;
  productName: string;
  issuedAt: number;
  expiresAt: number;
}

export const CHECKOUT_OFFERS: Record<string, CheckoutOfferConfig> = {
  [DEFAULT_CHECKOUT_OFFER_ID]: {
    id: DEFAULT_CHECKOUT_OFFER_ID,
    amountInCents: 13000,
    productName: 'Materiais do Ritual Cigana Barina',
  },
};

export const CARD_INTEREST_RATES: Record<number, number> = {
  1: 0,
  2: 0.0839,
  3: 0.0964,
  4: 0.1089,
  5: 0.1214,
};

export type SupportedPaymentMethod = 'credit_card' | 'pix';

export function normalizePaymentMethod(paymentMethod: unknown): SupportedPaymentMethod | null {
  if (paymentMethod === 'card' || paymentMethod === 'credit_card') return 'credit_card';
  if (paymentMethod === 'pix') return 'pix';
  return null;
}

export function isValidCardInstallmentCount(installments: number): boolean {
  return Number.isInteger(installments) && installments >= 1 && installments <= MAX_CARD_INSTALLMENTS;
}

export function calculateCardAmountInCents(baseAmountInCents: number, installments: number): number {
  if (baseAmountInCents <= 0 || installments < 1) return 0;

  const interestRate = CARD_INTEREST_RATES[installments] ?? 0;
  return Math.round(baseAmountInCents * (1 + interestRate));
}

export function resolveCheckoutOffer(offerId?: unknown): CheckoutOfferConfig | null {
  if (typeof offerId !== 'string' || offerId.trim() === '') {
    return CHECKOUT_OFFERS[DEFAULT_CHECKOUT_OFFER_ID];
  }

  return CHECKOUT_OFFERS[offerId] ?? null;
}

function getCheckoutLinkSecret(): string | null {
  return process.env.CHECKOUT_LINK_SECRET || null;
}

function toBase64Url(value: Buffer | string): string {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(value: string): Buffer {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return Buffer.from(padded, 'base64');
}

function signTokenPayload(encodedPayload: string, secret: string): string {
  return toBase64Url(createHmac('sha256', secret).update(encodedPayload).digest());
}

function signCompactPayload(payload: string, secret: string): string {
  return toBase64Url(createHmac('sha256', secret).update(payload).digest()).slice(0, 12);
}

export function createSignedCheckoutToken(input: {
  amountInCents: number;
  productName?: string;
  offerId?: string;
}): string {
  const secret = getCheckoutLinkSecret();
  if (!secret) {
    throw new Error('CHECKOUT_LINK_SECRET ausente.');
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);
  const payload: SignedCheckoutPayload = {
    offerId: input.offerId || DEFAULT_CHECKOUT_OFFER_ID,
    amountInCents: input.amountInCents,
    productName: input.productName || CHECKOUT_OFFERS[DEFAULT_CHECKOUT_OFFER_ID].productName,
    issuedAt: nowInSeconds,
    expiresAt: nowInSeconds + CHECKOUT_LINK_EXPIRES_IN_SECONDS,
  };
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = signTokenPayload(encodedPayload, secret);

  return `${encodedPayload}.${signature}`;
}

export function createCompactCheckoutToken(input: {
  amountInCents: number;
  offerId?: string;
}): string {
  const secret = getCheckoutLinkSecret();
  if (!secret) {
    throw new Error('CHECKOUT_LINK_SECRET ausente.');
  }

  const offerId = input.offerId || DEFAULT_CHECKOUT_OFFER_ID;
  const compactPayload = `${input.amountInCents.toString(36)}.${offerId}`;
  const signature = signCompactPayload(compactPayload, secret);

  return `${compactPayload}.${signature}`;
}

export function verifySignedCheckoutToken(token?: unknown): SignedCheckoutPayload | null {
  if (typeof token !== 'string' || !token.includes('.')) return null;

  const secret = getCheckoutLinkSecret();
  if (!secret) return null;

  const [encodedPayload, providedSignature] = token.split('.');
  if (!encodedPayload || !providedSignature) return null;

  const expectedSignature = signTokenPayload(encodedPayload, secret);
  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload).toString('utf8')) as SignedCheckoutPayload;
    const nowInSeconds = Math.floor(Date.now() / 1000);

    if (
      !payload ||
      !Number.isInteger(payload.amountInCents) ||
      payload.amountInCents <= 0 ||
      !payload.productName ||
      !payload.expiresAt ||
      payload.expiresAt < nowInSeconds
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function verifyCompactCheckoutToken(token?: unknown): CheckoutOfferConfig | null {
  if (typeof token !== 'string' || !token.includes('.')) return null;

  const secret = getCheckoutLinkSecret();
  if (!secret) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [amountBase36, offerId, providedSignature] = parts;
  if (!amountBase36 || !offerId || !providedSignature) return null;

  const compactPayload = `${amountBase36}.${offerId}`;
  const expectedSignature = signCompactPayload(compactPayload, secret);
  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null;
  }

  const amountInCents = Number.parseInt(amountBase36, 36);
  const offer = resolveCheckoutOffer(offerId);

  if (!Number.isInteger(amountInCents) || amountInCents <= 0 || !offer) {
    return null;
  }

  return {
    id: offer.id,
    amountInCents,
    productName: offer.productName,
  };
}

export function resolveCheckoutPayment(input: {
  paymentToken?: unknown;
  compactPaymentToken?: unknown;
  offerId?: unknown;
  itemId?: unknown;
}): CheckoutOfferConfig | null {
  const compactPayload = verifyCompactCheckoutToken(input.compactPaymentToken);
  if (compactPayload) return compactPayload;

  const signedPayload = verifySignedCheckoutToken(input.paymentToken);

  if (signedPayload) {
    return {
      id: signedPayload.offerId || DEFAULT_CHECKOUT_OFFER_ID,
      amountInCents: signedPayload.amountInCents,
      productName: signedPayload.productName,
    };
  }

  return resolveCheckoutOffer(input.offerId || input.itemId);
}
