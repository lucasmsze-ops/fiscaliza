/**
 * E5 — CEAP: despesas mensais via API para TODA a bancada de SP em exercício (70), 2025→hoje.
 *
 * - Número do político e média da bancada vêm da mesma fonte (API), porque o CSV anual oficial
 *   (camara.leg.br/cotas/Ano-{ano}.csv.zip) não inclui "PASSAGEM AÉREA - SIGEPA" e a API não
 *   inclui os micro-itens de TELEFONIA do CSV (ver docs/SONDA.md).
 * - Saída: data/sonda/despesas.json = { despesas (os 70 de SP, desde a E8), mediaUf (SP, por mês) }.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { mapLimite } from "../../lib/async";
import { listarDespesas, type DespesaCamara } from "../../lib/camara";
import type { PoliticoCamara } from "./camara";

const ANOS = [2025, 2026];
const LEG = 57;
const t0 = Date.now();
const marca = () => `${((Date.now() - t0) / 1000).toFixed(0)}s`;
const r2 = (x: number) => Math.round(x * 100) / 100;

export interface DespesaMesSonda { camaraId: number; ano: number; mes: number; total: number; porCategoria: Record<string, number>; documentos: number }
export interface MediaUfMes { uf: string; ano: number; mes: number; media: number; deputados: number; total: number }

const amostra = (JSON.parse(readFileSync("data/sonda/politicos-camara.json", "utf8")) as PoliticoCamara[]).filter((p) => p.emExercicio);
const bancadaSP = JSON.parse(readFileSync("data/raw/apoio/camara-sp-atual.json", "utf8")) as { id: number; nome: string }[];

const tarefas = bancadaSP.flatMap((d) => ANOS.map((ano) => ({ camaraId: d.id, ano })));
const res = await mapLimite(tarefas, 4, async ({ camaraId, ano }) => ({ camaraId, ano, itens: await listarDespesas(camaraId, LEG, ano) }));
const docs = res.ok.reduce((s, x) => s + x.itens.length, 0);
console.log(`[${marca()}] API: ${res.ok.length}/${tarefas.length} deputado-anos ok, ${res.falhas.length} falhas, ${docs} documentos`);

// Agregação por deputado-mês (valorLiquido, soma líquida: estornos vêm negativos).
// codDocumento repetido NÃO é duplicata: passagens SIGEPA têm várias linhas (trechos, estornos)
// com o mesmo código. Não deduplicar.
const porMes = new Map<string, DespesaMesSonda>();
let negativos = 0;
for (const { camaraId, itens } of res.ok) for (const d of itens as DespesaCamara[]) {
  if (d.valorLiquido < 0) negativos++;
  const k = `${camaraId}-${d.ano}-${d.mes}`;
  const e = porMes.get(k) ?? { camaraId, ano: d.ano, mes: d.mes, total: 0, porCategoria: {}, documentos: 0 };
  e.total = r2(e.total + d.valorLiquido); e.documentos++;
  e.porCategoria[d.tipo] = r2((e.porCategoria[d.tipo] ?? 0) + d.valorLiquido);
  porMes.set(k, e);
}
console.log(`linhas com valor líquido negativo (estornos, somadas): ${negativos}`);

// Média SP por mês: soma dos 70 ÷ deputados com algum gasto no mês.
const mediaUf: MediaUfMes[] = [];
for (const ano of ANOS) for (let mes = 1; mes <= 12; mes++) {
  const ms = [...porMes.values()].filter((e) => e.ano === ano && e.mes === mes);
  if (!ms.length) continue;
  const total = r2(ms.reduce((s, e) => s + e.total, 0));
  mediaUf.push({ uf: "SP", ano, mes, media: r2(total / ms.length), deputados: ms.length, total });
}

const despesas = [...porMes.values()].sort((a, b) => a.camaraId - b.camaraId || a.ano - b.ano || a.mes - b.mes);
writeFileSync("data/sonda/despesas.json", JSON.stringify({ fonte: "API /deputados/{id}/despesas?idLegislatura=57&ano", geradoEm: new Date().toISOString().slice(0, 10), despesas, mediaUf }, null, 1) + "\n");

console.log(`\nmédia SP por mês (API, ${bancadaSP.length} deputados em exercício):`);
for (const m of mediaUf) console.log(`  ${m.ano}-${String(m.mes).padStart(2, "0")}  R$ ${m.media.toFixed(2).padStart(10)}  (${m.deputados} com gasto)`);
const ref = mediaUf.filter((m) => m.ano === 2026).at(-3)!;
console.log(`\namostra em ${ref.ano}-${String(ref.mes).padStart(2, "0")} vs média SP R$ ${ref.media.toFixed(2)}:`);
for (const p of amostra) { const e = porMes.get(`${p.camaraId}-${ref.ano}-${ref.mes}`); console.log(`  ${p.nome.padEnd(24)} R$ ${(e?.total ?? 0).toFixed(2).padStart(10)}  ${e ? e.documentos + " docs" : "sem lançamento"}`); }
const cats = new Map<string, number>(); for (const e of porMes.values()) for (const [k, v] of Object.entries(e.porCategoria)) cats.set(k, r2((cats.get(k) ?? 0) + v));
console.log(`\ncategorias (${cats.size}), total SP 2025→hoje:`); for (const [k, v] of [...cats].sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(62)} R$ ${v.toFixed(2).padStart(12)}`);
if (res.falhas.length) { console.log("falhas:"); for (const f of res.falhas) console.log("  ", JSON.stringify(f.item), String(f.erro).slice(0, 100)); }
