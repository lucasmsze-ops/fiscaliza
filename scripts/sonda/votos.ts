/**
 * E4 — Sonda Câmara: votos nominais de todas as votações do plenário 2023→hoje.
 *
 * - Chama /votos das 6.5k votações listadas (a heurística do placar perde ~1%).
 * - Reescreve data/sonda/votacoes.json com a lista EXATA de nominais (+ totalVotos).
 * - Completa orientacoes.json para as nominais que a heurística não pegou.
 * - Grava data/sonda/votos.json só com os votos de quem tem camaraId na amostra.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mapLimite } from "../../lib/async";
import { getOrientacoes, getVotacao, getVotos, listarVotacoesPlenario, type OrientacaoCamara, type VotoCamara } from "../../lib/camara";
import type { VotacaoSonda } from "./votacoes";
import type { PoliticoCamara } from "./camara";

const INICIO = "2023-01-01";
const HOJE = new Date().toISOString().slice(0, 10);
const EM_VOO = 6;
const t0 = Date.now();
const marca = () => `${((Date.now() - t0) / 1000).toFixed(0)}s`;

export interface VotoSonda { votacaoId: string; camaraId: number; voto: VotoCamara["voto"] }
export interface VotacaoSondaCompleta extends VotacaoSonda { totalVotos: number }

const amostra = JSON.parse(readFileSync("data/sonda/politicos-camara.json", "utf8")) as PoliticoCamara[];
const idsAmostra = new Set(amostra.map((p) => p.camaraId));
const votacoesE3 = JSON.parse(readFileSync("data/sonda/votacoes.json", "utf8")) as VotacaoSonda[];
const orientacoes = JSON.parse(readFileSync("data/sonda/orientacoes.json", "utf8")) as OrientacaoCamara[];
const idsE3 = new Set(votacoesE3.map((v) => v.idExterno));

const lista = await listarVotacoesPlenario(INICIO, HOJE);
console.log(`[${marca()}] listadas ${lista.length}`);

// Cache por votação em data/raw (não versionado): rodar de novo só busca o que falta.
const CACHE = "data/raw/apoio/votos-cache";
mkdirSync(CACHE, { recursive: true });
let doCache = 0;
const res = await mapLimite(lista, EM_VOO, async (v) => {
  const arq = `${CACHE}/${v.idExterno}.json`;
  let todos: VotoCamara[];
  if (existsSync(arq)) { todos = JSON.parse(readFileSync(arq, "utf8")); doCache++; }
  else { todos = await getVotos(v.idExterno); writeFileSync(arq, JSON.stringify(todos)); }
  return { v, n: todos.length, amostra: todos.filter((x) => idsAmostra.has(x.camaraId)) };
});
console.log(`[${marca()}] votos vindos do cache: ${doCache}`);
console.log(`[${marca()}] /votos: ${res.ok.length} ok, ${res.falhas.length} falhas`);

const nominais = res.ok.filter((r) => r.n > 0);
const fn = nominais.filter((r) => !r.v.nominalPelaDescricao);
const fp = res.ok.filter((r) => r.n === 0 && r.v.nominalPelaDescricao);
console.log(`nominais exatas: ${nominais.length} | heurística: FN=${fn.length} FP=${fp.length}`);
for (const r of fn) console.log(`   FN ${r.v.idExterno} ${r.v.data} (${r.n} votos): ${r.v.descricao.slice(0, 80)}`);
for (const r of fp) console.log(`   FP ${r.v.idExterno} ${r.v.data}: ${r.v.descricao.slice(0, 80)}`);

// Completa detalhe + orientações do que faltava.
const faltam = nominais.filter((r) => !idsE3.has(r.v.idExterno));
const comp = await mapLimite(faltam, EM_VOO, async (r) => {
  const [d, o] = await Promise.all([getVotacao(r.v.idExterno), getOrientacoes(r.v.idExterno)]);
  const prop = d.proposicoesAfetadas[0] ?? null;
  const obj = d.proposicaoObjeto ?? (d.objetosPossiveis[0] ? `${d.objetosPossiveis[0].tipo} ${d.objetosPossiveis[0].numero}/${d.objetosPossiveis[0].ano}` : null);
  const v: VotacaoSonda = {
    idExterno: d.idExterno, casa: "camara", data: d.data, proposicao: prop, objeto: obj, descricao: d.descricao, aprovacao: d.aprovacao,
    urlOficial: prop ? `https://www.camara.leg.br/propostas-legislativas/${prop.proposicaoId}` : `https://dadosabertos.camara.leg.br/api/v2/votacoes/${d.idExterno}`,
  };
  return { v, o };
});
console.log(`[${marca()}] completadas ${comp.ok.length} votações que faltavam (${comp.falhas.length} falhas)`);

const totais = new Map(nominais.map((r) => [r.v.idExterno, r.n]));
const idsNominais = new Set(totais.keys());
const votacoes: VotacaoSondaCompleta[] = [...votacoesE3, ...comp.ok.map((c) => c.v)]
  .filter((v) => idsNominais.has(v.idExterno))
  .map((v) => ({ ...v, totalVotos: totais.get(v.idExterno)! }))
  .sort((a, b) => a.data.localeCompare(b.data) || a.idExterno.localeCompare(b.idExterno));
const orientacoesFinal = [...orientacoes, ...comp.ok.flatMap((c) => c.o)].filter((o) => idsNominais.has(o.votacaoId));
const votos: VotoSonda[] = nominais.flatMap((r) => r.amostra.map((x) => ({ votacaoId: x.votacaoId, camaraId: x.camaraId, voto: x.voto })))
  .sort((a, b) => a.votacaoId.localeCompare(b.votacaoId) || a.camaraId - b.camaraId);

writeFileSync("data/sonda/votacoes.json", JSON.stringify(votacoes, null, 1) + "\n");
writeFileSync("data/sonda/orientacoes.json", JSON.stringify(orientacoesFinal) + "\n");
writeFileSync("data/sonda/votos.json", JSON.stringify(votos) + "\n");
const falhas = [...res.falhas, ...comp.falhas].map((f) => ({ item: JSON.stringify(f.item).slice(0, 120), erro: String(f.erro) }));
if (falhas.length) writeFileSync("data/sonda/votacoes-falhas.json", JSON.stringify(falhas, null, 1) + "\n");

const porDep = new Map<number, number>();
for (const v of votos) porDep.set(v.camaraId, (porDep.get(v.camaraId) ?? 0) + 1);
console.log(`[${marca()}] gravadas ${votacoes.length} nominais, ${orientacoesFinal.length} orientações, ${votos.length} votos da amostra`);
for (const p of amostra) console.log(`  ${p.nome.padEnd(32)} ${porDep.get(p.camaraId) ?? 0} votos registrados`);
console.log(`falhas: ${falhas.length}`);
