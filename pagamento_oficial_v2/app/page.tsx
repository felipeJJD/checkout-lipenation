import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API de Checkout',
  description: 'API de processamento de pagamentos para o Checkout',
};

export default function HomePage() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      fontFamily: 'system-ui, sans-serif',
      backgroundColor: '#f8f9fa' 
    }}>
      <div style={{ 
        maxWidth: '800px', 
        padding: '2rem', 
        textAlign: 'center',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        margin: '2rem'
      }}>
        <h1 style={{ color: '#0070f3', marginBottom: '1rem' }}>API de Checkout</h1>
        <p style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>A API está em funcionamento. Use os endpoints abaixo para interagir com ela.</p>
        
        <div style={{ textAlign: 'left', margin: '2rem 0', padding: '1rem', backgroundColor: '#f7f7f7', borderRadius: '4px' }}>
          <h2 style={{ color: '#333', marginBottom: '1rem' }}>Endpoints disponíveis:</h2>
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            <li style={{ padding: '0.5rem 0' }}>
              <code style={{ backgroundColor: '#e9ecef', padding: '0.2rem 0.4rem', borderRadius: '3px' }}>GET /</code>
              <span style={{ marginLeft: '1rem' }}>Página inicial</span>
            </li>
            <li style={{ padding: '0.5rem 0' }}>
              <code style={{ backgroundColor: '#e9ecef', padding: '0.2rem 0.4rem', borderRadius: '3px' }}>GET /api/checkout</code>
              <span style={{ marginLeft: '1rem' }}>Verificar status da API</span>
            </li>
            <li style={{ padding: '0.5rem 0' }}>
              <code style={{ backgroundColor: '#e9ecef', padding: '0.2rem 0.4rem', borderRadius: '3px' }}>POST /api/checkout</code>
              <span style={{ marginLeft: '1rem' }}>Processar pagamento</span>
            </li>
          </ul>
        </div>

        <div style={{ 
          marginTop: '2rem', 
          padding: '1rem', 
          backgroundColor: '#d1ecf1', 
          color: '#0c5460',
          borderRadius: '4px'
        }}>
          <h3 style={{ marginTop: 0 }}>Informações do servidor</h3>
          <p>Versão do Node.js: {process.version}</p>
          <p>Ambiente: {process.env.NODE_ENV}</p>
          <p>Data/Hora do servidor: {new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
} 