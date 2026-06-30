import { Button } from "@/components/ui/button";
import { CheckCircle, CreditCard, MessageCircle, Receipt } from 'lucide-react';
import { CHECKOUT_OFFER, DELIVERY_WHATSAPP_URL, LEONORA_PROFILE_IMAGE_URL } from '@/config/checkout';

interface PaymentSuccessDisplayProps {
  paymentMethod: 'card' | 'pix';
  amount: number;
  orderId?: string;
  cardLastFour?: string;
  installments?: number;
  onNewPurchase?: () => void;
  onGoHome?: () => void;
}

export function PaymentSuccessDisplay({
  paymentMethod,
  amount,
  cardLastFour,
  installments,
}: PaymentSuccessDisplayProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value / 100);

  const getPaymentMethodText = () => {
    if (paymentMethod === 'card') {
      return cardLastFour ? `Cartão final ${cardLastFour}` : 'Cartão de crédito';
    }

    return 'Pix';
  };

  const getInstallmentText = () => {
    if (paymentMethod === 'card' && installments && installments > 1) {
      const installmentAmount = amount / installments;
      return `${installments}x de ${formatCurrency(installmentAmount)}`;
    }

    return null;
  };

  return (
    <div className="mx-auto flex max-w-md flex-col items-center rounded-lg border border-stone-200 bg-[#fffdf8] p-4 text-center shadow-sm md:max-w-xl md:p-7">
      <CheckCircle className="mb-3 h-14 w-14 text-emerald-600" />

      <h3 className="mb-2 text-2xl font-bold text-emerald-950">
        {CHECKOUT_OFFER.successTitle}
      </h3>

      <p className="mb-4 max-w-md text-sm leading-relaxed text-emerald-900">
        {CHECKOUT_OFFER.successDescription}
      </p>

      <div className="mb-4 w-full overflow-hidden rounded-lg border border-[#d7c4a2] bg-[#fff8e6] text-left shadow-sm">
        <div className="flex items-center gap-3 border-b border-[#ead9b8] bg-[#fbf1dc] p-3">
          <img
            src={LEONORA_PROFILE_IMAGE_URL}
            alt="Leonora"
            className="h-14 w-14 shrink-0 rounded-full border-2 border-white object-cover shadow-sm"
          />
          <div className="min-w-0">
            <p className="text-base font-bold text-stone-950">Leonora</p>
            <p className="text-sm text-stone-700">WhatsApp pessoal</p>
            <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              Acompanhamento do ritual
            </div>
          </div>
        </div>

        <div className="space-y-2 p-3 text-sm leading-relaxed text-stone-800">
          <p className="font-semibold text-stone-950">Próximo passo</p>
          <p>Entre no WhatsApp pessoal da Leonora para acompanhar seu ritual.</p>

          <Button
            asChild
            className="mt-2 h-12 w-full min-w-0 bg-[#173d34] px-3 text-sm font-bold text-white hover:bg-[#0f2f28] sm:text-base"
          >
            <a href={DELIVERY_WHATSAPP_URL} target="_blank" rel="noreferrer">
              <MessageCircle className="mr-2 h-5 w-5 shrink-0" />
              {CHECKOUT_OFFER.deliveryButtonText}
            </a>
          </Button>

          <p className="text-xs leading-relaxed text-stone-600">
            Não precisa fazer outro pagamento agora.
          </p>
        </div>
      </div>

      <div className="w-full rounded-md border border-emerald-200 bg-white p-4 text-left">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-800">
          <Receipt className="h-4 w-4" />
          Pedido confirmado
        </h4>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-stone-600">Item:</span>
            <span className="text-right font-semibold text-stone-900">{CHECKOUT_OFFER.productName}</span>
          </div>

          <div className="flex justify-between gap-4">
            <span className="text-stone-600">Valor:</span>
            <span className="font-semibold text-stone-900">{formatCurrency(amount)}</span>
          </div>

          <div className="flex justify-between gap-4">
            <span className="text-stone-600">Método:</span>
            <span className="flex items-center gap-1 font-semibold text-stone-900">
              {paymentMethod === 'card' && <CreditCard className="h-3 w-3" />}
              {getPaymentMethodText()}
            </span>
          </div>

          {getInstallmentText() && (
            <div className="flex justify-between gap-4">
              <span className="text-stone-600">Parcelas:</span>
              <span className="font-semibold text-stone-900">{getInstallmentText()}</span>
            </div>
          )}
        </div>
      </div>

      <p className="mt-4 text-xs text-stone-500">
        {CHECKOUT_OFFER.footerText}
      </p>
    </div>
  );
}
