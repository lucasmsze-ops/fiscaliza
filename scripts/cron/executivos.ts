/**
 * Job `executivos` (2026-11-13): presidente e governadores eleitos em 2026, do `consulta_cand` do TSE
 * (o mesmo arquivo que o job `parlamentares` lê, baixado a cada execução). Mostrados na Visão geral
 * com "posse em 1º/1/2027": não há fonte aberta de quem está no cargo hoje (governadores que
 * renunciaram em abril de 2026 para disputar a eleição), então só o eleito, com a data da posse.
 *
 * O arquivo traz cada UF num CSV próprio e, de novo, no consolidado `_BRASIL`: só os das UFs e o
 * `_BR` (presidente). No 2º turno o candidato tem uma linha por turno: vale a linha "ELEITO". CPF e
 * data de nascimento não são lidos.
 */
import { DuckDBInstance } from "@duckdb/node-api";
import { siglaPartido } from "../../lib/partidos";
import { fotoUrlTse } from "../../lib/tse";
import type { LinhaBruta } from "./estado";

const RAW = process.env.FISCALIZA_TSE ?? "data/raw";
const UFS = ["AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"];

export async function jobExecutivos(): Promise<{ tabelas: Record<string, LinhaBruta[]>; relatorio: string[]; falhas: number; atualizadas: string[] }> {
  const c = await (await DuckDBInstance.create(":memory:")).connect();
  const arqs = `[${[...UFS, "BR"].map((uf) => `'${RAW}/consulta_cand/consulta_cand_2026_${uf}.csv'`).join(",")}]`;
  const rows = (await (await c.run(`SELECT DISTINCT SQ_CANDIDATO sq, SG_UF uf, DS_CARGO cargo, NM_URNA_CANDIDATO "nomeUrna", NM_CANDIDATO nome, DS_GENERO genero, SG_PARTIDO partido, NR_CANDIDATO numero
    FROM read_csv(${arqs}, delim=';', header=true, quote='"', encoding='latin-1', all_varchar=true, union_by_name=true)
    WHERE DS_CARGO IN ('PRESIDENTE', 'GOVERNADOR') AND DS_SIT_TOT_TURNO = 'ELEITO'`)).getRowObjectsJson()) as unknown as
    { sq: string; uf: string; cargo: string; nomeUrna: string; nome: string; genero: string; partido: string; numero: string }[];

  const linhas: LinhaBruta[] = rows.map((r) => ({
    id: `2026:${r.sq}`, ano: 2026, cargo: r.cargo === "PRESIDENTE" ? "presidente" : "governador", uf: r.cargo === "PRESIDENTE" ? null : r.uf,
    nome: r.nome, nome_urna: r.nomeUrna, genero: r.genero === "FEMININO" ? "feminino" : r.genero === "MASCULINO" ? "masculino" : null,
    partido: siglaPartido(r.partido), numero_urna: Number(r.numero), tse_sq_candidato: r.sq,
    // Fotos por eleição: presidente na federal (6257), governador na estadual (6259); ver ele-c.json do TSE.
    foto_url: fotoUrlTse("ele2026", r.cargo === "PRESIDENTE" ? "6257" : "6259", r.uf, r.sq), posse: "2027-01-01",
  })).sort((a, b) => String(a.id).localeCompare(String(b.id)));

  // Conferência: 1 presidente e 1 governador por UF; senão o arquivo veio incompleto e nada muda.
  const gov = new Set(linhas.filter((l) => l.cargo === "governador").map((l) => l.uf));
  const pres = linhas.filter((l) => l.cargo === "presidente").length;
  if (pres !== 1 || gov.size !== 27 || linhas.length !== 28) {
    return { tabelas: {}, relatorio: [`eleitos inesperados no arquivo do TSE (presidente: ${pres}, governadores: ${gov.size} UFs em ${linhas.length - pres} linhas): nada gravado`], falhas: 1, atualizadas: [] };
  }
  return { tabelas: { executivos: linhas }, relatorio: [`1 presidente e 27 governadores eleitos em 2026 (posse em 1º/1/2027)`], falhas: 0, atualizadas: ["tse_executivos"] };
}
