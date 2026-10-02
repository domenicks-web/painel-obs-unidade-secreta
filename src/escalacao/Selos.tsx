// Selos dos lances em cima da bolinha (CAMPO) e ao lado do nome (LISTA). SVG pra sair igual no OBS
// (emoji depende da fonte do sistema).

export const COR_AMARELO = '#FFD23F';
export const COR_VERMELHO = '#E5383B';

export function SeloGol({ tam = 22 }: { tam?: number }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 24 24" aria-label="gol" role="img">
      <circle cx="12" cy="12" r="10.5" fill="#FFF3E0" stroke="#1A1417" strokeWidth="2" />
      <path d="M12 7.2l4.2 3-1.6 4.9H9.4L7.8 10.2z" fill="#1A1417" />
      <path d="M12 7.2V2.5M16.2 10.2l4.4-1.6M14.6 15.1l2.8 3.9M9.4 15.1l-2.8 3.9M7.8 10.2L3.4 8.6" stroke="#1A1417" strokeWidth="1.6" />
    </svg>
  );
}

export function SeloCartao({ cor, tam = 18 }: { cor: string; tam?: number }) {
  return (
    <svg width={tam * 0.75} height={tam} viewBox="0 0 15 20" aria-label={cor === COR_VERMELHO ? 'cartão vermelho' : 'cartão amarelo'} role="img">
      <rect x="1" y="1" width="13" height="18" rx="2" fill={cor} stroke="#1A1417" strokeWidth="2" />
    </svg>
  );
}

export function SeloSub({ tam = 22 }: { tam?: number }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 24 24" aria-label="entrou" role="img">
      <circle cx="12" cy="12" r="10.5" fill="#FFF3E0" stroke="#1A1417" strokeWidth="2" />
      <path d="M8.5 17V7.5M5.5 10.5l3-3 3 3" stroke="#FF6B1F" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.5 7v9.5M12.5 13.5l3 3 3-3" stroke="#8B6CF0" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
