// Os dois números (participação e governismo) a partir das tabelas finais em data/ (E8),
// com o denominador restrito aos mandatos em exercício. Uso: npx tsx scripts/sonda/_numeros.ts [--todos]
import { readFileSync } from "node:fs";
import { governismo, participacao, type Indicador } from "../../lib/indicadores";
import { deLinha } from "../../lib/linhas";
import type { Linha, Mandato, Orientacao, Politico, Votacao, Voto } from "../../lib/types";

const tab = <T extends object>(t: string) => (JSON.parse(readFileSync(`data/${t}.json`, "utf8")) as Linha<T>[]).map((l) => deLinha<T>(l));
const politicos = tab<Politico>("politicos"), mandatos = tab<Mandato>("mandatos"), votacoes = tab<Votacao>("votacoes");
const votos = tab<Voto>("votos"), orientacoes = tab<Orientacao>("orientacoes");
const amostra = new Set((JSON.parse(readFileSync("data/sonda/politicos-tse.json", "utf8")) as { tseSqCandidato: string }[]).map((p) => p.tseSqCandidato));
const PERIODO = { inicio: "2023-01-01", fim: "2026-12-31" }; // período de governo atual (corte em 01/01/2027)
const f = (x: Indicador) => (x.percentual === null ? `— (${x.denominador ? `${x.numerador}/${x.denominador}` : "sem mandato no período"})` : `${x.percentual.toFixed(1).replace(".", ",")}% (${x.numerador}/${x.denominador})`);

const alvo = politicos.filter((p) => (process.argv.includes("--todos") ? p.camaraId || p.senadoCodigo : amostra.has(p.tseSqCandidato ?? "")));
console.log("| Político | Cargo · status | Casa | Participação | Governismo |\n|---|---|---|---|---|");
for (const p of alvo) {
  const casa = p.senadoCodigo ? "senado" : "camara";
  const cargo = casa === "senado" ? "senador" : "deputado_federal";
  const vs = votacoes.filter((v) => v.casa === casa);
  const meus = votos.filter((v) => v.politicoId === p.id);
  const ex = mandatos.filter((m) => m.politicoId === p.id && m.cargo === cargo);
  if (!p.camaraId && !p.senadoCodigo) { console.log(`| ${p.nomeUrna} | ${p.cargo} · ${p.status} | — | primeiro voto em fevereiro | — |`); continue; }
  console.log(`| ${p.nomeUrna} | ${p.cargo} · ${p.status} | ${casa} | ${f(participacao(vs, meus, PERIODO, ex))} | ${f(governismo(vs, meus, orientacoes, PERIODO))} |`);
}
