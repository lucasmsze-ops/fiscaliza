/**
 * Os três números do card. Só aritmética sobre tipos internos; sem I/O.
 * Metodologia espelhada em /como-funciona (atualizar os dois juntos).
 */
import type { Orientacao, TipoVoto, Votacao, Voto } from "./types";

/**
 * Votos que contam como "registrou voto". `art17` é o presidente da sessão, que não vota mas
 * está presente; `nao_informado` é voto registrado cujo valor a API não divulga.
 */
const REGISTRA_VOTO: ReadonlySet<TipoVoto> = new Set(["sim", "nao", "abstencao", "obstrucao", "art17", "nao_informado"]);

/** Orientações que expressam posição. "Liberado" e vazio não entram no governismo. */
const ORIENTACAO_POSICIONAL: ReadonlySet<string> = new Set(["Sim", "Não", "Obstrução"]);

/** Votos que expressam posição frente a uma orientação. */
const VOTO_POSICIONAL: ReadonlySet<TipoVoto> = new Set(["sim", "nao", "obstrucao"]);

const ORIENTACAO_PARA_VOTO: Record<string, TipoVoto> = { Sim: "sim", Não: "nao", Obstrução: "obstrucao" };

export interface Indicador {
  /** 0–100, arredondado a uma casa; null quando `denominador` é 0. */
  percentual: number | null;
  numerador: number;
  denominador: number;
}

function indicador(numerador: number, denominador: number): Indicador {
  return { numerador, denominador, percentual: denominador === 0 ? null : Math.round((1000 * numerador) / denominador) / 10 };
}

export interface Periodo { inicio: string; fim: string } // ISO, inclusivo

const noPeriodo = (v: Votacao, p?: Periodo) => !p || (v.data >= p.inicio && v.data <= p.fim);

/**
 * Participação em votações: % das votações nominais do plenário (no período) em que o político
 * registrou voto. Quem não aparece na lista de votos é `ausente`.
 */
export function participacao(votacoes: Votacao[], votosDoPolitico: Voto[], periodo?: Periodo): Indicador {
  const porVotacao = new Map(votosDoPolitico.map((v) => [v.votacaoId, v.voto]));
  let n = 0, d = 0;
  for (const v of votacoes) {
    if (!noPeriodo(v, periodo)) continue;
    d++;
    const voto = porVotacao.get(v.idExterno) ?? "ausente";
    if (REGISTRA_VOTO.has(voto)) n++;
  }
  return indicador(n, d);
}

/**
 * Governismo: % dos votos posicionais (Sim/Não/Obstrução) alinhados à orientação "Governo"
 * nas votações em que o Governo orientou Sim, Não ou Obstrução. Ausência, abstenção, art. 17,
 * orientação "Liberado" ou vazia ficam fora do denominador. Calcular por período de governo.
 */
export function governismo(votacoes: Votacao[], votosDoPolitico: Voto[], orientacoes: Orientacao[], periodo?: Periodo): Indicador {
  const orientacaoGoverno = new Map<string, string>();
  for (const o of orientacoes) if (o.bancada === "Governo" && ORIENTACAO_POSICIONAL.has(o.orientacao)) orientacaoGoverno.set(o.votacaoId, o.orientacao);
  const porVotacao = new Map(votosDoPolitico.map((v) => [v.votacaoId, v.voto]));
  let n = 0, d = 0;
  for (const v of votacoes) {
    if (!noPeriodo(v, periodo)) continue;
    const ori = orientacaoGoverno.get(v.idExterno);
    const voto = porVotacao.get(v.idExterno);
    if (!ori || !voto || !VOTO_POSICIONAL.has(voto)) continue;
    d++;
    if (ORIENTACAO_PARA_VOTO[ori] === voto) n++;
  }
  return indicador(n, d);
}

/** Resposta do usuário no quiz: a favor ou contra a proposição. */
export type RespostaQuiz = "sim" | "nao";

/**
 * Concordância com você: % das votações do quiz respondidas em que o voto do político
 * (Sim/Não) coincide com a resposta. Sem resposta: null. Político sem voto posicional: fora do denominador.
 */
export function concordancia(respostas: Record<string, RespostaQuiz>, votosDoPolitico: Voto[]): Indicador {
  const porVotacao = new Map(votosDoPolitico.map((v) => [v.votacaoId, v.voto]));
  let n = 0, d = 0;
  for (const [votacaoId, resposta] of Object.entries(respostas)) {
    const voto = porVotacao.get(votacaoId);
    if (voto !== "sim" && voto !== "nao") continue;
    d++;
    if (voto === resposta) n++;
  }
  return indicador(n, d);
}
