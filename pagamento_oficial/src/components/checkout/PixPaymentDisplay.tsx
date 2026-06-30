import { useState } from 'react';
import QRCode from 'react-qr-code';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Copy, Loader2, QrCode, ShieldCheck } from 'lucide-react';

interface PixPaymentDisplayProps {
  qrCodeData?: string;
  copyPasteData?: string;
  expirationDate?: string;
  amount?: number;
  isCheckingStatus?: boolean;
  statusMessage?: string;
  onCheckStatus?: () => void;
}

export function PixPaymentDisplay({
  qrCodeData,
  copyPasteData,
  expirationDate,
  amount,
  isCheckingStatus = false,
  statusMessage,
  onCheckStatus,
}: PixPaymentDisplayProps) {
  const [hasCopied, setHasCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const copyWithTextarea = () => {
    const textArea = document.createElement('textarea');
    textArea.value = copyPasteData || '';
    textArea.setAttribute('readonly', 'true');
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textArea);
    return copied;
  };

  const handleCopy = async () => {
    if (!copyPasteData) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(copyPasteData);
      } else if (!copyWithTextarea()) {
        throw new Error('copy_failed');
      }

      setHasCopied(true);
      setCopyFailed(false);
    } catch {
      if (copyWithTextarea()) {
        setHasCopied(true);
        setCopyFailed(false);
        return;
      }

      setCopyFailed(true);
    }
  };

  const formatDateSimple = (dateString?: string): string => {
    if (!dateString) return "Data indisponível";

    try {
      const date = new Date(dateString);
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-4 rounded-lg border border-stone-200 bg-[#fffdf8] p-4 text-center shadow-sm md:p-7">
      <div className="space-y-1.5">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <QrCode className="h-5 w-5" />
        </div>
        <h3 className="text-2xl font-bold text-stone-950">Pague com Pix</h3>
        {typeof amount === 'number' && amount > 0 && (
          <p className="text-3xl font-bold text-stone-950">
            {amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        )}
      </div>

      <div className="space-y-3 rounded-md border border-[#ead9b8] bg-[#fff8e6] p-4 text-left">
        <div className="space-y-1">
          <p className="text-base font-bold text-stone-950">
            Pix copia e cola
          </p>
          <p className="text-sm leading-relaxed text-stone-700">
            Toque no botão. Depois cole no app do seu banco.
          </p>
        </div>

        <Button
          type="button"
          onClick={handleCopy}
          disabled={!copyPasteData}
          className="h-12 w-full bg-[#173d34] text-base font-bold text-white hover:bg-[#0f2f28]"
        >
          {hasCopied ? (
            <CheckCircle2 className="mr-2 h-5 w-5" />
          ) : (
            <Copy className="mr-2 h-5 w-5" />
          )}
          {hasCopied ? "Código copiado" : "Copiar código Pix"}
        </Button>

        {hasCopied && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold leading-relaxed text-emerald-900">
            Pronto. Abra o app do banco e cole no Pix copia e cola.
          </div>
        )}

        {copyFailed && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-stone-900">
              Se o botão não copiar, segure o código abaixo:
            </p>
            <Input
              type="text"
              value={copyPasteData || "Código indisponível"}
              readOnly
              className="h-10 bg-white text-xs text-stone-700"
              aria-label="Código Pix copia e cola"
            />
          </div>
        )}
      </div>

      <div className="flex items-start gap-2 rounded-md border border-emerald-100 bg-emerald-50 p-3 text-left text-sm leading-relaxed text-emerald-950">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
        <span>Pagamento seguro. Depois de pagar, a confirmação aparece aqui.</span>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-stone-900">
          Também pode escanear o QR Code:
        </p>
        {qrCodeData ? (
          <div className="mx-auto inline-block rounded-md border border-stone-200 bg-white p-3">
            <QRCode value={qrCodeData} size={190} />
          </div>
        ) : (
          <div className="mx-auto flex h-[190px] w-[190px] items-center justify-center rounded-md bg-white text-sm text-stone-500">
            QR Code indisponível
          </div>
        )}
      </div>

      {expirationDate && (
        <p className="text-xs text-stone-500">
          Expira em: {formatDateSimple(expirationDate)}
        </p>
      )}

      {onCheckStatus && (
        <Button
          type="button"
          onClick={onCheckStatus}
          disabled={isCheckingStatus}
          className="h-11 w-full bg-[#173d34] text-white hover:bg-[#0f2f28]"
        >
          {isCheckingStatus ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Já paguei
        </Button>
      )}

      {statusMessage && (
        <p className="text-sm text-stone-600">{statusMessage}</p>
      )}

      <p className="text-xs text-stone-500">Não feche esta tela.</p>
    </div>
  );
}
