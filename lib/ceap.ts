/**
 * CEAP: qual mês o card mostra (decisão de 2026-11-01).
 * A Câmara lança a cota com meses de atraso. Um mês é "fechado" quando o total da bancada da UF
 * é idêntico em duas coletas diferentes e todos os meses anteriores também são; o card mostra o
 * último mês fechado, com o rótulo "mês de referência".
 */
export interface TotalMes { ano: number; mes: number; total: number }

const chave = (m: { ano: number; mes: number }) => m.ano * 100 + m.mes;

/** Chaves AAAAMM dos meses fechados: iguais nas duas coletas, sem lacuna desde o primeiro mês. */
export function mesesFechados(atual: TotalMes[], anterior: TotalMes[]): Set<number> {
  const antes = new Map(anterior.map((m) => [chave(m), Math.round(m.total * 100)]));
  const fechados = new Set<number>();
  for (const m of [...atual].sort((a, b) => chave(a) - chave(b))) {
    if (antes.get(chave(m)) !== Math.round(m.total * 100)) break;
    fechados.add(chave(m));
  }
  return fechados;
}
