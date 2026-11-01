// Compara duas gerações do votacao_candidato_munzona (o TSE regenera o arquivo sem aviso):
// votos válidos e situação por candidato, para Deputado Federal e Senador.
// Uso: npx tsx scripts/sonda/_comparar-munzona.ts <csv-antigo> <csv-novo>
import { DuckDBInstance } from "@duckdb/node-api";
const [antigo, novo] = process.argv.slice(2) as [string, string];
const csv = (f: string) => `read_csv('${f}', delim=';', header=true, quote='"', encoding='latin-1', all_varchar=true)`;
const inst = await DuckDBInstance.create(":memory:");
const c = await inst.connect();
const q = async (s: string) => await (await c.run(s)).getRowObjectsJson();
for (const [t, f] of [["a", antigo], ["b", novo]] as const)
  await c.run(`CREATE TABLE ${t} AS SELECT DS_CARGO, SQ_CANDIDATO, sum(QT_VOTOS_NOMINAIS_VALIDOS::BIGINT) v, sum(QT_VOTOS_NOMINAIS::BIGINT) vn,
    any_value(DS_SIT_TOT_TURNO) sit, any_value(DS_SITUACAO_CANDIDATURA) cand, any_value(NM_TIPO_DESTINACAO_VOTOS) dest, max(DT_GERACAO) g
    FROM ${csv(f)} WHERE DS_CARGO IN ('Deputado Federal','Senador') GROUP BY ALL`);
console.log(await q(`SELECT 'antigo' f, DS_CARGO, count(*) n, sum(v) validos, max(g) geracao FROM a GROUP BY ALL
  UNION ALL SELECT 'novo', DS_CARGO, count(*), sum(v), max(g) FROM b GROUP BY ALL ORDER BY 2, 1`));
console.log("candidatos com diferença:", await q(`SELECT DS_CARGO, SQ_CANDIDATO, a.v va, b.v vb, a.vn vna, b.vn vnb, a.sit sa, b.sit sb, a.cand ca, b.cand cb, a.dest da, b.dest db
  FROM a FULL JOIN b USING (DS_CARGO, SQ_CANDIDATO)
  WHERE a.v IS DISTINCT FROM b.v OR a.vn IS DISTINCT FROM b.vn OR a.sit IS DISTINCT FROM b.sit OR a.cand IS DISTINCT FROM b.cand OR a.dest IS DISTINCT FROM b.dest`));
