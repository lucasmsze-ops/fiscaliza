/**
 * E8 — Consolidação da sonda: lê data/sonda/*.json (saídas da E1–E7, sem rede) e grava as
 * tabelas finais em data/*.json, uma linha por registro, em snake_case (o shape do Supabase).
 *
 * Políticos: os 435 candidatos que aparecem em algum top-20 de município (E7) + os 3 senadores de
 * SP em exercício (E6). Dado completo (mandatos, votos, CEAP) para quem está em exercício na
 * Câmara (bancada-camara.json, 69 de 70) ou no Senado; os demais só têm o que o TSE fornece.
 *
 * Não grava CPF nem hash de CPF: o join entre fontes é refeito pelo cron a cada execução.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { mesesFechados } from "../../lib/ceap";
import { paraLinha } from "../../lib/linhas";
import { fotoUrlTse } from "../../lib/tse";
import type {
  Afastamento, Cargo, DespesaMediaUf, DespesaMes, EleitoMunicipio, ListaEleitoral, Mandato, Municipio,
  Orientacao, Politico, QuizItem, Status, TipoVoto, Votacao, Voto,
} from "../../lib/types";
import type { DeputadoBancada } from "./bancada";
import type { PoliticoCamara } from "./camara";
import type { DespesaMesSonda, MediaUfMes } from "./despesas";
import type { OrientacaoSenadoSonda, SenadorSonda, VotacaoSenadoSonda, VotoSenadoSonda } from "./senadores";
import type { PoliticoTse } from "./tse";
import type { VotacaoSondaCompleta, VotoSonda } from "./votos";

const ler = <T>(f: string): T => JSON.parse(readFileSync(`data/sonda/${f}`, "utf8")) as T;
const AGORA = new Date().toISOString();
const HOJE = AGORA.slice(0, 10);
const UF = "SP", ANO = 2026, CICLO = "ele2026", ELEICAO = "6259";

// ------------------------------------------------------------------ entradas
interface CandidatoMun { nome: string; nomeUrna: string; numero: string; cargo: Cargo; partido: string; federacao: string | null; lista: string; situacao: string; votosUf: number }
const mun = ler<{ candidatos: Record<string, CandidatoMun>; municipios: { tse: string; ibge: number | null; nome: string; deputado_federal: [string, number][]; senador: [string, number][] }[] }>("eleitos-mun.json");
const quoc = ler<{ listas: { id: string; nome: string; composicao: string | null; votosValidos: number; total: number }[] }>("quociente.json");
const tse = ler<PoliticoTse[]>("politicos-tse.json");
const bancada = ler<DeputadoBancada[]>("bancada-camara.json");
const camaraAmostra = ler<PoliticoCamara[]>("politicos-camara.json");
const senadores = ler<SenadorSonda[]>("senadores.json");
const despesas = ler<{ despesas: DespesaMesSonda[]; mediaUf: MediaUfMes[] }>("despesas.json");
const vCam = ler<VotacaoSondaCompleta[]>("votacoes.json");
const vSen = ler<VotacaoSenadoSonda[]>("votacoes-senado.json");
const votosCam = ler<VotoSonda[]>("votos.json");
const votosSen = ler<VotoSenadoSonda[]>("votos-senado.json");
const oCam = ler<{ votacaoId: string; bancada: string; orientacao: string }[]>("orientacoes.json");
const oSen = ler<OrientacaoSenadoSonda[]>("orientacoes-senado.json");

// ------------------------------------------------------------------ políticos
const slugDe = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const listaId = (lista: string) => `${UF.toLowerCase()}-${ANO}-deputado_federal-${lista.toLowerCase()}`;
const bancadaPorSq = new Map(bancada.filter((d) => d.tseSqCandidato).map((d) => [d.tseSqCandidato!, d]));
const antigoPorSq = new Map(camaraAmostra.filter((p) => !p.emExercicio).map((p) => [p.tseSqCandidato, p]));

function statusDe(c: CandidatoMun, emExercicioMesmoCargo: boolean): Status {
  if (c.situacao.startsWith("ELEITO")) return emExercicioMesmoCargo ? "reeleito" : "eleito";
  if (c.situacao === "SUPLENTE") return "suplente";
  if (c.situacao === "NÃO ELEITO") return "nao_eleito";
  throw new Error(`situação do TSE sem mapeamento: ${c.situacao}`);
}

const politicos: Politico[] = [];
const usados = new Set<string>();
const novoSlug = (nomeUrna: string, numero: string | null) => {
  let s = slugDe(nomeUrna);
  if (usados.has(s)) s = `${s}-${numero ?? politicos.length}`;
  usados.add(s);
  return s;
};

for (const [sq, c] of Object.entries(mun.candidatos).sort((a, b) => b[1].votosUf - a[1].votosUf)) {
  const dep = bancadaPorSq.get(sq); // em exercício na Câmara hoje (69 de 70 de SP)
  const antigo = antigoPorSq.get(sq); // ex-deputado (registro de outra legislatura)
  const slug = novoSlug(c.nomeUrna, c.numero);
  politicos.push({
    id: slug, slug, cargo: c.cargo, nome: c.nome, nomeUrna: c.nomeUrna, uf: UF,
    partido: dep?.partido ?? c.partido,
    listaId: c.cargo === "deputado_federal" ? listaId(c.lista) : null,
    federacao: c.federacao, numeroUrna: c.numero,
    fotoUrl: dep?.fotoUrl ?? fotoUrlTse(CICLO, ELEICAO, UF, sq),
    email: dep?.emailGabinete ?? null,
    urlPerfil: dep ? `https://www.camara.leg.br/deputados/${dep.camaraId}` : null,
    tseSqCandidato: sq, camaraId: dep?.camaraId ?? antigo?.camaraId ?? null, senadoCodigo: null,
    status: statusDe(c, !!dep && c.cargo === "deputado_federal"),
    votos2026: c.votosUf, updatedAt: AGORA,
  });
}
for (const s of senadores) {
  const t = tse.find((p) => p.tseSqCandidato === s.tseSqCandidato);
  const slug = novoSlug(t?.nomeUrna ?? s.nome, null);
  politicos.push({
    id: slug, slug, cargo: "senador", nome: s.nomeCompleto, nomeUrna: t?.nomeUrna ?? s.nome, uf: UF, partido: s.partido,
    listaId: null, federacao: null, numeroUrna: null, fotoUrl: s.fotoUrl, email: s.email, urlPerfil: s.urlPagina,
    tseSqCandidato: s.tseSqCandidato, camaraId: null, senadoCodigo: s.senadoCodigo, status: "em_exercicio", votos2026: null, updatedAt: AGORA,
  });
}
const amostraFora = tse.filter((p) => !politicos.some((x) => x.tseSqCandidato === p.tseSqCandidato));
if (amostraFora.length) throw new Error(`amostra fora de politicos: ${amostraFora.map((p) => p.nomeUrna).join(", ")}`);
const porCamara = new Map(politicos.filter((p) => p.camaraId).map((p) => [p.camaraId!, p.id]));
const porSenado = new Map(politicos.filter((p) => p.senadoCodigo).map((p) => [p.senadoCodigo!, p.id]));
const porSq = new Map(politicos.map((p) => [p.tseSqCandidato, p.id]));

// ------------------------------------------------------------------ mandatos e afastamentos
// Legislatura N da Câmara: 1º/fev do ano 2023 − 4·(57 − N) até 31/jan quatro anos depois (CF, art. 44).
const fimLegislatura = (n: number) => `${2027 - 4 * (57 - n)}-01-31`;
const mandatos: Mandato[] = [];
const afastamentos: Afastamento[] = [];

function deHistorico(politicoId: string, historico: DeputadoBancada["historico"]) {
  const ev = historico.filter((h) => h.situacao && h.descricao).sort((a, b) => a.dataHora.localeCompare(b.dataHora));
  for (const leg of [...new Set(ev.map((h) => h.legislatura))].sort()) {
    const doLeg = ev.filter((h) => h.legislatura === leg);
    const posse = doLeg.find((h) => h.descricao!.startsWith("Entrada") && !/Reassun/.test(h.descricao!));
    if (!posse) continue;
    const saida = doLeg.find((h) => h.descricao!.startsWith("Saída - Afastamento definitivo"));
    const fimLeg = fimLegislatura(leg);
    const fim = saida ? saida.dataHora.slice(0, 10) : fimLeg < HOJE ? fimLeg : null;
    mandatos.push({ politicoId, cargo: "deputado_federal", inicio: posse.dataHora.slice(0, 10), fim, titular: posse.condicaoEleitoral !== "Suplente" });
    let aberto: { inicio: string; motivo: string } | null = null;
    for (const h of doLeg) {
      if (h.descricao!.startsWith("Saída - Afastamento") && !h.descricao!.startsWith("Saída - Afastamento definitivo")) {
        aberto = { inicio: h.dataHora.slice(0, 10), motivo: h.descricao!.split(" - ").at(-1)! };
      } else if (aberto && /Reassun/.test(h.descricao!)) {
        afastamentos.push({ politicoId, ...aberto, fim: h.dataHora.slice(0, 10) }); aberto = null;
      }
    }
    if (aberto) afastamentos.push({ politicoId, ...aberto, fim });
  }
}
for (const d of bancada) { const id = porCamara.get(d.camaraId); if (id) deHistorico(id, d.historico); }
for (const p of camaraAmostra.filter((x) => !x.emExercicio)) { const id = porCamara.get(p.camaraId); if (id) deHistorico(id, p.historico); }
for (const s of senadores) {
  const id = porSenado.get(s.senadoCodigo)!;
  for (const m of s.mandatos) {
    const fimMandato = m.legislaturas.map((l) => l.fim).sort().at(-1)!;
    for (const e of m.exercicios) mandatos.push({ politicoId: id, cargo: "senador", inicio: e.inicio, fim: e.fim ?? (fimMandato < HOJE ? fimMandato : null), titular: m.titular });
  }
  for (const l of s.licencas) afastamentos.push({ politicoId: id, inicio: l.inicio, fim: l.fim, motivo: l.descricao });
}

// ------------------------------------------------------------------ listas, municípios, top-20
const listas: ListaEleitoral[] = quoc.listas.map((l) => ({
  id: listaId(l.id), uf: UF, ano: ANO, cargo: "deputado_federal", nome: l.nome, composicao: l.composicao, votosValidos: l.votosValidos, eleitos: l.total,
}));
const municipios: Municipio[] = mun.municipios.map((m) => {
  if (m.ibge === null) throw new Error(`município sem código IBGE: ${m.nome}`);
  return { ibge: m.ibge, tse: m.tse, nome: m.nome, uf: UF };
});
const eleitosMun: EleitoMunicipio[] = mun.municipios.flatMap((m) => (["deputado_federal", "senador"] as const).flatMap((cargo) =>
  m[cargo].map(([sq, votos]) => ({
    municipioIbge: m.ibge!, cargo, politicoId: porSq.get(sq)!, votos,
    posicao: 1 + m[cargo].filter(([, v]) => v > votos).length, // empatados dividem a posição
  }))));

// ------------------------------------------------------------------ CEAP
const despesasMes: DespesaMes[] = despesas.despesas.filter((d) => porCamara.has(d.camaraId))
  .map((d) => ({ politicoId: porCamara.get(d.camaraId)!, ano: d.ano, mes: d.mes, total: d.total, porCategoria: d.porCategoria }));
// Mês fechado: total da bancada idêntico entre esta coleta e a anterior (data/sonda/despesas-coleta-anterior.json).
const anterior = ler<{ geradoEm: string; mediaUf: MediaUfMes[] }>("despesas-coleta-anterior.json");
const fechados = mesesFechados(despesas.mediaUf, anterior.mediaUf);
const mediasUf: DespesaMediaUf[] = despesas.mediaUf.map((m) => ({ uf: m.uf, ano: m.ano, mes: m.mes, media: m.media, deputados: m.deputados, total: m.total, fechado: fechados.has(m.ano * 100 + m.mes) }));
const ref = mediasUf.filter((m) => m.fechado).at(-1);
console.log(`CEAP: coleta anterior ${anterior.geradoEm} · mês de referência (último fechado): ${ref ? `${ref.ano}-${String(ref.mes).padStart(2, "0")}` : "nenhum"}`);

// ------------------------------------------------------------------ quiz (critério em docs/QUIZ.md)
/** [matéria na Câmara, votação de mérito na Câmara, votação de mérito no Senado ou null]. Ordem cronológica. */
const QUIZ: [string, string, string | null][] = [
  ["PLP 93/2023", "2357053-47", "6714"],
  ["PL 490/2007", "345311-270", "6756"],
  ["PEC 45/2019", "2196833-373", "6777"],
  ["PL 709/2023", "2349493-82", null],
  ["PL 1958/2021", "2439779-55", null],
  ["PL 4614/2024", "2473375-59", "6917"],
  ["PL 2159/2021", "257161-483", "6935"],
  ["PEC 3/2021", "2270800-175", null],
  ["PL 5582/2025", "2579832-62", null], // Senado votou outro substitutivo (64×0, Governo Sim): não é a mesma pergunta
  ["PL 2162/2023", "2358548-89", "7041"],
];
const noQuiz = new Set(QUIZ.flatMap(([, c, s]) => [`camara:${c}`, ...(s ? [`senado:${s}`] : [])]));

// ------------------------------------------------------------------ votações, votos, orientações
const resultadoCamara = (v: VotacaoSondaCompleta): Votacao["resultado"] =>
  v.aprovacao === 1 ? "aprovada" : v.aprovacao === 0 ? "rejeitada" : /^Aprovad/i.test(v.descricao) ? "aprovada" : /^Rejeitad/i.test(v.descricao) ? "rejeitada" : null;
const votacoes: Votacao[] = [
  ...vCam.map((v): Votacao => ({
    id: `camara:${v.idExterno}`, idExterno: v.idExterno, casa: "camara", data: v.data,
    proposicao: v.proposicao ? `${v.proposicao.tipo} ${v.proposicao.numero}/${v.proposicao.ano}` : null,
    ementa: v.proposicao?.ementa?.trim() || null, objeto: v.objeto, descricao: v.descricao.trim(), resultado: resultadoCamara(v),
    placar: v.placar, secreta: false, urlOficial: v.urlOficial, quiz: noQuiz.has(`camara:${v.idExterno}`),
  })),
  ...vSen.map((v): Votacao => ({
    id: `senado:${v.idExterno}`, idExterno: v.idExterno, casa: "senado", data: v.data, proposicao: v.proposicao?.identificacao ?? null,
    ementa: v.ementa, objeto: null, descricao: v.descricao.trim(), resultado: v.resultado, placar: v.placar, secreta: v.secreta,
    urlOficial: v.urlOficial, quiz: noQuiz.has(`senado:${v.idExterno}`),
  })),
].sort((a, b) => a.data.localeCompare(b.data) || a.id.localeCompare(b.id));
const idsVotacao = new Set(votacoes.map((v) => v.id));
const quiz: QuizItem[] = QUIZ.map(([materia, c, s], i) => {
  const vc = votacoes.find((v) => v.id === `camara:${c}`);
  if (!vc || !vc.ementa) throw new Error(`quiz: votação ${c} ausente ou sem ementa`);
  if (s && !idsVotacao.has(`senado:${s}`)) throw new Error(`quiz: votação do Senado ${s} ausente`);
  return { id: slugDe(materia), ordem: i + 1, materia, ementa: vc.ementa, votacaoCamaraId: vc.id, votacaoSenadoId: s ? `senado:${s}` : null };
});

const DETALHE_OMITIDO = new Set(["Sim", "Não", "Abstenção", "Votou"]);
const votos: Voto[] = [
  ...votosCam.filter((v) => porCamara.has(v.camaraId)).map((v) => ({ votacaoId: `camara:${v.votacaoId}`, politicoId: porCamara.get(v.camaraId)!, voto: v.voto as TipoVoto, detalhe: null })),
  ...votosSen.map((v) => ({ votacaoId: `senado:${v.votacaoId}`, politicoId: porSenado.get(v.senadoCodigo)!, voto: v.voto, detalhe: DETALHE_OMITIDO.has(v.sigla) ? null : v.sigla })),
];
const orientacoes: Orientacao[] = [
  ...oCam.map((o) => ({ votacaoId: `camara:${o.votacaoId}`, bancada: o.bancada, orientacao: o.orientacao })),
  ...oSen.map((o) => ({ votacaoId: `senado:${o.votacaoId}`, bancada: o.bancada, orientacao: o.orientacao })),
].filter((o) => idsVotacao.has(o.votacaoId));

// ------------------------------------------------------------------ escrita
function gravar<T extends object>(tabela: string, linhas: T[]) {
  const corpo = linhas.map((l) => JSON.stringify(paraLinha(l))).join(",\n");
  writeFileSync(`data/${tabela}.json`, `[\n${corpo}\n]\n`);
  console.log(`  data/${tabela}.json`.padEnd(34), String(linhas.length).padStart(6));
}
console.log("tabelas:");
gravar("politicos", politicos);
gravar("mandatos", mandatos);
gravar("afastamentos", afastamentos);
gravar("listas", listas);
gravar("municipios", municipios);
gravar("eleitos_mun", eleitosMun);
gravar("despesas_mes", despesasMes);
gravar("despesas_media_uf", mediasUf);
gravar("votacoes", votacoes);
gravar("votos", votos);
gravar("orientacoes", orientacoes);
gravar("quiz", quiz);

const st = new Map<string, number>();
for (const p of politicos) st.set(`${p.cargo}/${p.status}`, (st.get(`${p.cargo}/${p.status}`) ?? 0) + 1);
console.log("\nstatus:", Object.fromEntries(st));
console.log(`com camaraId: ${politicos.filter((p) => p.camaraId).length} · com e-mail: ${politicos.filter((p) => p.email).length} · foto do TSE: ${politicos.filter((p) => p.fotoUrl?.includes("resultados.tse")).length}`);
console.log(`votos de deputados da bancada fora de politicos (não estão em nenhum top-20): ${votosCam.filter((v) => !porCamara.has(v.camaraId)).length}`);
