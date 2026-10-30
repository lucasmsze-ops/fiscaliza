/**
 * E6 — Sonda Senado: perfil, mandatos, licenças, votações nominais do plenário 2023→hoje,
 * orientações de bancada e votos dos senadores de SP em exercício.
 *
 * Entrada: data/sonda/politicos-tse.json (E1).
 * Saída:   data/sonda/senadores.json           (3 em exercício, com join ao TSE)
 *          data/sonda/votacoes-senado.json     (todas as nominais do plenário, abertas e secretas)
 *          data/sonda/orientacoes-senado.json  (bancadas, no vocabulário da Câmara)
 *          data/sonda/votos-senado.json        (os 3 × todas as votações; ausência é explícita no Senado)
 * A API do Senado não expõe CPF: o join é por nome completo + UF, impresso aqui para revisão.
 */
import { writeFileSync } from "node:fs";
import { governismo, participacao } from "../../lib/indicadores";
import {
  getLicencas, getMandatos, getSenador, listarOrientacoesPlenario, listarSenadoresAtuais, listarVotacoesPlenario,
  type LicencaSenado, type MandatoSenado, type SenadorPerfil, type VotacaoSenado, type VotoSenado,
} from "../../lib/senado";
import type { Orientacao, TipoVoto, Votacao, Voto } from "../../lib/types";
import type { PoliticoTse } from "./tse";
import { readFileSync } from "node:fs";

const INICIO = "2023-02-01"; // posse da 57ª legislatura
const HOJE = new Date().toISOString().slice(0, 10);
const t0 = Date.now();
const marca = () => `${((Date.now() - t0) / 1000).toFixed(0)}s`;

export interface SenadorSonda extends SenadorPerfil {
  tseSqCandidato: string | null;
  cpfHash: string | null;
  /** Como o registro foi casado com o TSE. A API do Senado não tem CPF. */
  join: "nome_completo+uf" | null;
  emExercicio: true;
  participacao: string;
  titular: boolean;
  bloco: string | null;
  mandatos: MandatoSenado[];
  /** Licenças oficiais desde o início da legislatura. */
  licencas: LicencaSenado[];
}
export interface VotacaoSenadoSonda extends Omit<VotacaoSenado, "votos"> { totalVotos: number }
export interface VotoSenadoSonda { votacaoId: string; senadoCodigo: string; sigla: string; voto: TipoVoto }
export interface OrientacaoSenadoSonda { votacaoId: string; bancada: string; orientacao: string }

const normaliza = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, " ").trim();

// 1. Senadores de SP em exercício + join com o TSE.
const tse = JSON.parse(readFileSync("data/sonda/politicos-tse.json", "utf8")) as PoliticoTse[];
const tseSenadores = tse.filter((p) => p.cargo === "senador");
const atuais = await listarSenadoresAtuais({ uf: "SP" });
console.log(`[${marca()}] senadores de SP em exercício: ${atuais.length}`);

const senadores: SenadorSonda[] = [];
for (const s of atuais) {
  const [perfil, mandatos, licencas] = await Promise.all([getSenador(s.senadoCodigo), getMandatos(s.senadoCodigo), getLicencas(s.senadoCodigo, INICIO)]);
  const candidatos = tseSenadores.filter((p) => p.uf === perfil.uf && normaliza(p.nome) === normaliza(perfil.nomeCompleto));
  const casado = candidatos.length === 1 ? candidatos[0]! : null;
  console.log(`  ${perfil.nome.padEnd(28)} ${perfil.nomeCompleto.padEnd(28)} → TSE: ${casado ? `${casado.nome} (${casado.anoEleicao}, ${casado.tseCargo})` : `SEM MATCH (${candidatos.length})`}`);
  senadores.push({
    ...perfil, tseSqCandidato: casado?.tseSqCandidato ?? null, cpfHash: casado?.cpfHash ?? null, join: casado ? "nome_completo+uf" : null,
    emExercicio: true, participacao: s.participacao, titular: s.titular, bloco: s.bloco, mandatos, licencas,
  });
}
for (const p of tseSenadores.filter((p) => !senadores.some((s) => s.tseSqCandidato === p.tseSqCandidato)))
  console.log(`  (TSE sem registro no Senado hoje: ${p.nomeUrna} — ${p.amostra})`);

// 2. Votações nominais do plenário e orientações.
const votacoes = await listarVotacoesPlenario(INICIO, HOJE);
const orient = await listarOrientacoesPlenario(INICIO, HOJE);
console.log(`[${marca()}] votações: ${votacoes.length} (secretas ${votacoes.filter((v) => v.secreta).length}); orientações em ${orient.length} votações`);

const porSeq = new Map(votacoes.filter((v) => v.sequencialVotacao !== null).map((v) => [v.sequencialVotacao!, v.idExterno]));
const orientacoes: OrientacaoSenadoSonda[] = [];
let semVotacao = 0;
for (const o of orient) {
  const id = porSeq.get(o.sequencialVotacao);
  if (!id) { semVotacao++; continue; }
  for (const x of o.orientacoes) orientacoes.push({ votacaoId: id, bancada: x.bancada, orientacao: x.orientacao });
}
const seqOrient = new Set(orient.map((o) => o.sequencialVotacao));
const semOrient = votacoes.filter((v) => v.sequencialVotacao === null || !seqOrient.has(v.sequencialVotacao));
console.log(`  orientações sem votação correspondente em /votacao: ${semVotacao} (sessões conjuntas do CN e afins)`);
console.log(`  votações sem nenhuma orientação: ${semOrient.length} (sequencialVotacao nulo: ${votacoes.filter((v) => v.sequencialVotacao === null).length})`);

const codigos = new Set(senadores.map((s) => s.senadoCodigo));
const votos: VotoSenadoSonda[] = votacoes.flatMap((v) => v.votos.filter((x) => codigos.has(x.senadoCodigo)).map((x) => ({ votacaoId: x.votacaoId, senadoCodigo: x.senadoCodigo, sigla: x.sigla, voto: x.voto })));
const votacoesSaida: VotacaoSenadoSonda[] = votacoes.map(({ votos: vs, ...v }) => ({ ...v, totalVotos: vs.filter((x) => x.voto !== "ausente").length }));

writeFileSync("data/sonda/senadores.json", JSON.stringify(senadores, null, 1) + "\n");
writeFileSync("data/sonda/votacoes-senado.json", JSON.stringify(votacoesSaida, null, 1) + "\n");
writeFileSync("data/sonda/orientacoes-senado.json", JSON.stringify(orientacoes) + "\n");
writeFileSync("data/sonda/votos-senado.json", JSON.stringify(votos) + "\n");
console.log(`[${marca()}] gravados ${senadores.length} senadores, ${votacoesSaida.length} votações, ${orientacoes.length} orientações, ${votos.length} votos`);

// 3. Os dois números, com as mesmas funções da Câmara.
const vInt: Votacao[] = votacoesSaida.map((v) => ({ idExterno: v.idExterno, casa: "senado", data: v.data, objeto: v.proposicao?.identificacao ?? v.descricao, resultado: v.resultado, urlOficial: v.urlOficial, quiz: false }));
const oInt: Orientacao[] = orientacoes;
const periodo = { inicio: INICIO, fim: "2026-12-31" };
const f = (x: { percentual: number | null; numerador: number; denominador: number }) => `${x.percentual === null ? "—" : x.percentual.toFixed(1) + "%"} (${x.numerador}/${x.denominador})`;
const dias = (l: LicencaSenado) => (Date.parse(l.fim ?? HOJE) - Date.parse(l.inicio)) / 86_400_000 + 1;
console.log("\n| Senador | Partido | Participação | Governismo | Ausências por sigla | Licenças (dias) |\n|---|---|---|---|---|---|");
for (const s of senadores) {
  const meus: Voto[] = votos.filter((v) => v.senadoCodigo === s.senadoCodigo).map((v) => ({ votacaoId: v.votacaoId, politicoId: s.senadoCodigo, voto: v.voto }));
  const aus = new Map<string, number>();
  for (const v of votos) if (v.senadoCodigo === s.senadoCodigo && v.voto === "ausente") aus.set(v.sigla, (aus.get(v.sigla) ?? 0) + 1);
  const lic = s.licencas.filter((l) => l.inicio >= INICIO);
  console.log(`| ${s.nome} | ${s.partido} | ${f(participacao(vInt, meus, periodo))} | ${f(governismo(vInt, meus, oInt, periodo))} | ${[...aus].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}=${n}`).join(", ")} | ${lic.length} (${lic.reduce((a, l) => a + dias(l), 0)}) |`);
}
const gov = new Set(orientacoes.filter((o) => o.bancada === "Governo" && ["Sim", "Não", "Obstrução"].includes(o.orientacao)).map((o) => o.votacaoId));
console.log(`\nvotações com orientação posicional do Governo: ${gov.size} (abertas: ${votacoesSaida.filter((v) => gov.has(v.idExterno) && !v.secreta).length})`);
const tipos = new Map<string, number>();
for (const v of votos) tipos.set(v.voto, (tipos.get(v.voto) ?? 0) + 1);
console.log("tipos de voto dos 3:", [...tipos].map(([k, n]) => `${k}=${n}`).join(", "));
