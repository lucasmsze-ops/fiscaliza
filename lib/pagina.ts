/**
 * Dados da página do político (/p/[slug]): o card e o que não cabe nele. Só dado da fonte;
 * o que falta vira null e a seção some (ou mostra a lacuna com texto fixo).
 */
import { montarCard, PERIODO_GOVERNO, type CardDados } from "./card";
import type { Repo } from "./repo";
import type { Afastamento, Casa, Mandato, TipoVoto } from "./types";

export type TotaisVoto = Record<TipoVoto, number>;

export interface VotoListado {
  data: string;
  proposicao: string | null;
  descricao: string;
  voto: TipoVoto;
  urlOficial: string;
}

export interface MesCeap {
  ano: number;
  mes: number;
  /** Null = sem lançamento no mês. */
  valor: number | null;
  mediaUf: number;
  /** Mês ainda recebendo lançamentos (lib/ceap.ts): valores podem subir. */
  aberto: boolean;
}

export interface PropostaListada {
  casa: Casa;
  tipo: string;
  numero: number;
  ano: number;
  ementa: string | null;
  apresentacao: string;
  situacao: string | null;
  virouNorma: boolean;
  urlOficial: string;
  primeiroAutor: boolean;
}

/** Propostas de autoria desde 2023 (só onde foram coletadas: quem passou pela Câmara ou está no Senado). */
export interface PropostasPagina {
  desde: number;
  /** Tipos que podem virar lei (PL, PLP, PEC, PDL, PRC/PRS) com o político entre os autores. */
  leis: number;
  primeiroAutor: number;
  viraramNorma: number;
  /** Os demais tipos (requerimentos, indicações, emendas...), pela contagem. */
  outras: number;
  /** As mais recentes, até 10. */
  ultimas: PropostaListada[];
}

export interface PaginaDados {
  card: CardDados;
  votacoes: null | {
    casa: Casa;
    /** Votações nominais do plenário no período e dentro do mandato (= denominador da participação). */
    total: number;
    totais: TotaisVoto;
    ultimas: VotoListado[];
  };
  ceap: null | { casa: Casa; uf: string; meses: MesCeap[]; categorias: { nome: string; valor: number }[]; mesReferencia: { ano: number; mes: number } | null };
  mandatos: Mandato[];
  afastamentos: Afastamento[];
  contatos: { email: string | null; telefone: string | null; redesSociais: string[]; urlPerfil: string | null };
  /** Opcional: resumos gravados antes da E23 não têm (a seção some até o cron regravar). */
  propostas?: PropostasPagina | null;
}

/** Ano inicial da coleta de proposições (docs/VOLUME.md, decisão de 2026-11-02). */
export const PROPOSTAS_DESDE = 2023;

const VAZIO: TotaisVoto = { sim: 0, nao: 0, abstencao: 0, obstrucao: 0, art17: 0, nao_informado: 0, secreto: 0, ausente: 0 };

/** Conta os votos por tipo nas votações dadas; quem não aparece é ausente (regra da Câmara). */
export function contarVotos(votacoesIds: string[], votos: Map<string, TipoVoto>): TotaisVoto {
  const t = { ...VAZIO };
  for (const id of votacoesIds) t[votos.get(id) ?? "ausente"]++;
  return t;
}

export async function montarPagina(repo: Repo, id: string, hoje = new Date().toISOString().slice(0, 10)): Promise<PaginaDados | null> {
  const card = await montarCard(repo, id, hoje);
  const p = await repo.getPolitico(id);
  if (!card || !p) return null;
  const [mandatos, afastamentos] = await Promise.all([repo.getMandatos(id), repo.getAfastamentos(id)]);

  let votacoes: PaginaDados["votacoes"] = null;
  if (card.numeros.tipo === "mandato") {
    const casa = card.numeros.casa;
    const cargo = casa === "senado" ? "senador" : "deputado_federal";
    const ex = mandatos.filter((m) => m.cargo === cargo);
    const noMandato = (d: string) => ex.some((m) => d >= m.inicio && (m.fim === null || d <= m.fim));
    const vs = (await repo.getVotacoes(casa))
      .filter((v) => v.data >= PERIODO_GOVERNO.inicio && v.data <= PERIODO_GOVERNO.fim && noMandato(v.data))
      .sort((a, b) => b.data.localeCompare(a.data) || b.id.localeCompare(a.id));
    const meus = new Map((await repo.getVotos(id)).map((v) => [v.votacaoId, v.voto]));
    votacoes = {
      casa, total: vs.length, totais: contarVotos(vs.map((v) => v.id), meus),
      ultimas: vs.slice(0, 10).map((v) => ({ data: v.data, proposicao: v.proposicao, descricao: v.descricao, voto: meus.get(v.id) ?? "ausente", urlOficial: v.urlOficial })),
    };
  }

  let ceap: PaginaDados["ceap"] = null;
  if (card.ceap) {
    const despesas = (await repo.getDespesas(id)).filter((d) => d.casa === card.ceap!.casa);
    const medias = await repo.getMediasUf(card.ceap.uf, card.ceap.casa);
    const porMes = new Map(despesas.map((d) => [d.ano * 100 + d.mes, d]));
    const meses = [...medias].sort((a, b) => b.ano * 100 + b.mes - (a.ano * 100 + a.mes)).slice(0, 12)
      .map((m) => ({ ano: m.ano, mes: m.mes, valor: porMes.get(m.ano * 100 + m.mes)?.total ?? null, mediaUf: m.media, aberto: !m.fechado }));
    const ref = [...medias].filter((m) => m.fechado).sort((a, b) => a.ano * 100 + a.mes - (b.ano * 100 + b.mes)).at(-1) ?? null;
    const doRef = ref ? porMes.get(ref.ano * 100 + ref.mes) : undefined;
    const categorias = Object.entries(doRef?.porCategoria ?? {}).map(([nome, valor]) => ({ nome, valor })).filter((c) => c.valor !== 0).sort((a, b) => b.valor - a.valor || a.nome.localeCompare(b.nome)); // desempate pelo nome: o jsonb não preserva a ordem das chaves
    ceap = { casa: card.ceap.casa, uf: card.ceap.uf, meses, categorias, mesReferencia: ref ? { ano: ref.ano, mes: ref.mes } : null };
  }

  let propostas: PropostasPagina | null = null;
  if (p.camaraId || p.senadoCodigo) {
    const [autorias, contagem] = await Promise.all([repo.getAutorias(id), repo.getContagemProposicoes(id)]);
    const ordenadas = [...autorias].sort((a, b) => b.proposicao.apresentacao.localeCompare(a.proposicao.apresentacao) || b.proposicao.id.localeCompare(a.proposicao.id));
    propostas = {
      desde: PROPOSTAS_DESDE,
      leis: autorias.length,
      primeiroAutor: autorias.filter((a) => a.ordem === 1).length,
      viraramNorma: autorias.filter((a) => a.proposicao.virouNorma).length,
      outras: contagem.reduce((t, c) => t + c.autorias, 0),
      ultimas: ordenadas.slice(0, 10).map(({ proposicao: x, ordem }) => ({
        casa: x.casa, tipo: x.tipo, numero: x.numero, ano: x.ano, ementa: x.ementa, apresentacao: x.apresentacao,
        situacao: x.situacao, virouNorma: x.virouNorma, urlOficial: x.urlOficial, primeiroAutor: ordem === 1,
      })),
    };
  }

  return {
    card, votacoes, ceap, propostas,
    mandatos: [...mandatos].sort((a, b) => b.inicio.localeCompare(a.inicio)),
    afastamentos: afastamentos.filter((a) => (a.fim ?? hoje) >= PERIODO_GOVERNO.inicio).sort((a, b) => b.inicio.localeCompare(a.inicio)),
    contatos: { email: p.email, telefone: p.telefone, redesSociais: p.redesSociais, urlPerfil: p.urlPerfil },
  };
}
