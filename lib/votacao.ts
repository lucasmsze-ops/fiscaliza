/**
 * Página de uma votação do Plenário (/votacoes/[id], E23k) e o cartão de votação da tela Congresso.
 * Tudo sai do texto oficial (descrição, ementa, tipo da matéria) por regra fixa; nada é resumido nem
 * adivinhado. A página vem pré-calculada pelo cron (scripts/cron/votacoes-paginas.ts), porque o
 * partido de cada parlamentar no dia da votação só existe nas respostas das fontes em cache.
 */
import { orientacaoDoPartido } from "./fidelidade";
import { siglaPartido } from "./partidos";
import { semCpf } from "./texto";
import type { Casa, TipoVoto, Votacao } from "./types";

/** Id na URL: "camara:106701-223" → "camara-106701-223" (os dois-pontos ficam fora da URL). */
export const slugVotacao = (id: string) => id.replace(":", "-");
export const idDoSlug = (slug: string) => slug.replace(/^(camara|senado)-/, "$1:");
export const hrefVotacao = (id: string) => `/votacoes/${slugVotacao(id)}`;

/** Sigla do tipo da matéria ("PEC 18/2025" → "PEC"; "PLP 124/2022 (Substitutivo-CD)" → "PLP"). */
export const tipoDe = (proposicao: string | null) => proposicao?.match(/^[A-Z]+/)?.[0] ?? null;

const EXTENSO: Record<string, string> = {
  PL: "projeto de lei", PLS: "projeto de lei do Senado", PLC: "projeto de lei da Câmara", PLP: "projeto de lei complementar",
  PEC: "proposta de emenda à Constituição", MPV: "medida provisória", PDL: "projeto de decreto legislativo",
  PDC: "projeto de decreto legislativo", PRC: "projeto de resolução", PRS: "projeto de resolução",
  MSF: "mensagem (indicação de autoridade)", OFS: "ofício (indicação de autoridade)", SCD: "substitutivo da Câmara",
  REQ: "requerimento", RQS: "requerimento", MSC: "mensagem do Presidente da República", REP: "representação",
};
export const tipoPorExtenso = (proposicao: string | null) => EXTENSO[tipoDe(proposicao) ?? ""] ?? null;

/** "1º turno" / "2º turno", quando a descrição oficial diz. */
export function turnoDe(descricao: string): string | null {
  if (/(primeiro|1[º°o]) turno/i.test(descricao)) return "1º turno";
  if (/(segundo|2[º°o]) turno/i.test(descricao)) return "2º turno";
  return null;
}

export type ObjetoVotado = "principal" | "emenda" | "destaque" | "requerimento" | "recurso" | "redacao" | "autoridade";

/**
 * O que foi votado naquele momento, pela descrição oficial. Uma mesma matéria tem várias votações no
 * dia (requerimentos, texto principal, destaques); null quando a descrição não segue um padrão conhecido.
 */
export function objetoVotado(v: Pick<Votacao, "descricao" | "proposicao">): ObjetoVotado | null {
  const d = v.descricao;
  const t = tipoDe(v.proposicao);
  if (t === "MSF" || t === "OFS" || /^Votação nominal d[ao] (Mensagem|Ofício)/i.test(d)) return "autoridade";
  if (/requerimento|preferência/i.test(d.slice(0, 60))) return "requerimento";
  if (/^(Aprovado|Rejeitado) o Recurso/i.test(d)) return "recurso";
  if (/reda[çc][ãa]o final/i.test(d)) return "redacao";
  if (/^(Mantido|Suprimido) o texto|^(Aprovado|Rejeitado) o Destaque/i.test(d)) return "destaque";
  if (/Emenda Aglutinativa Substitutiva|Substitutivo|Subemenda Substitutiva/i.test(d)) return "principal";
  if (/\b(a|da|as|das) Emendas?\b/i.test(d)) return "emenda";
  if (/\b(o|a|do|da) (Projeto|Proposta de Emenda|Medida Provisória|Parecer|PEC|PLP|PL|PDL|PLV|MPV)\b/i.test(d)) return "principal";
  return null;
}

export const ROTULO_OBJETO: Record<ObjetoVotado, string> = {
  principal: "texto principal", emenda: "emenda", destaque: "destaque", requerimento: "requerimento", recurso: "recurso",
  redacao: "redação final", autoridade: "escolha de autoridade",
};

/** "texto principal, 1º turno" / "requerimento" (o turno citado num requerimento é o da votação pedida, não o dele). */
export function rotuloVotado(v: Pick<Votacao, "descricao" | "proposicao">): string {
  const o = objetoVotado(v);
  const t = o === "requerimento" ? null : turnoDe(v.descricao);
  return [o && ROTULO_OBJETO[o], t].filter(Boolean).join(", ");
}

/** O que cada objeto quer dizer, em uma frase (cabeçalho da página). */
export const EXPLICA_OBJETO: Record<ObjetoVotado, string> = {
  principal: "o texto da proposta (ou o texto que a substitui)",
  emenda: "uma emenda: uma mudança pontual no texto",
  destaque: "um destaque: um trecho separado para ser votado à parte, que fica ou sai do texto",
  requerimento: "um requerimento: um pedido sobre o andamento (adiar, retirar de pauta, votar por partes, dar preferência)",
  recurso: "um recurso: pedido para o Plenário rever uma decisão (como o parecer de uma comissão que encerraria a proposta)",
  redacao: "a redação final: o texto aprovado, já com as mudanças, para conferência",
  autoridade: "a escolha de uma autoridade indicada (ministro de tribunal, conselheiro, embaixador, diretor de agência)",
};

/** Regra de aprovação de cada tipo, com o artigo da Constituição. Só tipos de regra fixa. */
export function regraDoTipo(proposicao: string | null): string | null {
  switch (tipoDe(proposicao)) {
    case "PEC": return "Proposta de emenda à Constituição: muda o texto da Constituição. Precisa de 3/5 dos votos Sim em dois turnos em cada Casa: 308 dos 513 deputados e 49 dos 81 senadores (art. 60).";
    case "PLP": return "Projeto de lei complementar: regulamenta um ponto que a Constituição manda tratar por lei complementar. Precisa de maioria absoluta: 257 deputados ou 41 senadores votando Sim (art. 69).";
    case "PL": case "PLS": case "PLC": case "SCD": return "Projeto de lei: cria ou muda uma lei. É aprovado pela maioria dos votos, desde que a maioria absoluta da Casa esteja presente (art. 47); depois vai à sanção do Presidente.";
    case "MPV": return "Medida provisória: norma do Presidente da República que vale como lei desde a publicação. O Congresso tem até 120 dias para aprovar, mudar ou rejeitar, por maioria dos votos (art. 62).";
    case "PDL": case "PDC": return "Projeto de decreto legislativo: assunto que só o Congresso decide (como acordos internacionais ou sustar atos do Executivo), sem sanção do Presidente. Maioria dos votos (art. 49).";
    case "PRC": case "PRS": return "Projeto de resolução: assunto interno da Casa (regras, cargos, comissões), sem sanção do Presidente. Maioria dos votos.";
    case "MSF": case "OFS": return "Indicação de autoridade que o Senado aprova ou rejeita (art. 52), em votação secreta: a fonte publica só quem votou.";
    default: return null;
  }
}

/** Votos Sim necessários quando a regra é fixa e a votação é do texto principal (PEC e PLP). */
export function votosNecessarios(v: Pick<Votacao, "casa" | "proposicao" | "descricao">): number | null {
  if (objetoVotado(v) !== "principal") return null;
  const t = tipoDe(v.proposicao);
  if (t === "PEC") return v.casa === "camara" ? 308 : 49;
  if (t === "PLP") return v.casa === "camara" ? 257 : 41;
  return null;
}

export const CADEIRAS: Record<Casa, number> = { camara: 513, senado: 81 };

export interface Contagem { sim: number; nao: number; abstencao: number; obstrucao: number; outros: number; naoVotou: number }

export interface PartidoNaVotacao extends Contagem {
  partido: string;
  /** Parlamentares do partido no dia (votaram ou não). */
  total: number;
  /** "Sim" | "Não" | "Liberado" | "Obstrução"; null = a bancada do partido não orientou ou não se identifica. */
  orientacao: string | null;
  via: "partido" | "federacao" | "bloco" | null;
}

export interface PassoCaminho { id: string; data: string; descricao: string; resultado: Votacao["resultado"]; atual: boolean }

export interface VotacaoPagina {
  id: string; casa: Casa; data: string; proposicao: string | null; ementa: string | null; descricao: string;
  resultado: Votacao["resultado"]; secreta: boolean; urlOficial: string;
  /** Câmara: votação de escolha de pessoa, com o voto registrado e a direção não divulgada. */
  semDirecao: boolean;
  contagem: Contagem;
  partidos: PartidoNaVotacao[];
  /**
   * Câmara: deputados que não votaram e cujo partido não se identifica (fora do registro de mandatos
   * do site, como ex-deputados que não disputaram 2026). Entram no total, não na lista por partido.
   */
  naoVotouSemPartido: number;
  /** Votações nominais da mesma matéria no Plenário da mesma Casa, em ordem de data. */
  caminho: PassoCaminho[];
  /** A proposição, quando está no banco do site (autoria de quem tem página). */
  proposta: { apresentacao: string | null; situacao: string | null } | null;
}

const descricaoLimpa = (s: string) => semCpf(s.replace(/\s*Sim:\s*\d.*$/s, ""));
const vazia = (): Contagem => ({ sim: 0, nao: 0, abstencao: 0, obstrucao: 0, outros: 0, naoVotou: 0 });
function somar(c: Contagem, voto: TipoVoto | "ausente") {
  if (voto === "sim") c.sim++;
  else if (voto === "nao") c.nao++;
  else if (voto === "abstencao") c.abstencao++;
  else if (voto === "obstrucao") c.obstrucao++;
  else if (voto === "ausente") c.naoVotou++;
  else c.outros++; // art. 17 (presidente da sessão), voto não divulgado, secreto
}

/**
 * Monta a página. `votos` traz todo parlamentar em exercício no dia, com o partido do dia; quem não
 * registrou voto vem como "ausente".
 */
export function montarPaginaVotacao(
  v: Votacao,
  votos: { voto: TipoVoto; partido: string }[],
  orientacoes: { bancada: string; orientacao: string }[],
  mesmaMateria: Votacao[],
  proposta: VotacaoPagina["proposta"],
): VotacaoPagina {
  const contagem = vazia();
  const por = new Map<string, PartidoNaVotacao>();
  for (const x of votos) {
    somar(contagem, x.voto);
    const partido = siglaPartido(x.partido);
    let p = por.get(partido);
    if (!p) {
      const o = orientacaoDoPartido(partido, orientacoes);
      p = { partido, total: 0, ...vazia(), orientacao: o?.orientacao || null, via: o?.via ?? null };
      por.set(partido, p);
    }
    p.total++;
    somar(p, x.voto);
  }
  const registrados = votos.filter((x) => x.voto !== "ausente");
  // Câmara: 513 cadeiras; quem não votou = 513 − quem votou, mesmo quando o partido não se identifica.
  let naoVotouSemPartido = 0;
  if (v.casa === "camara") {
    const oficial = Math.max(0, CADEIRAS.camara - registrados.length);
    naoVotouSemPartido = Math.max(0, oficial - contagem.naoVotou);
    contagem.naoVotou = oficial;
  }
  return {
    id: v.id, casa: v.casa, data: v.data, proposicao: v.proposicao, ementa: v.ementa ? semCpf(v.ementa) : null,
    descricao: descricaoLimpa(v.descricao), resultado: v.resultado, secreta: v.secreta, urlOficial: v.urlOficial,
    semDirecao: !v.secreta && registrados.length > 0 && registrados.every((x) => x.voto === "nao_informado"),
    contagem, naoVotouSemPartido,
    partidos: [...por.values()].sort((a, b) => b.total - a.total || a.partido.localeCompare(b.partido, "pt-BR")),
    caminho: mesmaMateria.sort((a, b) => a.data.localeCompare(b.data) || a.id.localeCompare(b.id, "pt-BR", { numeric: true }))
      .map((x) => ({ id: x.id, data: x.data, descricao: descricaoLimpa(x.descricao), resultado: x.resultado, atual: x.id === v.id })),
    proposta,
  };
}
