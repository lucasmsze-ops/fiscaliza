/**
 * E7 — Sonda TSE: distribuição das 70 vagas de deputado federal de SP em 2026, calculada
 * por lib/quociente.ts a partir dos CSVs e conferida contra o resultado oficial.
 *
 * Entrada (data/raw/, não versionado):
 *   votacao_partido/votacao_partido_munzona_2026_SP.csv   (votos de legenda por lista)
 *   votacao_munzona/votacao_candidato_munzona_2026_SP.csv (votos nominais por candidato)
 *   consulta_cand/consulta_cand_2026_SP.csv               (situação oficial e nascimento, p/ desempate)
 * Gabarito: Relatório de Resultado da Totalização SP 2026, Anexos VI–VIII (PDF do TSE),
 *   transcrito em OFICIAL abaixo.
 * Saída:   data/sonda/quociente.json
 *          tests/fixtures/quociente-sp-2026.json (entrada real + gabarito, para o teste)
 */
import { DuckDBInstance } from "@duckdb/node-api";
import { writeFileSync } from "node:fs";
import { distribuirVagas, nomeCurtoLista, type Lista } from "../../lib/quociente";

const VAGAS = 70;
const UF = "SP";
const csv = (f: string) => `read_csv('data/raw/${f}', delim=';', header=true, quote='"', encoding='latin-1', all_varchar=true)`;

/** Anexo VIII (resumo) e Anexo VI (QE) do relatório oficial de totalização de SP. */
const OFICIAL = {
  qe: 338_203, votosValidos: 23_674_188, preenchidasQP: 60, porMedia: 10,
  listas: {
    REPUBLICANOS: [4, 2], PDT: [0, 0], "MISSÃO": [1, 0], MDB: [3, 1], PSTU: [0, 0], PODE: [5, 1], PL: [19, 0], DC: [0, 0],
    NOVO: [1, 1], DEMOCRATA: [0, 0], AGIR: [0, 0], PSB: [2, 0], PSD: [4, 2], AVANTE: [0, 0], UP: [0, 0],
    "FEDERAÇÃO BRASIL DA ESPERANÇA - FE BRASIL": [8, 3], "FEDERAÇÃO PSDB CIDADANIA": [1, 0], "FEDERAÇÃO PSOL REDE": [6, 0],
    "FEDERAÇÃO RENOVAÇÃO SOLIDÁRIA": [1, 0], "FEDERAÇÃO UNIÃO PROGRESSISTA": [5, 0],
  } as Record<string, [number, number]>,
};

const inst = await DuckDBInstance.create(":memory:");
const c = await inst.connect();
const rows = async <T>(sql: string) => (await (await c.run(sql)).getRowObjectsJson()) as unknown as T[];
const listaId = `CASE WHEN NR_FEDERACAO = '-1' THEN 'P' || NR_PARTIDO ELSE 'F' || NR_FEDERACAO END`;

const listasRaw = await rows<{ id: string; nome: string; composicao: string | null; tipo: string; legenda: string; nominais: string }>(`
  SELECT ${listaId} id, any_value(CASE WHEN NR_FEDERACAO = '-1' THEN SG_PARTIDO ELSE NM_FEDERACAO END) nome,
         any_value(CASE WHEN NR_FEDERACAO = '-1' THEN NULL ELSE SG_FEDERACAO END) composicao, any_value(TP_AGREMIACAO) tipo,
         sum(QT_TOTAL_VOTOS_LEG_VALIDOS::BIGINT) legenda, sum(QT_VOTOS_NOMINAIS_VALIDOS::BIGINT) nominais
  FROM ${csv("votacao_partido/votacao_partido_munzona_2026_SP.csv")} WHERE DS_CARGO = 'Deputado Federal' GROUP BY 1`);
const candRaw = await rows<{ sq: string; lista: string; votos: string; urna: string; partido: string }>(`
  SELECT SQ_CANDIDATO sq, any_value(${listaId}) lista, sum(QT_VOTOS_NOMINAIS_VALIDOS::BIGINT) votos,
         any_value(NM_URNA_CANDIDATO) urna, any_value(SG_PARTIDO) partido
  FROM ${csv("votacao_munzona/votacao_candidato_munzona_2026_SP.csv")} WHERE DS_CARGO = 'Deputado Federal' GROUP BY 1`);
const oficialCand = new Map((await rows<{ sq: string; sit: string; nasc: string }>(`
  SELECT SQ_CANDIDATO sq, DS_SIT_TOT_TURNO sit, DT_NASCIMENTO nasc FROM ${csv("consulta_cand/consulta_cand_2026_SP.csv")}
  WHERE DS_CARGO = 'DEPUTADO FEDERAL'`)).map((r) => [r.sq, r]));

const isoBr = (d: string | undefined) => (d && /^\d\d\/\d\d\/\d{4}$/.test(d) ? `${d.slice(6)}-${d.slice(3, 5)}-${d.slice(0, 2)}` : null);
const listas: Lista[] = listasRaw.map((l) => ({
  id: l.id, votosLegenda: Number(l.legenda),
  candidatos: candRaw.filter((x) => x.lista === l.id).map((x) => ({ id: x.sq, votos: Number(x.votos), nascimento: isoBr(oficialCand.get(x.sq)?.nasc) })),
}));

// Coerência entre os dois CSVs: nominais da lista = soma dos candidatos.
for (const l of listasRaw) {
  const soma = listas.find((x) => x.id === l.id)!.candidatos.reduce((s, x) => s + x.votos, 0);
  if (soma !== Number(l.nominais)) console.log(`  ⚠ ${l.nome}: nominais no CSV de partido ${l.nominais} ≠ soma dos candidatos ${soma}`);
}

// Empates de votos na fronteira de alguma lista (o desempate por idade importaria).
const empates = listas.flatMap((l) => {
  const vs = l.candidatos.map((x) => x.votos).filter((v) => v > 0);
  return vs.filter((v, i) => vs.indexOf(v) !== i).map((v) => `${l.id}:${v}`);
});

const d = distribuirVagas(VAGAS, listas);
const nome = new Map(listasRaw.map((l) => [l.id, l.nome]));
const composicao = new Map(listasRaw.map((l) => [l.id, l.composicao]));

// Conferência 1: lista a lista contra o Anexo VIII.
let divergencias = 0;
console.log(`QE calculado ${d.qe} (oficial ${OFICIAL.qe}) · votos válidos ${d.votosValidos} (oficial ${OFICIAL.votosValidos})`);
console.log("| Lista | Válidos | QP obtidas | QP preenchidas | Média | Total | Oficial QP+média |\n|---|---|---|---|---|---|---|");
for (const l of [...d.listas].sort((a, b) => b.votosValidos - a.votosValidos)) {
  const of = OFICIAL.listas[nome.get(l.id)!];
  const ok = of && of[0] === l.preenchidasQP && of[1] === l.vagasMedia;
  if (!ok) divergencias++;
  console.log(`| ${nome.get(l.id)} | ${l.votosValidos} | ${l.vagasQP} | ${l.preenchidasQP} | ${l.vagasMedia} | ${l.total} | ${of ? `${of[0]}+${of[1]}` : "?"} ${ok ? "✓" : "✗"} |`);
}
if (d.qe !== OFICIAL.qe || d.votosValidos !== OFICIAL.votosValidos) divergencias++;

// Conferência 2: candidato a candidato contra DS_SIT_TOT_TURNO do consulta_cand.
const esperado = (sit: string | undefined) => (sit === "ELEITO POR QP" ? "qp" : sit === "ELEITO POR MÉDIA" ? "media" : null);
const calculado = new Map(d.eleitos.map((e) => [e.candidatoId, e.por === "qp" ? "qp" : "media"]));
let difCand = 0;
for (const x of candRaw) {
  const e = esperado(oficialCand.get(x.sq)?.sit), got = calculado.get(x.sq) ?? null;
  if (e !== got) { difCand++; console.log(`  ✗ ${x.urna} (${x.partido}): calculado ${got}, oficial ${e}`); }
}
console.log(`\nlistas divergentes: ${divergencias} · candidatos divergentes: ${difCand} · empates de votos dentro de lista: ${empates.length}`);
console.log("sobras, na ordem:", d.eleitos.filter((e) => e.por !== "qp").map((e) => `${e.rodada}:${nome.get(e.listaId)}:${candRaw.find((x) => x.sq === e.candidatoId)!.urna}(${e.por})`).join(" · "));

const listaNome = (id: string) => ({ nome: nome.get(id)!, composicao: composicao.get(id) ?? null });
const saida = {
  fonte: "TSE — votacao_partido_munzona_2026, votacao_candidato_munzona_2026, consulta_cand_2026 (SP); conferido contra o Relatório de Resultado da Totalização SP 2026",
  geradoEm: new Date().toISOString(), uf: UF, cargo: "deputado_federal", vagas: d.vagas, votosValidos: d.votosValidos, qe: d.qe,
  conferencia: { listasDivergentes: divergencias, candidatosDivergentes: difCand },
  listas: [...d.listas].sort((a, b) => b.votosValidos - a.votosValidos).map((l) => ({
    ...l, nome: nome.get(l.id)!, composicao: composicao.get(l.id) ?? null, nomeCurto: nomeCurtoLista(listaNome(l.id)),
  })),
  eleitos: d.eleitos.map((e) => ({ tseSqCandidato: e.candidatoId, listaId: e.listaId, por: e.por, rodada: e.rodada })),
};
writeFileSync("data/sonda/quociente.json", JSON.stringify(saida, null, 1) + "\n");

// Fixture do teste: entrada real (sem nascimento: não há empate que dependa dele) + gabarito oficial.
writeFileSync("tests/fixtures/quociente-sp-2026.json", JSON.stringify({
  fonte: saida.fonte, vagas: VAGAS,
  listas: listas.map((l) => ({ id: l.id, nome: nome.get(l.id), votosLegenda: l.votosLegenda, candidatos: l.candidatos.filter((x) => x.votos > 0).map((x) => [x.id, x.votos]) })),
  oficial: { qe: OFICIAL.qe, votosValidos: OFICIAL.votosValidos, listas: OFICIAL.listas,
    eleitosQP: candRaw.filter((x) => esperado(oficialCand.get(x.sq)?.sit) === "qp").map((x) => x.sq).sort(),
    eleitosMedia: candRaw.filter((x) => esperado(oficialCand.get(x.sq)?.sit) === "media").map((x) => x.sq).sort() },
}) + "\n");
