import type { Cargo, Politico } from "./types";

/**
 * Ordem da lista de mais votados de uma cidade: cargo, posição, votos; no empate (mesma posição e
 * votos), número de urna crescente e, por fim, o id. Regra explícita para as duas origens de dados
 * (JSON e Supabase) darem a mesma ordem; a ordem dentro do empate não tem significado (LACUNAS).
 */
export function ordemNaCidade(a: { cargo: Cargo; posicao: number; votos: number; politico: Politico }, b: typeof a): number {
  const urna = (p: Politico) => (p.numeroUrna ? Number(p.numeroUrna) : Number.MAX_SAFE_INTEGER);
  return a.cargo.localeCompare(b.cargo) || a.posicao - b.posicao || b.votos - a.votos
    || urna(a.politico) - urna(b.politico) || a.politico.id.localeCompare(b.politico.id);
}
