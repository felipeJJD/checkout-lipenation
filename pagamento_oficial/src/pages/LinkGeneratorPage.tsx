import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Link as LinkIcon,
  Loader2,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { CHECKOUT_OFFER } from '@/config/checkout';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const normalizeAmount = (value: string): number => {
  const compact = value.trim().replace(/\s/g, '');
  const normalized = compact.includes(',')
    ? compact.replace(/\./g, '').replace(',', '.')
    : compact;
  const amount = Number.parseFloat(normalized);
  return Number.isFinite(amount) ? amount : 0;
};

export function LinkGeneratorPage() {
  const [amountInput, setAmountInput] = useState('130,00');
  const [generatedLink, setGeneratedLink] = useState('');
  const [generatedAmount, setGeneratedAmount] = useState(CHECKOUT_OFFER.baseAmount);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    document.title = 'Casa Leonora - Links';
  }, []);

  const links = useMemo(() => {
    const origin = window.location.origin;
    const official = `${origin}/checkout?oferta=${CHECKOUT_OFFER.id}`;
    const active = generatedLink || official;

    return {
      official,
      active,
      pixPreview: `${active}&preview=pix`,
      successPreview: `${active}&preview=success&method=pix`,
    };
  }, [generatedLink]);

  const copyLink = async (label: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLabel(label);
      toast({
        title: 'Link copiado',
        description: 'Agora e so enviar para o lead.',
      });
    } catch {
      toast({
        title: 'Nao foi possivel copiar',
        description: 'Selecione o link e copie manualmente.',
        variant: 'destructive',
      });
    }
  };

  const openLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const generateCustomLink = async () => {
    const amount = normalizeAmount(amountInput);

    if (amount < 1) {
      toast({
        title: 'Valor invalido',
        description: 'Use um valor de pelo menos R$ 1,00.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    setCopiedLabel(null);

    try {
      const response = await axios.post(`${API_URL}/api/checkout/link`, {
        amount,
        productName: CHECKOUT_OFFER.productName,
      });

      const token = response.data?.data?.token;
      if (!response.data?.success || !token) {
        throw new Error(response.data?.error || 'Falha ao gerar link.');
      }

      const checkoutUrl = `${window.location.origin}/checkout?p=${token}`;
      setGeneratedLink(checkoutUrl);
      setGeneratedAmount(amount);

      toast({
        title: 'Link personalizado gerado',
        description: `Valor travado em ${formatCurrency(amount)}.`,
      });
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error || 'Nao foi possivel gerar o link agora.'
        : 'Nao foi possivel gerar o link agora.';

      toast({
        title: 'Erro ao gerar link',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const useDefaultLink = () => {
    setAmountInput('130,00');
    setGeneratedLink('');
    setGeneratedAmount(CHECKOUT_OFFER.baseAmount);
    setCopiedLabel(null);
  };

  return (
    <div className="min-h-screen bg-[#f4efe7] px-4 py-5 md:px-8 md:py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <section className="rounded-lg border border-[#dfd4c5] bg-[#fffdf8] p-5 shadow-[0_18px_55px_rgba(40,32,22,0.12)] md:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d9c7a3] bg-[#fbf1dc] px-3 py-1 text-xs font-semibold text-stone-800">
                <ShieldCheck className="h-3.5 w-3.5" />
                Link seguro da Leonora
              </div>
              <div>
                <h1 className="text-2xl font-bold leading-tight text-stone-950 md:text-4xl">
                  Gerador do checkout Leonora
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-700 md:text-base">
                  Escolha o valor e gere um link sem <span className="font-semibold">amount</span> aberto na URL.
                  O valor fica assinado no backend.
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-[#173d34] p-4 text-white md:min-w-64">
              <p className="text-sm font-semibold text-emerald-100">Valor ativo</p>
              <p className="mt-1 text-3xl font-bold">{formatCurrency(generatedAmount)}</p>
              <p className="mt-1 text-sm text-emerald-100">materiais do ritual</p>
            </div>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
          <Card className="rounded-lg border-[#dfd4c5] bg-white shadow-sm">
            <CardHeader className="border-b border-[#eadfce]">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-[#173d34] text-white">
                  <LinkIcon className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-xl text-stone-950">Criar link de pagamento</CardTitle>
                  <CardDescription>
                    Use R$ 130,00 ou gere um link com qualquer valor combinado.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 p-5">
              <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)] md:items-end">
                <div className="space-y-2">
                  <Label htmlFor="amount">Valor do checkout</Label>
                  <Input
                    id="amount"
                    inputMode="decimal"
                    value={amountInput}
                    onChange={(event) => setAmountInput(event.target.value)}
                    className="h-12 border-[#dfd4c5] bg-[#fffdf8] text-lg font-semibold"
                    placeholder="130,00"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    onClick={generateCustomLink}
                    disabled={isGenerating}
                    className="h-12 bg-[#173d34] px-4 text-white hover:bg-[#0f2f28]"
                  >
                    {isGenerating ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    Gerar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={useDefaultLink}
                    className="h-12 border-[#cdbf9f] text-stone-800"
                  >
                    Usar R$ 130
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="official-link">Link para enviar ao lead</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="official-link"
                    readOnly
                    value={links.active}
                    className="h-12 border-[#dfd4c5] bg-[#fffdf8] font-mono text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2 sm:flex">
                    <Button
                      type="button"
                      onClick={() => copyLink('active', links.active)}
                      className="h-12 bg-[#173d34] px-4 text-white hover:bg-[#0f2f28]"
                    >
                      {copiedLabel === 'active' ? (
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                      ) : (
                        <Copy className="mr-2 h-4 w-4" />
                      )}
                      Copiar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => openLink(links.active)}
                      className="h-12 border-[#cdbf9f] text-stone-800"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Abrir
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm leading-relaxed text-emerald-950">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  <ShieldCheck className="h-4 w-4" />
                  Flexivel, mas sem valor editavel
                </div>
                <p>
                  O link personalizado sai com <span className="font-mono">p=...</span>.
                  Se alguem tentar alterar o codigo curto, o backend recusa o pagamento.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border-[#dfd4c5] bg-[#fffdf8] shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-[#fbf1dc] text-[#173d34]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg text-stone-950">Testes rapidos</CardTitle>
                  <CardDescription>Os previews usam o link ativo acima.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => openLink(links.pixPreview)}
                className="h-11 w-full justify-start border-[#d8c8a8] bg-white text-stone-800"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Preview Pix gerado
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => openLink(links.successPreview)}
                className="h-11 w-full justify-start border-[#d8c8a8] bg-white text-stone-800"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Preview obrigado
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
