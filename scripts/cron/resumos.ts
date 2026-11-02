/**
 * Card e página de cada político (lib/card.ts, lib/pagina.ts: o mesmo código do site) a partir de
 * uma pasta de tabelas, gravados em `resumos` só onde o hash mudou. Usado pelo cron (estado/dados)
 * e por `npm run precalcular` (data/).
 */
import { createHash } from "node:crypto";
import { montarPagina } from "../../lib/pagina";
import { JsonRepo } from "../../lib/repo";
import { cliente, selecionar, upsert } from "../../lib/supabase";

export async function gravarResumos(dir: string, hoje = new Date().toISOString().slice(0, 10)) {
  const repo = new JsonRepo(dir);
  const c = cliente("secreta");
  const existentes = new Map((await selecionar<{ politico_id: string; hash: string }>(c, "resumos", "select=politico_id,hash&order=politico_id")).map((r) => [r.politico_id, r.hash]));
  const novos: { politico_id: string; card: object; pagina: object; hash: string; calculado_em: string }[] = [];
  const politicos = await repo.listarPoliticos();
  let bytes = 0;
  for (const p of politicos) {
    const pagina = await montarPagina(repo, p.id, hoje);
    if (!pagina) throw new Error(`sem página para ${p.id}`);
    const texto = JSON.stringify(pagina);
    bytes += texto.length;
    const hash = createHash("sha256").update(texto).digest("hex");
    if (existentes.get(p.id) !== hash) novos.push({ politico_id: p.id, card: pagina.card, pagina, hash, calculado_em: new Date().toISOString() });
  }
  await upsert(c, "resumos", novos, ["politico_id"], 200);
  return { politicos: politicos.length, gravados: novos.length, kbMedio: bytes / 1024 / Math.max(1, politicos.length) };
}
