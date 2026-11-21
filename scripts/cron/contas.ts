/**
 * Job `contas` (E23x): contas do governo da União e dos 27 estados nos relatórios fiscais do SICONFI (Tesouro
 * Nacional), de 2022 (o ano antes da posse de quem governa desde 2023) ao último ano fechado. Regras de cada número em
 * `lib/siconfi.ts`.
 *
 * Ano fechado não muda, salvo retificação: fica em cache (`estado/fontes/siconfi/{ente}-{ano}.json`, só o extraído). O
 * último ano fechado é baixado de novo uma vez por semana até 30/06 do ano seguinte (prazo em que retificações são comuns).
 * O ano novo entra quando os entes entregam o 6º bimestre e o 3º quadrimestre (até 30/01): antes disso, a lista vem
 * vazia e o ente aparece no log como "sem relatório", sem falha.
 */
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { mapLimite } from "../../lib/async";
import { paraLinha } from "../../lib/linhas";
import { doAnexo01, doAnexo14, doRgf01, doRgf02, ENTES, itensAnexo, urlRgf, urlRreo } from "../../lib/siconfi";
import type { ContaGoverno } from "../../lib/types";
import { FONTES, type LinhaBruta } from "./estado";

const DIR = `${FONTES}/siconfi`;
const PRIMEIRO_ANO = 2022;
const SEMANA = 7 * 24 * 3600 * 1000;

export async function jobContas(hoje: string): Promise<{ tabelas: Record<string, LinhaBruta[]>; relatorio: string[]; falhas: number; atualizadas: string[] }> {
  mkdirSync(DIR, { recursive: true });
  const ultimo = Number(hoje.slice(0, 4)) - 1;
  const anos = Array.from({ length: ultimo - PRIMEIRO_ANO + 1 }, (_, i) => PRIMEIRO_ANO + i);
  const tarefas = ENTES.flatMap((ente) => anos.map((ano) => ({ ente, ano })));
  const linhas: ContaGoverno[] = [];
  const semRelatorio: string[] = [];
  let baixados = 0;

  const r = await mapLimite(tarefas, 2, async ({ ente, ano }) => {
    const arq = `${DIR}/${ente}-${ano}.json`;
    const revalidar = ano === ultimo && hoje < `${ano + 1}-07-01` && (!existsSync(arq) || Date.now() - statSync(arq).mtimeMs > SEMANA);
    if (existsSync(arq) && !revalidar) { linhas.push(...(JSON.parse(readFileSync(arq, "utf8")) as ContaGoverno[])); return; }
    const u14 = urlRreo(ente, ano, "14"), u01 = urlRreo(ente, ano, "01"), g1 = urlRgf(ente, ano, "01"), g2 = urlRgf(ente, ano, "02");
    const a14 = await itensAnexo(u14), a01 = await itensAnexo(u01), r1 = await itensAnexo(g1);
    const r2 = ente === "BR" ? [] : await itensAnexo(g2); // a União não tem limite de dívida aprovado pelo Senado
    baixados++;
    const contas = [
      ...(a14.length ? doAnexo14(ente, ano, a14, u14) : []),
      ...(a01.length ? [doAnexo01(ente, ano, a01, u01)] : []),
      ...(r1.length ? [doRgf01(ente, ano, r1, g1)] : []),
      ...(r2.length ? [doRgf02(ente, ano, r2, g2)] : []),
    ];
    const faltam = [!a14.length && "RREO 14", !a01.length && "RREO 01", !r1.length && "RGF 01", ente !== "BR" && !r2.length && "RGF 02"].filter(Boolean);
    if (faltam.length) semRelatorio.push(`${ente} ${ano} (${faltam.join(", ")})`);
    else writeFileSync(arq, JSON.stringify(contas)); // só o completo vai para o cache; o incompleto é pedido de novo
    linhas.push(...contas);
  });

  const nulos = linhas.filter((c) => c.percentual === null && c.reais === null).map((c) => `${c.ente} ${c.ano} ${c.indicador}`);
  const relatorio = [
    `${linhas.length} números de ${new Set(linhas.map((c) => c.ente)).size} entes, ${anos[0]}–${ultimo} (${baixados} relatórios de ente e ano baixados agora, os demais do cache)`,
    ...(semRelatorio.length ? [`sem relatório na fonte: ${semRelatorio.join("; ")}`] : []),
    ...(nulos.length ? [`linha sem número no relatório: ${nulos.slice(0, 20).join("; ")}${nulos.length > 20 ? ` (+${nulos.length - 20})` : ""}`] : []),
    ...r.falhas.map((f) => `${f.item.ente} ${f.item.ano} falhou: ${(f.erro as Error).message}`),
  ];
  return { tabelas: { contas_governo: linhas.map((c) => paraLinha(c) as LinhaBruta) }, relatorio, falhas: r.falhas.length, atualizadas: r.falhas.length ? [] : ["tesouro_contas"] };
}
