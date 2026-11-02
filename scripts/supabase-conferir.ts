/**
 * E19 — Critério de pronto: `count(*)` de cada tabela bate com data/*.json. Mede também o tamanho
 * real no Postgres (tabela + índices) contra o JSON, para conferir a estimativa de docs/VOLUME.md
 * (1,5 a 2 vezes o JSON) e a margem até os 500 MB do plano free.
 * Uso: npm run supabase:conferir   (SUPABASE_URL e SUPABASE_SECRET_KEY de .env.local; DATA_DIR=estado/dados compara com o estado do cron)
 */
import { readFileSync, statSync } from "node:fs";
import { TABELAS } from "../lib/esquema";
import { cliente, contar, rpc } from "../lib/supabase";

const c = cliente("secreta");
const DIR = process.env.DATA_DIR ?? "data";
const tam = new Map((await rpc<{ tabela: string; linhas: number; bytes: number }[]>(c, "tamanhos")).map((t) => [t.tabela, t]));
const mb = (b: number) => (b / 1024 / 1024).toFixed(2);
let diverge = 0, jsonTotal = 0;
console.log(`${"tabela".padEnd(18)} ${"JSON".padStart(7)} ${"banco".padStart(7)}   ${"JSON MB".padStart(8)} ${"PG MB".padStart(7)}  PG/JSON`);
for (const t of TABELAS) {
  const json = (JSON.parse(readFileSync(`${DIR}/${t.nome}.json`, "utf8")) as unknown[]).length;
  const banco = await contar(c, t.nome);
  const bytesJson = statSync(`${DIR}/${t.nome}.json`).size;
  const pg = tam.get(t.nome)?.bytes ?? 0;
  jsonTotal += bytesJson;
  if (json !== banco) diverge++;
  console.log(`${t.nome.padEnd(18)} ${String(json).padStart(7)} ${String(banco).padStart(7)} ${json === banco ? "ok" : "≠ "} ${mb(bytesJson).padStart(8)} ${mb(pg).padStart(7)}  ${(pg / bytesJson).toFixed(2)}`);
}
const pgTotal = [...tam.values()].reduce((s, t) => s + t.bytes, 0);
console.log(`\ntotal: JSON ${mb(jsonTotal)} MB · Postgres ${mb(pgTotal)} MB (todas as tabelas do schema public) · ${(pgTotal / jsonTotal).toFixed(2)}× · ${(100 * pgTotal / (500 * 1024 * 1024)).toFixed(1)}% de 500 MB`);
if (diverge) { console.error(`\n${diverge} tabela(s) com contagem diferente do JSON`); process.exit(1); }
console.log(`contagens ok: todas as tabelas batem com ${DIR}/*.json`);
