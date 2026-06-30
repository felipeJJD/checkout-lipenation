import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import React, { useState, useMemo, useCallback, useEffect} from "react";
import { CheckCircle2, Loader2, Lock, ShieldCheck } from "lucide-react";
import { useIMask } from 'react-imask';
import IMask from 'imask';
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { z } from "zod";
import { cpf, cnpj } from 'cpf-cnpj-validator';
import luhn from 'luhn';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';

// Importar os novos componentes
import { PersonalInfoForm } from '@/components/checkout/PersonalInfoForm';
import { PaymentMethodsTabs } from '@/components/checkout/PaymentMethodsTabs';
import { CardPaymentForm } from '@/components/checkout/CardPaymentForm';
import { PixPaymentDisplay } from '@/components/checkout/PixPaymentDisplay';
import { OrderSummary } from '@/components/checkout/OrderSummary';
import { PaymentErrorDisplay } from '@/components/checkout/PaymentErrorDisplay';
import { PaymentSuccessDisplay } from '@/components/checkout/PaymentSuccessDisplay';
import { ErrorBoundary } from '@/components/utils/ErrorBoundary';
import {
  calculateCardTotal,
  calculateInstallmentAmount,
  CHECKOUT_OFFER,
  CHECKOUT_PAGE_TITLE,
  getCheckoutOffer,
  getInstallmentOptions,
  type CheckoutPaymentMethod,
} from '@/config/checkout';

// --- Schema de Validação Zod ---
const phoneRegex = /^\(\d{2}\) \d{5}-\d{4}$/;

// <<< RESTAURADO: Uso de variável de ambiente para URL da API >>>
const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const PIX_PREVIEW_EXPIRES_IN_MS = 3 * 24 * 60 * 60 * 1000;

const checkoutSchema = z.object({
  name: z.string().min(1, { message: "Nome é obrigatório" }),
  email: z.string().min(1, { message: "Email é obrigatório" }).email({ message: "Formato de email inválido" }),
  ddi: z.string(),
  phone: z.string()
           .min(1, { message: "Celular é obrigatório" })
           .regex(phoneRegex, { message: "Formato de celular inválido ou incompleto" }),
  cpfCnpj: z.string()
            .min(1, { message: "CPF/CNPJ é obrigatório" })
            .refine(value => {
                const cleanedValue = value.replace(/\D/g, '');
                return cpf.isValid(cleanedValue) || cnpj.isValid(cleanedValue);
            }, { message: "CPF ou CNPJ inválido" }),
  paymentMethod: z.enum(['card', 'pix']),
  offerId: z.string().optional(),
  paymentToken: z.string().optional(),
  items: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    price: z.number().positive(),
    quantity: z.number().int().positive(),
  })).min(1, { message: "O carrinho não pode estar vazio" }),

  // Campos do Cartão (Validações Base)
  cardNumber: z.string().optional().refine(value => !value || luhn.validate(value.replace(/\s/g, '')), { message: "Número de cartão inválido" }),
  cardExpiry: z.string().optional().refine(value => {
                  if (!value) return true;
                  const [month, yearSuffix] = value.split('/');
                  if (!month || !yearSuffix || month.length !== 2 || yearSuffix.length !== 2) return false;
                  const currentYear = new Date().getFullYear();
                  const currentMonth = new Date().getMonth() + 1;
                  const inputYear = parseInt(`20${yearSuffix}`, 10);
                  const inputMonth = parseInt(month, 10);
                  if (isNaN(inputYear) || isNaN(inputMonth) || inputMonth < 1 || inputMonth > 12) return false;
                  if (inputYear < currentYear || (inputYear === currentYear && inputMonth < currentMonth)) {
                      return false;
                  }
                  return true;
               }, { message: "Data de validade inválida ou expirada" }),
  cardCvc: z.string().optional().refine(value => !value || /^\d{3,4}$/.test(value), { message: "CVV inválido"}),
  cardName: z.string().optional().refine(value => !value || value.trim().length > 0, { message: "Nome do titular é obrigatório" }),
  installments: z.string().optional(),

})
.refine((data) => {
  if (data.paymentMethod === 'card') {
    const isCardNumberValid = !!data.cardNumber && luhn.validate(data.cardNumber.replace(/\s/g, ''));
    const isExpiryFormatValid = !!data.cardExpiry && /^\d{2}\/\d{2}$/.test(data.cardExpiry);
    let isExpiryDateValid = false;
    if (isExpiryFormatValid && data.cardExpiry) {
              const [month, yearSuffix] = data.cardExpiry.split('/');
              const currentYear = new Date().getFullYear();
              const currentMonth = new Date().getMonth() + 1;
              const inputYear = parseInt(`20${yearSuffix}`, 10);
              const inputMonth = parseInt(month, 10);
      isExpiryDateValid = !(inputYear < currentYear || (inputYear === currentYear && inputMonth < currentMonth));
    }
    const isCvcValid = !!data.cardCvc && /^\d{3,4}$/.test(data.cardCvc);
    const isNameValid = !!data.cardName && data.cardName.trim().length > 0;
    // Installments é opcional no schema base, mas obrigatório na prática para cartão
    const areInstallmentsSelected = !!data.installments && data.installments !== '0'; 

    const cardFieldsValid = isCardNumberValid && isExpiryFormatValid && isExpiryDateValid && isCvcValid && isNameValid && areInstallmentsSelected;

    return cardFieldsValid;
  }
  return true;
}, {
  message: "Preencha todos os dados válidos do cartão, incluindo parcelas.", // Mensagem atualizada
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;
// --- Fim do Schema ---\

// --- Interface para Itens do Carrinho (Manter) ---
interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface DecodedCheckoutToken {
  offerId: string;
  amountInCents: number;
  productName: string;
}

function decodeCheckoutToken(token: string | null): DecodedCheckoutToken | null {
  if (!token || !token.includes('.')) return null;

  try {
    const [payload] = token.split('.');
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, '=');
    const parsed = JSON.parse(window.atob(paddedPayload)) as DecodedCheckoutToken;

    if (!parsed.productName || !Number.isFinite(parsed.amountInCents) || parsed.amountInCents <= 0) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function CheckoutPage() {
  // Navigation removed - users shouldn't access dashboard
  const [searchParams] = useSearchParams();
  const paymentTokenParam = searchParams.get('pedido') || searchParams.get('token');
  const offerParam = searchParams.get('oferta') || searchParams.get('offer');
  const previewParam = searchParams.get('preview');
  const previewMethodParam = searchParams.get('method');
  const isSuccessPreview = previewParam === 'success';
  const isPixPreview = previewParam === 'pix';
  const previewPaymentMethod: CheckoutPaymentMethod = previewMethodParam === 'pix' ? 'pix' : 'card';
  const { toast } = useToast();
  const signedCheckout = useMemo(() => decodeCheckoutToken(paymentTokenParam), [paymentTokenParam]);
  const resolvedOffer = useMemo(() => getCheckoutOffer(offerParam), [offerParam]);
  const offer = resolvedOffer ?? CHECKOUT_OFFER;
  
  // Atualizar título da página
  useEffect(() => {
    document.title = CHECKOUT_PAGE_TITLE;
  }, []);

  // <<< Lógica para definir itens iniciais >>>
  const getInitialCartItems = useCallback((): CartItem[] => {
    if (signedCheckout) {
      return [{
        id: signedCheckout.offerId || CHECKOUT_OFFER.id,
        name: signedCheckout.productName,
        price: signedCheckout.amountInCents / 100,
        quantity: 1
      }];
    }

    if (resolvedOffer) {
      // Valor fixo da oferta; nao vem mais aberto na URL.
      return [{
        id: resolvedOffer.id,
        name: resolvedOffer.productName,
        price: resolvedOffer.baseAmount,
        quantity: 1
      }];
    } else {
      // Sem amount válido na URL: carrinho vazio. O valor sempre vem do link gerado,
      // então não há fallback hardcoded — o resumo mostra "Carrinho vazio" e o submit
      // é bloqueado pela validação (items.min(1) no front / valor > 0 no backend).
      console.warn('Oferta invalida no link de checkout.');
      return [];
    }
  }, [resolvedOffer, signedCheckout]);
  const [cartItems] = useState<CartItem[]>(getInitialCartItems);
  // <<< Fim da lógica dos itens iniciais >>>

  // Estados para Dados Pessoais
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [ddi, setDdi] = useState("+55");
  const [phone, setPhone] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState(""); // CPF/CNPJ do Comprador

  // Estados para Pagamento (Cartão)
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardName, setCardName] = useState(""); // Nome impresso no cartão
  const [installments, setInstallments] = useState("1");
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>(
    isSuccessPreview ? previewPaymentMethod : isPixPreview ? 'pix' : "card"
  );

  // Estado para respostas de pagamento
  const [paymentResponse, setPaymentResponse] = useState<{
    id: string;
    status: string;
    amount: number;
    payment_method: string;
    card?: {
      last_four_digits: string;
    };
    installments?: number;
    orderId?: string;
    cardLastFour?: string;
    card_last_digits?: string;
    card_installments?: number;
    pixQrCodeData?: string;
    pixCopyPasteData?: string;
    pixExpirationDate?: string;
    is_approved?: boolean;
  } | null>(isSuccessPreview ? {
    id: 'preview-pagamento-confirmado',
    status: 'paid',
    amount: 0,
    payment_method: previewPaymentMethod,
    cardLastFour: previewPaymentMethod === 'card' ? '1234' : undefined,
    card_installments: 1,
    is_approved: true,
  } : isPixPreview ? {
    id: 'preview-pix-pendente',
    status: 'pending',
    amount: 0,
    payment_method: 'pix',
    pixQrCodeData: '00020126580014br.gov.bcb.pix0136preview-checkout-leonora5204000053039865406130.005802BR5925CASA LEONORA6009SAO PAULO62070503***6304ABCD',
    pixCopyPasteData: '00020126580014br.gov.bcb.pix0136preview-checkout-leonora5204000053039865406130.005802BR5925CASA LEONORA6009SAO PAULO62070503***6304ABCD',
    pixExpirationDate: new Date(Date.now() + PIX_PREVIEW_EXPIRES_IN_MS).toISOString(),
    is_approved: false,
  } : null);
  const [showPaymentResult, setShowPaymentResult] = useState(isSuccessPreview || isPixPreview);

  // Estados para exibição de resultado
  const [showPaymentError, setShowPaymentError] = useState(false);
  const [paymentError, setPaymentError] = useState<{
    message: string;
    type: 'card_declined' | 'insufficient_funds' | 'invalid_card' | 'network_error' | 'generic';
  } | null>(null);

  // Estado para erros
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  // Estado de Carregamento
  const [isLoading, setIsLoading] = useState(false);
  // Estado para loading durante transição de abas
  const [isTabChanging, setIsTabChanging] = useState(false);
  const [isCheckingPixStatus, setIsCheckingPixStatus] = useState(false);
  const [pixStatusMessage, setPixStatusMessage] = useState("");

  // --- CÁLCULO DO VALOR TOTAL BASE ---
  const totalBaseAmount = useMemo(() => {
    return cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  }, [cartItems]);

  // --- CÁLCULO DO VALOR DA PARCELA (PARA EXIBIÇÃO NO RESUMO) ---
  const calculatedInstallmentValue = useMemo(() => {
    const numInstallments = parseInt(installments, 10);
    if (paymentMethod === 'card' && numInstallments >= 1) {
      return calculateInstallmentAmount(totalBaseAmount, numInstallments);
    }
    return null; // Retorna null se não for cartão parcelado
  }, [paymentMethod, installments, totalBaseAmount]);

  // --- CÁLCULO DO VALOR TOTAL COM JUROS (PARA PAGAMENTOS PARCELADOS) ---
  const totalAmountWithInterest = useMemo(() => {
    const numInstallments = parseInt(installments, 10);
    if (paymentMethod === 'card' && numInstallments >= 1) {
      return calculateCardTotal(totalBaseAmount, numInstallments);
    }
    return totalBaseAmount; // Retorna valor base para pagamentos à vista ou outros métodos
  }, [paymentMethod, installments, totalBaseAmount]);

  // Gerar opções de parcelamento (Manter)
  const formattedBaseAmount = useMemo(() => {
    return totalBaseAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }, [totalBaseAmount]);

  const installmentOptions = useMemo(() => {
    return getInstallmentOptions(totalBaseAmount);
  }, [totalBaseAmount]);

  // --- Configurações das Máscaras com useIMask e onAccept ---\
  const { ref: phoneRef } = useIMask(
    { mask: '(00) 00000-0000' },
    { onAccept: (value) => setPhone(String(value)) }
  );
  const { ref: cpfCnpjRef } = useIMask( // Máscara para CPF/CNPJ do *comprador*
    { mask: [{ mask: '000.000.000-00' }, { mask: '00.000.000/0000-00' }] },
    { onAccept: (value) => setCpfCnpj(String(value)) }
  );
  const { ref: cardNumberRef } = useIMask(
    { mask: '0000 0000 0000 0000' },
    { onAccept: (value) => setCardNumber(String(value)) }
  );
  const { ref: cardExpiryRef } = useIMask(
    {
      mask: 'MM/YY',
      blocks: {
        MM: { mask: IMask.MaskedRange, from: 1, to: 12, maxLength: 2, placeholderChar: 'M' },
        YY: { mask: IMask.MaskedRange, from: new Date().getFullYear() % 100, to: 99, maxLength: 2, placeholderChar: 'Y' },
      },
    },
    { onAccept: (value) => setCardExpiry(String(value)) }
  );
  const { ref: cardCvcRef } = useIMask(
    { mask: '000[0]' }, // Permite 3 ou 4 dígitos
    { onAccept: (value) => setCardCvc(String(value)) }
  );

  // --- FUNÇÃO PARA DETERMINAR TIPO DE ERRO ---
  const getErrorType = useCallback((errorMessage: string): 'card_declined' | 'insufficient_funds' | 'invalid_card' | 'network_error' | 'generic' => {
    const message = errorMessage.toLowerCase();
    
    if (message.includes('declined') || message.includes('recusado') || message.includes('negado')) {
      return 'card_declined';
    }
    if (message.includes('insufficient') || message.includes('insuficiente') || message.includes('saldo')) {
      return 'insufficient_funds';
    }
    if (message.includes('invalid card') || message.includes('cartão inválido') || message.includes('card number')) {
      return 'invalid_card';
    }
    if (message.includes('network') || message.includes('connection') || message.includes('conexão') || message.includes('timeout')) {
      return 'network_error';
    }
    return 'generic';
  }, []);

  // --- FUNÇÕES DE CONTROLE DE ESTADO ---
  const resetPaymentStates = useCallback(() => {
    setShowPaymentResult(false);
    setShowPaymentError(false);
    setPaymentResponse(null);
    setPaymentError(null);
    setFormErrors({});
    setPixStatusMessage("");
    setIsCheckingPixStatus(false);
  }, []);

  const handleTryAgain = useCallback(() => {
    resetPaymentStates();
  }, [resetPaymentStates]);

  // handleGoHome removido - usuários não devem acessar dashboard

  // --- FUNÇÕES DE MANIPULAÇÃO DE FORMULÁRIO ---

  // Função para lidar com a troca de abas de pagamento com estado de carregamento
  const handlePaymentMethodChange = useCallback((value: string) => {
    // Resetar erros específicos do método anterior (ex: cartão)
    setFormErrors({});
    // Resetar resposta de pagamento anterior
    setPaymentResponse(null);
    setShowPaymentResult(false);
    setPixStatusMessage("");
    
    // Mudar o método de pagamento imediatamente
    setPaymentMethod(value as CheckoutPaymentMethod);
    
    // Mostrar loading brevemente apenas para feedback visual
    setIsTabChanging(true);
    requestAnimationFrame(() => {
      setTimeout(() => {
        setIsTabChanging(false);
      }, 100);
    });
  }, [setIsTabChanging, setPaymentMethod]);

  const checkPixPaymentStatus = useCallback(async (manual = false) => {
    if (!paymentResponse?.id) return;

    if (manual) {
      setIsCheckingPixStatus(true);
      setPixStatusMessage("Verificando confirmação do Pix...");
    }

    try {
      const response = await axios.get(`${API_URL}/api/checkout/status`, {
        params: { orderId: paymentResponse.id },
      });

      if (response.data.success) {
        const statusData = response.data.data;
        const isApproved = statusData?.is_approved || statusData?.status === 'paid';

        if (isApproved) {
          setPaymentResponse(previous => previous ? {
            ...previous,
            ...statusData,
            is_approved: true,
            status: statusData.status || 'paid',
          } : previous);
          setPixStatusMessage("Pagamento confirmado.");
          return;
        }

        if (manual) {
          setPixStatusMessage("Ainda aguardando a confirmação do banco. Pode levar alguns instantes.");
        }
      } else if (manual) {
        setPixStatusMessage("Não foi possível confirmar agora. Tente novamente em alguns segundos.");
      }
    } catch {
      if (manual) {
        setPixStatusMessage("Não foi possível verificar agora. Tente novamente em alguns segundos.");
      }
    } finally {
      if (manual) {
        setIsCheckingPixStatus(false);
      }
    }
  }, [paymentResponse?.id]);

  useEffect(() => {
    if (
      !showPaymentResult ||
      isPixPreview ||
      paymentMethod !== 'pix' ||
      !paymentResponse?.id ||
      paymentResponse.is_approved
    ) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void checkPixPaymentStatus(false);
    }, 6000);

    return () => window.clearInterval(intervalId);
  }, [
    showPaymentResult,
    isPixPreview,
    paymentMethod,
    paymentResponse?.id,
    paymentResponse?.is_approved,
    checkPixPaymentStatus,
  ]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    resetPaymentStates(); // Limpa todos os estados de resultado

    const formData: CheckoutFormData = {
      name,
      email,
      ddi,
      phone,
      cpfCnpj,
      paymentMethod,
      offerId: resolvedOffer?.id,
      paymentToken: paymentTokenParam || undefined,
      items: cartItems, // Passa os itens atuais do carrinho
      // Campos do cartão são incluídos condicionalmente abaixo
    };

    // Adiciona dados do cartão apenas se for o método selecionado
    if (paymentMethod === 'card') {
      formData.cardNumber = cardNumber;
      formData.cardExpiry = cardExpiry;
      formData.cardCvc = cardCvc;
      formData.cardName = cardName;
      formData.installments = installments;
    }

    try {
      // Validação com Zod
      checkoutSchema.parse(formData);

      // <<< RESTAURADO: Enviar dados para o backend usando API_URL >>>
      const response = await axios.post(`${API_URL}/api/checkout`, formData);

      if (response.data.success) {
        // Verificar se o status indica falha (cartão recusado, etc.)
        if (response.data.data?.status === 'failed') {
          // Pagamento foi recusado - mostrar erro
          const errorMessage = 'Seu cartão foi recusado pela operadora. Verifique os dados ou tente outro cartão.';
          setPaymentError({
            message: errorMessage,
            type: 'card_declined'
          });
          setShowPaymentError(true);
          return;
        }
        
        // Armazena os dados de Pix/Cartao. A exibicao de cada metodo
        // (PixPaymentDisplay / PaymentSuccessDisplay) e
        // resolvida no JSX a partir de showPaymentResult + paymentMethod.
        setPaymentResponse(response.data.data);
        if (paymentMethod === 'pix' && !response.data.data?.is_approved) {
          setPixStatusMessage("Aguardando confirmação do banco...");
        }
        setShowPaymentResult(true);

      } else {
        // Erro de negócio retornado pelo backend
        throw new Error(response.data.error || 'Ocorreu um erro no processamento do pagamento.');
      }

    } catch (error) {
      // Log seguro: nunca imprimir o objeto error inteiro (axios.config.data contem o cartao)
      if (error instanceof Error) {
        console.error("Erro no processo de checkout:", error.name, error.message);
      } else {
        console.error("Erro no processo de checkout (desconhecido)");
      }
      let errorMessage = "Ocorreu um erro inesperado.";
      let errorType: 'card_declined' | 'insufficient_funds' | 'invalid_card' | 'network_error' | 'generic' = 'generic';
      const errorDetails: Record<string, string> = {};

      if (error instanceof z.ZodError) {
        errorMessage = "Por favor, corrija os erros no formulário.";
        error.errors.forEach((err) => {
          if (err.path.length > 0) {
            errorDetails[err.path[0]] = err.message;
          }
        });
        setFormErrors(errorDetails);
        // Para erros de validação, ainda usamos toast pois são erros de formulário
        toast({
          title: "Erro no Formulário",
          description: errorMessage,
          variant: "destructive",
        });
      } else if (axios.isAxiosError(error)) {
         // Erro na chamada da API (rede, erro do servidor backend, etc.)
         if (error.response) {
           // O backend respondeu com um status de erro (4xx, 5xx)
           const backendError = error.response.data?.error || JSON.stringify(error.response.data);
           errorMessage = backendError;
           errorType = getErrorType(errorMessage);
           
           // Se o backend retornar erros de campos específicos, podemos mapeá-los
           if (typeof error.response.data?.details === 'object') {
             setFormErrors(error.response.data.details);
           }
           
           // Para erros de pagamento, usar o componente visual
           setPaymentError({ message: errorMessage, type: errorType });
           setShowPaymentError(true);
         } else if (error.request) {
           // A requisição foi feita mas não houve resposta
           errorMessage = "Não foi possível conectar ao servidor de pagamento. Verifique sua conexão.";
           errorType = 'network_error';
           setPaymentError({ message: errorMessage, type: errorType });
           setShowPaymentError(true);
         } else {
           // Erro ao configurar a requisição
           errorMessage = `Erro ao preparar requisição: ${error.message}`;
           errorType = 'network_error';
           setPaymentError({ message: errorMessage, type: errorType });
           setShowPaymentError(true);
         }
      } else if (error instanceof Error) {
         // Outros erros (ex: erro de negócio lançado manualmente)
        errorMessage = error.message;
        errorType = getErrorType(errorMessage);
        setPaymentError({ message: errorMessage, type: errorType });
        setShowPaymentError(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4efe7] px-3 py-3 md:px-6 md:py-8">
      <Toaster />
      <Card className="mx-auto w-full max-w-4xl overflow-hidden rounded-lg border-[#dfd4c5] shadow-[0_22px_70px_rgba(40,32,22,0.14)]">
        {!showPaymentResult && (
          <CardHeader className="border-b border-[#e7dccd] bg-[#fffdf8] p-4 md:p-8">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_280px] md:items-stretch md:gap-6">
              <div className="space-y-3 md:space-y-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#d9c7a3] bg-[#fbf1dc] px-3 py-1 text-xs font-semibold text-stone-800">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {offer.brandName}
                </div>
                <div className="space-y-1.5 md:space-y-2">
                  <p className="text-sm font-semibold text-emerald-800">
                    Combinado com a Leonora
                  </p>
                  <h1 className="max-w-xl text-2xl font-bold leading-tight tracking-normal text-stone-950 md:text-[2.6rem]">
                    {offer.headline}
                  </h1>
                  <p className="max-w-xl text-sm leading-relaxed text-stone-700 md:text-base">
                    {offer.shortDescription}
                  </p>
                </div>

                <div className="grid gap-1.5 text-sm text-stone-800 md:max-w-xl md:gap-2">
                  {offer.agreementLines.map(line => (
                    <div key={line} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                      <span>{line}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-lg bg-[#173d34] p-4 text-white shadow-sm md:p-5">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-emerald-100">Valor combinado</p>
                  <p className="text-3xl font-bold md:text-4xl">{formattedBaseAmount}</p>
                  <p className="text-sm text-emerald-100">materiais do ritual</p>
                </div>

                <div className="mt-5 hidden rounded-md border border-white/15 bg-white/10 p-3 text-sm leading-relaxed text-emerald-50 md:block">
                  <p className="font-semibold">Pagamento seguro</p>
                  <p>Pix ou cartão</p>
                </div>
              </div>
            </div>
          </CardHeader>
        )}
        <CardContent className="bg-white p-4 md:p-7">
          {/* Se há erro de pagamento, mostra o componente de erro */}
          {showPaymentError && paymentError ? (
            <PaymentErrorDisplay
              errorMessage={paymentError.message}
              errorType={paymentError.type}
              onTryAgain={handleTryAgain}
            />
          ) : showPaymentResult && paymentResponse ? (
            /* Se o pagamento foi bem sucedido, mostra o resultado */
            <div>
              {paymentMethod === 'pix' && (
                paymentResponse.is_approved ? (
                  <PaymentSuccessDisplay
                    paymentMethod={paymentMethod}
                    amount={totalBaseAmount * 100}
                    orderId={paymentResponse.id}
                  />
                ) : (
                  <PixPaymentDisplay 
                    qrCodeData={paymentResponse.pixQrCodeData}
                    copyPasteData={paymentResponse.pixCopyPasteData}
                    expirationDate={paymentResponse.pixExpirationDate}
                    amount={totalBaseAmount}
                    isCheckingStatus={isCheckingPixStatus}
                    statusMessage={pixStatusMessage}
                    onCheckStatus={() => void checkPixPaymentStatus(true)}
                  />
                )
              )}
              {paymentMethod === 'card' && (
                <PaymentSuccessDisplay
                  paymentMethod={paymentMethod}
                  amount={totalAmountWithInterest * 100} // Usar valor com juros convertido para centavos
                  orderId={paymentResponse.id}
                  cardLastFour={paymentResponse.cardLastFour || paymentResponse.card_last_digits || paymentResponse.card?.last_four_digits}
                  installments={paymentResponse.card_installments || parseInt(installments)}
                  // Remover botão de "Voltar ao Início" para evitar acesso ao dashboard
                />
              )}
            </div>
          ) : (
            /* Senão, mostra o formulário */
            <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-[minmax(0,1fr)_330px] md:gap-7">
              {/* Coluna da Esquerda: Dados Pessoais e Pagamento */}
              <div className="flex flex-col gap-5 md:gap-6">
                 <div className="order-2 md:order-1">
                 <PersonalInfoForm
                   name={name} setName={setName}
                   email={email} setEmail={setEmail}
                   ddi={ddi} setDdi={setDdi}
                   phone={phone} setPhone={setPhone} phoneRef={phoneRef}
                   cpfCnpj={cpfCnpj} setCpfCnpj={setCpfCnpj} cpfCnpjRef={cpfCnpjRef}
                   errors={formErrors}
                 />
                 </div>

                 <div className="order-1 rounded-md border border-stone-200 bg-[#fffdf8] p-4 md:order-2">
                   <h3 className="mb-1 text-lg font-semibold">Escolha como pagar</h3>
                   <p className="mb-4 text-sm text-stone-600">Pix ou cartão. Depois preencha seus dados.</p>
                   <ErrorBoundary>
                     <PaymentMethodsTabs
                       key={`payment-${paymentMethod}`} // Força remontagem ao trocar método
                       paymentMethod={paymentMethod}
                       onPaymentMethodChange={handlePaymentMethodChange}
                       isTabChanging={isTabChanging} // Passar estado se for usar visualmente
                       cardPaymentFormComponent={(
                          <CardPaymentForm
                             key="card-form" // Key estável para o formulário
                             cardNumber={cardNumber} setCardNumber={setCardNumber} cardNumberRef={cardNumberRef}
                             cardExpiry={cardExpiry} setCardExpiry={setCardExpiry} cardExpiryRef={cardExpiryRef}
                             cardCvc={cardCvc} setCardCvc={setCardCvc} cardCvcRef={cardCvcRef}
                             cardName={cardName} setCardName={setCardName}
                             installments={installments} setInstallments={setInstallments}
                             installmentOptions={installmentOptions}
                             errors={formErrors}
                           />
                       )}
                        pixPaymentDisplayComponent={
                         <div key="pix-info" className="space-y-2 rounded-md border border-stone-200 bg-[#fffdf8] p-4 text-sm text-stone-800">
                           <p className="font-semibold text-stone-950">Pix na próxima etapa.</p>
                           <p>Copie o Pix, pague no banco e volte para a Leonora.</p>
                         </div>
                       }
                     />
                   </ErrorBoundary>
                 </div>
              </div>

              {/* Coluna da Direita: Resumo do Pedido e Botão Finalizar */}
              <div className="space-y-5 md:border-l md:border-stone-200 md:py-2 md:pl-7">
                {/* Símbolo de Cadeado (segurança) */}
                 <div className="flex items-center justify-end text-xs text-gray-500">
                    <Lock size={12} className="mr-1"/> Ambiente Seguro
                 </div>
                 <OrderSummary 
                    cartItems={cartItems} 
                    totalBaseAmount={totalBaseAmount} 
                    paymentMethod={paymentMethod} 
                    installmentsCount={parseInt(installments, 10) || 1}
                    calculatedInstallmentValue={calculatedInstallmentValue}
                  />

                 <div className="rounded-md border border-[#ead9b8] bg-[#fff8e6] p-3 text-sm leading-relaxed text-stone-800">
                    <p className="font-semibold">{offer.adminNoticeTitle}</p>
                    <p>{offer.adminNotice}</p>
                 </div>

                 <Button 
                   type="submit" 
                   className="h-12 w-full bg-[#173d34] text-base text-white hover:bg-[#0f2f28] md:text-lg"
                   disabled={isLoading}
                 >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    'Pagar materiais'
                  )}
                </Button>

                 {/* Avisos/Infos Adicionais */}
                 <div className="text-xs text-center text-gray-500 space-y-1 pt-4">
                    <p>{offer.footerText}</p>
                 </div>

              </div>
            </form>
           )}
        </CardContent>
      </Card>
    </div>
  );
}
