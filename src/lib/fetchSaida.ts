// fetch do Supabase: com a aba escondida ou fechando, marca keepalive pra o navegador
// terminar de mandar a gravação pendente mesmo depois que a página sair.
export function fetchComSaida(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
    return fetch(input, { ...init, keepalive: true });
  }
  return init === undefined ? fetch(input) : fetch(input, init);
}
