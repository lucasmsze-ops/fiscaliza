/**
 * E3 — Sonda Câmara: votações do plenário 2023 → hoje (lista + detalhe + orientações).
 *
 * Saída: data/sonda/votacoes.json      (só nominais, pela heurística do placar na descrição)
 *        data/sonda/orientacoes.json
 *        data/sonda/votacoes-falhas.json (se houver falha; nunca escondida)
 * Mede: volume por ano, chamadas, tempo, falhas — dimensiona o cron (E19).
 * Valida a heurística num trimestre inteiro contra /votos.
 */
import { writeFileSync } from "node:fs";
import { mapLimite } from "../../lib/async";
import { getOrientacoes, getVotacao, getVotos, listarVotacoesPlenario, type OrientacaoCamara, type ProposicaoRef, type VotacaoCamara } from "../../lib/camara";

const INICIO = "2023-01-01";
const HOJE = new Date().toISOString().slice(0, 10);
const EM_VOO = 6;

export interface VotacaoSonda {
  idExterno: string;
  casa: "camara";
  data: string;
  /** Proposição principal afetada (ex.: MPV 1268/2024). */
  proposicao: ProposicaoRef | null;
  /** Objeto imediato da votação (requerimento, emenda...), quando difere da proposição. */
  objeto: string | null;
  descricao: string;
  aprovacao: 0 | 1 | null;
  urlOficial: string;
}

const t0 = Date.now();
const marca = () => `${((Date.now() - t0) / 1000).toFixed(0)}s`;

// 1. Lista completa.
const lista = await listarVotacoesPlenario(INICIO, HOJE);
const nominais = lista.filter((v) => v.nominalPelaDescricao);
console.log(`[${marca()}] listadas ${lista.length} votações do plenário ${INICIO}→${HOJE}; nominais pela descrição: ${nominais.length}`);
const porAno = new Map<string, { total: number; nominais: number }>();
for (const v of lista) {
  const a = v.data.slice(0, 4); const e = porAno.get(a) ?? { total: 0, nominais: 0 };
  e.total++; if (v.nominalPelaDescricao) e.nominais++; porAno.set(a, e);
}
for (const [a, e] of [...porAno].sort()) console.log(`  ${a}: ${e.total} votações, ${e.nominais} nominais`);

// 2. Validação da heurística num trimestre (2025-04..06) contra /votos.
const tri = lista.filter((v) => v.data >= "2025-04-01" && v.data <= "2025-06-30");
const val = await mapLimite(tri, EM_VOO, async (v) => ({ v, n: (await getVotos(v.idExterno)).length }));
let vp = 0, fp = 0, fn = 0, vn = 0;
const errosHeuristica: string[] = [];
for (const { v, n } of val.ok) {
  const real = n > 0;
  if (real && v.nominalPelaDescricao) vp++;
  else if (!real && !v.nominalPelaDescricao) vn++;
  else if (real && !v.nominalPelaDescricao) { fn++; errosHeuristica.push(`FN ${v.idExterno} (${n} votos): ${v.descricao.slice(0, 90)}`); }
  else { fp++; errosHeuristica.push(`FP ${v.idExterno}: ${v.descricao.slice(0, 90)}`); }
}
console.log(`[${marca()}] heurística no trimestre 2025-Q2 (${tri.length} votações, ${val.falhas.length} falhas): VP=${vp} VN=${vn} FP=${fp} FN=${fn}`);
for (const e of errosHeuristica.slice(0, 20)) console.log("   ", e);

// 3. Detalhe + orientações das nominais.
const det = await mapLimite(nominais, EM_VOO, async (v: VotacaoCamara) => {
  const [d, o] = await Promise.all([getVotacao(v.idExterno), getOrientacoes(v.idExterno)]);
  return { d, o };
});
console.log(`[${marca()}] detalhe+orientações: ${det.ok.length} ok, ${det.falhas.length} falhas`);

const votacoes: VotacaoSonda[] = det.ok.map(({ d }): VotacaoSonda => {
  const prop = d.proposicoesAfetadas[0] ?? null;
  const obj = d.proposicaoObjeto ?? (d.objetosPossiveis[0] ? `${d.objetosPossiveis[0].tipo} ${d.objetosPossiveis[0].numero}/${d.objetosPossiveis[0].ano}` : null);
  return {
    idExterno: d.idExterno, casa: "camara", data: d.data, proposicao: prop, objeto: obj,
    descricao: d.descricao, aprovacao: d.aprovacao,
    urlOficial: prop ? `https://www.camara.leg.br/propostas-legislativas/${prop.proposicaoId}` : `https://dadosabertos.camara.leg.br/api/v2/votacoes/${d.idExterno}`,
  };
}).sort((a, b) => a.data.localeCompare(b.data) || a.idExterno.localeCompare(b.idExterno));
const orientacoes: OrientacaoCamara[] = det.ok.flatMap(({ o }) => o);

writeFileSync("data/sonda/votacoes.json", JSON.stringify(votacoes, null, 1) + "\n");
writeFileSync("data/sonda/orientacoes.json", JSON.stringify(orientacoes) + "\n");
const falhas = [...val.falhas, ...det.falhas].map((f) => ({ id: (f.item as VotacaoCamara).idExterno, erro: String(f.erro) }));
if (falhas.length) writeFileSync("data/sonda/votacoes-falhas.json", JSON.stringify(falhas, null, 1) + "\n");

const semProp = votacoes.filter((v) => !v.proposicao).length;
const semOri = det.ok.filter(({ o }) => o.length === 0).length;
const bancadas = new Map<string, number>();
for (const o of orientacoes) bancadas.set(o.bancada, (bancadas.get(o.bancada) ?? 0) + 1);
console.log(`[${marca()}] gravadas ${votacoes.length} votações nominais, ${orientacoes.length} orientações`);
console.log(`  sem proposição afetada: ${semProp} | sem nenhuma orientação: ${semOri} | com orientação "Governo": ${det.ok.filter(({ o }) => o.some((x) => x.bancada === "Governo")).length}`);
console.log(`  bancadas mais frequentes: ${[...bancadas].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([b, n]) => `${b}=${n}`).join(", ")}`);
console.log(`  valores de orientação: ${[...new Set(orientacoes.map((o) => o.orientacao))].join(" | ")}`);
console.log(`  falhas: ${falhas.length}`);
