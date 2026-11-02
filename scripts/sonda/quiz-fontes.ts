/**
 * E13 — Fontes oficiais das matérias do quiz, para escrever a explicação de cada pergunta sem
 * inventar nada. Para cada item da lista QUIZ (scripts/sonda/consolidar.ts):
 *  - Câmara  /proposicoes/{id}: ementa, palavras-chave, situação atual, inteiro teor.
 *  - Senado  /processo/{id}: ementa do texto aprovado, situação atual, norma gerada.
 *  - Votações (data/sonda): data, placar e orientação do Governo das votações escolhidas.
 * Saída: data/sonda/quiz-fontes.json (base de data/sonda/quiz-textos.json, escrito à mão).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { CAMARA_API } from "../../lib/camara";
import { fetchJson } from "../../lib/http";
import { SENADO_API } from "../../lib/senado";
import type { VotacaoSenadoSonda } from "./senadores";
import type { VotacaoSondaCompleta } from "./votos";

const fonte = readFileSync("scripts/sonda/consolidar.ts", "utf8");
const bloco = fonte.slice(fonte.indexOf("const QUIZ"), fonte.indexOf("];", fonte.indexOf("const QUIZ")));
const itens = [...bloco.matchAll(/\["([^"]+)", (null|"[^"]+"), (null|"[^"]+")\]/g)].map((m) => ({
  materia: m[1]!, camara: m[2] === "null" ? null : m[2]!.slice(1, -1), senado: m[3] === "null" ? null : m[3]!.slice(1, -1),
}));

const vCam = JSON.parse(readFileSync("data/sonda/votacoes.json", "utf8")) as VotacaoSondaCompleta[];
const vSen = JSON.parse(readFileSync("data/sonda/votacoes-senado.json", "utf8")) as VotacaoSenadoSonda[];
const orient = [
  ...(JSON.parse(readFileSync("data/sonda/orientacoes.json", "utf8")) as { votacaoId: string; bancada: string; orientacao: string }[]),
  ...(JSON.parse(readFileSync("data/sonda/orientacoes-senado.json", "utf8")) as { votacaoId: string; bancada: string; orientacao: string }[]),
];
const gov = (id: string) => orient.find((o) => o.votacaoId === id && o.bancada === "Governo")?.orientacao || "sem orientação";

interface PropCamara { dados: { id: number; siglaTipo: string; numero: number; ano: number; ementa: string; ementaDetalhada: string; keywords: string; urlInteiroTeor: string | null; statusProposicao: { dataHora: string; descricaoSituacao: string | null; descricaoTramitacao: string; despacho: string } } }
interface ProcSenado { identificacao: string; codigoMateria: number; situacaoAtual: string; dataSituacaoAtual: string; conteudo?: { ementa?: string }; normaGerada?: { descricao?: string } }

const saida = [];
for (const it of itens) {
  const vc = it.camara ? vCam.find((v) => v.idExterno === it.camara)! : null;
  const vs = it.senado ? vSen.find((v) => v.idExterno === it.senado)! : null;
  const cam = vc?.proposicao ? (await fetchJson<PropCamara>(`${CAMARA_API}/proposicoes/${vc.proposicao.proposicaoId}`, { label: "camara:/proposicoes/{id}" })).dados : null;
  const sen = vs?.proposicao?.idProcesso ? await fetchJson<ProcSenado>(`${SENADO_API}/processo/${vs.proposicao.idProcesso}`, { label: "senado:/processo/{id}" }) : null;
  saida.push({
    materia: it.materia,
    camara: cam && vc ? {
      ementa: cam.ementa, palavrasChave: cam.keywords, situacao: cam.statusProposicao.descricaoSituacao, ultimaTramitacao: cam.statusProposicao.descricaoTramitacao,
      despacho: cam.statusProposicao.despacho, dataSituacao: cam.statusProposicao.dataHora.slice(0, 10), inteiroTeor: cam.urlInteiroTeor,
      pagina: `https://www.camara.leg.br/propostas-legislativas/${cam.id}`,
      votacao: { id: `camara:${vc.idExterno}`, data: vc.data, descricao: vc.descricao.replace(/\s+/g, " "), placar: vc.placar, governo: gov(vc.idExterno) },
    } : null,
    senado: sen && vs ? {
      identificacao: sen.identificacao, ementaTextoAprovado: sen.conteudo?.ementa ?? null, situacao: sen.situacaoAtual, dataSituacao: sen.dataSituacaoAtual,
      norma: sen.normaGerada?.descricao ?? null, pagina: `https://www25.senado.leg.br/web/atividade/materias/-/materia/${sen.codigoMateria}`,
      votacao: { id: `senado:${vs.idExterno}`, data: vs.data, descricao: vs.descricao, placar: vs.placar, governo: gov(vs.idExterno) },
    } : null,
  });
}
writeFileSync("data/sonda/quiz-fontes.json", JSON.stringify(saida, null, 1) + "\n");
console.log(`${saida.length} matérias; Câmara ${saida.filter((x) => x.camara).length}, Senado ${saida.filter((x) => x.senado).length}`);
