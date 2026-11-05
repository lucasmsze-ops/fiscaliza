/**
 * Resumo de um político para a tela Monitorando (E23e), tirado do resumo pronto da página
 * (`resumos.pagina`): os números do crachá e os itens com data que podem ser "novidade" (votos e
 * propostas). Servido por /dados/acompanhar/[id] (CDN); quem a pessoa acompanha fica só no
 * navegador dela (lib/monitorando.ts).
 */
import type { PaginaDados, VotoListado } from "./pagina";
import type { TipoVoto } from "./types";

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
}

const sem = (s: string) => s.replace(/\s*Sim:\s*\d.*$/s, "");

function deVoto(u: VotoListado): EventoAcompanhar | null {
  if (!u.votacaoId) return null;
  return {
    chave: `v:${u.votacaoId}`, tipo: "voto", data: u.data, titulo: u.ementa ?? sem(u.descricao), href: `/votacoes/${u.votacaoId.replace(":", "-")}`, externo: false,
    voto: u.voto, materia: u.proposicao,
    orientacao: u.partidoNoDia && u.orientacaoPartido ? `${u.partidoNoDia} ${u.orientacaoPartido === "Liberado" ? "liberou a bancada" : `orientou ${u.orientacaoPartido}`}` : null,
  };
}

export function resumoParaAcompanhar(pg: PaginaDados): ResumoAcompanhar {
  const c = pg.card, n = c.numeros;
  const f = pg.fidelidade, totalF = f ? f.com + f.contra : 0;
  const votos = (pg.votacoes?.ultimas ?? []).map(deVoto).filter((x): x is EventoAcompanhar => x !== null);
  const propostas = (pg.propostas?.ultimas ?? []).map((p): EventoAcompanhar => ({
    chave: `p:${p.casa}:${p.tipo} ${p.numero}/${p.ano}`, tipo: "proposta", data: p.apresentacao, titulo: p.ementa ?? `${p.tipo} ${p.numero}/${p.ano}`,
    href: p.urlOficial, externo: true, materia: `${p.tipo} ${p.numero}/${p.ano}`,
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
