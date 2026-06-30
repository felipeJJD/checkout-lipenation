export const MAX_CARD_INSTALLMENTS = 5;
export const DEFAULT_STATEMENT_DESCRIPTOR = 'DSHUB';
export const PIX_EXPIRES_IN_SECONDS = 3 * 24 * 60 * 60;

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
