// server-test.js - Servidor HTTP mínimo para diagnóstico
const http = require('http');

// Criar um servidor extremamente simples
const server = http.createServer((req, res) => {
  console.log(`Requisição recebida: ${req.method} ${req.url}`);

  // Servidor de diagnóstico isolado (não usado em produção). Sem CORS `*` aqui
  // para não servir de exemplo divergente da allowlist real das route handlers.

  // Responder com status OK e informações básicas
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'ok',
    message: 'Servidor de teste funcionando!',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    port: process.env.PORT || '3000'
  }));
});

// Pegar a porta do ambiente ou usar 3000 como fallback
const PORT = process.env.PORT || 3000;

// Iniciar o servidor
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor de teste rodando em http://0.0.0.0:${PORT}`);
}); 