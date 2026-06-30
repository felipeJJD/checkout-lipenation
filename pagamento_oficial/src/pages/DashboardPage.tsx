import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  DollarSign, 
  Receipt, 
  RefreshCw, 
  TrendingUp, 
  Wallet, 
  Clock, 
  Calendar,
  MapPin,
  Building,
  Package,
  CreditCard,
  BarChart3,
  Download,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  AlertCircle,
  Users,
  LayoutDashboard
} from "lucide-react"
import { useState, useEffect, useCallback, useRef } from "react"
import axios from "axios"

// Tipos para os dados do dashboard
interface DashboardMetrics {
  totalSales: number;
  totalRevenue: number;
  totalBoletos: number;
  boletosRevenue: number;
  pendingBoletos: number;
  totalRefunds: number;
  salesByMethod: {
    credit_card: number;
    boleto: number;
    pix: number;
  };
  recentOrders: Array<{
    id: string;
    customer: string;
    amount: number;
    status: string;
    paymentMethod: string;
    date: string;
  }>;
  topProducts: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
  salesByPeriod: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
  averageTicket: number;
  uniqueCustomers: number;
  conversionRate: {
    credit_card: number;
    boleto: number;
    pix: number;
  };
  todayStats: {
    revenue: number;
    orders: number;
  };
  weekStats: {
    revenue: number;
    orders: number;
  };
  monthStats: {
    revenue: number;
    orders: number;
  };
}

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Usar useRef para controlar requisições em andamento
  const isFetchingRef = useRef(false);

  // Função para buscar dados do dashboard
  const fetchDashboardData = useCallback(async (showLoading = true) => {
    // Evitar múltiplas chamadas simultâneas
    if (isFetchingRef.current) {
      console.log('Fetch já em andamento, ignorando nova chamada');
      return;
    }
    
    try {
      isFetchingRef.current = true;
      if (showLoading) {
        setIsLoading(true);
      }
      setError(null);
      
      console.log('🔄 Buscando dados do dashboard...');
      const response = await axios.get(`${API_URL}/api/dashboard`);
      
      if (response.data.success) {
        setMetrics(response.data.data);
        setLastUpdate(new Date());
        console.log('✅ Dados do dashboard atualizados com sucesso');
      } else {
        throw new Error(response.data.error || 'Erro ao carregar dados');
      }
    } catch (err: any) {
      console.error('❌ Erro ao buscar dados do dashboard:', err);
      setError(err.response?.data?.error || err.message || 'Erro desconhecido');
    } finally {
      isFetchingRef.current = false;
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, []); // Array vazio para evitar dependências que causam loop

  // Carregar dados ao montar o componente e configurar auto-refresh
  useEffect(() => {
    fetchDashboardData();
    // Atualizar título da página
    document.title = 'DS HUB - Dashboard';
    
    // Auto-refresh a cada 60 segundos (1 minuto) - sem mostrar loading
    const intervalId = setInterval(() => {
      fetchDashboardData(false);
    }, 60000); // 60000ms = 1 minuto
    
    // Cleanup: limpar interval quando componente for desmontado
    return () => {
      clearInterval(intervalId);
    };
  }, [fetchDashboardData]);

  // Função para formatar valores em reais
  const formatCurrency = (value: number) => {
    return (value / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  // Função para formatar data
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Função para gerar e baixar relatório CSV
  const downloadReport = () => {
    if (!metrics) return;

    const currentDate = new Date().toLocaleString('pt-BR');
    
    // Criar dados do CSV
    const csvData = [
      ['RELATÓRIO DE VENDAS'],
      ['Gerado em:', currentDate],
      [''],
      ['=== RESUMO GERAL ==='],
      ['Total de Vendas:', metrics.totalSales],
      ['Receita Total:', formatCurrency(metrics.totalRevenue)],
      ['Ticket Médio:', formatCurrency(metrics.averageTicket)],
      ['Clientes Únicos:', metrics.uniqueCustomers],
      [''],
      ['=== VENDAS POR MÉTODO ==='],
      ['Cartão de Crédito:', formatCurrency(metrics.salesByMethod.credit_card)],
      ['PIX:', formatCurrency(metrics.salesByMethod.pix)],
      ['Boleto (Pago):', formatCurrency(metrics.boletosRevenue)],
      ['Boleto (Pendente):', formatCurrency(metrics.pendingBoletos)],
      [''],
      ['=== PERFORMANCE POR PERÍODO ==='],
      ['Hoje - Receita:', formatCurrency(metrics.todayStats.revenue)],
      ['Hoje - Pedidos:', metrics.todayStats.orders],
      ['Esta Semana - Receita:', formatCurrency(metrics.weekStats.revenue)],
      ['Esta Semana - Pedidos:', metrics.weekStats.orders],
      ['Este Mês - Receita:', formatCurrency(metrics.monthStats.revenue)],
      ['Este Mês - Pedidos:', metrics.monthStats.orders],
      [''],
      ['=== VENDAS POR DIA ==='],
      ['Data', 'Receita', 'Pedidos']
    ];

    // Adicionar dados de vendas por período
    metrics.salesByPeriod.forEach(day => {
      csvData.push([
        formatDate(day.date),
        formatCurrency(day.revenue),
        day.orders.toString()
      ]);
    });

    csvData.push(['']);
    csvData.push(['=== PRODUTOS MAIS VENDIDOS ===']);
    csvData.push(['Posição', 'Produto', 'Quantidade', 'Receita']);

    // Adicionar produtos mais vendidos
    metrics.topProducts.forEach((product, index) => {
      csvData.push([
        `#${index + 1}`,
        product.name,
        product.quantity.toString(),
        formatCurrency(product.revenue)
      ]);
    });

    csvData.push(['']);
    csvData.push(['=== VENDAS RECENTES ===']);
    csvData.push(['Cliente', 'Valor', 'Método', 'Data']);

    // Adicionar vendas recentes
    metrics.recentOrders.forEach(order => {
      csvData.push([
        order.customer,
        formatCurrency(order.amount),
        order.paymentMethod.replace('_', ' '),
        formatDate(order.date)
      ]);
    });

    // Converter para CSV
    const csvContent = csvData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    // Criar e baixar arquivo
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio-vendas-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Se está carregando
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-red-950 p-6">
        <div className="backdrop-blur-lg bg-white/10 rounded-3xl border border-white/20 shadow-2xl p-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="relative">
                <Loader2 className="h-12 w-12 animate-spin mx-auto mb-6 text-white" />
                <div className="absolute inset-0 h-12 w-12 mx-auto animate-ping rounded-full bg-white/20"></div>
              </div>
              <p className="text-white/80 text-lg font-medium">Carregando sua dashboard...</p>
              <div className="mt-4 flex justify-center space-x-1">
                <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Se há erro
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-orange-800 p-6">
        <div className="backdrop-blur-lg bg-white/10 rounded-3xl border border-white/20 shadow-2xl p-8 max-w-md mx-auto mt-32">
          <div className="text-center">
            <div className="relative mb-6">
              <AlertCircle className="h-16 w-16 text-red-300 mx-auto" />
              <div className="absolute inset-0 h-16 w-16 mx-auto animate-pulse rounded-full bg-red-400/20"></div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Ops! Algo deu errado</h3>
            <p className="text-red-200 mb-6 leading-relaxed">{error}</p>
            <Button 
              onClick={() => fetchDashboardData(true)} 
              className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 border-0 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar novamente
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Se não há dados
  if (!metrics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-slate-800 p-6">
        <div className="backdrop-blur-lg bg-white/10 rounded-3xl border border-white/20 shadow-2xl p-8 max-w-md mx-auto mt-32">
          <div className="text-center">
            <Package className="h-16 w-16 mx-auto mb-6 text-gray-300" />
            <h3 className="text-xl font-bold text-white mb-2">Nenhum dado encontrado</h3>
            <p className="text-gray-300">Comece vendendo para ver suas métricas aqui!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-red-950 p-6">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header com Glassmorphism */}
        <div className="backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20 shadow-2xl p-8">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-r from-blue-500 to-red-500 rounded-2xl">
                  <LayoutDashboard className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-black bg-gradient-to-r from-white via-blue-200 to-red-200 bg-clip-text text-transparent">
                    Dashboard
                  </h1>
                  <p className="text-white/70 text-lg font-medium">
                    Visão completa do seu negócio
                                         {lastUpdate && (
                       <span className="ml-3 px-3 py-1 bg-green-500/20 text-green-300 text-sm rounded-full border border-green-500/30">
                         🔄 Atualizado às {lastUpdate.toLocaleTimeString('pt-BR')} • Auto-refresh: 1min
                       </span>
                     )}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
                             <Button 
                 variant="outline" 
                 size="lg"
                 onClick={() => fetchDashboardData(true)}
                 disabled={isLoading}
                 className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-lg font-semibold px-6 py-3 rounded-xl"
               >
                <RefreshCw className={`h-5 w-5 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              <Button 
                size="lg"
                onClick={downloadReport}
                className="bg-gradient-to-r from-blue-600 to-red-600 hover:from-blue-700 hover:to-red-700 border-0 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Download className="h-5 w-5 mr-2" />
                Relatórios
              </Button>
            </div>
          </div>
        </div>

        {/* Cards Principais com Gradientes Únicos */}
        <div className="grid gap-6 md:grid-cols-3">
          
                     {/* Card Vendas - Gradiente Verde Esmeralda */}
           <div className="group">
             <Card className="bg-gradient-to-br from-emerald-400 via-green-500 to-teal-600 border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105 rounded-2xl overflow-hidden">
               <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
                <div>
                  <CardTitle className="text-white/90 text-sm font-bold uppercase tracking-wider">Vendas Totais</CardTitle>
                  <p className="text-white/70 text-xs">Receita acumulada</p>
                </div>
                <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-lg border border-white/30">
                  <DollarSign className="h-8 w-8 text-white" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-black text-white">
                    {formatCurrency(metrics.totalRevenue)}
                  </div>
                </div>
                <div className="flex items-center text-white/80 mt-2">
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                  <span className="font-semibold">{metrics.totalSales} vendas realizadas</span>
                </div>
              </CardContent>
            </Card>
          </div>

                     {/* Card Boletos - Gradiente Laranja Fogo */}
           <div className="group">
             <Card className="bg-gradient-to-br from-orange-400 via-red-500 to-pink-600 border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105 rounded-2xl overflow-hidden">
               <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
                <div>
                  <CardTitle className="text-white/90 text-sm font-bold uppercase tracking-wider">Boletos</CardTitle>
                  <p className="text-white/70 text-xs">Pagamento tradicional</p>
                </div>
                <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-lg border border-white/30">
                  <Receipt className="h-8 w-8 text-white" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-black text-white">
                    {formatCurrency(metrics.boletosRevenue)}
                  </div>
                  <Clock className="h-6 w-6 text-yellow-300 animate-spin" style={{animationDuration: '3s'}} />
                </div>
                <div className="flex items-center text-white/80 mt-2">
                  <Clock className="h-4 w-4 mr-1" />
                  <span className="font-semibold">Pendente: {formatCurrency(metrics.pendingBoletos)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

                     {/* Card PIX - Gradiente Roxo Mágico */}
           <div className="group">
             <Card className="bg-gradient-to-br from-purple-400 via-violet-500 to-indigo-600 border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105 rounded-2xl overflow-hidden">
               <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
                <div>
                  <CardTitle className="text-white/90 text-sm font-bold uppercase tracking-wider">PIX Instantâneo</CardTitle>
                  <p className="text-white/70 text-xs">Pagamento à vista</p>
                </div>
                <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-lg border border-white/30">
                  <CreditCard className="h-8 w-8 text-white" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-black text-white">
                    {formatCurrency(metrics.salesByMethod.pix)}
                  </div>
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                </div>
                <div className="flex items-center text-white/80 mt-2">
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                  <span className="font-semibold">Transferência instantânea</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Seção Principal - Gráfico e Vendas Recentes */}
        <div className="grid gap-6 lg:grid-cols-5">
          
          {/* Card Gráfico */}
          <div className="lg:col-span-3">
            <Card className="backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-500 rounded-3xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-r from-blue-400 to-purple-500 rounded-xl">
                      <BarChart3 className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-white text-xl font-bold">Vendas por Período</CardTitle>
                      <CardDescription className="text-white/70">Últimos {metrics.salesByPeriod.length} dias de atividade</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {metrics.salesByPeriod.length > 0 ? (
                  <div className="space-y-4">
                    {metrics.salesByPeriod.map((day, index) => (
                      <div key={day.date} className="group">
                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-white/10 to-white/5 rounded-2xl border border-white/10 hover:bg-white/20 transition-all duration-300">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-r from-blue-400 to-purple-500 rounded-xl">
                              <Calendar className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <span className="text-white font-semibold text-lg">{formatDate(day.date)}</span>
                              <p className="text-white/70 text-sm">{day.orders} {day.orders === 1 ? 'pedido' : 'pedidos'}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-white">
                              {formatCurrency(day.revenue)}
                            </p>
                            <div className="flex items-center gap-1 justify-end mt-1">
                              <TrendingUp className="h-4 w-4 text-green-400" />
                              <span className="text-green-400 text-sm font-medium">+{((day.revenue / metrics.totalRevenue) * 100).toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-80 flex flex-col items-center justify-center">
                    <div className="relative">
                      <TrendingUp className="h-20 w-20 text-white/30 mb-6" />
                      <div className="absolute inset-0 animate-ping h-20 w-20 rounded-full bg-white/10"></div>
                    </div>
                    <h3 className="text-white font-bold text-xl mb-2">Nenhuma venda ainda</h3>
                    <p className="text-white/70 text-center max-w-md">Seus dados de vendas aparecerão aqui após as primeiras transações.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

                     {/* Card Vendas Recentes */}
           <div className="lg:col-span-2">
           <Card className="backdrop-blur-xl bg-gradient-to-br from-pink-600/30 to-purple-700/30 border border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-500 rounded-3xl overflow-hidden h-full">
               <CardHeader className="bg-gradient-to-r from-pink-600/30 to-purple-600/30 border-b border-white/20">
                 <div className="flex items-center gap-3">
                   <div className="p-3 bg-gradient-to-r from-pink-400 to-purple-500 rounded-xl">
                     <Users className="h-6 w-6 text-white" />
                   </div>
                   <div>
                     <CardTitle className="text-white text-xl font-bold">Vendas Recentes</CardTitle>
                     <CardDescription className="text-white/80">Últimas transações</CardDescription>
                   </div>
                 </div>
               </CardHeader>
               <CardContent className="p-6 space-y-4">
                 {metrics.recentOrders.length > 0 ? (
                   metrics.recentOrders.slice(0, 5).map((order, index) => (
                     <div key={order.id} className="group">
                       <div className="flex items-center justify-between p-4 bg-gradient-to-r from-white/20 to-purple-500/20 rounded-2xl border border-white/20 hover:from-white/30 hover:to-purple-500/30 transition-all duration-300 backdrop-blur-sm">
                         <div className="flex items-center gap-3">
                           <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg"></div>
                           <div>
                             <p className="text-white font-bold truncate max-w-[120px] text-sm">
                               {order.customer}
                             </p>
                             <p className="text-white/80 text-xs">
                               {formatDate(order.date)}
                             </p>
                           </div>
                         </div>
                         <div className="text-right">
                           <p className="text-white font-bold text-sm">
                             {formatCurrency(order.amount)}
                           </p>
                           <p className="text-white/90 text-xs capitalize bg-gradient-to-r from-purple-500/40 to-pink-500/40 px-3 py-1 rounded-full border border-white/20 backdrop-blur-sm">
                             {order.paymentMethod.replace('_', ' ')}
                           </p>
                         </div>
                       </div>
                     </div>
                   ))
                 ) : (
                   <div className="flex flex-col items-center justify-center h-64">
                     <Users className="h-16 w-16 text-white/40 mb-4" />
                     <h3 className="text-white font-bold text-lg mb-2">Aguardando vendas</h3>
                     <p className="text-white/80 text-center">Suas vendas aparecerão aqui em tempo real</p>
                   </div>
                 )}
               </CardContent>
             </Card>
           </div>
        </div>

        {/* Cards de Métricas com Design Ultra-Moderno */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          
                     {/* Ticket Médio */}
           <Card className="bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105 rounded-2xl overflow-hidden group">
             <CardContent className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-lg">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-white/90 text-sm font-bold uppercase tracking-wider">Ticket Médio</h3>
                <div className="text-3xl font-black text-white">
                  {formatCurrency(metrics.averageTicket)}
                </div>
                <p className="text-white/70 text-xs">Valor médio por venda</p>
              </div>
            </CardContent>
          </Card>

                     {/* Método Preferido */}
           <Card className="bg-gradient-to-br from-blue-500 via-violet-500 to-red-600 border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105 rounded-2xl overflow-hidden group">
             <CardContent className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-lg">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-white/90 text-sm font-bold uppercase tracking-wider">Método Preferido</h3>
                <div className="text-2xl font-black text-white">
                  {(() => {
                    const rates = metrics.conversionRate;
                    const maxRate = Math.max(rates.credit_card, rates.boleto, rates.pix);
                    if (maxRate === 0) return 'Nenhum';
                    
                    const methodNames = {
                      credit_card: 'Cartão',
                      boleto: 'Boleto', 
                      pix: 'PIX'
                    };
                    
                    const preferredMethod = Object.entries(rates).find(([_, rate]) => rate === maxRate)?.[0] as keyof typeof methodNames;
                    return methodNames[preferredMethod] || 'N/A';
                  })()}
                </div>
                <p className="text-white/70 text-xs">
                  {(() => {
                    const rates = metrics.conversionRate;
                    const maxRate = Math.max(rates.credit_card, rates.boleto, rates.pix);
                    return `${maxRate}% das transações`;
                  })()}
                </p>
              </div>
            </CardContent>
          </Card>
          
                     {/* Clientes Únicos */}
           <Card className="bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105 rounded-2xl overflow-hidden group">
             <CardContent className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-lg">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-yellow-300 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                  <div className="w-2 h-2 bg-yellow-300 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                  <div className="w-2 h-2 bg-yellow-300 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-white/90 text-sm font-bold uppercase tracking-wider">Clientes Únicos</h3>
                <div className="text-3xl font-black text-white">
                  {metrics.uniqueCustomers}
                </div>
                <p className="text-white/70 text-xs">Clientes diferentes</p>
              </div>
            </CardContent>
          </Card>

                     {/* Hoje */}
           <Card className="bg-gradient-to-br from-rose-400 via-pink-500 to-purple-600 border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105 rounded-2xl overflow-hidden group">
             <CardContent className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-lg">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              </div>
              <div className="space-y-2">
                <h3 className="text-white/90 text-sm font-bold uppercase tracking-wider">Hoje</h3>
                <div className="text-3xl font-black text-white">
                  {formatCurrency(metrics.todayStats.revenue)}
                </div>
                <p className="text-white/70 text-xs">
                  {metrics.todayStats.orders} {metrics.todayStats.orders === 1 ? 'pedido' : 'pedidos'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20 shadow-2xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-white/80">
                <Clock className="h-4 w-4" />
                <span>Última atualização: {lastUpdate?.toLocaleString('pt-BR') || 'Nunca'}</span>
              </div>
              <div className="flex items-center gap-2 text-green-400 font-semibold">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span>Sistema Online</span>
              </div>
            </div>
            <div className="flex items-center gap-6 text-white/80">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-400" />
                <span>Total de vendas:</span>
                <span className="font-bold text-green-400 text-lg">{metrics.totalSales}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-400" />
                <span>Clientes:</span>
                <span className="font-bold text-blue-400 text-lg">{metrics.uniqueCustomers}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}