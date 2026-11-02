/**
 * E20 — Calcula o card e a página de cada político (lib/card.ts, lib/pagina.ts: o mesmo código
 * que o site usa no modo JSON) e grava em `resumos`, só onde o resultado mudou (hash).
 * Fonte: data/*.json (JsonRepo). Na E21 o cron calcula a partir do que acabou de coletar.
 * Uso: npm run precalcular   (SUPABASE_URL e SUPABASE_SECRET_KEY de .env.local)
 */
import { createHash } from "node:crypto";
import { montarPagina } from "../lib/pagina";
import { JsonRepo } from "../lib/repo";
import { cliente, selecionar, upsert } from "../lib/supabase";

const json = new JsonRepo();
const c = cliente("secreta");
const hoje = new Date().toISOString().slice(0, 10);
const t0 = Date.now();

const existentes = new Map((await selecionar<{ politico_id: string; hash: string }>(c, "resumos", "select=politico_id,hash&order=politico_id")).map((r) => [r.politico_id, r.hash]));
const novos: { politico_id: string; card: object; pagina: object; hash: string; calculado_em: string }[] = [];
let bytes = 0;
for (const p of await json.listarPoliticos()) {
  const pagina = await montarPagina(json, p.id, hoje);
  if (!pagina) throw new Error(`sem página para ${p.id}`);
  const texto = JSON.stringify(pagina);
  bytes += texto.length;
  const hash = createHash("sha256").update(texto).digest("hex");
  if (existentes.get(p.id) !== hash) novos.push({ politico_id: p.id, card: pagina.card, pagina, hash, calculado_em: new Date().toISOString() });
}
await upsert(c, "resumos", novos, ["politico_id"], 200);
const politicos = (await json.listarPoliticos()).length;
console.log(`${politicos} políticos · ${novos.length} resumos gravados (os demais não mudaram) · média ${(bytes / 1024 / politicos).toFixed(1)} KB por página · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
