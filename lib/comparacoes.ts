/**
 * Números do crachá que comparam o parlamentar com a Casa (E23i): a participação média de quem está
 * em exercício hoje e "quem vota mais parecido". Regras em docs/METODOLOGIA.md e /como-funciona.
 *
 * Os votos de cada Casa viram vetores uma vez por `Repo` (o cron monta 3.724 páginas com o mesmo
 * repo): comparar 594 parlamentares par a par em mapas seria lento demais.
 */
import { PERIODO_GOVERNO } from "./card";
import { casasHoje, ordemDasCores } from "./congresso";
import { participacao } from "./indicadores";
import type { Repo } from "./repo";
import type { Casa, Politico, TipoVoto } from "./types";

/** Votos que entram na comparação: os que dizem como a pessoa votou. */
const CODIGO: Partial<Record<TipoVoto, number>> = { sim: 1, nao: 2, abstencao: 3, obstrucao: 4 };
/** Mínimo de votações em comum para mostrar o % de votos iguais. */
export const MINIMO_EM_COMUM = 50;

interface DadosCasa {
  membros: Politico[];
  /** Média, em pontos percentuais, da participação de quem está em exercício hoje. */
  media: number | null;
  vetores: Map<string, Int8Array>;
}

const cache = new WeakMap<Repo, Map<string, Promise<DadosCasa>>>();

function dadosDaCasa(repo: Repo, casa: Casa, hoje: string): Promise<DadosCasa> {
  let porCasa = cache.get(repo);
  if (!porCasa) cache.set(repo, (porCasa = new Map()));
  const chave = `${casa}|${hoje}`;
  let p = porCasa.get(chave);
  if (!p) {
    p = (async () => {
      const [{ casas, politicos }, todas] = await Promise.all([casasHoje(repo, hoje), repo.getVotacoes(casa)]);
      const membros = casas.find((c) => c.casa === casa)!.bancadas.flatMap((b) => b.membros.map((m) => politicos.get(m.id)!));
      const votacoes = todas.filter((v) => v.data >= PERIODO_GOVERNO.inicio && v.data <= PERIODO_GOVERNO.fim);
      const indice = new Map(votacoes.map((v, i) => [v.id, i]));
      const cargo = casa === "senado" ? "senador" : "deputado_federal";
      const vetores = new Map<string, Int8Array>();
      const pcts: number[] = [];
      for (const m of membros) {
        const [votos, mandatos] = await Promise.all([repo.getVotos(m.id), repo.getMandatos(m.id)]);
        const part = participacao(votacoes, votos, PERIODO_GOVERNO, mandatos.filter((x) => x.cargo === cargo));
        if (part.percentual !== null) pcts.push(part.percentual);
        const vet = new Int8Array(votacoes.length);
        for (const v of votos) { const i = indice.get(v.votacaoId); const c = CODIGO[v.voto]; if (i !== undefined && c) vet[i] = c; }
        vetores.set(m.id, vet);
      }
      const media = pcts.length ? Math.round((10 * pcts.reduce((a, b) => a + b, 0)) / pcts.length) / 10 : null;
      return { membros, media, vetores };
    })();
    porCasa.set(chave, p);
  }
  return p;
}

const cores = new WeakMap<Repo, Map<string, Promise<string[]>>>();
/** Ordem das cores de partido do dia (a mesma de /congresso e da Visão geral), uma vez por `Repo`. */
export function coresDoDia(repo: Repo, hoje: string): Promise<string[]> {
  let m = cores.get(repo);
  if (!m) cores.set(repo, (m = new Map()));
  let p = m.get(hoje);
  if (!p) m.set(hoje, (p = casasHoje(repo, hoje).then(({ casas }) => ordemDasCores(casas))));
  return p;
}

/** % de votos iguais entre dois vetores, nas votações em que os dois votaram. */
export function semelhanca(a: Int8Array, b: Int8Array): { comuns: number; iguais: number } {
  let comuns = 0, iguais = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!, y = b[i]!;
    if (x && y) { comuns++; if (x === y) iguais++; }
  }
  return { comuns, iguais };
}

export interface Parecido { id: string; nomeUrna: string; partido: string; uf: string; fotoUrl: string | null; pct: number; comuns: number }

export interface ComparacaoCasa {
  casa: Casa;
  /** Participação média de quem está em exercício hoje na Casa. */
  mediaParticipacao: number | null;
  membros: number;
  /** Até 5, do maior % de votos iguais para o menor; mínimo de votações em comum: MINIMO_EM_COMUM. */
  parecidos: Parecido[];
}

/** Só para quem está em exercício hoje na Casa; senão null. */
export async function compararComCasa(repo: Repo, id: string, casa: Casa, hoje: string): Promise<ComparacaoCasa | null> {
  const d = await dadosDaCasa(repo, casa, hoje);
  const eu = d.vetores.get(id);
  if (!eu) return null;
  const parecidos = d.membros.filter((m) => m.id !== id).flatMap((m) => {
    const { comuns, iguais } = semelhanca(eu, d.vetores.get(m.id)!);
    return comuns >= MINIMO_EM_COMUM ? [{ id: m.id, nomeUrna: m.nomeUrna, partido: m.partido, uf: m.uf, fotoUrl: m.fotoUrl, pct: Math.round((1000 * iguais) / comuns) / 10, comuns }] : [];
  }).sort((a, b) => b.pct - a.pct || b.comuns - a.comuns || a.nomeUrna.localeCompare(b.nomeUrna, "pt-BR")).slice(0, 5);
  return { casa, mediaParticipacao: d.media, membros: d.membros.length, parecidos };
}
