interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface OrderSummaryProps {
  cartItems: CartItem[];
  totalBaseAmount: number;
  paymentMethod?: 'card' | 'pix';
  installmentsCount?: number;
  calculatedInstallmentValue?: number | null;
}

export function OrderSummary({
  cartItems,
  totalBaseAmount,
  paymentMethod,
  installmentsCount,
  calculatedInstallmentValue,
}: OrderSummaryProps) {
  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const hasCardInstallments =
    paymentMethod === 'card' &&
    !!installmentsCount &&
    installmentsCount > 1 &&
    !!calculatedInstallmentValue;

  const cardTotal = hasCardInstallments
    ? Math.round(calculatedInstallmentValue * installmentsCount * 100) / 100
    : totalBaseAmount;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-stone-950">Seu combinado</h3>

      <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
        {cartItems.map(item => (
          <div key={item.id} className="space-y-3">
            <div>
              <p className="font-semibold leading-snug text-stone-950">{item.name}</p>
              <p className="text-sm text-stone-600">materiais do ritual</p>
            </div>

            <div className="flex justify-between border-t border-stone-200 pt-3 text-sm text-stone-700">
              <span>Valor combinado</span>
              <span className="font-semibold text-stone-950">
                {formatCurrency(item.price * item.quantity)}
              </span>
            </div>
          </div>
        ))}

        {cartItems.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">Carrinho vazio.</p>
        )}
      </div>

      {hasCardInstallments && calculatedInstallmentValue ? (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-stone-700">
            <span>Cartão parcelado</span>
            <span>
              {installmentsCount}x de {formatCurrency(calculatedInstallmentValue)}
            </span>
          </div>
          <div className="flex justify-between text-base font-semibold text-stone-950">
            <span>Total no cartão</span>
            <span>{formatCurrency(cardTotal)}</span>
          </div>
        </div>
      ) : (
        <div className="flex justify-between text-base font-semibold text-stone-950">
          <span>Total</span>
          <span>{formatCurrency(totalBaseAmount)}</span>
        </div>
      )}
    </div>
  );
}
