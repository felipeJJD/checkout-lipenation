import { Button } from "@/components/ui/button";
import { XCircle, CreditCard, AlertTriangle, RefreshCw } from 'lucide-react';

interface PaymentErrorDisplayProps {
  errorMessage: string;
  errorType?: 'card_declined' | 'insufficient_funds' | 'invalid_card' | 'network_error' | 'generic';
  onTryAgain: () => void;
}

export function PaymentErrorDisplay({ 
  errorMessage, 
  errorType = 'generic', 
  onTryAgain
}: PaymentErrorDisplayProps) {
  
  const getErrorIcon = () => {
    switch (errorType) {
      case 'card_declined':
      case 'insufficient_funds':
      case 'invalid_card':
        return <CreditCard className="h-16 w-16 text-red-500" />;
      case 'network_error':
        return <AlertTriangle className="h-16 w-16 text-orange-500" />;
      default:
        return <XCircle className="h-16 w-16 text-red-500" />;
    }
  };

  const getErrorTitle = () => {
    switch (errorType) {
      case 'card_declined':
        return 'Cartão Recusado';
      case 'insufficient_funds':
        return 'Saldo Insuficiente';
      case 'invalid_card':
        return 'Cartão Inválido';
      case 'network_error':
        return 'Erro de Conexão';
      default:
        return 'Pagamento Não Processado';
    }
  };

  const getErrorDescription = () => {
    switch (errorType) {
      case 'card_declined':
        return 'Seu cartão foi recusado pela operadora. Verifique os dados ou tente outro cartão.';
      case 'insufficient_funds':
        return 'Não há saldo suficiente no cartão para esta transação.';
      case 'invalid_card':
        return 'Os dados do cartão estão incorretos. Verifique o número, validade e CVV.';
      case 'network_error':
        return 'Não foi possível conectar ao servidor de pagamento. Verifique sua conexão.';
      default:
        return errorMessage || 'Ocorreu um erro durante o processamento do pagamento.';
    }
  };

  const getSuggestions = () => {
    switch (errorType) {
      case 'card_declined':
        return [
          'Verifique se os dados do cartão estão corretos',
          'Confirme se o cartão está desbloqueado',
          'Tente usar outro cartão',
          'Entre em contato com seu banco'
        ];
      case 'insufficient_funds':
        return [
          'Verifique o saldo disponível no cartão',
          'Tente um valor menor',
          'Use outro cartão com saldo suficiente'
        ];
      case 'invalid_card':
        return [
          'Verifique o número do cartão',
          'Confirme a data de validade',
          'Verifique o código CVV'
        ];
      case 'network_error':
        return [
          'Verifique sua conexão com a internet',
          'Tente novamente em alguns instantes',
          'Recarregue a página se necessário'
        ];
      default:
        return [
          'Tente novamente em alguns instantes',
          'Verifique sua conexão com a internet',
          'Entre em contato conosco se o problema persistir'
        ];
    }
  };

  return (
    <div className="flex flex-col items-center p-8 border rounded-lg bg-red-50 border-red-200 max-w-md mx-auto">
      {/* Ícone do erro */}
      <div className="mb-6">
        {getErrorIcon()}
      </div>

      {/* Título do erro */}
      <h3 className="text-2xl font-bold text-red-700 mb-3 text-center">
        {getErrorTitle()}
      </h3>

      {/* Descrição do erro */}
      <p className="text-red-600 text-center mb-6 leading-relaxed">
        {getErrorDescription()}
      </p>

      {/* Sugestões */}
      <div className="w-full mb-6">
        <h4 className="text-sm font-semibold text-red-700 mb-3">O que você pode fazer:</h4>
        <ul className="text-sm text-red-600 space-y-1">
          {getSuggestions().map((suggestion, index) => (
            <li key={index} className="flex items-start">
              <span className="text-red-400 mr-2">•</span>
              <span>{suggestion}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Botão para tentar novamente */}
      <Button 
        onClick={onTryAgain}
        className="w-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2"
      >
        <RefreshCw className="h-4 w-4" />
        Tentar Novamente
      </Button>

      {/* Informações de segurança */}
      <div className="mt-6 text-xs text-gray-500 text-center">
        <p>🔒 Seus dados estão protegidos</p>
        <p>Nenhuma cobrança foi realizada</p>
      </div>
    </div>
  );
}