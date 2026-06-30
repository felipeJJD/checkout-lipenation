import { Outlet, Link, useLocation } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import {
  BarChart3,
  LinkIcon,
  Lock
} from 'lucide-react';

export function Layout() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-red-950">
      {/* Sidebar com Glassmorphism */}
      <aside className="w-72 backdrop-blur-xl bg-white/10 border-r border-white/20 shadow-2xl p-6 flex flex-col">
        {/* Header da Sidebar */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 via-violet-600 to-red-600 shadow-lg">
              <span className="text-xl font-black tracking-tight text-white">CL</span>
            </div>
            <div>
              <h2 className="text-2xl font-black bg-gradient-to-r from-white via-blue-200 to-red-200 bg-clip-text text-transparent">
                Casa Leonora
              </h2>
              <p className="text-white/70 text-sm font-medium">Painel da operacao</p>
            </div>
          </div>
          <div className="h-1 bg-gradient-to-r from-blue-500 via-violet-500 to-red-500 rounded-full"></div>
        </div>

        {/* Navigation */}
        <nav className="flex-grow space-y-3">
          <div className="mb-4">
            <p className="text-white/60 text-xs font-bold uppercase tracking-wider mb-3">Menu Principal</p>
          </div>

          {/* Dashboard Link */}
          <Link
            to="/dashboard"
            className={`group flex items-center p-4 rounded-2xl transition-all duration-300 ${
              location.pathname === '/dashboard'
                ? 'bg-gradient-to-r from-blue-500/30 to-blue-700/30 border border-white/20 shadow-lg'
                : 'hover:bg-white/10 hover:shadow-md border border-transparent'
            }`}
          >
            <div className={`p-3 rounded-xl mr-4 transition-all duration-300 ${
              location.pathname === '/dashboard'
                ? 'bg-gradient-to-r from-blue-500 to-blue-700 shadow-lg'
                : 'bg-white/10 group-hover:bg-white/20'
            }`}>
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold text-base">Dashboard</span>
                <Lock className="w-4 h-4 text-white/60" />
              </div>
              <p className="text-white/70 text-xs">Métricas de vendas</p>
            </div>
          </Link>

          {/* Gerador de Links */}
          <Link
            to="/gerador-links"
            className={`group flex items-center p-4 rounded-2xl transition-all duration-300 ${
              location.pathname === '/gerador-links'
                ? 'bg-gradient-to-r from-red-500/30 to-red-700/30 border border-white/20 shadow-lg'
                : 'hover:bg-white/10 hover:shadow-md border border-transparent'
            }`}
          >
            <div className={`p-3 rounded-xl mr-4 transition-all duration-300 ${
              location.pathname === '/gerador-links'
                ? 'bg-gradient-to-r from-red-500 to-red-700 shadow-lg'
                : 'bg-white/10 group-hover:bg-white/20'
            }`}>
              <LinkIcon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <span className="text-white font-semibold text-base">Link Leonora</span>
              <p className="text-white/70 text-xs">Checkout oficial</p>
            </div>
          </Link>
        </nav>

        {/* Footer */}
        <div className="mt-auto">
          <div className="backdrop-blur-lg bg-white/5 rounded-2xl border border-white/10 p-4 mb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 font-semibold text-sm">Sistema Online</span>
            </div>
            <p className="text-white/60 text-xs">Todas as funcionalidades ativas</p>
          </div>

          {/* Créditos */}
          <div className="text-center">
            <p className="text-white/50 text-xs">Checkout Casa Leonora</p>
          </div>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      {/* Toaster */}
      <Toaster />
    </div>
  );
}
