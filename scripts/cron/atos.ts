/**
 * Jobs `atos` e `vetos` (E23x): o que o presidente em exercício assinou e o que o Congresso fez com os vetos dele,
 * desde 01/01/2023.
 *
 * - `atos`: leis, leis complementares, decretos numerados e medidas provisórias pela legislação federal do Senado
 *   (`/legislacao/lista`, uma chamada por tipo e ano). O ano corrente é baixado a cada execução; os anteriores, uma vez
 *   por semana (cache em `estado/fontes/senado-legislacao/`). Ato com data de assinatura depois de hoje é erro da fonte
 *   (Decreto 13.162 com "13/12/2026", visto em 21/11/2026): fica de fora e é relatado no log.
 * - `vetos`: lista de vetos do Congresso por ano e a situação de cada dispositivo. Veto já decidido (sem dispositivo por
 *   votar) fica em cache (`estado/fontes/congresso-vetos/`); os demais são pedidos de novo a cada execução (~110 hoje).
 */
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { mapLimite } from "../../lib/async";
import { contarDispositivos, grupoRotina } from "../../lib/atos";
import { paraLinha } from "../../lib/linhas";
import { listarLegislacao, listarVetosAno, situacoesDispositivosVeto, TIPOS_LEGISLACAO, urlNorma, urlVeto, type NormaSenado } from "../../lib/senado";
import { textoOficial } from "../../lib/texto";
import type { AtoExecutivo, Veto } from "../../lib/types";
import { FONTES, type LinhaBruta } from "./estado";

/** Posse do presidente em exercício (o mandato de 2023; a reeleição de 2026 continua a série). */
export const DESDE = "2023-01-01";
const SEMANA = 7 * 24 * 3600 * 1000;
const anosDesde = (hoje: string) => Array.from({ length: Number(hoje.slice(0, 4)) - 2023 + 1 }, (_, i) => 2023 + i);
type Saida = { tabelas: Record<string, LinhaBruta[]>; relatorio: string[]; falhas: number; atualizadas: string[] };

export async function jobAtos(hoje: string): Promise<Saida> {
  const dir = `${FONTES}/senado-legislacao`;
  mkdirSync(dir, { recursive: true });
  const anoAtual = Number(hoje.slice(0, 4));
  const tarefas = anosDesde(hoje).flatMap((ano) => TIPOS_LEGISLACAO.map((tipo) => ({ tipo, ano })));
  const normas: NormaSenado[] = [];
  const r = await mapLimite(tarefas, 2, async ({ tipo, ano }) => {
    const arq = `${dir}/${tipo}-${ano}.json`;
    if (ano < anoAtual && existsSync(arq) && Date.now() - statSync(arq).mtimeMs < SEMANA) { normas.push(...(JSON.parse(readFileSync(arq, "utf8")) as NormaSenado[])); return; }
    const lista = await listarLegislacao(tipo, ano);
    writeFileSync(arq, JSON.stringify(lista));
    normas.push(...lista);
  });
  const futuras = normas.filter((n) => n.data > hoje);
  const atos: AtoExecutivo[] = normas.filter((n) => n.data >= DESDE && n.data <= hoje).map((n) => {
    const ementa = n.ementa ? textoOficial(n.ementa) : null;
    return { id: `${n.tipo}-${n.numero}`, codigo: n.codigo, tipo: n.tipo, numero: n.numero, data: n.data, ementa, rotina: grupoRotina(ementa), url: urlNorma(n.codigo) };
  });
  const porTipo = TIPOS_LEGISLACAO.map((t) => `${t} ${atos.filter((a) => a.tipo === t).length}`).join(", ");
  const relatorio = [
    `${atos.length} atos desde ${DESDE} (${porTipo}); de rotina: ${atos.filter((a) => a.rotina).length}`,
    ...(futuras.length ? [`com data depois de hoje na fonte, fora do site: ${futuras.map((n) => `${n.tipo} ${n.numero} de ${n.data}`).join("; ")}`] : []),
    ...r.falhas.map((f) => `${f.item.tipo} ${f.item.ano} falhou: ${(f.erro as Error).message}`),
  ];
  return { tabelas: { atos_executivo: atos.map((a) => paraLinha(a) as LinhaBruta) }, relatorio, falhas: r.falhas.length, atualizadas: r.falhas.length ? [] : ["senado_atos"] };
}

export async function jobVetos(hoje: string): Promise<Saida> {
  const dir = `${FONTES}/congresso-vetos`;
  mkdirSync(dir, { recursive: true });
  const listas = await mapLimite(anosDesde(hoje), 2, (ano) => listarVetosAno(ano));
  const vetos = listas.ok.flat().filter((v) => v.publicacao >= DESDE);
  const desconhecidas = new Set<string>();
  let baixados = 0;
  const r = await mapLimite(vetos, 2, async (v): Promise<Veto> => {
    const arq = `${dir}/${v.codigoMateria}.json`;
    let situacoes: string[];
    if (existsSync(arq)) situacoes = JSON.parse(readFileSync(arq, "utf8")) as string[];
    else {
      situacoes = await situacoesDispositivosVeto(v.codigoMateria);
      baixados++;
      // Decidido (nada por votar) não muda mais: vai para o cache.
      if (situacoes.length && !situacoes.includes("Não Apreciado")) writeFileSync(arq, JSON.stringify(situacoes));
    }
    const c = contarDispositivos(situacoes);
    for (const s of c.desconhecidas) desconhecidas.add(s);
    return {
      id: v.codigo, codigoMateria: v.codigoMateria, numero: v.numero, ano: v.ano, ementa: v.ementa ? textoOficial(v.ementa) : null, total: v.total,
      publicacao: v.publicacao, materiaVetada: v.materiaVetada, dispositivos: situacoes.length || v.dispositivos,
      mantidos: c.mantidos, derrubados: c.derrubados, prejudicados: c.prejudicados, pendentes: c.pendentes, url: urlVeto(v.codigo),
    };
  });
  const falhas = listas.falhas.length + r.falhas.length;
  const ok = r.ok;
  const relatorio = [
    `${ok.length} vetos desde ${DESDE} (${baixados} pedidos agora, os demais decididos e em cache): com dispositivo derrubado ${ok.filter((v) => v.derrubados).length}, aguardando ${ok.filter((v) => !v.derrubados && v.pendentes).length}, mantidos ou prejudicados ${ok.filter((v) => !v.derrubados && !v.pendentes).length}`,
    ...(ok.some((v) => !v.dispositivos) ? [`veto sem nenhum dispositivo na fonte: ${ok.filter((v) => !v.dispositivos).map((v) => `${v.numero}/${v.ano}`).join(", ")}`] : []),
    ...(desconhecidas.size ? [`situação de dispositivo desconhecida, fora da contagem (rever lib/atos.ts): ${[...desconhecidas].join(", ")}`] : []),
    ...listas.falhas.map((f) => `lista de ${f.item} falhou: ${(f.erro as Error).message}`),
    ...r.falhas.map((f) => `veto ${f.item.numero}/${f.item.ano} falhou: ${(f.erro as Error).message}`),
  ];
  return { tabelas: { vetos: ok.map((v) => paraLinha(v) as LinhaBruta) }, relatorio, falhas, atualizadas: falhas ? [] : ["congresso_vetos"] };
}
