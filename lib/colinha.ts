/**
 * A colinha: em quem a pessoa votou em 2026 para o Congresso. Na urna de 2026 foram 1 voto para
 * deputado federal e 2 para senador (renovação de 2/3 do Senado). Vive no localStorage e na URL
 * `/c/[ids]`; não existe no servidor (CLAUDE.md: sem conta, sem dado pessoal).
 */
export interface Colinha {
  deputado: string | null;
  senadores: string[];
}

export const MAX_SENADORES = 2;
export const COLINHA_VAZIA: Colinha = { deputado: null, senadores: [] };
/** Separador dos ids na URL. Slugs só têm [a-z0-9-]. */
const SEP = "+";
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Marca ou desmarca. Deputado: escolha única (troca). Senador: até 2; o terceiro substitui o mais antigo. */
export function alternar(c: Colinha, cargo: "deputado_federal" | "senador", id: string): Colinha {
  if (cargo === "deputado_federal") return { ...c, deputado: c.deputado === id ? null : id };
  if (c.senadores.includes(id)) return { ...c, senadores: c.senadores.filter((s) => s !== id) };
  return { ...c, senadores: [...c.senadores, id].slice(-MAX_SENADORES) };
}

export const idsDaColinha = (c: Colinha) => [...(c.deputado ? [c.deputado] : []), ...c.senadores];

export function caminhoColinha(c: Colinha): string | null {
  const ids = idsDaColinha(c);
  return ids.length ? `/c/${ids.join(SEP)}` : null;
}

/** Lê o segmento da URL (já decodificado ou não). Descarta o que não é slug e repetições; no máximo 3 ids. */
export function idsDaUrl(segmento: string): string[] {
  const ids = decodeURIComponent(segmento).split(/[+ ,]/).map((s) => s.trim()).filter((s) => SLUG.test(s));
  return [...new Set(ids)].slice(0, 1 + MAX_SENADORES);
}

/** Valida o que veio do localStorage (pode ter sido editado à mão ou ser de versão antiga). */
export function lerColinha(bruto: string | null): Colinha {
  try {
    const o = JSON.parse(bruto ?? "null") as Partial<Colinha> | null;
    const deputado = typeof o?.deputado === "string" && SLUG.test(o.deputado) ? o.deputado : null;
    const senadores = Array.isArray(o?.senadores) ? o!.senadores.filter((s): s is string => typeof s === "string" && SLUG.test(s)).slice(0, MAX_SENADORES) : [];
    return { deputado, senadores };
  } catch {
    return COLINHA_VAZIA;
  }
}

/** v2: ids passaram a ter a UF no fim (2026-11-01); colinhas v1 ficam para trás. */
export const CHAVE_STORAGE = "fiscaliza.colinha.v2";
