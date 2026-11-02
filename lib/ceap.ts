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

/** Intervalo mínimo entre duas coletas para um mês novo poder fechar (`fecharMeses`). */
export const INTERVALO_MINIMO_DIAS = 20;

/**
 * Meses fechados de uma bancada nesta coleta.
 * - Coleta anterior com pelo menos INTERVALO_MINIMO_DIAS: a regra de `mesesFechados`.
 * - Anterior mais recente que isso: nenhum mês novo fecha (duas coletas no mesmo fim de semana
 *   coincidem sem que o mês esteja completo); continua fechado só o que já estava e não mudou.
 */
export function fecharMeses(atual: TotalMes[], anterior: (TotalMes & { fechado: boolean })[], diasDesdeAnterior: number): Set<number> {
  return mesesFechados(atual, diasDesdeAnterior >= INTERVALO_MINIMO_DIAS ? anterior : anterior.filter((m) => m.fechado));
}

/** Meses até `limite` (AAAAMM), contíguos desde o primeiro: o fechamento da primeira coleta nacional (E21d). */
export function fechadosAte(atual: TotalMes[], limite: number): Set<number> {
  return new Set(atual.map(chave).filter((k) => k <= limite));
}

/** Gasto de um parlamentar num mês: soma líquida (estornos vêm negativos) e soma por categoria. */
export interface GastoMes { ano: number; mes: number; total: number; porCategoria: Record<string, number> }

/** Categoria de despesa que a fonte deixou sem tipo (CEAPS: alguns recibos). */
export const SEM_TIPO = "Tipo não informado pela fonte";

/**
 * Soma os lançamentos por mês e categoria. Soma em centavos inteiros: somar reais em ponto flutuante
 * acumula erro e o total deixaria de bater com a soma das categorias.
 */
export function somarPorMes(itens: { ano: number; mes: number; tipo: string | null; valor: number }[]): GastoMes[] {
  const porMes = new Map<number, { ano: number; mes: number; total: number; cat: Map<string, number> }>();
  for (const d of itens) {
    const e = porMes.get(chave(d)) ?? { ano: d.ano, mes: d.mes, total: 0, cat: new Map<string, number>() };
    const c = Math.round(d.valor * 100), tipo = d.tipo ?? SEM_TIPO;
    e.total += c;
    e.cat.set(tipo, (e.cat.get(tipo) ?? 0) + c);
    porMes.set(chave(d), e);
  }
  return [...porMes.values()].sort((a, b) => chave(a) - chave(b)).map((e) => ({
    ano: e.ano, mes: e.mes, total: e.total / 100,
    porCategoria: Object.fromEntries([...e.cat].sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => [k, v / 100])),
  }));
}

/** Média da bancada no mês: soma de quem teve algum lançamento no mês ÷ quantos. Uma linha por UF e mês. */
export function mediasPorUf(gastos: { uf: string; ano: number; mes: number; total: number }[]): { uf: string; ano: number; mes: number; media: number; parlamentares: number; total: number }[] {
  const g = new Map<string, { uf: string; ano: number; mes: number; centavos: number; n: number }>();
  for (const x of gastos) {
    const k = `${x.uf}-${chave(x)}`;
    const e = g.get(k) ?? { uf: x.uf, ano: x.ano, mes: x.mes, centavos: 0, n: 0 };
    e.centavos += Math.round(x.total * 100); e.n++;
    g.set(k, e);
  }
  return [...g.values()].sort((a, b) => a.uf.localeCompare(b.uf) || chave(a) - chave(b))
    // Divisão em centavos: com reais em ponto flutuante, 34.289,145 virava 34.289,14 (medido em 4 bancadas).
    .map((e) => ({ uf: e.uf, ano: e.ano, mes: e.mes, media: Math.round(e.centavos / e.n) / 100, parlamentares: e.n, total: e.centavos / 100 }));
}
