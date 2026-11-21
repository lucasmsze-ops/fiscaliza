/**
 * E23x — Adapter do SICONFI (Tesouro Nacional): relatórios fiscais que União e estados entregam (RREO e RGF).
 * API pública, sem chave: https://apidatalake.tesouro.gov.br/ords/siconfi/tt (ORDS; páginas de até 5.000 itens).
 *
 * Cada número das "Contas do governo" sai de uma linha (cod_conta) e de uma coluna de um anexo:
 * - saúde e educação: RREO do 6º bimestre, Anexo 14 (demonstrativo simplificado): "% Aplicado" e "% Mínimo a Aplicar".
 *   Nos estados, os dois são % da receita de impostos; na União, o mínimo vem em reais (o piso) e o aplicado em % do piso.
 * - resultado primário: RREO Anexo 14 (estados: "sem RPPS", com a meta da LDO; União: sem meta no demonstrativo).
 * - investimentos: RREO Anexo 01 (balanço orçamentário), despesas liquidadas no ano (sem as intraorçamentárias).
 * - folha de pagamento: RGF do 3º quadrimestre do Poder Executivo, Anexo 01: despesa total com pessoal sobre a RCL e o
 *   limite máximo.
 * - dívida (só estados): RGF Anexo 02, dívida consolidada líquida sobre a RCL no fim do ano. O limite é o da Resolução
 *   do Senado nº 40/2001 (art. 3º, I: duas vezes a RCL); o valor em reais que o relatório traz para o limite não bate
 *   com 200% em todo quadrimestre (SP, 3º de 2025), então o percentual vem da resolução.
 * Número que o relatório não traz fica nulo (ex.: educação da União em 2022), nunca zero.
 */
import { fetchJson } from "./http";
import type { ContaGoverno, IndicadorConta } from "./types";

export const SICONFI = "https://apidatalake.tesouro.gov.br/ords/siconfi/tt";

/** Código IBGE de cada UF, que é o id_ente dos estados no SICONFI (a União é 1). */
export const UF_IBGE: Record<string, number> = {
  RO: 11, AC: 12, AM: 13, RR: 14, PA: 15, AP: 16, TO: 17, MA: 21, PI: 22, CE: 23, RN: 24, PB: 25, PE: 26, AL: 27, SE: 28, BA: 29,
  MG: 31, ES: 32, RJ: 33, SP: 35, PR: 41, SC: 42, RS: 43, MS: 50, MT: 51, GO: 52, DF: 53,
};
/** "BR" é a União. */
export const ENTES = ["BR", ...Object.keys(UF_IBGE)] as const;

interface Item { cod_conta: string; conta: string; coluna: string; valor: number | null }
interface Pagina { items: Item[]; hasMore?: boolean }

const esfera = (ente: string) => (ente === "BR" ? "U" : "E");
const idEnte = (ente: string) => (ente === "BR" ? 1 : UF_IBGE[ente]!);

export const urlRreo = (ente: string, ano: number, anexo: string) =>
  `${SICONFI}/rreo?an_exercicio=${ano}&nr_periodo=6&co_tipo_demonstrativo=RREO&no_anexo=${encodeURIComponent(`RREO-Anexo ${anexo}`)}&co_esfera=${esfera(ente)}&id_ente=${idEnte(ente)}`;
export const urlRgf = (ente: string, ano: number, anexo: string) =>
  `${SICONFI}/rgf?an_exercicio=${ano}&in_periodicidade=Q&nr_periodo=3&co_tipo_demonstrativo=RGF&no_anexo=${encodeURIComponent(`RGF-Anexo ${anexo}`)}&co_esfera=${esfera(ente)}&co_poder=E&id_ente=${idEnte(ente)}`;

/** Todos os itens de um anexo (segue as páginas do ORDS). Lista vazia: o ente ainda não entregou o relatório. */
export async function itensAnexo(url: string): Promise<Item[]> {
  const out: Item[] = [];
  for (let offset = 0; ; offset += 5000) {
    const p = await fetchJson<Pagina>(`${url}&offset=${offset}`, { label: "siconfi", timeoutMs: 60_000 });
    out.push(...p.items);
    if (!p.hasMore || !p.items.length) return out;
  }
}

/** Valor da linha cujo código começa por `prefixo` e cuja coluna casa com `coluna`; null se não houver. */
function valor(itens: Item[], prefixo: string | RegExp, coluna: RegExp): number | null {
  const it = itens.find((i) => (typeof prefixo === "string" ? i.cod_conta.startsWith(prefixo) : prefixo.test(i.cod_conta)) && coluna.test(i.coluna.trim()));
  return it && it.valor !== null && Number.isFinite(Number(it.valor)) ? Number(it.valor) : null;
}

const APLICADO = /^% Aplicado/i, MINIMO = /^% M[íi]nimo a Aplicar/i, APURADO = /^Valor Apurado/i;

/** Saúde, educação e resultado primário (RREO Anexo 14). */
export function doAnexo14(ente: string, ano: number, itens: Item[], url: string): ContaGoverno[] {
  const uniao = ente === "BR";
  // Na União, o valor aplicado e o piso em reais são o que a página compara. Nos estados, só o %: a coluna "Valor
  // Apurado" nem sempre é o aplicado (SP, educação de 2024: R$ 209 bi, a base, não os 27,04% dela).
  const base = (indicador: IndicadorConta, prefixo: string): ContaGoverno => {
    const ref = valor(itens, prefixo, MINIMO);
    let pct = valor(itens, prefixo, APLICADO);
    let pctRef = uniao ? null : ref;
    // Amazonas e Amapá informaram saúde e educação como fração em vez de %: o mínimo (AM 0,12 e 0,25 de 2022 a 2025; AP
    // 0,25 ao lado de 26,85% em 2022) e, no Amapá de 2024 e 2025, também o aplicado (0,26 com mínimo 0,25). Nos estados, mínimo abaixo de 1 (o da Constituição é 12% ou 25%) e aplicado abaixo
    // de 1% não existem: cada coluna nessa situação é passada para % (docs/LACUNAS.md).
    const emPct = (v: number | null) => (v !== null && v > 0 && v < 1 ? Math.round(v * 1e4) / 100 : v);
    if (!uniao) { pct = emPct(pct); pctRef = emPct(pctRef); }
    return { ente, ano, indicador, percentual: pct, percentualRef: pctRef,
      reais: uniao ? valor(itens, prefixo, APURADO) : null, reaisRef: uniao ? ref : null, url };
  };
  const out = [base("saude", "AplicacaoTotalDasDespesasComAcoesEServicosPublicosDeSaude"), base("educacao", "MinimoAnualDasReceitasDeImpostosNaManutencaoEDesenv")];
  // Estados: "RESULTADO PRIMÁRIO (SEM RPPS) - Acima da Linha", com a meta; União: "Resultado Primário - Acima da Linha".
  const semRpps = itens.some((i) => i.cod_conta.startsWith("ResultadoPrimarioAcimaDaLinhaSemRPPS"));
  const prim = semRpps ? "ResultadoPrimarioAcimaDaLinhaSemRPPS" : /^ResultadoPrimario(AcimaDaLinha)?Demonstrativo/;
  out.push({ ente, ano, indicador: "primario", percentual: null, percentualRef: null,
    reais: valor(itens, prim, /^(Resultado Apurado|At[ée] o Bimestre)/i), reaisRef: valor(itens, prim, /^Meta/i), url });
  return out;
}

/** Investimentos liquidados no ano (RREO Anexo 01), sem as despesas intraorçamentárias. */
export function doAnexo01(ente: string, ano: number, itens: Item[], url: string): ContaGoverno {
  const it = itens.filter((i) => i.cod_conta === "Investimentos" && /^DESPESAS LIQUIDADAS AT[ÉE] O BIMESTRE/i.test(i.coluna.trim()));
  return { ente, ano, indicador: "investimentos", percentual: null, percentualRef: null, reais: it.length === 1 && it[0]!.valor !== null ? Number(it[0]!.valor) : null, reaisRef: null, url };
}

/** O maior valor entre as linhas do código e da coluna (null se não houver). */
function maior(itens: Item[], cod: string, coluna: RegExp): number | null {
  const vs = itens.filter((i) => i.cod_conta === cod && coluna.test(i.coluna.trim()) && i.valor !== null).map((i) => Number(i.valor)).filter(Number.isFinite);
  return vs.length ? Math.max(...vs) : null;
}

/**
 * Folha de pagamento do Poder Executivo (RGF Anexo 01). O relatório da União traz quatro blocos com o mesmo código: o
 * Executivo federal (limite de 37,9% da RCL, LRF art. 20, I, c) e as parcelas do DF e dos ex-territórios (limites de
 * 2,2%, 0,169% e 0,099%); o do Executivo federal é o maior em gasto e em limite. Nos estados há um bloco só.
 */
export function doRgf01(ente: string, ano: number, itens: Item[], url: string): ContaGoverno {
  const pct = /^% sobre a RCL/i;
  return { ente, ano, indicador: "folha", percentual: maior(itens, "DespesaComPessoalTotal", pct), percentualRef: maior(itens, "LimiteMaximoDespesaComPessoalTotal", pct),
    reais: maior(itens, "DespesaComPessoalTotal", /^Valor$/i), reaisRef: null, url };
}

/** Limite da dívida consolidada líquida dos estados: duas vezes a RCL (Resolução do Senado nº 40/2001, art. 3º, I). */
export const LIMITE_DIVIDA_ESTADOS = 200;

/** Dívida consolidada líquida sobre a RCL no fim do ano (RGF Anexo 02, só estados). */
export function doRgf02(ente: string, ano: number, itens: Item[], url: string): ContaGoverno {
  const fim = /^At[ée] o 3º Quadrimestre/i;
  const percentual = valor(itens, "PercentualDaDCLSobreARCL", fim);
  return { ente, ano, indicador: "divida", percentual, percentualRef: percentual === null ? null : LIMITE_DIVIDA_ESTADOS,
    reais: valor(itens, "DividaConsolidadaLiquida", fim), reaisRef: null, url };
}
