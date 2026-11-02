/**
 * Montagem das linhas de `votacoes`, `votos` e `orientacoes` a partir dos adapters da Câmara e do
 * Senado. Uma regra só para a consolidação da sonda (scripts/sonda/consolidar.ts) e para o cron
 * (scripts/cron/votacoes.ts): se as duas divergissem, o cron acharia "mudanças" falsas e
 * regravaria linhas que não mudaram.
 */
import type { ProposicaoRef, VotacaoDetalhe, VotoCamara } from "./camara";
import type { VotacaoSenado } from "./senado";
import { semCpf } from "./texto";
import type { Orientacao, Placar, TipoVoto, Votacao, Voto } from "./types";

/** Votação nominal da Câmara já com o detalhe (matéria principal e objeto). */
export interface VotacaoCamaraBase {
  idExterno: string;
  data: string;
  proposicao: ProposicaoRef | null;
  objeto: string | null;
  descricao: string;
  aprovacao: 0 | 1 | null;
  urlOficial: string;
}

export function baseCamara(d: VotacaoDetalhe): VotacaoCamaraBase {
  const prop = d.proposicoesAfetadas[0] ?? null;
  const obj = d.proposicaoObjeto ?? (d.objetosPossiveis[0] ? `${d.objetosPossiveis[0].tipo} ${d.objetosPossiveis[0].numero}/${d.objetosPossiveis[0].ano}` : null);
  return {
    idExterno: d.idExterno, data: d.data, proposicao: prop, objeto: obj, descricao: d.descricao, aprovacao: d.aprovacao,
    urlOficial: prop ? `https://www.camara.leg.br/propostas-legislativas/${prop.proposicaoId}` : `https://dadosabertos.camara.leg.br/api/v2/votacoes/${d.idExterno}`,
  };
}

const conta = (vs: { voto: TipoVoto }[], t: TipoVoto) => vs.filter((x) => x.voto === t).length;
export const placarDe = (vs: { voto: TipoVoto }[]): Placar => ({ sim: conta(vs, "sim"), nao: conta(vs, "nao"), abstencao: conta(vs, "abstencao"), obstrucao: conta(vs, "obstrucao") });

const resultadoCamara = (v: VotacaoCamaraBase): Votacao["resultado"] =>
  v.aprovacao === 1 ? "aprovada" : v.aprovacao === 0 ? "rejeitada" : /^Aprovad/i.test(v.descricao) ? "aprovada" : /^Rejeitad/i.test(v.descricao) ? "rejeitada" : null;

export function linhaVotacaoCamara(v: VotacaoCamaraBase, placar: Placar): Votacao {
  return {
    id: `camara:${v.idExterno}`, idExterno: v.idExterno, casa: "camara", data: v.data,
    proposicao: v.proposicao ? `${v.proposicao.tipo} ${v.proposicao.numero}/${v.proposicao.ano}` : null,
    ementa: v.proposicao?.ementa?.trim() ? semCpf(v.proposicao.ementa.trim()) : null, objeto: v.objeto, descricao: semCpf(v.descricao.trim()), resultado: resultadoCamara(v),
    placar, secreta: false, urlOficial: v.urlOficial,
  };
}

/** Placar do Senado: só existe em votação aberta; na secreta a API diz apenas "Votou". */
export const placarSenado = (v: Pick<VotacaoSenado, "secreta" | "votos">): Placar | null => (v.secreta ? null : placarDe(v.votos));

export function linhaVotacaoSenado(v: Omit<VotacaoSenado, "votos">, placar: Placar | null): Votacao {
  return {
    id: `senado:${v.idExterno}`, idExterno: v.idExterno, casa: "senado", data: v.data, proposicao: v.proposicao?.identificacao ?? null,
    ementa: v.ementa ? semCpf(v.ementa) : null, objeto: null, descricao: semCpf(v.descricao.trim()), resultado: v.resultado, placar, secreta: v.secreta,
    urlOficial: v.urlOficial,
  };
}

export const linhaVotoCamara = (v: Pick<VotoCamara, "votacaoId" | "voto">, politicoId: string): Voto =>
  ({ votacaoId: `camara:${v.votacaoId}`, politicoId, voto: v.voto, detalhe: null });

/** Siglas que já dizem o voto: não vão para `detalhe` (só as de comparecimento, ex.: "MIS", "LS"). */
const DETALHE_OMITIDO = new Set(["Sim", "Não", "Abstenção", "Votou"]);
export const linhaVotoSenado = (v: { votacaoId: string; sigla: string; voto: TipoVoto }, politicoId: string): Voto =>
  ({ votacaoId: `senado:${v.votacaoId}`, politicoId, voto: v.voto, detalhe: DETALHE_OMITIDO.has(v.sigla) ? null : v.sigla });

export const linhaOrientacao = (casa: "camara" | "senado", o: { votacaoId: string; bancada: string; orientacao: string }): Orientacao =>
  ({ votacaoId: `${casa}:${o.votacaoId}`, bancada: o.bancada, orientacao: o.orientacao });
