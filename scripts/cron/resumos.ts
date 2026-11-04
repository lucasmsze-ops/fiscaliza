/**
 * Card e página de cada político (lib/card.ts, lib/pagina.ts: o mesmo código do site) a partir de
 * uma pasta de tabelas, gravados em `resumos` só onde o hash mudou. Usado pelo cron (estado/dados)
 * e por `npm run precalcular` (data/).
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
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

/** Página de cada votação (scripts/cron/votacoes-paginas.ts), gravada em `resumos_votacao` só onde o hash mudou. */
export async function gravarResumosVotacao(dir: string) {
  const arq = `${dir}/resumos_votacao.json`;
  if (!existsSync(arq)) return { votacoes: 0, gravados: 0 };
  const linhas = JSON.parse(readFileSync(arq, "utf8")) as { votacao_id: string; pagina: object }[];
  const c = cliente("secreta");
  const existentes = new Map((await selecionar<{ votacao_id: string; hash: string }>(c, "resumos_votacao", "select=votacao_id,hash&order=votacao_id")).map((r) => [r.votacao_id, r.hash]));
  const novos = linhas.flatMap((l) => {
    const hash = createHash("sha256").update(JSON.stringify(l.pagina)).digest("hex");
    return existentes.get(l.votacao_id) === hash ? [] : [{ votacao_id: l.votacao_id, pagina: l.pagina, hash, calculado_em: new Date().toISOString() }];
  });
  await upsert(c, "resumos_votacao", novos, ["votacao_id"], 200);
  return { votacoes: linhas.length, gravados: novos.length };
}
