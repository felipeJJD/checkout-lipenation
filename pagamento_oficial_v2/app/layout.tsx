import { Metadata } from 'next';
import { Inter } from 'next/font/google';

// Configuração da fonte Inter
const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'API de Checkout',
  description: 'API de processamento de pagamentos para o sistema de Checkout',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
} 