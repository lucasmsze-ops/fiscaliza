/**
 * Job `indicadores` (E23x): indicadores do IBGE do Brasil e das 27 UFs (`lib/ibge.ts`, seis consultas pequenas) e o IDH
 * do Atlas Brasil (PNUD, Ipea e FJP) pela série IDHM do Ipeadata (`lib/ipea.ts`), tudo baixado de novo a cada execução.
 * Uma consulta que falha não apaga o que já foi coletado (o cron nunca apaga linha).
 */
import { CONSULTAS, sidra } from "../../lib/ibge";
import { idhm } from "../../lib/ipea";
import { paraLinha } from "../../lib/linhas";
import type { IndicadorLocal } from "../../lib/types";
import type { LinhaBruta } from "./estado";

/** O IDH entra desde 2019, como os indicadores anuais do IBGE (a série da PNAD Contínua começa em 2012). */
const IDH_DESDE = 2019;

export async function jobIndicadores(): Promise<{ tabelas: Record<string, LinhaBruta[]>; relatorio: string[]; falhas: number; atualizadas: string[] }> {
  const linhas: IndicadorLocal[] = [];
  const relatorio: string[] = [];
  let falhas = 0;
  for (const q of CONSULTAS) {
    try {
      const r = await sidra(q);
      const ultimo = r.filter((x) => x.local === "BR").map((x) => x.periodo).sort().at(-1);
      linhas.push(...r);
      relatorio.push(`${q.indicador} (tabela ${q.tabela}): ${r.length} valores de ${new Set(r.map((x) => x.local)).size} locais, até ${ultimo}`);
    } catch (e) {
      falhas++;
      relatorio.push(`${q.indicador} (tabela ${q.tabela}) FALHOU: ${(e as Error).message}`);
    }
  }
  try {
    const r = await idhm(IDH_DESDE);
    linhas.push(...r);
    relatorio.push(`idh (Ipeadata, série IDHM): ${r.length} valores de ${new Set(r.map((x) => x.local)).size} locais, até ${r.map((x) => x.periodo).sort().at(-1)}`);
  } catch (e) {
    falhas++;
    relatorio.push(`idh (Ipeadata) FALHOU: ${(e as Error).message}`);
  }
  return { tabelas: { indicadores: linhas.map((x) => paraLinha(x) as LinhaBruta) }, relatorio, falhas, atualizadas: falhas ? [] : ["ibge_indicadores", "ipea_idh"] };
}
