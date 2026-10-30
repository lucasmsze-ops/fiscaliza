// Tabela dos dois números (participação e governismo) da amostra, com dado real da sonda.
import { readFileSync } from "node:fs";
import { governismo, participacao } from "../../lib/indicadores";
import type { Orientacao, Votacao, Voto } from "../../lib/types";
import type { PoliticoCamara } from "./camara";
import type { VotoSonda, VotacaoSondaCompleta } from "./votos";
import type { OrientacaoCamara } from "../../lib/camara";

const amostra = JSON.parse(readFileSync("data/sonda/politicos-camara.json", "utf8")) as PoliticoCamara[];
const vs = JSON.parse(readFileSync("data/sonda/votacoes.json", "utf8")) as VotacaoSondaCompleta[];
const os = JSON.parse(readFileSync("data/sonda/orientacoes.json", "utf8")) as OrientacaoCamara[];
const votos = JSON.parse(readFileSync("data/sonda/votos.json", "utf8")) as VotoSonda[];

const votacoes: Votacao[] = vs.map((v) => ({ idExterno: v.idExterno, casa: "camara", data: v.data, objeto: v.objeto ?? "", resultado: null, urlOficial: v.urlOficial, quiz: false }));
const orientacoes: Orientacao[] = os.map((o) => ({ votacaoId: o.votacaoId, bancada: o.bancada, orientacao: o.orientacao }));
const periodo = { inicio: "2023-01-01", fim: "2026-12-31" };
const f = (x: { percentual: number | null; numerador: number; denominador: number }) => `${x.percentual === null ? "—" : x.percentual.toFixed(1) + "%"} (${x.numerador}/${x.denominador})`;

console.log("| Político | Partido | Participação | Governismo |\n|---|---|---|---|");
for (const p of amostra) {
  const meus: Voto[] = votos.filter((v) => v.camaraId === p.camaraId).map((v) => ({ votacaoId: v.votacaoId, politicoId: String(p.camaraId), voto: v.voto }));
  console.log(`| ${p.nome} | ${p.partido} | ${f(participacao(votacoes, meus, periodo))} | ${f(governismo(votacoes, meus, orientacoes, periodo))} |`);
}
const tipos = new Map<string, number>();
for (const v of votos) tipos.set(v.voto, (tipos.get(v.voto) ?? 0) + 1);
console.log("\ntipos de voto na amostra:", [...tipos].map(([k, n]) => `${k}=${n}`).join(", "));
