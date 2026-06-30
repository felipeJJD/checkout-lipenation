/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  env: {
    FRONTEND_URL_ALLOWED: process.env.FRONTEND_URL_ALLOWED || 'https://gosafepay.com.br',
  },
  // Ignorar erros de ESLint durante o build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Ignorar erros de tipos do TypeScript durante o build
  typescript: {
    ignoreBuildErrors: true,
  },
  // CORS é tratado por cada route handler (app/api/*/route.ts) via allowlist
  // explícita de origens. NÃO definir headers CORS globais aqui — um
  // `Access-Control-Allow-Origin: *` global anularia essa allowlist.
};

module.exports = nextConfig; 