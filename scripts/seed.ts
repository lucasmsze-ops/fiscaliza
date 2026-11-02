/**
 * E19 — Carrega data/*.json no Supabase (upsert por chave primária; rodar de novo não duplica).
 * Uso: npm run seed   (lê SUPABASE_URL e SUPABASE_SECRET_KEY de .env.local)
 */
import { readFileSync } from "node:fs";
import { TABELAS } from "../lib/esquema";
import { cliente, upsert } from "../lib/supabase";

const c = cliente("secreta");
const t0 = Date.now();
for (const t of TABELAS) {
  const linhas = JSON.parse(readFileSync(`data/${t.nome}.json`, "utf8")) as object[];
  const t1 = Date.now();
  await upsert(c, t.nome, linhas, [...t.pk]);
  console.log(`${t.nome.padEnd(18)} ${String(linhas.length).padStart(7)} linhas  ${((Date.now() - t1) / 1000).toFixed(1).padStart(5)} s`);
}
console.log(`\nseed ok em ${((Date.now() - t0) / 1000).toFixed(0)} s`);
