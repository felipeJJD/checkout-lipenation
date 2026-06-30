import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Copy,
  Link as LinkIcon,
  DollarSign,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  QrCode,
  Info
} from 'lucide-react';

export function LinkGeneratorPage() {
  const [amountInput, setAmountInput] = useState<string>('');
  const [generatedLink, setGeneratedLink] = useState<string>('');
  const [error, setError] = useState<string>('');
  const { toast } = useToast();

  // Atualizar título da página
  useEffect(() => {
    document.title = 'DS HUB - Gerar Links';
  }, []);

  const handleGenerateLink = () => {
    setError('');
    setGeneratedLink('');
    const amount = parseFloat(amountInput.replace(',', '.')); // Aceitar vírgula ou ponto

    if (isNaN(amount) || amount <= 0) {
      setError('Por favor, insira um valor numérico positivo.');
      return;
    }

    // Formata para garantir duas casas decimais (ex: 35 -> 35.00)
    const formattedAmount = amount.toFixed(2);
    const checkoutUrl = `${window.location.origin}/checkout?amount=${formattedAmount}`;
    setGeneratedLink(checkoutUrl);
  };

  const handleCopyLink = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink)
      .then(() => {
        toast({
          title: "Link Copiado! ✨",
          description: "Link de pagamento copiado para a área de transferência.",
        });
      })
      .catch(err => {
        console.error('Erro ao copiar link:', err);
        toast({
          title: "Erro ao Copiar",
          description: "Não foi possível copiar o link.",
          variant: "destructive",
        });
      });
  };

  const handleOpenPreview = () => {
    if (generatedLink) {
      window.open(generatedLink, '_blank');
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Premium */}
        <div className="backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20 shadow-2xl p-8">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-r from-blue-500 to-red-500 rounded-2xl shadow-lg">
              <LinkIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black bg-gradient-to-r from-white via-blue-200 to-red-200 bg-clip-text text-transparent">
                Gerador de Links
              </h1>
              <p className="text-white/70 text-lg font-medium">
                Crie links de pagamento personalizados em segundos
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          
          {/* Card de Criação de Link */}
          <Card className="backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-500 rounded-3xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-500/20 to-blue-700/20 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-700 rounded-xl shadow-lg">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-white text-xl font-bold">Criar Novo Link</CardTitle>
                  <CardDescription className="text-white/70">
                    Insira o valor desejado para gerar um link de checkout personalizado
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-3">
                <Label htmlFor="amount" className="text-white font-semibold flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Valor do Pagamento (R$)
                </Label>
                <div className="relative">
                  <Input 
                    id="amount"
                    type="text"
                    placeholder="Ex: 35,00" 
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className={`bg-white/10 border-white/20 text-white placeholder:text-white/50 text-lg font-semibold h-12 ${
                      error ? 'border-red-400 bg-red-500/10' : 'focus:border-blue-400'
                    }`}
                  />
                  {amountInput && !error && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    </div>
                  )}
                  {error && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <AlertCircle className="w-5 h-5 text-red-400" />
                    </div>
                  )}
                </div>
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-400/20 rounded-xl">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <p className="text-red-300 text-sm font-medium">{error}</p>
                  </div>
                )}
              </div>

              <Button 
                onClick={handleGenerateLink}
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-red-600 hover:from-blue-700 hover:to-red-700 border-0 text-white font-semibold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                disabled={!amountInput || !!error}
              >
                <LinkIcon className="w-5 h-5 mr-2" />
                Gerar Link
              </Button>
            </CardContent>
          </Card>

          {/* Card do Link Gerado */}
          <Card className="backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-500 rounded-3xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-red-500/20 to-red-700/20 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-r from-red-500 to-red-700 rounded-xl shadow-lg">
                  <QrCode className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-white text-xl font-bold">Seu Link Gerado</CardTitle>
                  <CardDescription className="text-white/70">
                    Compartilhe ou teste seu link de pagamento
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {generatedLink ? (
                <div className="space-y-4">
                  {/* Link Display */}
                  <div className="space-y-2">
                    <Label className="text-white font-semibold">Link de Pagamento:</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="text" 
                        readOnly 
                        value={generatedLink} 
                        className="flex-grow bg-white/10 border-white/20 text-white text-sm font-mono"
                      />
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={handleCopyLink} 
                        title="Copiar Link"
                        className="bg-white/10 border-white/20 text-white hover:bg-white/20 h-10 w-10"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Valor Formatado */}
                  <div className="backdrop-blur-lg bg-white/5 rounded-2xl border border-white/10 p-4">
                    <div className="text-center">
                      <p className="text-white/70 text-sm mb-1">Valor do Pagamento</p>
                      <p className="text-3xl font-black text-white">
                        {parseFloat(amountInput.replace(',', '.')).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      onClick={handleCopyLink}
                      className="bg-gradient-to-r from-blue-600 to-red-600 hover:from-blue-700 hover:to-red-700 border-0 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copiar
                    </Button>
                    <Button 
                      onClick={handleOpenPreview}
                      variant="outline"
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20 font-semibold rounded-xl"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Testar
                    </Button>
                  </div>

                  {/* Success Message */}
                  <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-400/20 rounded-xl">
                    <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <p className="text-emerald-300 text-sm font-medium">
                      Link gerado com sucesso! Pronto para compartilhar.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64">
                  <div className="relative mb-6">
                    <LinkIcon className="h-16 w-16 text-white/30" />
                    <div className="absolute inset-0 animate-ping h-16 w-16 rounded-full bg-white/10"></div>
                  </div>
                  <h3 className="text-white font-bold text-lg mb-2">Aguardando Valor</h3>
                  <p className="text-white/70 text-center max-w-sm">
                    Insira um valor no formulário ao lado para gerar seu link de pagamento personalizado.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Instruções */}
        <Card className="backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl rounded-3xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-500/20 to-red-500/20 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-red-500 rounded-xl shadow-lg">
                <Info className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-white text-xl font-bold">Como Usar</CardTitle>
                <CardDescription className="text-white/70">
                  Dicas para aproveitar ao máximo seus links de pagamento
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-700 rounded-xl mx-auto mb-3 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">1</span>
                </div>
                <h4 className="text-white font-semibold mb-2">Defina o Valor</h4>
                <p className="text-white/70 text-sm">Insira o valor exato que deseja receber</p>
              </div>
              <div className="text-center p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="w-12 h-12 bg-gradient-to-r from-violet-500 to-violet-700 rounded-xl mx-auto mb-3 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">2</span>
                </div>
                <h4 className="text-white font-semibold mb-2">Gere o Link</h4>
                <p className="text-white/70 text-sm">Clique em "Gerar Link" para criar sua URL</p>
              </div>
              <div className="text-center p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-700 rounded-xl mx-auto mb-3 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">3</span>
                </div>
                <h4 className="text-white font-semibold mb-2">Compartilhe</h4>
                <p className="text-white/70 text-sm">Copie e envie para seus clientes</p>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}