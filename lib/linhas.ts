/**
 * Conversão entre os tipos de `lib/types.ts` (camelCase) e as linhas de `data/*.json` e do
 * Supabase (snake_case). Só renomeia as chaves do primeiro nível; valores (inclusive objetos como
 * `porCategoria` e `placar`) passam intactos.
 */
import type { Linha } from "./types";

const paraSnake = (k: string) => k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`).replace(/(\D)(\d+)/g, "$1_$2");
const paraCamel = (k: string) => k.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());

export function paraLinha<T extends object>(obj: T): Linha<T> {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [paraSnake(k), v])) as Linha<T>;
}

export function deLinha<T extends object>(linha: Linha<T>): T {
  return Object.fromEntries(Object.entries(linha).map(([k, v]) => [paraCamel(k), v])) as T;
}
