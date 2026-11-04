/**
 * "Votou com o partido?" (E23i), depois das coletas e antes dos resumos. O partido de cada voto vem
 * das respostas em cache das fontes (estado/fontes: Câmara `/votacoes/{id}/votos`, Senado `/votacao`),
 * que trazem a sigla no dia da votação; a orientação vem da tabela `orientacoes`.
 *
 * Grava `estado/dados/fidelidade.json`, que não é tabela do banco (fora de lib/esquema.ts): só os
 * resumos das páginas a leem, no próprio cron. Regras em lib/fidelidade.ts.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { PERIODO_GOVERNO } from "../../lib/card";
import { contarComPartido, orientacaoDoPartido } from "../../lib/fidelidade";
import type { TipoVoto } from "../../lib/types";
import { FONTES, lerTabela, type LinhaBruta } from "./estado";

/** Votações mais recentes de cada Casa com a orientação guardada (coluna da aba Votos do crachá). */
const ULTIMAS = 20;

export interface VotoNoDia { votacaoId: string; politicoId: string; voto: TipoVoto; partido: string }

const ler = <T>(f: string): T => JSON.parse(readFileSync(f, "utf8")) as T;
/** Só os JSON de verdade: o tar do macOS põe ao lado de cada arquivo um `._nome.json` binário (AppleDouble). */
const jsons = (dir: string) => readdirSync(dir).filter((f) => !f.startsWith(".") && f.endsWith(".json"));

/**
 * Cada voto registrado com o partido do dia, das respostas em cache das fontes. Câmara: só quem
 * votou (a ausência é implícita); Senado: os 81. `incluirSemPagina`: também quem não tem página no
 * site (ex-deputado que não disputou 2026), com um id provisório: o placar de uma votação precisa de todos.
 */
export function votosComPartido(politicos = lerTabela("politicos"), incluirSemPagina = false): VotoNoDia[] {
  const porCamara = new Map(politicos.filter((p) => p.camara_id).map((p) => [Number(p.camara_id), String(p.id)]));
  const porSenado = new Map(politicos.filter((p) => p.senado_codigo).map((p) => [String(p.senado_codigo), String(p.id)]));
  const votos: VotoNoDia[] = [];
  const dirCamara = `${FONTES}/camara-votos`;
  if (existsSync(dirCamara)) for (const f of jsons(dirCamara)) {
    for (const v of ler<{ votacaoId: string; camaraId: number; voto: TipoVoto; partido: string }[]>(`${dirCamara}/${f}`)) {
      const pid = porCamara.get(v.camaraId) ?? (incluirSemPagina ? `camara-id:${v.camaraId}` : undefined);
      if (pid) votos.push({ votacaoId: `camara:${v.votacaoId}`, politicoId: pid, voto: v.voto, partido: v.partido });
    }
  }
  for (const f of existsSync(FONTES) ? jsons(FONTES).filter((x) => /^senado-votacao-\d{4}\.json$/.test(x)) : []) {
    for (const vt of ler<{ idExterno: string; votos: { senadoCodigo: string; voto: TipoVoto; partido: string }[] }[]>(`${FONTES}/${f}`)) {
      for (const v of vt.votos) {
        const pid = porSenado.get(String(v.senadoCodigo)) ?? (incluirSemPagina ? `senado-id:${v.senadoCodigo}` : undefined);
        if (pid) votos.push({ votacaoId: `senado:${vt.idExterno}`, politicoId: pid, voto: v.voto, partido: v.partido });
      }
    }
  }
  return votos;
}

export function calcularFidelidade(): { linhas: LinhaBruta[]; relatorio: string[] } {
  const politicos = lerTabela("politicos");
  const votacoes = lerTabela("votacoes").filter((v) => String(v.data) >= PERIODO_GOVERNO.inicio && String(v.data) <= PERIODO_GOVERNO.fim);
  const noPeriodo = new Set(votacoes.map((v) => String(v.id)));
  const oriPor = new Map<string, { bancada: string; orientacao: string }[]>();
  for (const o of lerTabela("orientacoes")) {
    const l = oriPor.get(String(o.votacao_id)) ?? [];
    l.push({ bancada: String(o.bancada), orientacao: String(o.orientacao) });
    oriPor.set(String(o.votacao_id), l);
  }

  const votos = votosComPartido(politicos);

  const ultimas = new Set(["camara", "senado"].flatMap((casa) => votacoes.filter((v) => v.casa === casa)
    .sort((a, b) => String(b.data).localeCompare(String(a.data)) || String(b.id).localeCompare(String(a.id))).slice(0, ULTIMAS).map((v) => String(v.id))));
  const porPolitico = new Map<string, { casa: string; itens: { voto: TipoVoto; orientacao: string | null }[]; ultimas: { votacao_id: string; partido: string; orientacao: string | null }[] }>();
  let semOrientacao = 0, contados = 0;
  for (const v of votos) {
    if (!noPeriodo.has(v.votacaoId)) continue;
    const casa = v.votacaoId.split(":")[0]!;
    const o = orientacaoDoPartido(v.partido, oriPor.get(v.votacaoId) ?? []);
    const p = porPolitico.get(v.politicoId) ?? { casa, itens: [], ultimas: [] };
    p.itens.push({ voto: v.voto, orientacao: o?.orientacao ?? null });
    if (ultimas.has(v.votacaoId)) p.ultimas.push({ votacao_id: v.votacaoId, partido: v.partido, orientacao: o?.orientacao ?? null });
    porPolitico.set(v.politicoId, p);
    if (o) contados++; else semOrientacao++;
  }
  const linhas: LinhaBruta[] = [...porPolitico].map(([politicoId, p]) => {
    const { com, contra } = contarComPartido(p.itens);
    return { politico_id: politicoId, casa: p.casa, com, contra, ultimas: p.ultimas.sort((a, b) => a.votacao_id.localeCompare(b.votacao_id)) };
  }).sort((a, b) => String(a.politico_id).localeCompare(String(b.politico_id)));
  return {
    linhas,
    relatorio: [`${votos.length} votos com partido no dia; ${contados} com a bancada do partido identificada, ${semOrientacao} sem (bloco cortado, sem orientação ou sem partido); ${linhas.length} políticos`],
  };
}
