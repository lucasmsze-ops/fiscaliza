/**
 * "Quem votei" (aba da tela Monitorando, pedido de 2026-11-19): o santinho de quem a pessoa votou, na ordem
 * da urna. Fica só no navegador (lib/quem-votei-estado.ts); aqui ficam os tipos e as regras, sem estado.
 * Quem foi eleito entra automaticamente no Monitorando; quem não foi fica com o "Monitorar" desligado.
 */
import type { ExecutivoEleito, Status } from "./types";

/** Eleições que a aba conhece. Por enquanto só a mais recente (o filtro existe para as próximas). */
export const ELEICOES = [{ ano: 2026, rotulo: "Eleição de 2026", turnos: "4 e 25 de outubro de 2026" }] as const;
export type AnoEleicao = (typeof ELEICOES)[number]["ano"];

/** Cargos na ordem da urna de 2026. `acompanha`: false quando o Fiscaliza ainda não tem dado do cargo. */
export const CARGOS = [
  { chave: "deputado_federal", rotulo: "Deputado federal", vagas: 1, acompanha: true },
  { chave: "deputado_estadual", rotulo: "Deputado estadual ou distrital", vagas: 1, acompanha: false },
  { chave: "senador", rotulo: "Senador", vagas: 2, acompanha: true },
  { chave: "governador", rotulo: "Governador", vagas: 1, acompanha: true },
  { chave: "presidente", rotulo: "Presidente", vagas: 1, acompanha: true },
] as const;
export type CargoSantinho = (typeof CARGOS)[number]["chave"];

/** Uma escolha do santinho: um político do índice (/dados/politicos) ou um executivo (/dados/executivos). */
export interface Escolha {
  id: string;
  nome: string;
  tipo: "politico" | "executivo";
  /** Eleito em 2026: libera o "Monitorar" e entra automaticamente no Monitorando. */
  eleito: boolean;
  /** Guardados com a escolha, para o santinho aparecer sem baixar o índice inteiro. */
  fotoUrl: string | null;
  /** "PT-SP" (ou só o partido, no presidente). */
  partido: string;
  /** "Eleito em 2026", "Não eleita em 2026", "Suplente em 2026". */
  situacao: string;
  /** Crachá, quando existe. */
  href: string | null;
}

export interface Santinho {
  /** Onde a pessoa votou: filtra deputados, senadores e governadores. */
  uf: string | null;
  escolhas: Partial<Record<CargoSantinho, Escolha[]>>;
}

export const eleitoNoStatus = (st: Status) => st === "eleito" || st === "reeleito";

/** Item do índice de executivos: presidente e governadores de 2026 (hoje, só os eleitos). */
export interface ItemExecutivo {
  /** Id do Monitorando e da escolha: "executivo-presidente" ou "executivo-sp". */
  id: string;
  cargo: "presidente" | "governador";
  uf: string | null;
  nomeUrna: string;
  partido: string;
  fotoUrl: string | null;
  eleito: boolean;
  /** Crachá do executivo, quando existe (só para os eleitos). */
  href: string | null;
  busca: string;
}

export const idExecutivo = (e: Pick<ExecutivoEleito, "cargo" | "uf">) => `executivo-${e.cargo === "presidente" ? "presidente" : (e.uf ?? "").toLowerCase()}`;
export const hrefExecutivo = (e: Pick<ExecutivoEleito, "cargo" | "uf">) => `/executivos/${e.cargo === "presidente" ? "presidente" : (e.uf ?? "").toLowerCase()}`;
