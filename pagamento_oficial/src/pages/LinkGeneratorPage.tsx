import { useEffect, useMemo, useState } from 'react';
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
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { CHECKOUT_OFFER } from '@/config/checkout';

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function LinkGeneratorPage() {
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    document.title = 'Casa Leonora - Links';
  }, []);

  const links = useMemo(() => {
    const origin = window.location.origin;
    const official = `${origin}/checkout?oferta=${CHECKOUT_OFFER.id}`;

    return {
      official,
      pixPreview: `${official}&preview=pix`,
      successPreview: `${official}&preview=success&method=pix`,
    };
  }, []);

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

  return (
    <div className="min-h-screen bg-[#f4efe7] px-4 py-5 md:px-8 md:py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <section className="rounded-lg border border-[#dfd4c5] bg-[#fffdf8] p-5 shadow-[0_18px_55px_rgba(40,32,22,0.12)] md:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d9c7a3] bg-[#fbf1dc] px-3 py-1 text-xs font-semibold text-stone-800">
                <ShieldCheck className="h-3.5 w-3.5" />
                Link oficial da Leonora
              </div>
              <div>
                <h1 className="text-2xl font-bold leading-tight text-stone-950 md:text-4xl">
                  Gerador do checkout Leonora
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-700 md:text-base">
                  Use esse link no final do pitch. O valor fica travado pela oferta, sem aparecer como
                  <span className="font-semibold"> amount </span>
                  na URL.
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-[#173d34] p-4 text-white md:min-w-64">
              <p className="text-sm font-semibold text-emerald-100">Valor da oferta</p>
              <p className="mt-1 text-3xl font-bold">{formatCurrency(CHECKOUT_OFFER.baseAmount)}</p>
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
                  <CardTitle className="text-xl text-stone-950">Link para enviar ao lead</CardTitle>
                  <CardDescription>
                    Link limpo, direto para pagamento por Pix ou cartao.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 p-5">
              <div className="space-y-2">
                <Label htmlFor="official-link">Checkout oficial</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="official-link"
                    readOnly
                    value={links.official}
                    className="h-12 border-[#dfd4c5] bg-[#fffdf8] font-mono text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2 sm:flex">
                    <Button
                      type="button"
                      onClick={() => copyLink('official', links.official)}
                      className="h-12 bg-[#173d34] px-4 text-white hover:bg-[#0f2f28]"
                    >
                      {copiedLabel === 'official' ? (
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                      ) : (
                        <Copy className="mr-2 h-4 w-4" />
                      )}
                      Copiar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => openLink(links.official)}
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
                  Mais seguro que amount na URL
                </div>
                <p>
                  O cliente ve apenas a oferta. O backend tambem valida essa oferta e nao depende do
                  valor enviado pelo navegador.
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
                  <CardDescription>Para conferir as telas sem fazer compra real.</CardDescription>
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
