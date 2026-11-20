/**
 * Dados do Mapa (`/mapa`; era a Visão geral, E23c): quem está no cargo hoje no Congresso, por estado, e quantos
 * municípios cada estado tem. Governador, prefeito, deputados estaduais e vereadores entram no
 * Passo 5; até lá não aparecem (docs/PROTOTIPO.md).
 */
import { rotuloCargo } from "./card";
import { casasHoje, ordemDasCores } from "./congresso";
import type { Repo } from "./repo";
import type { Casa } from "./types";

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
}

export interface VisaoDados {
  /** Eleitos em 2026 para presidente e governador; vazio enquanto o cron não os grava. */
  executivos?: Executivo[];
  /** Em exercício hoje, em ordem alfabética. */
  pessoas: PessoaNoCargo[];
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
  const municipiosPorUf: Record<string, number> = {};
  for (const m of municipios) municipiosPorUf[m.uf] = (municipiosPorUf[m.uf] ?? 0) + 1;
  const executivos: Executivo[] = eleitos.filter((e) => e.ano === 2026).map((e) => ({
    cargoChave: e.cargo, cargo: e.cargo === "presidente" ? (e.genero === "feminino" ? "Presidenta" : "Presidente") : (e.genero === "feminino" ? "Governadora" : "Governador"),
    feminino: e.genero === "feminino", uf: e.uf, nomeUrna: e.nomeUrna, partido: e.partido, fotoUrl: e.fotoUrl, posse: e.posse,
  }));
  return { pessoas, cores: ordemDasCores(casas), municipiosPorUf, executivos };
}
