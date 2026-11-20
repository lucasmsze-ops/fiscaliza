/**
 * Resumo de um político para a tela Monitorando (E23e), tirado do resumo pronto da página
 * (`resumos.pagina`): os números do crachá e os itens com data que podem ser "novidade" (votos e
 * propostas). Servido por /dados/acompanhar/[id] (CDN); quem a pessoa acompanha fica só no
 * navegador dela (lib/monitorando.ts).
 */
import type { PaginaDados, VotoListado } from "./pagina";
import { hrefExecutivo, idExecutivo } from "./quem-votei";
import type { ExecutivoEleito, TipoVoto } from "./types";

/** Mínimo de votações com a orientação identificada para mostrar "votou com o partido" (o mesmo do crachá). */
export const MINIMO_FIDELIDADE = 20;

export interface EventoAcompanhar {
  /** Chave estável: "v:<votacaoId>" ou "p:<casa>:<tipo> <número>/<ano>". */
  chave: string;
  tipo: "voto" | "proposta";
  data: string;
  /** Do que trata (ementa oficial) ou, sem ementa, a descrição oficial. */
  titulo: string;
  href: string;
  externo: boolean;
  voto?: TipoVoto;
  /** "PT orientou Sim"; null sem orientação identificada. */
  orientacao?: string | null;
  /** "PL 123/2025". */
  materia?: string | null;
  /** Linha do tempo do Monitorando (protótipo Liquid Glass, E23s); opcionais, calculados na hora pelo resumo. */
  casa?: "camara" | "senado";
  /** Voto: resultado da votação e o que foi votado (descrição oficial, sem o placar). */
  resultado?: "aprovada" | "rejeitada" | null;
  votado?: string;
  /** Proposta: situação oficial e autoria. */
  virouNorma?: boolean;
  situacao?: string | null;
  primeiroAutor?: boolean;
}

export interface ResumoAcompanhar {
  id: string;
  nomeUrna: string;
  cargo: string;
  partidoUf: string;
  fotoUrl: string | null;
  /** Participação no mandato e a média de quem está na Casa hoje; null sem mandato no período. */
  participacao: { percentual: number | null; de: number; total: number; mediaCasa: number | null } | null;
  comPartido: { percentual: number; total: number } | null;
  eventos: EventoAcompanhar[];
  /** Crachá; sem o campo, o do político (/p/[id]). Presidente e governador vão para /executivos/[id]. */
  href?: string;
  /** Executivos: no lugar dos números de votação, que eles não têm ("Posse em 5/1/2027"). */
  nota?: string;
}

/** Presidente ou governador eleito no Monitorando: sem votos nem propostas no Congresso, só o crachá e a posse. */
export function resumoExecutivo(e: ExecutivoEleito): ResumoAcompanhar {
  const fem = e.genero === "feminino";
  const cargo = e.cargo === "presidente" ? `Presidente eleit${fem ? "a" : "o"}` : `Governador${fem ? "a" : ""} eleit${fem ? "a" : "o"}`;
  const [a, m, d] = e.posse.split("-");
  return {
    id: idExecutivo(e), nomeUrna: e.nomeUrna, cargo, partidoUf: e.uf ? `${e.partido}-${e.uf}` : e.partido, fotoUrl: e.fotoUrl,
    participacao: null, comPartido: null, eventos: [], href: hrefExecutivo(e),
    nota: `Posse em ${Number(d)}/${Number(m)}/${a}. Sem votações no Congresso: o crachá mostra o que o TSE publica e o plano de governo.`,
  };
}

const sem = (s: string) => s.replace(/\s*Sim:\s*\d.*$/s, "");

function deVoto(u: VotoListado, casa: "camara" | "senado"): EventoAcompanhar | null {
  if (!u.votacaoId) return null;
  return {
    chave: `v:${u.votacaoId}`, tipo: "voto", data: u.data, titulo: u.ementa ?? sem(u.descricao), href: `/votacoes/${u.votacaoId.replace(":", "-")}`, externo: false,
    voto: u.voto, materia: u.proposicao, casa, resultado: u.resultado ?? null, votado: sem(u.descricao),
    orientacao: u.partidoNoDia && u.orientacaoPartido ? `${u.partidoNoDia} ${u.orientacaoPartido === "Liberado" ? "liberou a bancada" : `orientou ${u.orientacaoPartido}`}` : null,
  };
}

export function resumoParaAcompanhar(pg: PaginaDados): ResumoAcompanhar {
  const c = pg.card, n = c.numeros;
  const f = pg.fidelidade, totalF = f ? f.com + f.contra : 0;
  const votos = (pg.votacoes?.ultimas ?? []).map((u) => deVoto(u, pg.votacoes!.casa)).filter((x): x is EventoAcompanhar => x !== null);
  const propostas = (pg.propostas?.ultimas ?? []).map((p): EventoAcompanhar => ({
    chave: `p:${p.casa}:${p.tipo} ${p.numero}/${p.ano}`, tipo: "proposta", data: p.apresentacao, titulo: p.ementa ?? `${p.tipo} ${p.numero}/${p.ano}`,
    href: p.urlOficial, externo: true, materia: `${p.tipo} ${p.numero}/${p.ano}`,
    casa: p.casa, virouNorma: p.virouNorma, situacao: p.situacao, primeiroAutor: p.primeiroAutor,
  }));
  return {
    id: c.id, nomeUrna: c.nomeUrna, cargo: c.cargo, partidoUf: c.partidoUf, fotoUrl: c.fotoUrl,
    participacao: n.tipo === "mandato"
      ? { percentual: n.participacao.percentual, de: n.participacao.numerador, total: n.participacao.denominador, mediaCasa: pg.comparacao?.mediaParticipacao ?? null }
      : null,
    comPartido: f && totalF >= MINIMO_FIDELIDADE ? { percentual: Math.round((1000 * f.com) / totalF) / 10, total: totalF } : null,
    eventos: [...votos, ...propostas].sort((a, b) => b.data.localeCompare(a.data) || a.chave.localeCompare(b.chave)),
  };
}
