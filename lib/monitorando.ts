"use client";

/**
 * Quem a pessoa monitora, só neste navegador (CLAUDE.md, princípio 3: sem conta, sem e-mail). Fica
 * no localStorage; nunca vai para o servidor. Se o navegador bloquear o armazenamento (aba anônima,
 * dados limpos), a lista some e tudo continua funcionando.
 *
 * `vistos`: chaves dos votos e propostas que a pessoa já viu (lib/acompanhar.ts). Quem acabou de ser
 * adicionado entra com `base: false`: na primeira carga, o que ele já tinha vira "visto", para a
 * novidade ser só o que aparecer depois.
 */
import { useSyncExternalStore } from "react";

export interface Acompanhado { id: string; nome: string; desde: string; base: boolean }
export interface EstadoMonitorando { pessoas: Acompanhado[]; vistos: string[] }

const CHAVE = "fiscaliza:monitorando:v1";
const EVENTO = "fiscaliza:monitorando";
const VAZIO: EstadoMonitorando = { pessoas: [], vistos: [] };

let cache: { texto: string | null; valor: EstadoMonitorando } = { texto: null, valor: VAZIO };

function ler(): EstadoMonitorando {
  let texto: string | null = null;
  try { texto = window.localStorage.getItem(CHAVE); } catch { return cache.valor; }
  if (texto === cache.texto) return cache.valor;
  let valor = VAZIO;
  try {
    const j = texto ? JSON.parse(texto) as Partial<EstadoMonitorando> : null;
    if (j && Array.isArray(j.pessoas)) valor = { pessoas: j.pessoas.filter((p) => p && typeof p.id === "string"), vistos: Array.isArray(j.vistos) ? j.vistos.filter((v) => typeof v === "string") : [] };
  } catch { /* texto corrompido: começa vazio */ }
  cache = { texto, valor };
  return valor;
}

function gravar(f: (e: EstadoMonitorando) => EstadoMonitorando) {
  const novo = f(ler());
  const texto = JSON.stringify(novo);
  try { window.localStorage.setItem(CHAVE, texto); } catch { /* sem armazenamento: vale só nesta página */ }
  cache = { texto, valor: novo };
  window.dispatchEvent(new Event(EVENTO));
}

function assinar(aviso: () => void) {
  const noStorage = (e: StorageEvent) => { if (e.key === CHAVE) aviso(); };
  window.addEventListener("storage", noStorage); // outra aba
  window.addEventListener(EVENTO, aviso);
  return () => { window.removeEventListener("storage", noStorage); window.removeEventListener(EVENTO, aviso); };
}

export function useMonitorando(): EstadoMonitorando {
  return useSyncExternalStore(assinar, ler, () => VAZIO);
}

export const monitora = (e: EstadoMonitorando, id: string) => e.pessoas.some((p) => p.id === id);

export function alternar(id: string, nome: string) {
  gravar((e) => monitora(e, id)
    ? { ...e, pessoas: e.pessoas.filter((p) => p.id !== id) }
    : { ...e, pessoas: [...e.pessoas, { id, nome, desde: new Date().toISOString().slice(0, 10), base: false }] });
}

export function limpar() { gravar(() => VAZIO); }

/** Marca chaves como vistas; com `base`, também registra que a primeira carga dessas pessoas já foi feita. */
export function marcarVistos(chaves: string[], base: string[] = []) {
  gravar((e) => ({
    pessoas: e.pessoas.map((p) => (base.includes(p.id) ? { ...p, base: true } : p)),
    vistos: [...new Set([...e.vistos, ...chaves])],
  }));
}

/** Tira dos vistos o que já não aparece em nenhum resumo (a lista não cresce sem fim). */
export function podarVistos(atuais: Set<string>) {
  gravar((e) => ({ ...e, vistos: e.vistos.filter((v) => atuais.has(v)) }));
}
