/**
 * Adapter do TSE para o que não vem em CSV: o JSON oficial de divulgação de resultados
 * (`resultados.tse.jus.br`, o mesmo que alimenta o app Resultados) e a URL pública das fotos.
 * Os CSVs de `dadosabertos.tse.jus.br` são lidos com DuckDB nos scripts.
 *
 * Paths vêm de `/oficial/comum/config/ele-c.json` (campo `arq`):
 *   resultado por município: /oficial/{ciclo}/{eleicao}/dados/{uf}/{uf}{municipio}-c{cargo:4}-e{eleicao:6}-u.json
 *   foto:                    /oficial/{ciclo}/{eleicao}/fotos/{uf}/{sq_candidato}.jpeg
 * Nada do shape cru sai deste arquivo.
 */
import { fetchJson } from "./http";

export const TSE_RESULTADOS = "https://resultados.tse.jus.br/oficial";

/** Códigos de cargo do TSE. */
export const CARGO_TSE = { senador: 5, deputado_federal: 6 } as const;
export type CargoTse = keyof typeof CARGO_TSE;

const pad = (n: number | string, w: number) => String(n).padStart(w, "0");

/** URL pública da foto de candidatura (JPEG pequeno, ~6 KB). Existe para eleitos e não eleitos. */
export function fotoUrlTse(ciclo: string, cdEleicao: string, uf: string, sqCandidato: string): string {
  return `${TSE_RESULTADOS}/${ciclo}/${cdEleicao}/fotos/${uf.toLowerCase()}/${sqCandidato}.jpeg`;
}

export interface CandidatoResultado {
  tseSqCandidato: string;
  numero: string;
  nomeUrna: string;
  /** Votos apurados no município. */
  votos: number;
  /** "Válido" ou o motivo de não ser (ex.: anulado sub judice). */
  destinacao: string;
  eleito: boolean;
  situacao: string;
  partido: string;
  /** Número da federação, ou null para partido isolado. */
  federacao: string | null;
}

export interface ResultadoMunicipio {
  cdMunicipio: string;
  cargo: CargoTse;
  vagas: number;
  /** Data e hora da totalização a que o arquivo se refere. */
  totalizadoEm: string;
  votosValidos: number;
  votosNominais: number;
  votosLegenda: number;
  candidatos: CandidatoResultado[];
}

interface ResultadoRaw {
  dt: string; ht: string;
  carg: { cd: string; nv: string; agr: { par: { sg: string; nfed: string; cand: { n: string; sqcand: string; nmu: string; vap: string; dvt: string; e: string; st: string }[] }[] }[] }[];
  v: { vv: string; vnom: string; vl: string };
}

export async function getResultadoMunicipio(ciclo: string, cdEleicao: string, uf: string, cdMunicipio: string, cargo: CargoTse): Promise<ResultadoMunicipio> {
  const u = uf.toLowerCase();
  // O nome do arquivo usa o código do município com 5 dígitos; o CSV traz sem os zeros à esquerda (RO "35").
  const url = `${TSE_RESULTADOS}/${ciclo}/${cdEleicao}/dados/${u}/${u}${pad(cdMunicipio, 5)}-c${pad(CARGO_TSE[cargo], 4)}-e${pad(cdEleicao, 6)}-u.json`;
  const raw = await fetchJson<ResultadoRaw>(url, { label: "tse:resultados/{municipio}-u.json" });
  const c = raw.carg.find((x) => Number(x.cd) === CARGO_TSE[cargo]);
  if (!c) throw new Error(`cargo ${cargo} ausente em ${url}`);
  return {
    cdMunicipio, cargo, vagas: Number(c.nv), totalizadoEm: `${raw.dt} ${raw.ht}`,
    votosValidos: Number(raw.v.vv), votosNominais: Number(raw.v.vnom), votosLegenda: Number(raw.v.vl),
    candidatos: c.agr.flatMap((a) => a.par.flatMap((p) => p.cand.map((x) => ({
      tseSqCandidato: x.sqcand, numero: x.n, nomeUrna: x.nmu, votos: Number(x.vap), destinacao: x.dvt,
      eleito: x.e === "s", situacao: x.st, partido: p.sg, federacao: p.nfed || null,
    })))),
  };
}
