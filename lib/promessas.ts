/**
 * Promessas dos planos de governo 2027–2030 (crachá do executivo, E23n). A lista vem de
 * `data/promessas/2026.json`: texto literal e página do PDF registrado no TSE, selecionada a partir de
 * todas as frases de compromisso e aprovada pelo usuário em 2026-11-14 (docs/promessas/).
 *
 * Status só por ato oficial (Diário Oficial, Câmara, Senado, Assembleia) ou dado oficial, sempre com
 * link, registrado à mão. Sem ato, "sem ato oficial ainda". Nunca "cumprida", "em risco" ou percentual
 * do plano (CLAUDE.md, princípios 4 e 5).
 */
import dados from "@/data/promessas/2026.json";

export interface AtoOficial {
  data: string;
  /** O que o ato é, em uma frase ("Decreto nº ... institui a Política ..."). */
  descricao: string;
  url: string;
  /** Quem publicou: "DOU", "DOE-SP", "Câmara", "Senado", "Alesp", "INEP"... */
  fonte: string;
}

export interface Promessa {
  id: string;
  area: string;
  /** Texto literal do plano, entre aspas (às vezes dois trechos do mesmo item). */
  texto: string;
  pagina: number;
  paginaFim?: number;
  tipo: string;
  /** O ato ou o dado oficial que o site mostraria ao lado. */
  marcaria: string;
  atos: AtoOficial[];
}

export interface PlanoDeGoverno {
  cargo: "presidente" | "governador";
  uf: string | null;
  tseSqCandidato: string;
  arquivo: string;
  zip: string;
  aprovadoEm: string;
  promessas: Promessa[];
}

const PLANOS = (dados as { planos: PlanoDeGoverno[] }).planos;

/** O plano com promessas selecionadas deste eleito, se houver (hoje, Lula e Tarcísio). */
export const planoDe = (tseSqCandidato: string): PlanoDeGoverno | null =>
  PLANOS.find((p) => p.tseSqCandidato === tseSqCandidato) ?? null;
