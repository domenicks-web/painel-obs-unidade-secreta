// Grade automática de câmeras: dada a área da tela e quantas câmeras, escolhe colunas × linhas
// com a maior câmera possível, sempre 16:9 exato (largura múltipla de 16), centralizada na área.
// Linha incompleta fica centralizada. gy é maior que gx porque a etiqueta do nome fica embaixo.

export interface Area {
  x: number;
  y: number;
  w: number;
  h: number;
  gx: number;
  gy: number;
}

export interface Caixa {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Áreas medidas para que a quantidade de sempre caia exatamente nas posições aprovadas.
export const AREA_MESA: Area = { x: 62, y: 160, w: 1796, h: 734, gx: 34, gy: 86 };
export const AREA_FILME: Area = { x: 60, y: 130, w: 1320, h: 771, gx: 72, gy: 69 };
export const AREA_FUTEBOL: Area = { x: 60, y: 190, w: 1320, h: 720, gx: 40, gy: 40 };
export const AREA_FUTEBOL_ENQUETE: Area = { x: 60, y: 200, w: 1320, h: 360, gx: 40, gy: 40 };

export function gradeCameras(n: number, a: Area): Caixa[] {
  if (n < 1) return [];
  let melhor = { cols: 1, linhas: n, w: 0 };
  for (let cols = 1; cols <= n; cols++) {
    const linhas = Math.ceil(n / cols);
    const porLargura = (a.w - (cols - 1) * a.gx) / cols;
    const porAltura = ((a.h - (linhas - 1) * a.gy) / linhas) * (16 / 9);
    const w = Math.floor(Math.min(porLargura, porAltura) / 16) * 16;
    // empate: menos linhas (3 câmeras ficam em colunas, lado a lado)
    if (w > melhor.w || (w === melhor.w && linhas < melhor.linhas)) melhor = { cols, linhas, w };
  }
  const { cols, linhas, w } = melhor;
  const h = (w / 16) * 9;
  const alturaGrade = linhas * h + (linhas - 1) * a.gy;
  const y0 = a.y + Math.round((a.h - alturaGrade) / 2);

  const caixas: Caixa[] = [];
  for (let l = 0; l < linhas; l++) {
    const naLinha = Math.min(cols, n - l * cols);
    const larguraLinha = naLinha * w + (naLinha - 1) * a.gx;
    const x0 = a.x + Math.round((a.w - larguraLinha) / 2);
    for (let c = 0; c < naLinha; c++) caixas.push({ x: x0 + c * (w + a.gx), y: y0 + l * (h + a.gy), w, h });
  }
  return caixas;
}
