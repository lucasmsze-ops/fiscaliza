/**
 * E8 — Bancada de SP na Câmara: perfil e histórico dos 70 deputados em exercício e join por
 * hash de CPF com TODOS os candidatos de SP em 2026 (deputado federal e senador).
 *
 * Por quê: o consulta_cand 2026 não diz quem concorre à reeleição; "reeleito" só sai deste join.
 * E o top-20 por município (E7) traz deputados em exercício que não estão na amostra.
 *
 * Entrada: data/raw/consulta_cand/consulta_cand_2026_SP.csv
 * Saída:   data/sonda/bancada-camara.json (sem CPF nem hash: só o par camaraId ↔ tseSqCandidato)
 * Incremental: quem já está no arquivo não é buscado de novo (a API devolve 504 em rajadas).
 * `--refazer` ignora o arquivo.
 */
import { DuckDBInstance } from "@duckdb/node-api";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { mapLimite } from "../../lib/async";
import { getDeputado, getHistorico, listarDeputados, type DeputadoPerfil, type HistoricoDeputado } from "../../lib/camara";

const cpfHash = (cpf: string) => createHash("sha256").update(cpf.replace(/\D/g, "").padStart(11, "0")).digest("hex");
const t0 = Date.now();
const marca = () => `${((Date.now() - t0) / 1000).toFixed(0)}s`;

export interface DeputadoBancada extends Omit<DeputadoPerfil, "cpf"> {
  /** Candidatura de 2026 casada pelo hash do CPF; null se não concorreu em SP. */
  tseSqCandidato: string | null;
  tseCargo2026: string | null;
  historico: HistoricoDeputado[];
}

const inst = await DuckDBInstance.create(":memory:");
const c = await inst.connect();
const cands = (await (await c.run(`
  SELECT SQ_CANDIDATO sq, DS_CARGO cargo, NR_CPF_CANDIDATO cpf
  FROM read_csv('data/raw/consulta_cand/consulta_cand_2026_SP.csv', delim=';', header=true, quote='"', encoding='latin-1', all_varchar=true)
  WHERE DS_CARGO IN ('DEPUTADO FEDERAL', 'SENADOR')`)).getRowObjectsJson()) as unknown as { sq: string; cargo: string; cpf: string }[];
const porHash = new Map(cands.map((x) => [cpfHash(x.cpf), x]));

const SAIDA = "data/sonda/bancada-camara.json";
const anteriores: DeputadoBancada[] = existsSync(SAIDA) && !process.argv.includes("--refazer") ? JSON.parse(readFileSync(SAIDA, "utf8")) : [];
const lista = await listarDeputados({ uf: "SP" });
const idsAtuais = new Set(lista.map((d) => d.camaraId));
const jaTem = new Set(anteriores.filter((d) => idsAtuais.has(d.camaraId)).map((d) => d.camaraId));
const res = await mapLimite(lista.filter((d) => !jaTem.has(d.camaraId)), 2, async (d) => {
  const [p, historico] = await Promise.all([getDeputado(d.camaraId), getHistorico(d.camaraId)]);
  const cand = p.cpf ? porHash.get(cpfHash(p.cpf)) : undefined;
  const { cpf: _cpf, ...semCpf } = p;
  return { ...semCpf, tseSqCandidato: cand?.sq ?? null, tseCargo2026: cand?.cargo ?? null, historico } satisfies DeputadoBancada;
});
const bancada = [...anteriores.filter((d) => idsAtuais.has(d.camaraId)), ...res.ok].sort((a, b) => a.camaraId - b.camaraId);
writeFileSync(SAIDA, JSON.stringify(bancada, null, 1) + "\n");

const porCargo = new Map<string, number>();
for (const d of bancada) porCargo.set(d.tseCargo2026 ?? "não concorreu em SP", (porCargo.get(d.tseCargo2026 ?? "não concorreu em SP") ?? 0) + 1);
console.log(`[${marca()}] em exercício SP: ${lista.length} · já no arquivo ${jaTem.size} · buscados agora ${res.ok.length} · falhas ${res.falhas.length} · total ${bancada.length}`);
console.log("candidatura 2026 pelo CPF:", Object.fromEntries(porCargo));
