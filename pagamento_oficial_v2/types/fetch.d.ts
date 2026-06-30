// Estendendo interface RequestInit para incluir o parâmetro duplex
// Necessário para Node.js 18+ compatibilidade
interface RequestInit {
  /** 
   * Propriedade duplex exigida pelo Node.js 18+ quando enviando um body na requisição
   * Ver: https://github.com/nodejs/node/issues/46221
   */
  duplex?: 'half';
} 