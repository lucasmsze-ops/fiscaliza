// Extrai uma fixture pequena e real para tests/fixtures/indicadores-senado-real.json:
// 1 senador, votações de 2025 — 6 abertas com orientação Sim/Não do Governo (3 alinhadas,
// 3 contrárias quando houver), 2 secretas ("Votou") e 2 abertas em que a sigla é de ausência —
// com os votos dele e as orientações do Governo.
import { readFileSync, writeFileSync } from "node:fs";
import type { OrientacaoSenadoSonda, SenadorSonda, VotacaoSenadoSonda, VotoSenadoSonda } from "./senadores";

const nome = process.argv[2] ?? "Astronauta Marcos Pontes";
const sen = (JSON.parse(readFileSync("data/sonda/senadores.json", "utf8")) as SenadorSonda[]).find((s) => s.nome === nome)!;
const votacoes = JSON.parse(readFileSync("data/sonda/votacoes-senado.json", "utf8")) as VotacaoSenadoSonda[];
const orientacoes = JSON.parse(readFileSync("data/sonda/orientacoes-senado.json", "utf8")) as OrientacaoSenadoSonda[];
const votos = new Map((JSON.parse(readFileSync("data/sonda/votos-senado.json", "utf8")) as VotoSenadoSonda[]).filter((v) => v.senadoCodigo === sen.senadoCodigo).map((v) => [v.votacaoId, v]));

const gov = new Map(orientacoes.filter((o) => o.bancada === "Governo").map((o) => [o.votacaoId, o.orientacao]));
const de2025 = votacoes.filter((v) => v.data.startsWith("2025"));
const PARA_VOTO: Record<string, string> = { Sim: "sim", Não: "nao" };
const posicionais = de2025.filter((v) => !v.secreta && ["Sim", "Não"].includes(gov.get(v.idExterno) ?? "") && ["sim", "nao"].includes(votos.get(v.idExterno)!.voto));
const contrarias = posicionais.filter((v) => PARA_VOTO[gov.get(v.idExterno)!] !== votos.get(v.idExterno)!.voto).slice(0, 3);
const alinhadas = posicionais.filter((v) => PARA_VOTO[gov.get(v.idExterno)!] === votos.get(v.idExterno)!.voto).slice(0, 6 - contrarias.length);
const abertasGov = [...alinhadas, ...contrarias];
const secretas = de2025.filter((v) => v.secreta && votos.get(v.idExterno)!.voto === "secreto").slice(0, 2);
const ausencias = de2025.filter((v) => !v.secreta && votos.get(v.idExterno)!.voto === "ausente").slice(0, 2);
const sel = [...abertasGov, ...secretas, ...ausencias];

const fixture = {
  politico: { senadoCodigo: sen.senadoCodigo, nome: sen.nome },
  votacoes: sel.map((v) => ({ idExterno: v.idExterno, data: v.data, secreta: v.secreta, proposicao: v.proposicao?.identificacao ?? null, descricao: v.descricao })),
  orientacoesGoverno: sel.map((v) => ({ votacaoId: v.idExterno, orientacao: gov.get(v.idExterno) ?? null })),
  votos: sel.map((v) => { const x = votos.get(v.idExterno)!; return { votacaoId: x.votacaoId, sigla: x.sigla, voto: x.voto }; }),
};
writeFileSync("tests/fixtures/indicadores-senado-real.json", JSON.stringify(fixture, null, 1) + "\n");
console.log(fixture.votos.map((v, i) => [v.votacaoId, fixture.votacoes[i]!.secreta ? "S" : "N", fixture.orientacoesGoverno[i]!.orientacao, v.sigla, v.voto].join(" | ")).join("\n"));
