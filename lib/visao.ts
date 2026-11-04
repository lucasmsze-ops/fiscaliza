/**
 * Dados da Visão geral (`/`, E23c): quem está no cargo hoje no Congresso, por estado, e quantos
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
}

export interface VisaoDados {
  /** Em exercício hoje, em ordem alfabética. */
  pessoas: PessoaNoCargo[];
  /** Ordem das cores de partido (a mesma de /congresso). */
  cores: string[];
  municipiosPorUf: Record<string, number>;
}

export async function montarVisao(repo: Repo, hoje = new Date().toISOString().slice(0, 10)): Promise<VisaoDados> {
  const [{ casas, politicos }, municipios] = await Promise.all([casasHoje(repo, hoje), repo.listarMunicipios()]);
  const pessoas = casas.flatMap((c) => c.bancadas.flatMap((b) => b.membros.map((m) => {
    const p = politicos.get(m.id)!;
    return { id: p.id, nomeUrna: p.nomeUrna, cargo: rotuloCargo({ ...p, cargo: c.casa === "senado" ? "senador" : "deputado_federal" }), casa: c.casa, uf: p.uf, partido: p.partido, fotoUrl: p.fotoUrl };
  }))).sort((a, b) => a.nomeUrna.localeCompare(b.nomeUrna, "pt-BR"));
  const municipiosPorUf: Record<string, number> = {};
  for (const m of municipios) municipiosPorUf[m.uf] = (municipiosPorUf[m.uf] ?? 0) + 1;
  return { pessoas, cores: ordemDasCores(casas), municipiosPorUf };
}
