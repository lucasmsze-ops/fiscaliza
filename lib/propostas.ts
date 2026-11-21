/**
 * Lista geral de propostas (`/propostas`, E23g): filtros, grupos de situação e a busca na ementa.
 * Roda no servidor (as duas implementações do repo) e no navegador (os filtros). Nada aqui chama fonte externa.
 */
import { normalizar } from "./texto";
import type { Casa, Politico, Proposicao } from "./types";

/** Sigla por extenso: a pessoa entende "Projeto de lei" sem saber o que é PL. */
export const NOME_TIPO: Record<string, string> = {
  PL: "Projeto de lei", PLP: "Projeto de lei complementar", PEC: "Proposta de emenda à Constituição",
  PDL: "Projeto de decreto legislativo", PRC: "Projeto de resolução", PRS: "Projeto de resolução",
};

/**
 * Situações (como a fonte escreve) em que a proposta saiu de tramitação sem virar norma: arquivada, retirada,
 * devolvida, prejudicada, rejeitada, vetada ou substituída por outra. Câmara em caixa normal, Senado em maiúsculas.
 * Conferido contra as 65 situações distintas do banco em 2026-11-21; situação nova cai em "Em tramitação".
 */
export const SITUACOES_ENCERRADAS = [
  "Arquivada", "Retirado pelo(a) Autor(a)", "Devolvida ao(à) Autor(a)", "Prejudicialidade", "Transformado em nova proposição",
  "RETIRADA PELO AUTOR", "PREJUDICADA", "VETADA", "REJEITADA", "IMPUGNADA",
] as const;

export type GrupoSituacao = "norma" | "tramitando" | "encerrada";
export const GRUPOS_SITUACAO: { valor: GrupoSituacao; texto: string }[] = [
  { valor: "tramitando", texto: "Em tramitação" },
  { valor: "norma", texto: "Virou norma" },
  { valor: "encerrada", texto: "Encerrada sem virar norma" },
];

/** O grupo da proposta; null quando a fonte não traz a situação (só aparece em "Todas"). */
export function grupoSituacao(p: Pick<Proposicao, "virouNorma" | "situacao">): GrupoSituacao | null {
  if (p.virouNorma) return "norma";
  if (p.situacao == null) return null;
  return (SITUACOES_ENCERRADAS as readonly string[]).includes(p.situacao) ? "encerrada" : "tramitando";
}

export const TIPOS_FILTRO = ["PL", "PLP", "PEC", "PDL", "PR"] as const;
export type TipoFiltro = (typeof TIPOS_FILTRO)[number];
/** PRC (Câmara) e PRS (Senado) são o mesmo tipo de proposta: um filtro só. */
export const siglasDoTipo = (t: TipoFiltro): string[] => (t === "PR" ? ["PRC", "PRS"] : [t]);
export const NOME_TIPO_FILTRO: Record<TipoFiltro, string> = {
  PL: "Projeto de lei", PLP: "Lei complementar", PEC: "Emenda à Constituição", PDL: "Decreto legislativo", PR: "Resolução",
};

/** Anos do filtro: os da legislatura; as poucas de antes de 2023 (coautoria em proposta antiga) ficam em "Todos". */
export const ANOS_FILTRO = [2026, 2025, 2024, 2023] as const;

export interface FiltroPropostas {
  casa: Casa | null;
  tipo: TipoFiltro | null;
  situacao: GrupoSituacao | null;
  ano: number | null;
  /** Texto da busca como a pessoa digitou (até 80 caracteres). */
  busca: string;
}

export const POR_PAGINA = 20;

type Params = Record<string, string | string[] | undefined>;
const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** Lê os filtros do endereço (`?casa=senado&tipo=PEC&situacao=norma&ano=2025&q=saúde&pagina=2`); valor estranho vira "todos". */
export function lerFiltro(sp: Params): { filtro: FiltroPropostas; pagina: number } {
  const casa = um(sp.casa), tipo = um(sp.tipo), situacao = um(sp.situacao), ano = Number(um(sp.ano)), pagina = Number(um(sp.pagina));
  return {
    filtro: {
      casa: casa === "camara" || casa === "senado" ? casa : null,
      tipo: (TIPOS_FILTRO as readonly string[]).includes(tipo) ? (tipo as TipoFiltro) : null,
      situacao: GRUPOS_SITUACAO.some((g) => g.valor === situacao) ? (situacao as GrupoSituacao) : null,
      ano: (ANOS_FILTRO as readonly number[]).includes(ano) ? ano : null,
      busca: um(sp.q).trim().slice(0, 80),
    },
    pagina: Number.isInteger(pagina) && pagina >= 1 && pagina <= 2000 ? pagina : 1,
  };
}

/** Endereço com os filtros (sem os vazios), para os links de página e os filtros. */
export function hrefPropostas(f: FiltroPropostas, pagina = 1): string {
  const q = new URLSearchParams();
  if (f.busca) q.set("q", f.busca);
  if (f.casa) q.set("casa", f.casa);
  if (f.tipo) q.set("tipo", f.tipo);
  if (f.situacao) q.set("situacao", f.situacao);
  if (f.ano) q.set("ano", String(f.ano));
  if (pagina > 1) q.set("pagina", String(pagina));
  const s = q.toString();
  return s ? `/propostas?${s}` : "/propostas";
}

/**
 * A busca, já interpretada: "PL 1234/2025", "1234/2025" ou "PEC 45" procuram pelo número; o resto procura as
 * palavras na ementa (todas, em qualquer ordem, sem acento nem caixa). Palavras de uma letra são ignoradas.
 */
export type Busca =
  | { tipo: "numero"; sigla: string | null; numero: number; ano: number | null }
  | { tipo: "palavras"; palavras: string[] }
  | null;

export function interpretarBusca(texto: string): Busca {
  const m = texto.trim().match(/^(?:([a-zA-Z]{2,3})\s*[.\-]?\s*)?(?:n[ºo°.]?\s*)?(\d{1,5})(?:\s*\/\s*(\d{4}))?$/);
  if (m && (m[1] || m[3])) return { tipo: "numero", sigla: m[1]?.toUpperCase() ?? null, numero: Number(m[2]), ano: m[3] ? Number(m[3]) : null };
  const palavras = [...new Set(normalizar(texto).split(" ").filter((p) => p.length >= 2))].slice(0, 6);
  return palavras.length ? { tipo: "palavras", palavras } : null;
}

/** As variantes acentuadas de cada letra, para a expressão regular do banco achar "saude" em "Saúde". */
const VARIANTES: Record<string, string> = { a: "aáàâãä", e: "eéèêë", i: "iíìîï", o: "oóòôõö", u: "uúùûü", c: "cç", n: "nñ" };
/** Expressão regular POSIX (operador `imatch` do PostgREST) da palavra normalizada, sem acento nem caixa. */
export function regexPalavra(palavra: string): string {
  return [...palavra].map((ch) => {
    const v = VARIANTES[ch];
    return v ? `[${v}${v.toUpperCase()}]` : ch; // `normalizar` só deixa a-z e 0-9: nada a escapar
  }).join("");
}

/** Os filtros na query string do PostgREST (sem `select` nem `order`), a mesma regra de `grupoSituacao` e `atendeBusca`. */
export function filtrosProposicoes(f: FiltroPropostas): string {
  const q: string[] = [];
  const e = encodeURIComponent;
  const lista = (vs: readonly string[]) => `(${vs.map((x) => `"${x}"`).join(",")})`;
  if (f.casa) q.push(`casa=eq.${f.casa}`);
  if (f.tipo) q.push(`tipo=in.${e(lista(siglasDoTipo(f.tipo)))}`);
  if (f.ano) q.push(`ano=eq.${f.ano}`);
  if (f.situacao === "norma") q.push("virou_norma=is.true");
  if (f.situacao === "encerrada") q.push("virou_norma=is.false", `situacao=in.${e(lista(SITUACOES_ENCERRADAS))}`);
  if (f.situacao === "tramitando") q.push("virou_norma=is.false", "situacao=not.is.null", `situacao=not.in.${e(lista(SITUACOES_ENCERRADAS))}`);
  const b = interpretarBusca(f.busca);
  if (b?.tipo === "numero") {
    q.push(`numero=eq.${b.numero}`);
    if (b.ano) q.push(`ano=eq.${b.ano}`);
    if (b.sigla) q.push(b.sigla === "PR" ? `tipo=in.${e(lista(["PRC", "PRS"]))}` : `tipo=eq.${e(b.sigla)}`);
  }
  // Mesma coluna repetida: o PostgREST junta com E (todas as palavras).
  if (b?.tipo === "palavras") for (const w of b.palavras) q.push(`ementa=imatch.${e(regexPalavra(w))}`);
  return q.join("&");
}

/** A proposta atende à busca? (implementação em memória, modo JSON; o Supabase faz o mesmo com `imatch`). */
export function atendeBusca(p: Pick<Proposicao, "tipo" | "numero" | "ano" | "ementa">, b: Busca): boolean {
  if (!b) return true;
  if (b.tipo === "numero") {
    return p.numero === b.numero && (b.ano == null || p.ano === b.ano) && (b.sigla == null || p.tipo === b.sigla || (b.sigla === "PR" && p.tipo.startsWith("PR")));
  }
  const e = normalizar(p.ementa ?? "");
  return b.palavras.every((w) => e.includes(w));
}

/** Autor que está no site (parlamentar com crachá), na ordem de assinatura. */
export type AutorNoSite = Pick<Politico, "id" | "slug" | "nomeUrna" | "partido" | "uf"> & { ordem: number };

export interface PaginaPropostas {
  /** Quantas atendem aos filtros e, delas, quantas viraram norma. */
  total: number;
  viraramNorma: number;
  itens: { proposicao: Proposicao; autores: AutorNoSite[] }[];
}
