import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from '@/components/custom/Layout' // Usando alias
import { DashboardPage } from '@/pages/DashboardPage' // Usando alias
import { CheckoutPage } from '@/pages/CheckoutPage' // Usando alias
import { LinkGeneratorPage } from '@/pages/LinkGeneratorPage'
import { ErrorBoundary } from '@/components/utils/ErrorBoundary'

function App() {
  // ATENÇÃO (segurança): a rota /dashboard NÃO tem autenticação real.
  // A antiga "proteção" era uma senha hardcoded no bundle do frontend
  // (visível no browser) — removida por ser inútil. Antes do go-live com
  // dados de venda reais, proteger /dashboard server-side ou pela plataforma
  // de deploy (ex.: Cloudflare Access / Basic Auth no Railway/Vercel).
  return (
    <ErrorBoundary>
      <Routes>
        {/* Rotas que USAM o Layout principal (com tema global) */}
        <Route element={<Layout />}>
          {/* Redireciona a rota raiz para /gerador-links */}
          <Route path="/" element={<Navigate to="/gerador-links" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/gerador-links" element={<LinkGeneratorPage />} />
          {/* Outras rotas do dashboard poderiam vir aqui */}
        </Route>

        {/* Rota do Checkout SEM o Layout principal */}
        <Route path="/checkout" element={<CheckoutPage />} />

        {/* Rotas fora do Layout principal (ex: login, 404) podem vir aqui */}
      </Routes>
    </ErrorBoundary>
  )
}

export default App
