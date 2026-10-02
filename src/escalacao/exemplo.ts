// Os mesmos elencos de exemplo da referência (e do seed da 0012), pra prévia com fixture e testes.
import type { Time } from './times';

const elenco = (s: string) =>
  s.split(',').map((x, i) => {
    const [n, ...r] = x.trim().split(' ');
    return { numero: Number(n), nome: r.join(' '), titular: true, ordem: i + 1 };
  });

export const TIMES_EXEMPLO: Time[] = [
  { id: 'brasil', nome: 'BRASIL', sigla: 'BRA', tecnico: 'Carlo Ancelotti', cor: null, jogadores: elenco('1 Alisson,2 Vanderson,4 Marquinhos,3 Gabriel,6 Alex Sandro,5 Casemiro,8 Bruno G.,20 Paquetá,7 Raphinha,10 Rodrygo,11 Vini Jr.') },
  { id: 'corinthians', nome: 'CORINTHIANS', sigla: 'COR', tecnico: 'Dorival Júnior', cor: null, jogadores: elenco('1 Hugo Souza,2 Matheuzinho,13 G. Henrique,5 A. Ramalho,46 Hugo,7 Raniele,70 J. Martínez,19 Carrillo,10 Garro,94 Memphis,9 Yuri Alberto') },
  { id: 'palmeiras', nome: 'PALMEIRAS', sigla: 'PAL', tecnico: 'Abel Ferreira', cor: null, jogadores: elenco('21 Weverton,4 Giay,15 G. Gómez,26 Murilo,22 Piquerez,5 A. Moreno,8 Andreas,23 Veiga,17 F. Torres,9 Vitor Roque,18 Maurício') },
  { id: 'india', nome: 'ÍNDIA', sigla: 'IND', tecnico: 'A DEFINIR', cor: null, jogadores: elenco(Array.from({ length: 11 }, (_, i) => `${i + 1} JOGADOR ${i + 1}`).join(',')) },
];
