export const CHECKOUT_BRAND_NAME = 'Casa Leonora Cigana Barina';
export const CHECKOUT_PRODUCT_NAME = 'Materiais do Ritual Cigana Barina';
export const CHECKOUT_PAGE_TITLE = `${CHECKOUT_BRAND_NAME} - Pagamento`;
export const CHECKOUT_DEFAULT_OFFER_ID = 'ritual-leonora';
export const MAX_CARD_INSTALLMENTS = 5;
export const DELIVERY_WHATSAPP_URL = 'http://redzap.online/2/cliqueaqui';
export const LEONORA_PROFILE_IMAGE_URL = '/leonora-whatsapp-profile.png';

export const CARD_INTEREST_RATES: Record<number, number> = {
  1: 0,
  2: 0.0839,
  3: 0.0964,
  4: 0.1089,
  5: 0.1214,
};

export type CheckoutPaymentMethod = 'card' | 'pix';

export interface CheckoutOffer {
  id: string;
  brandName: string;
  productName: string;
  baseAmount: number;
  headline: string;
  shortDescription: string;
  confirmationText: string;
  agreementLines: string[];
  adminNoticeTitle: string;
  adminNotice: string;
  successTitle: string;
  successDescription: string;
  successNextStep: string;
  deliveryButtonText: string;
  deliveryFootnote: string;
  footerText: string;
}

export const CHECKOUT_OFFER: CheckoutOffer = {
  id: CHECKOUT_DEFAULT_OFFER_ID,
  brandName: 'Casa Leonora',
  productName: CHECKOUT_PRODUCT_NAME,
  baseAmount: 130,
  headline: 'Materiais do Ritual Cigana Barina',
  shortDescription:
    'Pague os R$ 130 dos materiais combinados com a Leonora.',
  confirmationText:
    'Depois de confirmar, volte para a Leonora no WhatsApp.',
  agreementLines: [
    'Esse valor é somente para separar os materiais do ritual.',
    'A parte da Leonora fica para depois do resultado.',
    'Pagamento seguro por Pix ou cartão.',
  ],
  adminNoticeTitle: 'Pode aparecer Felipe no pagamento',
  adminNotice:
    'Está certo: Felipe de Oliveira cuida da parte administrativa.',
  successTitle: 'Pagamento confirmado',
  successDescription:
    'Seu pagamento dos materiais foi confirmado. Agora a Leonora vai seguir com a preparação.',
  successNextStep:
    'Agora está aqui o WhatsApp pessoal da Leonora. É por lá que você vai acompanhar o seu ritual e receber as próximas orientações.',
  deliveryButtonText: 'Abrir WhatsApp',
  deliveryFootnote:
    'Você será direcionado para a conversa de acompanhamento. Não precisa fazer outro pagamento agora.',
  footerText: 'Pagamento seguro. Dados protegidos.',
};

export const CHECKOUT_OFFERS: Record<string, CheckoutOffer> = {
  [CHECKOUT_OFFER.id]: CHECKOUT_OFFER,
};

export function getCheckoutOffer(offerId?: string | null): CheckoutOffer | null {
  if (!offerId) return CHECKOUT_OFFER;
  return CHECKOUT_OFFERS[offerId] ?? null;
}

export interface InstallmentOption {
  value: string;
  label: string;
}

const formatCurrency = (value: number): string =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function calculateCardTotal(baseAmount: number, installments: number): number {
  if (baseAmount <= 0 || installments < 1) return 0;

  const interestRate = CARD_INTEREST_RATES[installments] ?? 0;
  return Math.round(baseAmount * (1 + interestRate) * 100) / 100;
}

export function calculateInstallmentAmount(baseAmount: number, installments: number): number {
  if (baseAmount <= 0 || installments < 1) return 0;

  const totalWithInterest = calculateCardTotal(baseAmount, installments);
  return Math.round((totalWithInterest / installments) * 100) / 100;
}

export function getInstallmentOptions(baseAmount: number): InstallmentOption[] {
  if (baseAmount <= 0) return [];

  return Array.from({ length: MAX_CARD_INSTALLMENTS }, (_, index) => {
    const installments = index + 1;
    const installmentAmount = calculateInstallmentAmount(baseAmount, installments);

    return {
      value: String(installments),
      label: `${installments}x de ${formatCurrency(installmentAmount)}`,
    };
  });
}
