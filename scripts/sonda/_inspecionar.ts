import { DuckDBInstance } from "@duckdb/node-api";
const csv = process.argv[2]!;
const inst = await DuckDBInstance.create(":memory:");
const c = await inst.connect();
await c.run(`CREATE VIEW t AS SELECT * FROM read_csv('${csv}', delim=';', header=true, quote='"', encoding='latin-1', all_varchar=true)`);
const cols = await (await c.run(`DESCRIBE t`)).getRows();
console.log("colunas:", cols.map(r => r[0]).join(", "));
console.log("linhas:", (await (await c.run(`SELECT count(*) FROM t`)).getRows())[0]![0]);
for (const q of process.argv.slice(3)) {
  console.log("\n>", q);
  const rows = await (await c.run(q)).getRows();
  for (const r of rows) console.log("  ", r.join(" | "));
}
