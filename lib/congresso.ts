/**
 * Dados da página /congresso (E23b): quem ocupa cada cadeira hoje, por Casa e partido, e as
 * últimas votações e normas. Só dado do banco; nada ao vivo (princípio 2).
 */
import type { Repo } from "./repo";
import type { Afastamento, Casa, Mandato, Politico, Proposicao, Votacao } from "./types";

export interface Membro { id: string; nomeUrna: string; uf: string }
export interface Bancada { partido: string; membros: Membro[] }
export interface CasaHoje { casa: Casa; total: number; bancadas: Bancada[] }

/**
 * Em exercício na data: mandato em curso e nenhum afastamento cobrindo a data. Titular licenciado
 * mantém o mandato, mas a cadeira é do suplente (Câmara: 575 mandatos em curso, 513 cadeiras).
 */
export function emExercicio(mandatos: Mandato[], afastamentos: Afastamento[], data: string): Mandato[] {
  const afastados = new Set(afastamentos.filter((a) => a.inicio <= data && (a.fim === null || a.fim >= data)).map((a) => a.politicoId));
  return mandatos.filter((m) => m.fim === null && m.inicio <= data && !afastados.has(m.politicoId));
}

/** Bancadas por tamanho (maior primeiro); empate pelo nome. Membros em ordem alfabética. */
export function bancadas(mandatos: Mandato[], politicos: Map<string, Politico>): Bancada[] {
  const por = new Map<string, Membro[]>();
  for (const m of mandatos) {
    const p = politicos.get(m.politicoId);
    if (!p) continue;
    const l = por.get(p.partido) ?? [];
    l.push({ id: p.id, nomeUrna: p.nomeUrna, uf: p.uf });
    por.set(p.partido, l);
  }
  return [...por].map(([partido, membros]) => ({ partido, membros: membros.sort((a, b) => a.nomeUrna.localeCompare(b.nomeUrna, "pt-BR")) }))
    .sort((a, b) => b.membros.length - a.membros.length || a.partido.localeCompare(b.partido, "pt-BR"));
}

/** Quantos partidos ganham cor própria; os demais viram "outros partidos" (a paleta tem 8 cores). */
export const CORES_PARTIDO = 8;

/**
 * Ordem das cores: pelo total de cadeiras nas duas Casas somadas, para o mesmo partido ter a mesma
 * cor na Câmara e no Senado. Nunca por posição política (CLAUDE.md, princípio 4).
 */
export function ordemDasCores(casas: CasaHoje[]): string[] {
  const total = new Map<string, number>();
  for (const c of casas) for (const b of c.bancadas) total.set(b.partido, (total.get(b.partido) ?? 0) + b.membros.length);
  return [...total].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR")).slice(0, CORES_PARTIDO).map(([p]) => p);
}

/**
 * Posições das cadeiras num semicírculo de raio 1 (centro em 0,0; y para cima), em fileiras
 * concêntricas com cadeiras proporcionais ao raio, ordenadas da esquerda para a direita: assim
 * cada bancada, preenchida em sequência, vira uma fatia contínua.
 */
export function cadeirasHemiciclo(n: number, fileiras: number, raioInterno = 0.4): { x: number; y: number }[] {
  const raios = Array.from({ length: fileiras }, (_, i) => raioInterno + ((1 - raioInterno) * i) / Math.max(1, fileiras - 1));
  const soma = raios.reduce((t, r) => t + r, 0);
  const porFileira = raios.map((r) => Math.round((n * r) / soma));
  porFileira[porFileira.length - 1]! += n - porFileira.reduce((t, k) => t + k, 0); // arredondamento vai para a fileira de fora
  const pts: { x: number; y: number; a: number }[] = [];
  raios.forEach((r, i) => {
    const k = porFileira[i]!;
    for (let j = 0; j < k; j++) {
      const a = Math.PI - (k === 1 ? Math.PI / 2 : (Math.PI * j) / (k - 1)); // de π (esquerda) a 0 (direita)
      pts.push({ x: r * Math.cos(a), y: r * Math.sin(a), a });
    }
  });
  return pts.sort((p, q) => q.a - p.a || Math.hypot(p.x, p.y) - Math.hypot(q.x, q.y)).map(({ x, y }) => ({ x, y }));
}

export interface CongressoDados {
  casas: CasaHoje[];
  cores: string[];
  votacoes: Votacao[];
  normas: { proposicao: Proposicao; autores: { id: string; nomeUrna: string; ordem: number }[] }[];
}

export async function montarCongresso(repo: Repo, hoje = new Date().toISOString().slice(0, 10)): Promise<CongressoDados> {
  const [politicos, mandatos, afastamentos, vc, vs, normas] = await Promise.all([
    repo.listarPoliticos(), repo.listarMandatosEmCurso(), repo.listarAfastamentosEm(hoje),
    repo.ultimasVotacoes("camara", 10), repo.ultimasVotacoes("senado", 10), repo.ultimasNormas(10),
  ]);
  const porId = new Map(politicos.map((p) => [p.id, p]));
  const exercicio = emExercicio(mandatos, afastamentos, hoje);
  const casas: CasaHoje[] = (["camara", "senado"] as const).map((casa) => {
    const ms = exercicio.filter((m) => (m.cargo === "senador") === (casa === "senado"));
    return { casa, total: ms.length, bancadas: bancadas(ms, porId) };
  });
  return {
    casas,
    cores: ordemDasCores(casas),
    votacoes: [...vc, ...vs].sort((a, b) => b.data.localeCompare(a.data) || b.id.localeCompare(a.id)).slice(0, 10),
    normas: normas.map((n) => ({
      proposicao: n.proposicao,
      autores: n.autores.flatMap((a) => { const p = porId.get(a.politicoId); return p ? [{ id: p.id, nomeUrna: p.nomeUrna, ordem: a.ordem }] : []; })
        .sort((a, b) => a.ordem - b.ordem),
    })),
  };
}
