// Extrai uma fixture pequena e real para tests/fixtures/indicadores-real.json:
// 1 deputado da amostra, as 8 primeiras votações nominais de 2025 com orientação do Governo,
// mais 2 sem orientação posicional, com os votos dele (ou ausência) e as orientações.
import { readFileSync, writeFileSync } from "node:fs";
import type { PoliticoCamara } from "./camara";
import type { VotoSonda, VotacaoSondaCompleta } from "./votos";
import type { OrientacaoCamara } from "../../lib/camara";

const nome = process.argv[2] ?? "Tabata Amaral";
const dep = (JSON.parse(readFileSync("data/sonda/politicos-camara.json", "utf8")) as PoliticoCamara[]).find((p) => p.nome === nome)!;
const votacoes = JSON.parse(readFileSync("data/sonda/votacoes.json", "utf8")) as VotacaoSondaCompleta[];
const orientacoes = JSON.parse(readFileSync("data/sonda/orientacoes.json", "utf8")) as OrientacaoCamara[];
const votos = (JSON.parse(readFileSync("data/sonda/votos.json", "utf8")) as VotoSonda[]).filter((v) => v.camaraId === dep.camaraId);

const gov = new Map(orientacoes.filter((o) => o.bancada === "Governo").map((o) => [o.votacaoId, o.orientacao]));
const de2025 = votacoes.filter((v) => v.data.startsWith("2025"));
const comGov = de2025.filter((v) => ["Sim", "Não", "Obstrução"].includes(gov.get(v.idExterno) ?? "")).slice(0, 8);
const semGov = de2025.filter((v) => !["Sim", "Não", "Obstrução"].includes(gov.get(v.idExterno) ?? "")).slice(0, 2);
const sel = [...comGov, ...semGov];
const ids = new Set(sel.map((v) => v.idExterno));

const fixture = {
  politico: { camaraId: dep.camaraId, nome: dep.nome },
  votacoes: sel.map((v) => ({ idExterno: v.idExterno, data: v.data, objeto: v.objeto, proposicao: v.proposicao ? `${v.proposicao.tipo} ${v.proposicao.numero}/${v.proposicao.ano}` : null, descricao: v.descricao })),
  orientacoesGoverno: sel.map((v) => ({ votacaoId: v.idExterno, orientacao: gov.get(v.idExterno) ?? null })),
  votos: votos.filter((v) => ids.has(v.votacaoId)).map((v) => ({ votacaoId: v.votacaoId, voto: v.voto })),
};
writeFileSync("tests/fixtures/indicadores-real.json", JSON.stringify(fixture, null, 1) + "\n");
console.log(JSON.stringify(fixture.orientacoesGoverno.map((o, i) => [o.votacaoId, o.orientacao, fixture.votos.find((v) => v.votacaoId === o.votacaoId)?.voto ?? "ausente"]), null, 0));
