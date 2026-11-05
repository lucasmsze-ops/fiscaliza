/**
 * Dados da página /congresso (E23b): quem ocupa cada cadeira hoje, por Casa e partido, e as
 * últimas votações e normas. Só dado do banco; nada ao vivo (princípio 2).
 */
import { siglaPartido } from "./partidos";
import type { Repo } from "./repo";
import type { Afastamento, Casa, Mandato, Politico, Votacao } from "./types";

export interface Membro { id: string; nomeUrna: string; uf: string; fotoUrl: string | null }
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
  return bancadasDe(mandatos.flatMap((m) => { const p = politicos.get(m.politicoId); return p ? [p] : []; }));
}

export function bancadasDe(pessoas: Politico[]): Bancada[] {
  const por = new Map<string, Membro[]>();
  for (const p of pessoas) {
    const partido = siglaPartido(p.partido); // o cron já grava assim; aqui por segurança
    const l = por.get(partido) ?? [];
    l.push({ id: p.id, nomeUrna: p.nomeUrna, uf: p.uf, fotoUrl: p.fotoUrl });
    por.set(partido, l);
  }
  return [...por].map(([partido, membros]) => ({ partido, membros: membros.sort((a, b) => a.nomeUrna.localeCompare(b.nomeUrna, "pt-BR")) }))
    .sort((a, b) => b.membros.length - a.membros.length || a.partido.localeCompare(b.partido, "pt-BR"));
}

/** Cor do partido: a oficial (lib/partidos.ts#corPartido). */
export { corPartido } from "./partidos";

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

/** Quem ocupa cada cadeira na data, por Casa (a mesma regra em /congresso e na Visão geral). */
export async function casasHoje(repo: Repo, hoje: string): Promise<{ casas: CasaHoje[]; politicos: Map<string, Politico> }> {
  const [politicos, mandatos, afastamentos] = await Promise.all([repo.listarPoliticos(), repo.listarMandatosEmCurso(), repo.listarAfastamentosEm(hoje)]);
  const porId = new Map(politicos.map((p) => [p.id, p]));
  const exercicio = emExercicio(mandatos, afastamentos, hoje);
  const casas: CasaHoje[] = (["camara", "senado"] as const).map((casa) => {
    const ms = exercicio.filter((m) => (m.cargo === "senador") === (casa === "senado"));
    return { casa, total: ms.length, bancadas: bancadas(ms, porId) };
  });
  return { casas, politicos: porId };
}

/** Primeiro e último dia do mês AAAA-MM (o Postgres recusa "2026-11-31"). */
export function limitesDoMes(mes: string): [string, string] {
  const [a, m] = mes.split("-").map(Number) as [number, number];
  return [`${mes}-01`, `${mes}-${String(new Date(Date.UTC(a, m, 0)).getUTCDate()).padStart(2, "0")}`];
}

/** Votação como a página mostra: descrição sem o placar no fim (a Câmara o repete no texto). */
export interface VotacaoResumo {
  id: string; casa: Casa; data: string; proposicao: string | null; ementa: string | null; descricao: string;
  resultado: Votacao["resultado"]; placar: Votacao["placar"]; secreta: boolean; urlOficial: string;
}
export const resumirVotacao = (v: Votacao): VotacaoResumo => ({
  id: v.id, casa: v.casa, data: v.data, proposicao: v.proposicao, ementa: v.ementa, descricao: v.descricao.replace(/\s*Sim:\s*\d.*$/s, ""),
  resultado: v.resultado, placar: v.placar, secreta: v.secreta, urlOficial: v.urlOficial,
});

/**
 * Câmara a partir de 01/02/2027: os 513 eleitos de 2026 (status eleito ou reeleito), com o partido
 * registrado hoje. O Senado não entra: de 27 cadeiras eleitas em 2022, só se sabe quem ocupa hoje,
 * não quem ocupará em fevereiro (titulares licenciados, suplentes).
 */
export function camaraEleita(politicos: Politico[]): CasaHoje {
  const eleitos = politicos.filter((p) => p.cargo === "deputado_federal" && (p.status === "eleito" || p.status === "reeleito"));
  return { casa: "camara", total: eleitos.length, bancadas: bancadasDe(eleitos) };
}

export interface CongressoDados {
  casas: CasaHoje[];
  camara2027: CasaHoje;
  cores: string[];
}

export async function montarCongresso(repo: Repo, hoje = new Date().toISOString().slice(0, 10)): Promise<CongressoDados> {
  const { casas, politicos } = await casasHoje(repo, hoje);
  return { casas, camara2027: camaraEleita([...politicos.values()]), cores: ordemDasCores(casas) };
}

/** Dados da página /votacoes: agenda do Plenário e a última sessão de cada Casa. */
export interface VotacoesDados {
  /** AAAA-MM-DD → votações nominais por Casa no dia. */
  porDia: Record<string, { camara: number; senado: number }>;
  /** Mês (AAAA-MM) e dia da votação mais recente, com as votações desse mês. */
  mesInicial: string;
  diaInicial: string;
  votacoesMes: VotacaoResumo[];
  /** Última sessão com votação nominal de cada Casa. */
  ultimaSessao: { casa: Casa; data: string; votacoes: VotacaoResumo[] }[];
}

export async function montarVotacoes(repo: Repo, hoje = new Date().toISOString().slice(0, 10)): Promise<VotacoesDados> {
  const [datas, vc, vs] = await Promise.all([repo.listarDatasVotacoes(), repo.ultimasVotacoes("camara", 40), repo.ultimasVotacoes("senado", 40)]);
  const porDia: VotacoesDados["porDia"] = {};
  for (const x of datas) (porDia[x.data] ??= { camara: 0, senado: 0 })[x.casa]++;
  const ultimo = datas.at(-1)?.data ?? hoje;
  const mesInicial = ultimo.slice(0, 7);
  const votacoesMes = (await repo.votacoesEntre(...limitesDoMes(mesInicial))).map(resumirVotacao);
  const sessao = (casa: Casa, vs: Votacao[]) => ({ casa, data: vs[0]?.data ?? "", votacoes: vs.filter((v) => v.data === vs[0]?.data).map(resumirVotacao) });
  return {
    porDia, mesInicial, diaInicial: ultimo, votacoesMes,
    ultimaSessao: [sessao("camara", vc), sessao("senado", vs)].filter((x) => x.data),
  };
}
