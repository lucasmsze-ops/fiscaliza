/**
 * E23x — Regras fixas sobre os atos do presidente (legislação federal pelo Senado) e os vetos (Congresso).
 * Nada é resumido nem escrito por nós: a regra só separa a rotina e conta o resultado dos vetos.
 */

/**
 * Atos de rotina que ficam recolhidos em "O que o presidente assinou" (a lista mostra os demais). Regra sobre o começo
 * da ementa oficial, conferida em 3.164 atos de 2023 a 2026:
 * - credito: "Abre ao Orçamento Fiscal...", "Abre crédito extraordinário..." (leis, MPs e decretos);
 * - acordo: "Promulga o Acordo/a Convenção/o Protocolo..." (todo "Promulga" da lista é instrumento internacional);
 * - desapropriacao: "Declara de interesse social [ou utilidade pública], para fins de desapropriação...";
 * - radiodifusao: outorga, renovação, transferência ou extinção de concessão de rádio e TV (não as regras do setor).
 */
export type GrupoRotina = "credito" | "acordo" | "desapropriacao" | "radiodifusao";

export const NOME_ROTINA: Record<GrupoRotina, string> = {
  credito: "Créditos no orçamento",
  acordo: "Acordos internacionais promulgados",
  desapropriacao: "Desapropriações",
  radiodifusao: "Concessões de rádio e TV",
};

const REGRAS: [GrupoRotina, RegExp][] = [
  ["credito", /^Abrem?\b.*\b(cr[ée]ditos?|Or[çc]amentos?)\b/i],
  ["acordo", /^Promulga\b/i],
  ["desapropriacao", /^Declara de (interesse social|utilidade p[úu]blica)\b/i],
  ["radiodifusao", /^(Renova|Outorga|Transfere|Extingue|Torna sem efeito|Autoriza)\b.*radiodifus/i],
];

export function grupoRotina(ementa: string | null): GrupoRotina | null {
  const e = (ementa ?? "").trim();
  return REGRAS.find(([, r]) => r.test(e))?.[0] ?? null;
}

/** Contagem dos dispositivos de um veto pela situação que o Congresso registra. */
export interface ContagemVeto { mantidos: number; derrubados: number; prejudicados: number; pendentes: number }

/** Situação de cada dispositivo como a fonte escreve: "Rejeitado" é o veto derrubado; "Não Apreciado", ainda sem voto. */
export function contarDispositivos(situacoes: string[]): ContagemVeto & { desconhecidas: string[] } {
  const c = { mantidos: 0, derrubados: 0, prejudicados: 0, pendentes: 0, desconhecidas: [] as string[] };
  for (const s of situacoes) {
    if (s === "Mantido") c.mantidos++;
    else if (s === "Rejeitado") c.derrubados++;
    else if (s === "Prejudicado") c.prejudicados++;
    else if (s === "Não Apreciado") c.pendentes++;
    else c.desconhecidas.push(s);
  }
  return c;
}

/**
 * Situação do veto no placar: derrubado se o Congresso derrubou pelo menos um dispositivo (no todo ou em parte, mesmo
 * com outros ainda por votar); senão, aguardando se falta votar algum; senão, mantido (inclui prejudicado: o veto não
 * foi derrubado). Regra em /como-funciona.
 */
export type SituacaoVeto = "derrubado" | "aguardando" | "mantido";
export function situacaoVeto(c: ContagemVeto): SituacaoVeto {
  if (c.derrubados > 0) return "derrubado";
  if (c.pendentes > 0) return "aguardando";
  return "mantido";
}
