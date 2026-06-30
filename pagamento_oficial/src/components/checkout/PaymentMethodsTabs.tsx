import React, { Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, QrCode, Loader2 } from "lucide-react";

interface PaymentMethodsTabsProps {
  paymentMethod: string;
  onPaymentMethodChange: (value: string) => void;
  isTabChanging: boolean;
  cardPaymentFormComponent: React.ReactNode;
  pixPaymentDisplayComponent: React.ReactNode;
}

export function PaymentMethodsTabs({
  paymentMethod,
  onPaymentMethodChange,
  isTabChanging,
  cardPaymentFormComponent,
  pixPaymentDisplayComponent
}: PaymentMethodsTabsProps) {

  const handleTabChange = (value: string) => {
    onPaymentMethodChange(value);
  };

  // Componente de loading
  const LoadingSpinner = () => (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
    </div>
  );

  // Validação básica dos métodos de pagamento
  const isValidPaymentMethod = ['card', 'pix'].includes(paymentMethod);

  if (!isValidPaymentMethod) {
    console.error(`Método de pagamento inválido: ${paymentMethod}`);
    return (
      <div className="text-center p-4 text-red-600">
        Método de pagamento inválido. Por favor, recarregue a página.
      </div>
    );
  }

  return (
    <Tabs value={paymentMethod} onValueChange={handleTabChange} className="w-full">
      <TabsList className="mb-4 grid h-auto w-full grid-cols-2 rounded-md bg-stone-100 p-1">
        <TabsTrigger value="card" className="rounded-sm py-2 text-sm font-medium data-[state=active]:bg-[#173d34] data-[state=active]:text-white data-[state=inactive]:hover:bg-stone-200">
          <CreditCard className="mr-1.5 h-4 w-4" /> Cartão
        </TabsTrigger>
        <TabsTrigger value="pix" className="rounded-sm py-2 text-sm font-medium data-[state=active]:bg-[#173d34] data-[state=active]:text-white data-[state=inactive]:hover:bg-stone-200">
          <QrCode className="mr-1.5 h-4 w-4" /> Pix
        </TabsTrigger>
      </TabsList>

      <div className="min-h-[200px] relative">
        {isTabChanging && (
          <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center">
            <LoadingSpinner />
          </div>
        )}
        
        <TabsContent value="card" className="mt-0">
          <Suspense fallback={<LoadingSpinner />}>
            {cardPaymentFormComponent || <LoadingSpinner />}
          </Suspense>
        </TabsContent>

        <TabsContent value="pix" className="mt-0">
          <Suspense fallback={<LoadingSpinner />}>
            {pixPaymentDisplayComponent || <LoadingSpinner />}
          </Suspense>
        </TabsContent>
      </div>
    </Tabs>
  );
} 
