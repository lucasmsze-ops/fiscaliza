/**
 * Publica no Supabase só a diferença entre estado/dados e estado/publicado, tabela a tabela, na
 * ordem das chaves estrangeiras. Regravar linha igual ocupa espaço (medido na E19), então linha sem
 * mudança não sai daqui. Só depois de todas as tabelas darem certo o publicado vira o novo dados:
 * se algo falhar no meio, a próxima execução manda de novo (upsert é idempotente).
 */
import { TABELAS } from "../../lib/esquema";
import { cliente, upsert } from "../../lib/supabase";
import { canonico, chave, DADOS, gravarTabela, lerTabela, PUBLICADO } from "./estado";

export interface Publicacao { tabela: string; enviadas: number; semMudanca: number; soNoPublicado: number }

export async function publicar(): Promise<Publicacao[]> {
  const c = cliente("secreta");
  const res: Publicacao[] = [];
  const novos = new Map<string, ReturnType<typeof lerTabela>>();
  for (const t of TABELAS) {
    const dados = lerTabela(t.nome, DADOS), antes = lerTabela(t.nome, PUBLICADO);
    const publicado = new Map(antes.map((l) => [chave(l, t.pk), canonico(l)]));
    const mudou = dados.filter((l) => publicado.get(chave(l, t.pk)) !== canonico(l));
    const atuais = new Set(dados.map((l) => chave(l, t.pk)));
    await upsert(c, t.nome, mudou, [...t.pk]);
    res.push({ tabela: t.nome, enviadas: mudou.length, semMudanca: dados.length - mudou.length, soNoPublicado: antes.filter((l) => !atuais.has(chave(l, t.pk))).length });
    novos.set(t.nome, dados);
  }
  for (const [nome, linhas] of novos) gravarTabela(nome, linhas, PUBLICADO);
  return res;
}
