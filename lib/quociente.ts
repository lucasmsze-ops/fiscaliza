/**
 * Distribuição das vagas de deputado (sistema proporcional). Só aritmética; sem I/O.
 * Metodologia espelhada em /como-funciona (atualizar os dois juntos).
 *
 * Regras (Código Eleitoral arts. 106–109 com a Lei 14.211/2021; Res.-TSE 23.677/2021 art. 11;
 * STF, ADIs 7228/7263/7325, 2024, que abriu a última fase a todos):
 * 1. QE = votos válidos (nominais + legenda) ÷ vagas, desprezada a fração ≤ 0,5 e arredondada
 *    para cima se > 0,5.
 * 2. QP de cada lista = votos válidos da lista ÷ QE, desprezada a fração. Federação é uma lista só.
 * 3. As vagas do QP vão aos mais votados da lista com votação nominal ≥ 10% do QE. Se faltar
 *    candidato com 10%, a vaga não preenchida vai para as sobras.
 * 4. Sobras, fase 1: só listas com ≥ 80% do QE e que ainda tenham candidato não eleito com
 *    ≥ 20% do QE. Cada vaga vai à maior média = votos válidos ÷ (vagas obtidas por QP +
 *    vagas obtidas por média + 1), e dentro da lista ao mais votado com ≥ 20% do QE.
 * 5. Sobras, fase 2: quando nenhuma lista atende a fase 1, as vagas restantes vão a todas as
 *    listas pela maior média, ao mais votado não eleito, sem votação mínima.
 * Empate de média: maior votação válida da lista. Empate de votos entre candidatos: o mais idoso
 * (art. 110), quando a data de nascimento é informada.
 */

export interface CandidatoLista {
  id: string;
  votos: number;
  /** ISO; desempata candidatos com a mesma votação (o mais idoso vence). */
  nascimento?: string | null;
}

export interface Lista {
  /** Partido isolado ou federação. */
  id: string;
  /** Votos de legenda válidos (inclui nominais convertidos em legenda). */
  votosLegenda: number;
  candidatos: CandidatoLista[];
}

export type FormaEleicao = "qp" | "media" | "media_sem_exigencia";

export interface EleitoLista {
  candidatoId: string;
  listaId: string;
  por: FormaEleicao;
  /** Ordem da vaga nas sobras (1 = primeira média); null para QP. */
  rodada: number | null;
}

export interface ResultadoLista {
  id: string;
  votosNominais: number;
  votosLegenda: number;
  votosValidos: number;
  /** Vagas obtidas por QP (antes da exigência de 10%). */
  vagasQP: number;
  preenchidasQP: number;
  vagasMedia: number;
  total: number;
}

export interface Distribuicao {
  vagas: number;
  votosValidos: number;
  qe: number;
  listas: ResultadoLista[];
  eleitos: EleitoLista[];
  /** Vagas que ficaram sem candidato (lista sem ninguém restante). Esperado: 0. */
  vagasNaoPreenchidas: number;
}

/** QE com o arredondamento do art. 106: fração ≤ 0,5 desprezada, > 0,5 sobe. Aritmética inteira. */
export function quocienteEleitoral(votosValidos: number, vagas: number): number {
  const q = Math.floor(votosValidos / vagas);
  const resto = votosValidos - q * vagas;
  return 2 * resto > vagas ? q + 1 : q;
}

// Limiares sem ponto flutuante: v ≥ p% de QE  ⇔  100·v ≥ p·QE.
const atinge = (votos: number, qe: number, pct: number) => 100 * votos >= pct * qe;

const ordemCandidatos = (a: CandidatoLista, b: CandidatoLista) =>
  b.votos - a.votos || (a.nascimento ?? "9999").localeCompare(b.nascimento ?? "9999") || a.id.localeCompare(b.id);

export function distribuirVagas(vagas: number, listas: Lista[]): Distribuicao {
  const base = listas.map((l) => {
    const votosNominais = l.candidatos.reduce((s, c) => s + c.votos, 0);
    return { lista: l, votosNominais, votosValidos: votosNominais + l.votosLegenda, fila: [...l.candidatos].sort(ordemCandidatos) };
  });
  const votosValidos = base.reduce((s, b) => s + b.votosValidos, 0);
  const qe = quocienteEleitoral(votosValidos, vagas);
  const eleitos: EleitoLista[] = [];

  const estado = base.map((b) => {
    const vagasQP = qe > 0 ? Math.floor(b.votosValidos / qe) : 0;
    const aptos10 = b.fila.filter((c) => atinge(c.votos, qe, 10));
    const preenchidasQP = Math.min(vagasQP, aptos10.length);
    for (const c of aptos10.slice(0, preenchidasQP)) eleitos.push({ candidatoId: c.id, listaId: b.lista.id, por: "qp", rodada: null });
    return { ...b, vagasQP, preenchidasQP, vagasMedia: 0, proximo: preenchidasQP };
  });

  let restantes = vagas - estado.reduce((s, e) => s + e.preenchidasQP, 0);
  let rodada = 0;
  let semExigencia = false;
  while (restantes > 0) {
    const candidatoDaVez = (e: (typeof estado)[number]) => e.fila[e.proximo];
    const elegivel = (e: (typeof estado)[number]) => {
      const c = candidatoDaVez(e);
      if (!c) return false;
      return semExigencia || (atinge(e.votosValidos, qe, 80) && atinge(c.votos, qe, 20));
    };
    const disputa = estado.filter(elegivel);
    if (disputa.length === 0) {
      if (semExigencia) break; // ninguém tem candidato restante
      semExigencia = true;
      continue;
    }
    // Maior média por produto cruzado (exato): a/da > b/db ⇔ a·db > b·da.
    let melhor = disputa[0]!;
    for (const e of disputa.slice(1)) {
      const dE = e.vagasQP + e.vagasMedia + 1, dM = melhor.vagasQP + melhor.vagasMedia + 1;
      const cmp = e.votosValidos * dM - melhor.votosValidos * dE;
      if (cmp > 0 || (cmp === 0 && e.votosValidos > melhor.votosValidos)) melhor = e;
    }
    const c = candidatoDaVez(melhor)!;
    melhor.vagasMedia++;
    melhor.proximo++;
    restantes--;
    eleitos.push({ candidatoId: c.id, listaId: melhor.lista.id, por: semExigencia ? "media_sem_exigencia" : "media", rodada: ++rodada });
  }

  return {
    vagas, votosValidos, qe, eleitos, vagasNaoPreenchidas: restantes,
    listas: estado.map((e) => ({
      id: e.lista.id, votosNominais: e.votosNominais, votosLegenda: e.lista.votosLegenda, votosValidos: e.votosValidos,
      vagasQP: e.vagasQP, preenchidasQP: e.preenchidasQP, vagasMedia: e.vagasMedia, total: e.preenchidasQP + e.vagasMedia,
    })),
  };
}

/**
 * A frase do card. Nunca "ajudou a eleger Z": o voto vai para a lista, não para um candidato.
 * `nomeLista`: sigla do partido isolado ou nome oficial da federação.
 */
export function fraseVotoContou(nomeLista: string, eleitos: number, uf: string): string {
  return eleitos === 0
    ? `seu voto contou para ${nomeLista}, que não elegeu ninguém em ${uf}`
    : `seu voto contou para ${nomeLista}, que elegeu ${eleitos} em ${uf}`;
}
