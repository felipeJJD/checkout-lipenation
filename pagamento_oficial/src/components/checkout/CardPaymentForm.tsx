import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CardPaymentFormProps {
  cardNumber: string;
  setCardNumber: (value: string) => void;
  cardNumberRef: React.Ref<any>;
  cardExpiry: string;
  setCardExpiry: (value: string) => void;
  cardExpiryRef: React.Ref<any>;
  cardCvc: string;
  setCardCvc: (value: string) => void;
  cardCvcRef: React.Ref<any>;
  cardName: string;
  setCardName: (value: string) => void;
  installments: string;
  setInstallments: (value: string) => void;
  installmentOptions: Array<{ value: string; label: string }>;
  errors: Record<string, string>;
}

export function CardPaymentForm({
  cardNumber, setCardNumber, cardNumberRef,
  cardExpiry, setCardExpiry, cardExpiryRef,
  cardCvc, setCardCvc, cardCvcRef,
  cardName, setCardName,
  installments, setInstallments,
  installmentOptions,
  errors
}: CardPaymentFormProps) {
  return (
    <div className="space-y-3 md:space-y-4">
       {/* Número do Cartão */}
      <div className="grid gap-2">
        <Label htmlFor="cardNumber">Número do Cartão</Label>
        <Input
          id="cardNumber"
          ref={cardNumberRef}
          placeholder="0000 0000 0000 0000"
          onChange={(e) => setCardNumber(e.target.value)} // Máscara atualiza via ref
          required
          autoComplete="cc-number"
          inputMode="numeric"
          aria-invalid={!!errors.cardNumber}
          aria-describedby={errors.cardNumber ? "cardNumber-error" : undefined}
        />
        {errors.cardNumber && <p id="cardNumber-error" className="text-sm text-red-600">{errors.cardNumber}</p>}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
        {/* Validade */}
        <div className="grid gap-2">
          <Label htmlFor="cardExpiry">Validade (MM/AA)</Label>
          <Input
            id="cardExpiry"
            ref={cardExpiryRef}
            placeholder="MM/AA"
            onChange={(e) => setCardExpiry(e.target.value)}
            required
            autoComplete="cc-exp"
            inputMode="numeric"
            aria-invalid={!!errors.cardExpiry}
            aria-describedby={errors.cardExpiry ? "cardExpiry-error" : undefined}
          />
          {errors.cardExpiry && <p id="cardExpiry-error" className="text-sm text-red-600">{errors.cardExpiry}</p>}
        </div>

        {/* CVV */}
        <div className="grid gap-2">
          <Label htmlFor="cardCvc">CVV</Label>
          <Input
            id="cardCvc"
            ref={cardCvcRef}
            placeholder="000"
            onChange={(e) => setCardCvc(e.target.value)}
            required
            autoComplete="cc-csc"
            inputMode="numeric"
            aria-invalid={!!errors.cardCvc}
            aria-describedby={errors.cardCvc ? "cardCvc-error" : undefined}
          />
          {errors.cardCvc && <p id="cardCvc-error" className="text-sm text-red-600">{errors.cardCvc}</p>}
        </div>

         {/* Parcelas */}
        <div className="grid gap-2">
           <Label htmlFor="installments">Parcelas</Label>
           <Select value={installments} onValueChange={setInstallments}>
              <SelectTrigger id="installments">
                 <SelectValue placeholder="Parcelas" />
              </SelectTrigger>
              <SelectContent>
                 {installmentOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                       {option.label}
                    </SelectItem>
                 ))}
              </SelectContent>
           </Select>
           {/* Pode adicionar erro de parcela se necessário */}
        </div>
      </div>

       {/* Nome no Cartão */}
       <div className="grid gap-2">
         <Label htmlFor="cardName">Nome Impresso no Cartão</Label>
         <Input
           id="cardName"
           placeholder="Como está no cartão"
           value={cardName}
           onChange={(e) => setCardName(e.target.value)}
           required
           autoComplete="cc-name"
           aria-invalid={!!errors.cardName}
           aria-describedby={errors.cardName ? "cardName-error" : undefined}
         />
         {errors.cardName && <p id="cardName-error" className="text-sm text-red-600">{errors.cardName}</p>}
       </div>
    </div>
  );
} 
