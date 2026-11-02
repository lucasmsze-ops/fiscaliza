/**
 * Quiz de concordância (E13). Roda no navegador: as respostas vivem só no localStorage
 * (CLAUDE.md: sem conta, sem dado pessoal). Regras em docs/METODOLOGIA.md.
 */
import { concordancia, type Indicador } from "./indicadores";
import type { TipoVoto } from "./types";

export type Resposta = "sim" | "nao";
/** Respostas por id de pergunta do quiz (ex.: "pec-45-2019"). */
export type Respostas = Record<string, Resposta>;

/** Voto do político numa pergunta do quiz: a votação da Casa dele, ou null se não havia mandato/registro. */
export interface VotoQuiz {
  itemId: string;
  titulo: string;
  materia: string;
  data: string;
  voto: TipoVoto | null;
}

export const CHAVE_RESPOSTAS = "fiscaliza.respostas.v1";
/** Abaixo disso, o percentual não aparece: "poucos votos para comparar" (decisão de 2026-11-01). */
export const MIN_COMPARAVEIS = 3;
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function lerRespostas(bruto: string | null): Respostas {
  try {
    const o = JSON.parse(bruto ?? "{}") as unknown;
    if (!o || typeof o !== "object" || Array.isArray(o)) return {};
    return Object.fromEntries(Object.entries(o).filter(([k, v]) => ID.test(k) && (v === "sim" || v === "nao"))) as Respostas;
  } catch {
    return {};
  }
}

/** Concordância do político com as respostas: só perguntas respondidas em que ele votou Sim ou Não. */
export function concordanciaQuiz(respostas: Respostas, votos: VotoQuiz[]): Indicador {
  return concordancia(respostas, votos.filter((v) => v.voto !== null).map((v) => ({ votacaoId: v.itemId, voto: v.voto! })));
}

export const exibivel = (i: Indicador) => i.percentual !== null && i.denominador >= MIN_COMPARAVEIS;

/** A primeira votação (na ordem do quiz) em que o voto Sim/Não do político diferiu da resposta. */
export function votacaoDiscordante(respostas: Respostas, votos: VotoQuiz[]): (VotoQuiz & { resposta: Resposta }) | null {
  for (const v of votos) {
    const r = respostas[v.itemId];
    if (r && (v.voto === "sim" || v.voto === "nao") && v.voto !== r) return { ...v, resposta: r };
  }
  return null;
}
