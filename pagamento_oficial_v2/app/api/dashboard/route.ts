import { NextResponse } from 'next/server';

// Tipos para a resposta da API Pagar.me
interface PagarMeOrder {
  id: string;
  code: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'canceled';
  created_at: string;
  updated_at: string;
  items: Array<{
    id: string;
    description: string;
    amount: number;
    quantity: number;
  }>;
  customer: {
    id: string;
    name: string;
    email: string;
  };
  charges: Array<{
    id: string;
    amount: number;
    status: string;
    payment_method: 'credit_card' | 'boleto' | 'pix';
    paid_amount?: number;
    paid_at?: string;
    created_at: string;
  }>;
}

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

const API_KEY = process.env.PAGARME_API_KEY;
const isApiKeyValid = !!API_KEY && API_KEY.startsWith('sk_') && API_KEY.length > 20;
const API_BASE_URL = 'https://api.pagar.me/core/v5';

const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL_ALLOWED,
  'https://gosafepay.com.br',
  'https://checkout-frontend-production-0626.up.railway.app',
].filter(Boolean) as string[];

const isAllowedOrigin = (origin: string | null): boolean => {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes('*')) return true;
  return ALLOWED_ORIGINS.some((allowed) => origin.includes(allowed));
};

function getCorsHeaders(requestOrigin: string | null) {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Access-Control-Allow-Origin': '',
  };
  if (requestOrigin && (ALLOWED_ORIGINS.includes('*') || isAllowedOrigin(requestOrigin))) {
    headers['Access-Control-Allow-Origin'] = requestOrigin;
  } else if (ALLOWED_ORIGINS.includes('*') && !requestOrigin) {
    headers['Access-Control-Allow-Origin'] = '*';
  }
  return headers;
}

export async function OPTIONS(request: Request) {
  const requestOrigin = request.headers.get('origin');
  const currentCorsHeaders = getCorsHeaders(requestOrigin);
  if (currentCorsHeaders['Access-Control-Allow-Origin']) {
    return new NextResponse(null, { status: 200, headers: currentCorsHeaders });
  }
  return new NextResponse(null, { status: 204 });
}

async function fetchOrdersFromPagarme(page: number = 1, size: number = 100): Promise<PagarMeOrder[]> {
  try {
    console.log('Buscando pedidos da Pagar.me...');
    
    const response = await fetch(`${API_BASE_URL}/orders?page=${page}&size=${size}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from((API_KEY ?? '') + ':').toString('base64')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Erro na resposta da API Pagar.me:', response.status, response.statusText);
      throw new Error(`API Pagar.me retornou status ${response.status}`);
    }

    const data = await response.json();
    console.log('Dados recebidos da Pagar.me:', data.data?.length || 0, 'pedidos');
    
    return data.data || [];
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    throw error;
  }
}

function calculateMetrics(orders: PagarMeOrder[]): DashboardMetrics {
  console.log('Calculando métricas para', orders.length, 'pedidos');
  
  let totalRevenue = 0;
  let totalSales = 0;
  let boletosRevenue = 0;
  let pendingBoletos = 0;
  let totalRefunds = 0;
  
  const salesByMethod = {
    credit_card: 0,
    boleto: 0,
    pix: 0,
  };
  
  const salesCountByMethod = {
    credit_card: 0,
    boleto: 0,
    pix: 0,
  };
  
  const productMap = new Map<string, { quantity: number; revenue: number }>();
  const dailySales = new Map<string, { revenue: number; orders: number }>();
  const uniqueCustomers = new Set<string>();
  
  const recentOrders: DashboardMetrics['recentOrders'] = [];
  
  // Datas para comparação
  const today = new Date().toISOString().split('T')[0];
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  let todayStats = { revenue: 0, orders: 0 };
  let weekStats = { revenue: 0, orders: 0 };
  let monthStats = { revenue: 0, orders: 0 };

  orders.forEach(order => {
    const orderDate = new Date(order.created_at).toISOString().split('T')[0];
    
    // Adicionar cliente único
    uniqueCustomers.add(order.customer.email);
    
    // Apenas pedidos pagos contam para receita
    if (order.status === 'paid') {
      totalRevenue += order.amount;
      totalSales++;
      
      // Stats por período
      if (orderDate === today) {
        todayStats.revenue += order.amount;
        todayStats.orders++;
      }
      if (orderDate >= oneWeekAgo) {
        weekStats.revenue += order.amount;
        weekStats.orders++;
      }
      if (orderDate >= oneMonthAgo) {
        monthStats.revenue += order.amount;
        monthStats.orders++;
      }
      
      // Agrupar vendas por dia
      if (!dailySales.has(orderDate)) {
        dailySales.set(orderDate, { revenue: 0, orders: 0 });
      }
      const dayData = dailySales.get(orderDate)!;
      dayData.revenue += order.amount;
      dayData.orders++;
    }
    
    // Processar charges para obter método de pagamento
    order.charges.forEach(charge => {
      if (charge.payment_method in salesByMethod) {
        // Contar transações por método
        salesCountByMethod[charge.payment_method as keyof typeof salesCountByMethod]++;
        
        if (charge.status === 'paid') {
          salesByMethod[charge.payment_method as keyof typeof salesByMethod] += charge.paid_amount || charge.amount;
        }
        
        // Contar boletos pendentes
        if (charge.payment_method === 'boleto') {
          if (charge.status === 'paid') {
            boletosRevenue += charge.paid_amount || charge.amount;
          } else if (charge.status === 'pending') {
            pendingBoletos += charge.amount;
          }
        }
      }
    });
    
    // Processar produtos
    order.items.forEach(item => {
      const productName = item.description;
      if (!productMap.has(productName)) {
        productMap.set(productName, { quantity: 0, revenue: 0 });
      }
      const product = productMap.get(productName)!;
      product.quantity += item.quantity;
      if (order.status === 'paid') {
        product.revenue += item.amount * item.quantity;
      }
    });
    
    // Adicionar aos pedidos recentes (últimos 10)
    if (recentOrders.length < 10) {
      const primaryCharge = order.charges[0];
      recentOrders.push({
        id: order.id,
        customer: order.customer.name,
        amount: order.amount,
        status: order.status,
        paymentMethod: primaryCharge?.payment_method || 'unknown',
        date: order.created_at,
      });
    }
  });
  
  // Calcular taxa de conversão por método (% de vendas pagas)
  const totalTransactions = salesCountByMethod.credit_card + salesCountByMethod.boleto + salesCountByMethod.pix;
  const conversionRate = {
    credit_card: totalTransactions > 0 ? Math.round((salesCountByMethod.credit_card / totalTransactions) * 100) : 0,
    boleto: totalTransactions > 0 ? Math.round((salesCountByMethod.boleto / totalTransactions) * 100) : 0,
    pix: totalTransactions > 0 ? Math.round((salesCountByMethod.pix / totalTransactions) * 100) : 0,
  };
  
  // Calcular ticket médio
  const averageTicket = totalSales > 0 ? Math.round(totalRevenue / totalSales) : 0;
  
  // Converter produtos para array e ordenar por quantidade
  const topProducts = Array.from(productMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);
  
  // Converter vendas diárias para array e ordenar por data
  const salesByPeriod = Array.from(dailySales.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-7); // Últimos 7 dias
  
  const metrics: DashboardMetrics = {
    totalSales,
    totalRevenue,
    totalBoletos: boletosRevenue + pendingBoletos,
    boletosRevenue,
    pendingBoletos,
    totalRefunds, // Por enquanto 0, precisaria de endpoint específico
    salesByMethod,
    recentOrders,
    topProducts,
    salesByPeriod,
    averageTicket,
    uniqueCustomers: uniqueCustomers.size,
    conversionRate,
    todayStats,
    weekStats,
    monthStats,
  };
  
  console.log('Métricas calculadas:', {
    totalSales: metrics.totalSales,
    totalRevenue: (metrics.totalRevenue / 100).toFixed(2),
    averageTicket: (metrics.averageTicket / 100).toFixed(2),
    uniqueCustomers: metrics.uniqueCustomers,
    topProducts: metrics.topProducts.length,
  });
  
  return metrics;
}

export async function GET(request: Request) {
  console.log('=== INÍCIO GET /api/dashboard ===');

  const currentCorsHeaders = getCorsHeaders(request.headers.get('origin'));

  if (!API_KEY || !isApiKeyValid) {
    return NextResponse.json(
      { success: false, error: 'Configuracao do servidor incompleta. Contate o administrador.' },
      { status: 500, headers: currentCorsHeaders }
    );
  }

  try {
    // Buscar pedidos da API Pagar.me
    const orders = await fetchOrdersFromPagarme(1, 100); // Últimos 100 pedidos

    // Calcular métricas
    const metrics = calculateMetrics(orders);

    console.log('Dashboard metrics gerado com sucesso');

    return NextResponse.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString(),
    }, {
      status: 200,
      headers: currentCorsHeaders,
    });

  } catch (error: any) {
    console.error('Erro no endpoint dashboard:', error);

    return NextResponse.json({
      success: false,
      error: 'Erro ao buscar dados do dashboard',
    }, {
      status: 500,
      headers: currentCorsHeaders,
    });
  }
}