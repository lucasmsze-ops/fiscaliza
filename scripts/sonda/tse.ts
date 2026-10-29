/**
 * E1 — Sonda TSE: amostra de ~20 políticos reais de SP a partir dos CSVs do TSE.
 *
 * Entrada (data/raw/, não versionado):
 *   consulta_cand/consulta_cand_2026_SP.csv
 *   votacao_munzona/votacao_candidato_munzona_2026_SP.csv
 *   consulta_cand_2022/consulta_cand_2022_SP.csv  (senador em exercício eleito em 2022)
 *   consulta_cand_2018/consulta_cand_2018_SP.csv  (senadores em exercício eleitos em 2018)
 *   apoio/camara-sp-atual.json                     (gerado por _listas-atuais.ts)
 *
 * Saída: data/sonda/politicos-tse.json
 *
 * Critério da amostra (ver docs/SONDA.md):
 *   10 deputados "reeleitos": eleitos em 2026 cujo nome de urna casa exatamente com o nome
 *      parlamentar de um deputado de SP em exercício. Confirmação por CPF fica para a E2.
 *    5 deputados "novos": eleitos em 2026 sem nenhuma semelhança de nome com a lista atual.
 *    Em cada grupo: ordem por votos válidos, no máximo 2 por partido, garantindo ao menos
 *    um eleito por média e um membro de federação quando houver.
 *    5 senadores: os 2 eleitos por SP em 2026 + os 3 em exercício (TSE 2018/2022).
 */
import { DuckDBInstance, type DuckDBConnection } from "@duckdb/node-api";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

const RAW = "data/raw";
const csv = (f: string) =>
  `read_csv('${RAW}/${f}', delim=';', header=true, quote='"', encoding='latin-1', all_varchar=true)`;

// Sentinelas do TSE para "sem valor".
const nulo = (v: string | null | undefined) =>
  v == null || v === "" || /^#(NULO|NE)#?$/.test(v) ? null : v;

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const STOP = new Set(["DE", "DA", "DO", "DAS", "DOS", "E", "O", "A"]);
const tokens = (s: string) => norm(s).split(" ").filter((t) => t.length > 1 && !STOP.has(t));

// Fotos de 2026 vêm num zip por UF; só registramos o nome se o arquivo está lá.
const FOTOS_ZIP = `${RAW}/fotos/foto_cand2026_SP_div.zip`;
const fotosNoZip = new Set(
  existsSync(FOTOS_ZIP) ? execFileSync("unzip", ["-Z1", FOTOS_ZIP], { encoding: "utf8" }).split("\n") : [],
);
const fotoNoZip = (nome: string) => (fotosNoZip.has(nome) ? nome : null);

const cpfHash = (cpf: string) =>
  createHash("sha256").update(cpf.replace(/\D/g, "").padStart(11, "0")).digest("hex");

interface LinhaCand {
  SQ_CANDIDATO: string; NM_CANDIDATO: string; NM_URNA_CANDIDATO: string; NR_CANDIDATO: string;
  SG_PARTIDO: string; NM_PARTIDO: string; SG_FEDERACAO: string; NM_FEDERACAO: string;
  SG_UF: string; SG_UE: string; DS_CARGO: string; DS_SIT_TOT_TURNO: string;
  NR_CPF_CANDIDATO: string; ANO_ELEICAO: string; CD_ELEICAO: string;
  tseCargoOriginal?: string;
}

export interface PoliticoTse {
  amostra: "deputado_reeleito" | "deputado_novo" | "senador_eleito" | "senador_exercicio";
  cargo: "deputado_federal" | "senador";
  anoEleicao: number;
  tseSqCandidato: string;
  tseCdEleicao: string;
  /** DS_CARGO original. Para quem assumiu como suplente, difere de `cargo`. */
  tseCargo: string;
  nome: string;
  nomeUrna: string;
  numero: string;
  partido: string;
  partidoNome: string;
  federacao: string | null;
  federacaoNome: string | null;
  uf: string;
  situacaoTotalizacao: string;
  /** SHA-256 do CPF, só para o join com Câmara/Senado. Nunca o CPF. */
  cpfHash: string;
  /** Votos nominais válidos em 2026 (exclui "anulado sub judice"). Null para quem não concorreu em 2026. */
  votos2026: number | null;
  /** Nome do arquivo dentro de fotos/foto_cand2026_SP_div.zip, se existir lá. Não é URL. */
  fotoTseArquivo: string | null;
  /** Preenchido só na E2/E6 com a URL oficial da Câmara/Senado. */
  fotoUrl: null;
}

async function linhas<T>(c: DuckDBConnection, sql: string): Promise<T[]> {
  const r = await c.run(sql);
  return (await r.getRowObjectsJson()) as unknown as T[];
}

function paraPolitico(l: LinhaCand, amostra: PoliticoTse["amostra"], votos: number | null): PoliticoTse {
  const cargo = l.DS_CARGO === "DEPUTADO FEDERAL" ? "deputado_federal" : "senador";
  return {
    amostra, cargo,
    anoEleicao: Number(l.ANO_ELEICAO),
    tseSqCandidato: l.SQ_CANDIDATO,
    tseCdEleicao: l.CD_ELEICAO,
    tseCargo: l.tseCargoOriginal ?? l.DS_CARGO,
    nome: l.NM_CANDIDATO,
    nomeUrna: l.NM_URNA_CANDIDATO,
    numero: l.NR_CANDIDATO,
    partido: l.SG_PARTIDO,
    partidoNome: l.NM_PARTIDO,
    federacao: nulo(l.SG_FEDERACAO),
    federacaoNome: nulo(l.NM_FEDERACAO),
    uf: l.SG_UF,
    situacaoTotalizacao: l.DS_SIT_TOT_TURNO,
    cpfHash: cpfHash(l.NR_CPF_CANDIDATO),
    votos2026: votos,
    fotoTseArquivo: fotoNoZip(`F${l.SG_UE}${l.SQ_CANDIDATO}_div.jpg`),
    fotoUrl: null,
  };
}

/** Escolhe n candidatos: ordem por votos, máx. 2 por partido, ≥1 por média e ≥1 de federação se houver. */
function escolher(cands: (LinhaCand & { votos: number })[], n: number): (LinhaCand & { votos: number })[] {
  const ordenados = [...cands].sort((a, b) => b.votos - a.votos);
  const escolhidos: typeof ordenados = [];
  const porPartido = new Map<string, number>();
  const cabe = (c: LinhaCand) => (porPartido.get(c.SG_PARTIDO) ?? 0) < 2 && !escolhidos.includes(c as any);
  const add = (c: (typeof ordenados)[number] | undefined) => {
    if (!c) return;
    escolhidos.push(c);
    porPartido.set(c.SG_PARTIDO, (porPartido.get(c.SG_PARTIDO) ?? 0) + 1);
  };
  add(ordenados.find((c) => c.DS_SIT_TOT_TURNO === "ELEITO POR MÉDIA" && cabe(c)));
  add(ordenados.find((c) => nulo(c.SG_FEDERACAO) && cabe(c)));
  for (const c of ordenados) {
    if (escolhidos.length >= n) break;
    if (cabe(c)) add(c);
  }
  return escolhidos.slice(0, n);
}

const inst = await DuckDBInstance.create(":memory:");
const c = await inst.connect();

// 1. Eleitos em 2026 (deputado federal e senador) em SP.
const cols = `SQ_CANDIDATO, NM_CANDIDATO, NM_URNA_CANDIDATO, NR_CANDIDATO, SG_PARTIDO, NM_PARTIDO,
  SG_FEDERACAO, NM_FEDERACAO, SG_UF, SG_UE, DS_CARGO, DS_SIT_TOT_TURNO, NR_CPF_CANDIDATO, ANO_ELEICAO, CD_ELEICAO`;
const eleitos = await linhas<LinhaCand>(c, `
  SELECT ${cols} FROM ${csv("consulta_cand/consulta_cand_2026_SP.csv")}
  WHERE DS_CARGO IN ('DEPUTADO FEDERAL','SENADOR') AND DS_SIT_TOT_TURNO LIKE 'ELEITO%'`);

// 2. Votos válidos por candidato (atenção: DS_CARGO aqui vem em caixa mista).
const votosRows = await linhas<{ SQ_CANDIDATO: string; votos: string }>(c, `
  SELECT SQ_CANDIDATO, CAST(sum(CAST(QT_VOTOS_NOMINAIS_VALIDOS AS BIGINT)) AS VARCHAR) AS votos
  FROM ${csv("votacao_munzona/votacao_candidato_munzona_2026_SP.csv")}
  WHERE DS_CARGO IN ('Deputado Federal','Senador') GROUP BY 1`);
const votos = new Map(votosRows.map((r) => [r.SQ_CANDIDATO, Number(r.votos)]));
const comVotos = eleitos.map((l) => ({ ...l, votos: votos.get(l.SQ_CANDIDATO) ?? -1 }));
const semVotos = comVotos.filter((l) => l.votos < 0);
if (semVotos.length) throw new Error(`eleitos sem votos no munzona: ${semVotos.map((l) => l.NM_URNA_CANDIDATO).join(", ")}`);

// 3. Reeleitos x novos, pelo nome de urna contra a Câmara em exercício.
const camara = JSON.parse(readFileSync(`${RAW}/apoio/camara-sp-atual.json`, "utf8")) as { id: number; nome: string }[];
const nomesCamara = camara.map((d) => norm(d.nome));
const tokensCamara = camara.map((d) => new Set(tokens(d.nome)));
const deputados = comVotos.filter((l) => l.DS_CARGO === "DEPUTADO FEDERAL");
const casaExato = (l: LinhaCand) => nomesCamara.includes(norm(l.NM_URNA_CANDIDATO));
const parecido = (l: LinhaCand) => {
  const t = tokens(l.NM_URNA_CANDIDATO);
  return tokensCamara.some((tc) => {
    const comuns = t.filter((x) => tc.has(x)).length;
    return comuns >= 2 || (t.length > 0 && comuns === t.length) || (tc.size > 0 && comuns === tc.size);
  });
};
const reeleitosCand = deputados.filter(casaExato);
const novosCand = deputados.filter((l) => !casaExato(l) && !parecido(l));
const ambiguos = deputados.filter((l) => !casaExato(l) && parecido(l));

const reeleitos = escolher(reeleitosCand, 10);
const novos = escolher(novosCand, 5);
const senadoresEleitos = comVotos.filter((l) => l.DS_CARGO === "SENADOR");

// 4. Senadores em exercício: registros do TSE 2018/2022.
const exercicio = [
  { arq: "consulta_cand_2022/consulta_cand_2022_SP.csv", sq: "250001612472" }, // Astronauta Marcos Pontes
  { arq: "consulta_cand_2018/consulta_cand_2018_SP.csv", sq: "250000612593" }, // Mara Gabrilli
  { arq: "consulta_cand_2018/consulta_cand_2018_SP.csv", sq: "250000615467" }, // Giordano (1º suplente, assumiu)
];
const senadoresExercicio: LinhaCand[] = [];
for (const e of exercicio) {
  const [l] = await linhas<LinhaCand>(c, `SELECT ${cols} FROM ${csv(e.arq)} WHERE SQ_CANDIDATO='${e.sq}'`);
  if (!l) throw new Error(`senador em exercício não encontrado: ${e.sq}`);
  senadoresExercicio.push({ ...l, tseCargoOriginal: l.DS_CARGO, DS_CARGO: "SENADOR" });
}

const saida: PoliticoTse[] = [
  ...reeleitos.map((l) => paraPolitico(l, "deputado_reeleito", l.votos)),
  ...novos.map((l) => paraPolitico(l, "deputado_novo", l.votos)),
  ...senadoresEleitos.map((l) => paraPolitico(l, "senador_eleito", l.votos)),
  ...senadoresExercicio.map((l) => paraPolitico(l, "senador_exercicio", null)),
];

mkdirSync("data/sonda", { recursive: true });
writeFileSync("data/sonda/politicos-tse.json", JSON.stringify(saida, null, 2) + "\n");

console.log(`eleitos 2026 SP: ${deputados.length} deputados, ${senadoresEleitos.length} senadores`);
console.log(`casam exato com a Câmara: ${reeleitosCand.length} | sem semelhança: ${novosCand.length} | ambíguos (E2 resolve por CPF): ${ambiguos.length}`);
console.log(`\namostra (${saida.length}):`);
for (const p of saida) console.log(`  ${p.amostra.padEnd(18)} ${p.nomeUrna.padEnd(30)} ${p.partido.padEnd(12)} ${(p.federacao ?? "-").padEnd(14)} ${p.situacaoTotalizacao.padEnd(16)} ${p.votos2026 ?? "-"}`);
console.log(`\nambíguos: ${ambiguos.map((l) => l.NM_URNA_CANDIDATO).join("; ")}`);
