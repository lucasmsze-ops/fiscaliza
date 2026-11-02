// Cobertura do top-20 por município (E16): % dos votos nominais válidos que foram para os candidatos listados no site.
// Uso: npx tsx scripts/sonda/_cobertura-top20.ts (lê data/raw/votacao_munzona; regra do top-20 igual a eleitos-mun.ts).
import { DuckDBInstance } from "@duckdb/node-api";
const root = process.cwd();
const inst = await DuckDBInstance.create(":memory:");
const c = await inst.connect();
await c.run(`CREATE VIEW t AS SELECT * FROM read_csv('${root}/data/raw/votacao_munzona/votacao_candidato_munzona_2026_SP.csv', delim=';', header=true, quote='"', encoding='latin-1', all_varchar=true)`);
const rows = await (await c.run(`SELECT NM_MUNICIPIO, lower(DS_CARGO) cargo, SQ_CANDIDATO, sum(CAST(QT_VOTOS_NOMINAIS_VALIDOS AS BIGINT)) v FROM t WHERE lower(DS_CARGO) IN ('deputado federal','senador') GROUP BY ALL`)).getRows();
// por município e cargo: lista ordenada de votos
const porMun = new Map<string, number[]>();
for (const [mun, cargo, , v] of rows) { const k = `${mun}|${cargo}`; (porMun.get(k) ?? porMun.set(k, []).get(k)!).push(Number(v)); }
// top-20 + empatados no 20º (mesma regra do site)
const cob: Record<string, { mun: string; pct: number; tot: number }[]> = { "deputado federal": [], senador: [] };
for (const [k, vs] of porMun) {
  const [mun, cargo] = k.split("|") as [string, string];
  vs.sort((a, b) => b - a);
  const corte = vs[19] ?? 0;
  const tot = vs.reduce((a, b) => a + b, 0);
  const top = vs.filter((v, i) => i < 20 || v === corte).reduce((a, b) => a + b, 0);
  cob[cargo]!.push({ mun, pct: tot ? (100 * top) / tot : 100, tot });
}
for (const [cargo, l] of Object.entries(cob)) {
  const votos = l.reduce((a, b) => a + b.tot, 0), cobertos = l.reduce((a, b) => a + (b.pct / 100) * b.tot, 0);
  l.sort((a, b) => a.pct - b.pct);
  const q = (p: number) => l[Math.floor(p * (l.length - 1))]!.pct.toFixed(1);
  console.log(`${cargo}: ${l.length} municípios; eleitor médio do estado acha o candidato no top-20 em ${(100 * cobertos / votos).toFixed(1)}% dos votos; mediana municipal ${q(0.5)}%, mínimo ${q(0)}%`);
  console.log("  menores:", l.slice(0, 5).map((x) => `${x.mun} ${x.pct.toFixed(1)}%`).join(", "));
  const grandes = [...l].sort((a, b) => b.tot - a.tot).slice(0, 8);
  console.log("  maiores cidades:", grandes.map((x) => `${x.mun} ${x.pct.toFixed(1)}%`).join(", "));
}

// Curva: cobertura estadual (ponderada por voto) e da capital se a lista tivesse N nomes.
const dep = [...porMun].filter(([k]) => k.endsWith("|deputado federal"));
for (const n of [20, 30, 50, 100]) {
  let tot = 0, cob = 0, capTot = 0, capCob = 0;
  for (const [k, vs] of dep) {
    const s = [...vs].sort((a, b) => b - a), t = s.reduce((a, b) => a + b, 0), c = s.slice(0, n).reduce((a, b) => a + b, 0);
    tot += t; cob += c;
    if (k.startsWith("SÃO PAULO|")) { capTot = t; capCob = c; }
  }
  console.log(`top-${n}: estado ${(100 * cob / tot).toFixed(1)}%, capital ${(100 * capCob / capTot).toFixed(1)}%`);
}
