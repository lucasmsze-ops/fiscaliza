/**
 * Estado do cron entre execuções (fora do git; no GitHub Actions, no cache do Actions — E22):
 *   estado/dados/      as tabelas atuais, no formato de data/*.json (snake_case, uma linha por registro)
 *   estado/publicado/  cópia do que já foi gravado no Supabase: a base do diff (publicar.ts)
 *   estado/fontes/     respostas brutas das APIs (cache: votações passadas não mudam)
 * Na primeira execução, dados e publicado partem de data/*.json, que é o que o seed carregou.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { TABELAS } from "../../lib/esquema";

export const ESTADO = process.env.FISCALIZA_ESTADO ?? "estado";
export const DADOS = `${ESTADO}/dados`;
export const PUBLICADO = `${ESTADO}/publicado`;
export const FONTES = `${ESTADO}/fontes`;

export type LinhaBruta = Record<string, unknown>;

export function iniciarEstado(): boolean {
  for (const d of [DADOS, PUBLICADO, FONTES]) mkdirSync(d, { recursive: true });
  if (existsSync(`${DADOS}/politicos.json`)) return false;
  for (const t of TABELAS) {
    copyFileSync(`data/${t.nome}.json`, `${DADOS}/${t.nome}.json`);
    copyFileSync(`data/${t.nome}.json`, `${PUBLICADO}/${t.nome}.json`);
  }
  return true;
}

export const lerTabela = (nome: string, dir = DADOS): LinhaBruta[] =>
  existsSync(`${dir}/${nome}.json`) ? (JSON.parse(readFileSync(`${dir}/${nome}.json`, "utf8")) as LinhaBruta[]) : [];

/** Mesmo formato de scripts/sonda/consolidar.ts: um registro por linha, diffs pequenos. */
export function gravarTabela(nome: string, linhas: LinhaBruta[], dir = DADOS) {
  writeFileSync(`${dir}/${nome}.json`, `[\n${linhas.map((l) => JSON.stringify(l)).join(",\n")}\n]\n`);
}

export const pkDe = (nome: string) => TABELAS.find((t) => t.nome === nome)!.pk;
export const chave = (l: LinhaBruta, pk: readonly string[]) => pk.map((k) => String(l[k])).join("\u0001");

/**
 * Mescla linhas novas numa tabela pela chave primária (substitui a existente). Nunca apaga:
 * uma votação que sumiu da fonte por falha momentânea não some do site.
 * Devolve quantas linhas entraram e quantas mudaram de conteúdo.
 */
export function mesclar(nome: string, atuais: LinhaBruta[], novas: LinhaBruta[]): { linhas: LinhaBruta[]; novas: number; alteradas: number } {
  const pk = pkDe(nome);
  const mapa = new Map(atuais.map((l) => [chave(l, pk), l]));
  let n = 0, a = 0;
  for (const l of novas) {
    const k = chave(l, pk), antes = mapa.get(k);
    if (!antes) n++;
    else if (canonico(antes) !== canonico(l)) a++;
    mapa.set(k, l);
  }
  const linhas = [...mapa.values()].sort((x, y) => chave(x, pk).localeCompare(chave(y, pk)));
  return { linhas, novas: n, alteradas: a };
}

/** JSON com chaves ordenadas em todos os níveis: comparação de conteúdo que não depende da ordem. */
export function canonico(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonico).join(",")}]`;
  if (v && typeof v === "object") return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonico((v as LinhaBruta)[k])}`).join(",")}}`;
  return JSON.stringify(v);
}
