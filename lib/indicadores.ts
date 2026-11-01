/**
 * Os três números do card. Só aritmética sobre tipos internos; sem I/O.
 * Metodologia espelhada em /como-funciona (atualizar os dois juntos).
 */
import type { Orientacao, TipoVoto, Votacao, Voto } from "./types";

/** O que os indicadores precisam de cada tabela. `Voto.votacaoId` casa com `Votacao.id`. */
export type VotacaoBase = Pick<Votacao, "id" | "data">;
export type VotoBase = Pick<Voto, "votacaoId" | "voto">;
export type OrientacaoBase = Pick<Orientacao, "votacaoId" | "bancada" | "orientacao">;

/**
 * Votos que contam como "registrou voto". `art17` é o presidente da sessão, que não vota mas
 * está presente; `nao_informado` é voto registrado cujo valor a API não divulga; `secreto` é
 * voto registrado em votação secreta do Senado (a direção não é pública).
 */
const REGISTRA_VOTO: ReadonlySet<TipoVoto> = new Set(["sim", "nao", "abstencao", "obstrucao", "art17", "nao_informado", "secreto"]);

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

/** Período em exercício do mandato; `fim` null = em curso. Ver `Mandato`. */
export interface Exercicio { inicio: string; fim: string | null }

const noPeriodo = (v: VotacaoBase, p?: Periodo) => !p || (v.data >= p.inicio && v.data <= p.fim);
const emExercicio = (v: VotacaoBase, ex?: Exercicio[]) => !ex || ex.some((e) => v.data >= e.inicio && (e.fim === null || v.data <= e.fim));

/**
 * Participação em votações: % das votações nominais do plenário (no período e dentro de algum
 * mandato em exercício, se `exercicio` for informado) em que o político registrou voto. Quem não
 * aparece na lista de votos é `ausente`. Votação secreta (Senado) conta: o painel registra que
 * votou, só não diz como. Sem mandato no período: denominador 0 → percentual null
 * ("sem mandato no período", nunca 0%). Licença dentro do mandato não é descontada.
 */
export function participacao(votacoes: VotacaoBase[], votosDoPolitico: VotoBase[], periodo?: Periodo, exercicio?: Exercicio[]): Indicador {
  const porVotacao = new Map(votosDoPolitico.map((v) => [v.votacaoId, v.voto]));
  let n = 0, d = 0;
  for (const v of votacoes) {
    if (!noPeriodo(v, periodo) || !emExercicio(v, exercicio)) continue;
    d++;
    const voto = porVotacao.get(v.id) ?? "ausente";
    if (REGISTRA_VOTO.has(voto)) n++;
  }
  return indicador(n, d);
}

/**
 * Governismo: % dos votos posicionais (Sim/Não/Obstrução) alinhados à orientação "Governo"
 * nas votações em que o Governo orientou Sim, Não ou Obstrução. Ausência, abstenção, art. 17,
 * orientação "Liberado" ou vazia ficam fora do denominador. Calcular por período de governo.
 */
export function governismo(votacoes: VotacaoBase[], votosDoPolitico: VotoBase[], orientacoes: OrientacaoBase[], periodo?: Periodo): Indicador {
  const orientacaoGoverno = new Map<string, string>();
  for (const o of orientacoes) if (o.bancada === "Governo" && ORIENTACAO_POSICIONAL.has(o.orientacao)) orientacaoGoverno.set(o.votacaoId, o.orientacao);
  const porVotacao = new Map(votosDoPolitico.map((v) => [v.votacaoId, v.voto]));
  let n = 0, d = 0;
  for (const v of votacoes) {
    if (!noPeriodo(v, periodo)) continue;
    const ori = orientacaoGoverno.get(v.id);
    const voto = porVotacao.get(v.id);
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
export function concordancia(respostas: Record<string, RespostaQuiz>, votosDoPolitico: VotoBase[]): Indicador {
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

/**
 * Dias afastado no período: união dos afastamentos oficiais (licenças dentro do mandato),
 * recortada a [periodo.inicio, min(periodo.fim, hoje)], contando dias inteiros e inclusivos.
 * Mostrado ao lado da participação, que não desconta licença (decisão de 2026-11-01).
 */
export function diasAfastado(afastamentos: Exercicio[], periodo: Periodo, hoje: string): number {
  const dia = (iso: string) => Math.floor(Date.parse(`${iso}T00:00:00Z`) / 86_400_000);
  const ini = dia(periodo.inicio), fim = Math.min(dia(periodo.fim), dia(hoje));
  const faixas = afastamentos
    .map((a) => [Math.max(dia(a.inicio), ini), Math.min(a.fim === null ? fim : dia(a.fim), fim)] as [number, number])
    .filter(([a, b]) => a <= b)
    .sort((x, y) => x[0] - y[0]);
  let total = 0, aberto: [number, number] | null = null;
  for (const f of faixas) {
    if (aberto && f[0] <= aberto[1] + 1) aberto[1] = Math.max(aberto[1], f[1]);
    else { if (aberto) total += aberto[1] - aberto[0] + 1; aberto = [f[0], f[1]]; }
  }
  return aberto ? total + aberto[1] - aberto[0] + 1 : total;
}
