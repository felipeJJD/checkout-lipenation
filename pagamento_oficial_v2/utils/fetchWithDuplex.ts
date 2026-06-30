/**
 * Função wrapper para fetch que adiciona automaticamente duplex: 'half' quando body estiver presente
 * Necessário para Node.js 18+ devido às mudanças na especificação WHATWG fetch
 * Ver: https://github.com/nodejs/node/issues/46221
 */
export async function fetchWithDuplex(
  url: string | URL | Request,
  options?: RequestInit
): Promise<Response> {
  // Se não houver options, fazer uma chamada fetch normal
  if (!options) {
    return fetch(url);
  }

  // Se houver body, adicionar duplex: 'half'
  if (options.body) {
    return fetch(url, {
      ...options,
      duplex: 'half'
    });
  }

  // Caso contrário, fazer fetch normal com options
  return fetch(url, options);
} 