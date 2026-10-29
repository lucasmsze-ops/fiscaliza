/**
 * E2 — Sonda Câmara: perfil oficial e join com o TSE por hash de CPF.
 *
 * Entrada: data/sonda/politicos-tse.json (E1), CSV do TSE 2026 (para os 70 eleitos de SP).
 * Saída:   data/sonda/politicos-camara.json (só quem tem registro na Câmara)
 *          + relatório no stdout (quantos eleitos de 2026 já estão em exercício).
 */
import { DuckDBInstance } from "@duckdb/node-api";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { getDeputado, getHistorico, getOrgaos, listarDeputados, type DeputadoPerfil, type HistoricoDeputado, type OrgaoDeputado } from "../../lib/camara";
import type { PoliticoTse } from "./tse";

const cpfHash = (cpf: string) =>
  createHash("sha256").update(cpf.replace(/\D/g, "").padStart(11, "0")).digest("hex");

export interface PoliticoCamara {
  tseSqCandidato: string;
  camaraId: number;
  /** Como o registro foi casado com o TSE. */
  join: "cpf_hash";
  /** true se está na lista de deputados em exercício hoje. */
  emExercicio: boolean;
  nome: string;
  nomeCivil: string;
  partido: string;
  uf: string;
  legislatura: number;
  fotoUrl: string;
  emailGabinete: string | null;
  telefoneGabinete: string | null;
  situacao: string | null;
  condicaoEleitoral: string | null;
  redesSociais: string[];
  site: string | null;
  orgaosAtuais: OrgaoDeputado[];
  historico: HistoricoDeputado[];
}

const amostra = JSON.parse(readFileSync("data/sonda/politicos-tse.json", "utf8")) as PoliticoTse[];

// 1. Hash de CPF dos 70 deputados eleitos em SP em 2026 (direto do CSV; não vai a arquivo).
const inst = await DuckDBInstance.create(":memory:");
const c = await inst.connect();
const eleitos = (await (await c.run(`
  SELECT SQ_CANDIDATO, NM_URNA_CANDIDATO, SG_PARTIDO, NR_CPF_CANDIDATO
  FROM read_csv('data/raw/consulta_cand/consulta_cand_2026_SP.csv', delim=';', header=true, encoding='latin-1', all_varchar=true)
  WHERE DS_CARGO='DEPUTADO FEDERAL' AND DS_SIT_TOT_TURNO LIKE 'ELEITO%'`)).getRowObjectsJson()) as unknown as
  { SQ_CANDIDATO: string; NM_URNA_CANDIDATO: string; SG_PARTIDO: string; NR_CPF_CANDIDATO: string }[];
const hashEleito = new Map(eleitos.map((e) => [cpfHash(e.NR_CPF_CANDIDATO), e]));

// 2. Perfil dos 70 em exercício em SP (é aqui que o CPF aparece).
const emExercicio = await listarDeputados({ uf: "SP" });
const perfis = new Map<string, DeputadoPerfil>(); // hash → perfil
let semCpf = 0;
for (const d of emExercicio) {
  const p = await getDeputado(d.camaraId);
  if (!p.cpf) { semCpf++; continue; }
  perfis.set(cpfHash(p.cpf), p);
}

// 3. Quantos dos 70 eleitos já estão em exercício (reeleitos de fato).
const reeleitosReais = eleitos.filter((e) => perfis.has(cpfHash(e.NR_CPF_CANDIDATO)));
console.log(`em exercício SP: ${emExercicio.length} (sem CPF no perfil: ${semCpf})`);
console.log(`eleitos 2026 SP: ${eleitos.length} | já em exercício (join por CPF): ${reeleitosReais.length}`);

// 4. Join da amostra.
const saida: PoliticoCamara[] = [];
const semRegistro: string[] = [];
const legislaturasAntigas = [56, 55, 54, 53, 52, 51, 50];

async function montar(p: DeputadoPerfil, tse: PoliticoTse, emEx: boolean): Promise<PoliticoCamara> {
  const [orgaos, historico] = await Promise.all([getOrgaos(p.camaraId), getHistorico(p.camaraId)]);
  return {
    tseSqCandidato: tse.tseSqCandidato, camaraId: p.camaraId, join: "cpf_hash", emExercicio: emEx,
    nome: p.nome, nomeCivil: p.nomeCivil, partido: p.partido, uf: p.uf, legislatura: p.legislatura,
    fotoUrl: p.fotoUrl, emailGabinete: p.emailGabinete, telefoneGabinete: p.telefoneGabinete,
    situacao: p.situacao, condicaoEleitoral: p.condicaoEleitoral, redesSociais: p.redesSociais, site: p.site,
    orgaosAtuais: orgaos.filter((o) => !o.fim), historico,
  };
}

for (const tse of amostra) {
  if (tse.cargo === "senador" && tse.amostra === "senador_exercicio") continue; // Senado é a E6
  const p = perfis.get(tse.cpfHash);
  if (p) { saida.push(await montar(p, tse, true)); continue; }

  // Não está em exercício: procurar registro antigo por nome nas legislaturas anteriores,
  // confirmando sempre pelo hash do CPF.
  let achado: DeputadoPerfil | null = null;
  for (const leg of legislaturasAntigas) {
    const cands = await listarDeputados({ nome: tse.nomeUrna, legislatura: leg });
    for (const cand of cands) {
      const perfil = await getDeputado(cand.camaraId);
      if (perfil.cpf && cpfHash(perfil.cpf) === tse.cpfHash) { achado = perfil; break; }
    }
    if (achado) break;
  }
  if (achado) saida.push(await montar(achado, tse, false));
  else semRegistro.push(tse.nomeUrna);
}

writeFileSync("data/sonda/politicos-camara.json", JSON.stringify(saida, null, 2) + "\n");

console.log(`\namostra com registro na Câmara: ${saida.length}`);
for (const s of saida) {
  const tse = amostra.find((a) => a.tseSqCandidato === s.tseSqCandidato)!;
  console.log(`  ${tse.amostra.padEnd(18)} ${tse.nomeUrna.padEnd(26)} → ${String(s.camaraId).padEnd(7)} ${s.nome.padEnd(32)} ${s.partido.padEnd(8)} ${s.emExercicio ? "em exercício" : `legislatura ${s.legislatura}`}  ${s.situacao ?? "-"}  email=${s.emailGabinete ? "ok" : "NULO"}`);
}
console.log(`\nsem registro na Câmara até 01/02/2027: ${semRegistro.join("; ") || "nenhum"}`);

// 5. Os 4 ambíguos da E1, resolvidos pelo CPF.
const ambiguos = ["MOTTA", "PASTOR MARCO FELICIANO", "LUIZ PHILIPPE DE O E BRAGANÇA", "PAULO FREIRE"];
console.log("\nambíguos da E1:");
for (const e of eleitos.filter((x) => ambiguos.includes(x.NM_URNA_CANDIDATO))) {
  const p = perfis.get(cpfHash(e.NR_CPF_CANDIDATO));
  console.log(`  ${e.NM_URNA_CANDIDATO.padEnd(32)} → ${p ? `reeleito: ${p.nome} (${p.camaraId})` : "não está em exercício"}`);
}
