/**
 * Dados do Mapa (`/mapa`; era a Visão geral, E23c): quem está no cargo hoje no Congresso, por estado, e quantos
 * municípios cada estado tem. Governador, prefeito, deputados estaduais e vereadores entram no
 * Passo 5; até lá não aparecem (docs/PROTOTIPO.md).
 */
import { rotuloCargo } from "./card";
import { casasHoje, ordemDasCores } from "./congresso";
import type { Repo } from "./repo";
import type { Casa, ExecutivoEleito, Politico } from "./types";

export interface PessoaNoCargo {
  id: string;
  nomeUrna: string;
  /** Rótulo flexionado ("Senadora", "Deputado federal"). */
  cargo: string;
  casa: Casa;
  uf: string;
  partido: string;
  fotoUrl: string | null;
  /** Participação em votações no mandato (card), para a lista do estado (E23s); null sem dado. */
  participacao: { pct: number; num: number; den: number } | null;
  /** Dias afastado no período (licença, missão), do card. */
  diasAfastado: number;
  /** Linha de contexto do cartão ("Eleito em 2026", "Eleito em 2022, mandato até 2031"); E23w. */
  nota?: string;
}

/** Presidente ou governador eleito em 2026 (TSE), com a data da posse (5/1 e 6/1/2027, EC 111/2021). Sem crachá por enquanto. */
export interface Executivo {
  cargoChave: "presidente" | "governador";
  /** "Presidente", "Governador" (masculino; o cartão flexiona por `feminino`). */
  cargo: string;
  feminino: boolean;
  /** null para presidente. */
  uf: string | null;
  nomeUrna: string;
  partido: string;
  fotoUrl: string | null;
  /** AAAA-MM-DD. */
  posse: string;
  /** Linha de contexto ("Eleito em 2022, no cargo até a posse do sucessor"); E23w. */
  nota?: string;
}

export interface VisaoDados {
  /** Eleitos em 2026 para presidente e governador; vazio enquanto o cron não os grava. */
  executivos?: Executivo[];
  /** Em exercício hoje, em ordem alfabética. */
  pessoas: PessoaNoCargo[];
  /**
   * A partir de fev/2027 (E23w): deputados eleitos em 2026 e, no Senado, os 2 eleitos em 2026 de cada estado mais quem
   * ocupa a cadeira eleita em 2022 (mandato até 2031), quando dá para saber pelos mandatos em curso.
   */
  futuro: PessoaNoCargo[];
  /**
   * Executivo hoje (E23w): o presidente eleito em 2022 e o governador reeleito em 2026 (quem disputa a reeleição não deixa
   * o cargo). Os demais governadores de hoje não têm fonte aberta (renúncias e substituições não estão no TSE).
   */
  executivosHoje: Executivo[];
  /** Ordem das cores de partido (a mesma de /congresso). */
  cores: string[];
  municipiosPorUf: Record<string, number>;
}

export async function montarVisao(repo: Repo, hoje = new Date().toISOString().slice(0, 10)): Promise<VisaoDados> {
  const [{ casas, politicos }, municipios, eleitos] = await Promise.all([casasHoje(repo, hoje), repo.listarMunicipios(), repo.listarExecutivos()]);
  const pessoas = casas.flatMap((c) => c.bancadas.flatMap((b) => b.membros.map((m) => {
    const p = politicos.get(m.id)!;
    return { id: p.id, nomeUrna: p.nomeUrna, cargo: rotuloCargo({ ...p, cargo: c.casa === "senado" ? "senador" : "deputado_federal" }), casa: c.casa, uf: m.uf, partido: b.partido, fotoUrl: p.fotoUrl, participacao: null, diasAfastado: 0 } as PessoaNoCargo;
  }))).sort((a, b) => a.nomeUrna.localeCompare(b.nomeUrna, "pt-BR"));
  const numeros = await repo.listarNumeros(pessoas.map((p) => p.id));
  for (const p of pessoas) {
    const n = numeros.get(p.id);
    if (n?.tipo !== "mandato") continue;
    p.diasAfastado = n.diasAfastado;
    if (n.participacao.percentual !== null) p.participacao = { pct: n.participacao.percentual, num: n.participacao.numerador, den: n.participacao.denominador };
  }
  // A partir de fev/2027: eleitos de 2026 (deputados e senadores) e as cadeiras do Senado eleitas em 2022.
  const [todos, mandatos] = await Promise.all([repo.listarPoliticos(), repo.listarMandatosEmCurso()]);
  const porId = new Map(pessoas.map((p) => [p.id, p]));
  const fem = (p: Politico) => p.genero === "feminino";
  const eleitos2026: PessoaNoCargo[] = todos.filter((p) => (p.cargo === "deputado_federal" || p.cargo === "senador") && (p.status === "eleito" || p.status === "reeleito"))
    .map((p) => ({
      id: p.id, nomeUrna: p.nomeUrna, cargo: rotuloCargo(p), casa: p.cargo === "senador" ? "senado" as const : "camara" as const, uf: p.uf, partido: p.partido,
      fotoUrl: p.fotoUrl, participacao: porId.get(p.id)?.participacao ?? null, diasAfastado: 0,
      nota: `${p.status === "reeleito" ? "Reeleit" : "Eleit"}${fem(p) ? "a" : "o"} em 2026`,
    }));
  // Senado: titular empossado em 1º/2/2023 (eleito em 2022) segue até 31/1/2031.
  const ate2031 = new Set(mandatos.filter((m) => m.cargo === "senador" && m.titular && m.inicio === "2023-02-01").map((m) => m.politicoId));
  const senado2031: PessoaNoCargo[] = pessoas.filter((p) => p.casa === "senado" && ate2031.has(p.id) && !eleitos2026.some((e) => e.id === p.id))
    .map((p) => ({ ...p, nota: `${/^Senadora/.test(p.cargo) ? "Eleita" : "Eleito"} em 2022, mandato até 2031` }));
  const futuro = [...eleitos2026, ...senado2031].sort((a, b) => a.nomeUrna.localeCompare(b.nomeUrna, "pt-BR"));
  const municipiosPorUf: Record<string, number> = {};
  for (const m of municipios) municipiosPorUf[m.uf] = (municipiosPorUf[m.uf] ?? 0) + 1;
  const executivos: Executivo[] = eleitos.filter((e) => e.ano === 2026).map((e) => ({
    cargoChave: e.cargo, cargo: e.cargo === "presidente" ? (e.genero === "feminino" ? "Presidenta" : "Presidente") : (e.genero === "feminino" ? "Governadora" : "Governador"),
    feminino: e.genero === "feminino", uf: e.uf, nomeUrna: e.nomeUrna, partido: e.partido, fotoUrl: e.fotoUrl, posse: e.posse,
  }));
  // Hoje: quem o TSE registra como eleito em 2022 e foi reeleito (presidente; governador que disputou a reeleição).
  const eleito2022 = (e: ExecutivoEleito, cargo: RegExp) => (e.historico ?? []).some((h) => h.ano === 2022 && cargo.test(h.cargo) && /^eleit/i.test(h.resultado ?? ""));
  const executivosHoje: Executivo[] = eleitos.filter((e) => e.ano === 2026 && eleito2022(e, e.cargo === "presidente" ? /^presidente$/i : /^governador$/i))
    .map((e) => ({ ...executivos.find((x) => x.cargoChave === e.cargo && x.uf === e.uf)!, nota: `${e.genero === "feminino" ? "Eleita" : "Eleito"} em 2022 e reeleit${e.genero === "feminino" ? "a" : "o"} em 2026` }));
  return { pessoas, futuro, executivosHoje, cores: ordemDasCores(casas), municipiosPorUf, executivos };
}
