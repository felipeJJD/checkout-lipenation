// server-next.js - Servidor customizado para Next.js standalone
const http = require('http');
const path = require('path');
const { parse } = require('url');

// Carrega o Next.js em modo produção
const next = require('next');
const dev = process.env.NODE_ENV !== 'production';
const dir = '.'; // Diretório raiz
const port = process.env.PORT || 8080;

console.log(`Iniciando servidor Next.js em ${dev ? 'desenvolvimento' : 'produção'} na porta ${port}`);

// Inicializa o app Next.js
const app = next({ dev, dir });
const handle = app.getRequestHandler();

// Prepara o servidor Next.js
app.prepare()
  .then(() => {
    console.log('Next.js carregado com sucesso');
    
    // Cria um servidor HTTP diretamente
    const server = http.createServer((req, res) => {
      // Log detalhado para depuração
      const parsedUrl = parse(req.url, true);
      console.log(`${new Date().toISOString()} - ${req.method} ${parsedUrl.pathname}`);
      
      try {
        // CORS é tratado por cada route handler (app/api/*/route.ts) via allowlist
        // explícita de origens. NÃO injetar `Access-Control-Allow-Origin: *` global
        // aqui — isso anularia a allowlist e abriria a API de checkout pra qualquer origem.

        // Rota de diagnóstico para pular totalmente o Next.js
        if (parsedUrl.pathname === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'ok',
            message: 'Servidor Next.js funcionando!',
            timestamp: new Date().toISOString(),
            env: process.env.NODE_ENV,
            port
          }));
          return;
        }
        
        // Encaminha para o handler do Next.js
        handle(req, res, parsedUrl)
          .catch(err => {
            console.error('Erro ao processar requisição Next.js:', err);
            res.statusCode = 500;
            res.end('Erro interno no servidor');
          });
      } catch (error) {
        console.error('Erro no servidor:', error);
        res.statusCode = 500;
        res.end('Erro interno no servidor');
      }
    });
    
    // Inicia o servidor na porta especificada
    server.listen(port, '0.0.0.0', (err) => {
      if (err) throw err;
      console.log(`> Servidor pronto em http://0.0.0.0:${port}`);
    });
  })
  .catch(err => {
    console.error('Erro ao inicializar Next.js:', err);
    process.exit(1);
  }); 