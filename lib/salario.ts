/**
 * Subsídio mensal dos membros do Congresso Nacional: o mesmo para deputados federais e senadores.
 * Fonte: Decreto Legislativo nº 172/2022, art. 1º (valores por vigência). Não há API: conferido à
 * mão no texto oficial; um decreto novo (em geral perto da posse) entra aqui com a data.
 */
export const SUBSIDIO_CONGRESSO = {
  ato: "Decreto Legislativo nº 172/2022, art. 1º",
  url: "https://www2.camara.leg.br/legin/fed/decleg/2022/decretolegislativo-172-21-dezembro-2022-793529-publicacaooriginal-166604-pl.html",
  conferidoEm: "2026-11-03",
  /** Em ordem de vigência. */
  valores: [
    { desde: "2023-01-01", valor: 39293.32 },
    { desde: "2023-04-01", valor: 41650.92 },
    { desde: "2024-02-01", valor: 44008.52 },
    { desde: "2025-02-01", valor: 46366.19 },
  ],
} as const;

/** Valor em vigor na data (AAAA-MM-DD); null antes do primeiro valor do decreto. */
export function subsidioEm(data: string): { valor: number; desde: string } | null {
  let atual: { valor: number; desde: string } | null = null;
  for (const v of SUBSIDIO_CONGRESSO.valores) if (v.desde <= data) atual = v;
  return atual;
}
