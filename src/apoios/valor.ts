// Lê o valor de um superchat como o YouTube mostra ("R$ 10,00", "US$ 5.00", "$5.00", "€5,00",
// "MX$100.00", "¥500", "ARS 1.000") e converte para reais com as cotações de /api/cambio.
// Sem imports: também é usado pelo servidor (tabela fixa).

/** Quanto 1 real vale em cada moeda. Reserva se /api/cambio cair (médias de 2026). */
export const TAXAS_FIXAS: Record<string, number> = {
  BRL: 1, USD: 0.1955, EUR: 0.17, GBP: 0.146, JPY: 31.4, CAD: 0.274, AUD: 0.278, MXN: 3.39, ARS: 285.7,
  CLP: 180.6, COP: 692, PEN: 0.674, UYU: 7.88, CHF: 0.157, INR: 18.65, KRW: 291, CNY: 1.32, NZD: 0.336,
};

// mais longos primeiro: "US$" antes de "$", "CN¥" antes de "¥"
const SIMBOLOS: [string, string][] = [
  ['R$', 'BRL'], ['US$', 'USD'], ['CA$', 'CAD'], ['AU$', 'AUD'], ['A$', 'AUD'], ['MX$', 'MXN'], ['NZ$', 'NZD'],
  ['HK$', 'HKD'], ['NT$', 'TWD'], ['CN¥', 'CNY'], ['JP¥', 'JPY'], ['€', 'EUR'], ['£', 'GBP'], ['¥', 'JPY'],
  ['￥', 'JPY'], ['₩', 'KRW'], ['₹', 'INR'], ['₱', 'PHP'], ['₪', 'ILS'], ['₺', 'TRY'], ['₽', 'RUB'], ['$', 'USD'],
];

/** "1.234,56" / "1,234.56" / "10,00" / "1.000" → número. */
function lerNumero(bruto: string): number | null {
  const s = bruto.replace(/\s/g, '');
  if (!/\d/.test(s)) return null;
  const ponto = s.lastIndexOf('.');
  const virgula = s.lastIndexOf(',');
  let normal: string;
  if (ponto >= 0 && virgula >= 0) {
    // os dois aparecem: o último é o decimal
    const dec = ponto > virgula ? '.' : ',';
    const mil = dec === '.' ? ',' : '.';
    normal = s.split(mil).join('').replace(dec, '.');
  } else if (ponto >= 0 || virgula >= 0) {
    const sep = ponto >= 0 ? '.' : ',';
    const partes = s.split(sep);
    // um separador com 3 dígitos depois é milhar ("1.000", "₩1,000"); senão é decimal ("10,00", "5.5")
    const milhar = partes.length > 2 || partes[partes.length - 1].length === 3;
    normal = milhar ? partes.join('') : partes.join('.');
  } else {
    normal = s;
  }
  const n = Number(normal);
  return Number.isFinite(n) ? n : null;
}

export function lerValor(texto: string): { moeda: string; quantia: number } | null {
  const t = texto.trim();
  if (!t) return null;
  const numero = t.match(/\d[\d.,\s]*/);
  if (!numero) return null;
  const quantia = lerNumero(numero[0].trim());
  if (quantia == null) return null;
  const resto = (t.slice(0, numero.index) + ' ' + t.slice(numero.index! + numero[0].length)).trim();
  const codigo = resto.match(/\b([A-Z]{3})\b/);
  if (codigo) return { moeda: codigo[1], quantia };
  const simbolo = SIMBOLOS.find(([s]) => resto.includes(s));
  return simbolo ? { moeda: simbolo[1], quantia } : null;
}

/** Valor em reais (2 casas). 0 quando não dá pra saber a moeda ou não tem cotação. */
export function emReais(texto: string, taxas: Record<string, number>): number {
  const v = lerValor(texto);
  if (!v) return 0;
  const taxa = v.moeda === 'BRL' ? 1 : taxas[v.moeda];
  if (!taxa || !(taxa > 0)) return 0;
  return Math.round((v.quantia / taxa) * 100) / 100;
}
