/**
 * Cliente mínimo da API REST do Supabase (PostgREST), só com `fetch`: sem dependência nova
 * (CLAUDE.md: preferir a plataforma). Usado pelo seed e pelo cron (chave secreta, escreve) e, na
 * E20, pelo `SupabaseRepo` (chave publicável, só lê). Só roda no servidor ou em scripts.
 *
 * Variáveis: SUPABASE_URL, SUPABASE_SECRET_KEY (escrita; nunca no navegador) e
 * SUPABASE_PUBLISHABLE_KEY (leitura). Aceita as chaves novas (sb_secret_…, sb_publishable_…) e as
 * antigas em JWT (service_role, anon); só as antigas vão também no cabeçalho Authorization.
 */

export class SupabaseErro extends Error {
  constructor(public status: number, public corpo: string, contexto: string) {
    super(`Supabase ${contexto}: HTTP ${status} ${corpo.slice(0, 300)}`);
  }
}

export interface Cliente {
  url: string;
  chave: string;
}

export function cliente(chave: "secreta" | "publicavel"): Cliente {
  const url = process.env.SUPABASE_URL;
  const valor = chave === "secreta" ? process.env.SUPABASE_SECRET_KEY : process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !valor) throw new Error(`Faltam SUPABASE_URL e ${chave === "secreta" ? "SUPABASE_SECRET_KEY" : "SUPABASE_PUBLISHABLE_KEY"} no ambiente (.env.local).`);
  return { url: url.replace(/\/$/, ""), chave: valor };
}

function cabecalhos(c: Cliente, extra: Record<string, string> = {}): Record<string, string> {
  const jwt = c.chave.startsWith("eyJ");
  return { apikey: c.chave, ...(jwt ? { Authorization: `Bearer ${c.chave}` } : {}), ...extra };
}

async function pedir(c: Cliente, caminho: string, init: RequestInit & { headers?: Record<string, string> }, contexto: string): Promise<Response> {
  const r = await fetch(`${c.url}/rest/v1/${caminho}`, { ...init, headers: cabecalhos(c, init.headers), signal: AbortSignal.timeout(60_000) });
  if (!r.ok) throw new SupabaseErro(r.status, await r.text(), contexto);
  return r;
}

/** Upsert em lotes pela chave `conflito` (colunas da chave primária). Idempotente. */
export async function upsert(c: Cliente, tabela: string, linhas: object[], conflito: string[], lote = 1000): Promise<void> {
  for (let i = 0; i < linhas.length; i += lote) {
    await pedir(c, `${tabela}?on_conflict=${conflito.join(",")}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(linhas.slice(i, i + lote)),
    }, `upsert ${tabela} [${i}–${Math.min(i + lote, linhas.length)}]`);
  }
}

/**
 * SELECT paginado: o Supabase devolve no máximo 1.000 linhas por pedido (só a Câmara tem 1.107
 * votações), então pede faixas de 1.000 até vir menos. `consulta` é a query string do PostgREST,
 * sempre com `order=` pela chave (ex.: "select=*&casa=eq.camara&order=id").
 */
export async function selecionar<T>(c: Cliente, tabela: string, consulta: string, pagina = 1000): Promise<T[]> {
  // Sem ordem estável, faixas diferentes podem repetir ou pular linhas.
  if (!/(^|&)order=/.test(consulta)) throw new Error(`selecionar ${tabela}: a consulta precisa de order= (paginação estável)`);
  const todas: T[] = [];
  for (let i = 0; ; i += pagina) {
    const r = await pedir(c, `${tabela}?${consulta}`, { method: "GET", headers: { "Range-Unit": "items", Range: `${i}-${i + pagina - 1}` } }, `select ${tabela}`);
    const lote = (await r.json()) as T[];
    todas.push(...lote);
    if (lote.length < pagina) return todas;
  }
}

/** Contagem exata de linhas da tabela. */
export async function contar(c: Cliente, tabela: string): Promise<number> {
  const r = await pedir(c, `${tabela}?select=*`, { method: "HEAD", headers: { Prefer: "count=exact", Range: "0-0" } }, `contar ${tabela}`);
  const total = r.headers.get("content-range")?.split("/")[1];
  if (!total || total === "*") throw new Error(`contar ${tabela}: sem Content-Range`);
  return Number(total);
}

/** Chama uma função do banco (`create function ...`) e devolve o JSON. */
export async function rpc<T>(c: Cliente, funcao: string, args: object = {}): Promise<T> {
  const r = await pedir(c, `rpc/${funcao}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(args) }, `rpc ${funcao}`);
  return (r.status === 204 ? null : await r.json()) as T;
}
