/**
 * E8 — Consolidação da sonda: lê data/sonda/*.json (saídas da E1–E7, sem rede) e grava as
 * tabelas finais em data/*.json, uma linha por registro, em snake_case (o shape do Supabase).
 *
 * Políticos: os 435 candidatos que aparecem em algum top-20 de município (E7) + os 3 senadores de
 * SP em exercício (E6). Dado completo (mandatos, votos, CEAP) para quem está em exercício na
 * Câmara (bancada-camara.json, 69 de 70) ou no Senado; os demais só têm o que o TSE fornece.
 *
 * Não grava CPF nem hash de CPF: o join entre fontes é refeito pelo cron a cada execução.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { mesesFechados } from "../../lib/ceap";
import { paraLinha } from "../../lib/linhas";
import { deHistoricoCamara, deSenado } from "../../lib/linhas-mandato";
import { linhaOrientacao, linhaVotacaoCamara, linhaVotacaoSenado, linhaVotoCamara, linhaVotoSenado } from "../../lib/linhas-votacao";
import { fotoUrlTse } from "../../lib/tse";
import type {
  Afastamento, Cargo, DespesaMediaUf, DespesaMes, EleitoMunicipio, ListaEleitoral, Mandato, Municipio,
  Orientacao, Politico, Status, TipoVoto, Votacao, Voto,
} from "../../lib/types";
import type { DeputadoBancada } from "./bancada";
import type { PoliticoCamara } from "./camara";
import type { DespesaMesSonda, MediaUfMes } from "./despesas";
import type { OrientacaoSenadoSonda, SenadorSonda, VotacaoSenadoSonda, VotoSenadoSonda } from "./senadores";
import type { PoliticoTse } from "./tse";
import type { VotacaoSondaCompleta, VotoSonda } from "./votos";

const ler = <T>(f: string): T => JSON.parse(readFileSync(`data/sonda/${f}`, "utf8")) as T;
const AGORA = new Date().toISOString();
const HOJE = AGORA.slice(0, 10);
const UF = "SP", ANO = 2026, CICLO = "ele2026", ELEICAO = "6259";

// ------------------------------------------------------------------ entradas
interface CandidatoMun { nome: string; nomeUrna: string; numero: string; cargo: Cargo; partido: string; federacao: string | null; lista: string; situacao: string; votosUf: number; genero: "feminino" | "masculino" | null }
const mun = ler<{ candidatos: Record<string, CandidatoMun>; municipios: { tse: string; ibge: number | null; nome: string; deputado_federal: [string, number][]; senador: [string, number][] }[] }>("eleitos-mun.json");
const quoc = ler<{ listas: { id: string; nome: string; composicao: string | null; votosValidos: number; total: number }[] }>("quociente.json");
const tse = ler<PoliticoTse[]>("politicos-tse.json");
const bancada = ler<DeputadoBancada[]>("bancada-camara.json");
const camaraAmostra = ler<PoliticoCamara[]>("politicos-camara.json");
const senadores = ler<SenadorSonda[]>("senadores.json");
const despesas = ler<{ despesas: DespesaMesSonda[]; mediaUf: MediaUfMes[] }>("despesas.json");
const vCam = ler<VotacaoSondaCompleta[]>("votacoes.json");
const vSen = ler<VotacaoSenadoSonda[]>("votacoes-senado.json");
const votosCam = ler<VotoSonda[]>("votos.json");
const votosSen = ler<VotoSenadoSonda[]>("votos-senado.json");
const oCam = ler<{ votacaoId: string; bancada: string; orientacao: string }[]>("orientacoes.json");
const oSen = ler<OrientacaoSenadoSonda[]>("orientacoes-senado.json");

// ------------------------------------------------------------------ políticos
const slugDe = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const listaId = (lista: string) => `${UF.toLowerCase()}-${ANO}-deputado_federal-${lista.toLowerCase()}`;
const bancadaPorSq = new Map(bancada.filter((d) => d.tseSqCandidato).map((d) => [d.tseSqCandidato!, d]));
const antigoPorSq = new Map(camaraAmostra.filter((p) => !p.emExercicio).map((p) => [p.tseSqCandidato, p]));

function statusDe(c: CandidatoMun, emExercicioMesmoCargo: boolean): Status {
  if (c.situacao.startsWith("ELEITO")) return emExercicioMesmoCargo ? "reeleito" : "eleito";
  if (c.situacao === "SUPLENTE") return "suplente";
  if (c.situacao === "NÃO ELEITO") return "nao_eleito";
  throw new Error(`situação do TSE sem mapeamento: ${c.situacao}`);
}

const politicos: Politico[] = [];
// Slug = nome de urna + UF (decisão de 2026-11-01): estável entre eleições (sem o cargo) e sem
// colisão entre estados. Homônimo na mesma UF é erro: decidir o desempate à mão, nunca pela ordem.
const usados = new Set<string>();
const novoSlug = (nomeUrna: string) => {
  const s = `${slugDe(nomeUrna)}-${UF.toLowerCase()}`;
  if (usados.has(s)) throw new Error(`slug repetido na mesma UF: ${s} (homônimos; decidir desempate)`);
  usados.add(s);
  return s;
};

for (const [sq, c] of Object.entries(mun.candidatos).sort((a, b) => b[1].votosUf - a[1].votosUf)) {
  const dep = bancadaPorSq.get(sq); // em exercício na Câmara hoje (69 de 70 de SP)
  const antigo = antigoPorSq.get(sq); // ex-deputado (registro de outra legislatura)
  const slug = novoSlug(c.nomeUrna);
  politicos.push({
    id: slug, slug, cargo: c.cargo, nome: c.nome, nomeUrna: c.nomeUrna, genero: c.genero, uf: UF,
    partido: dep?.partido ?? c.partido,
    listaId: c.cargo === "deputado_federal" ? listaId(c.lista) : null,
    federacao: c.federacao, numeroUrna: c.numero,
    fotoUrl: dep?.fotoUrl ?? fotoUrlTse(CICLO, ELEICAO, UF, sq),
    email: dep?.emailGabinete ?? null,
    telefone: dep?.telefoneGabinete ?? null,
    redesSociais: dep?.redesSociais ?? [],
    urlPerfil: dep ? `https://www.camara.leg.br/deputados/${dep.camaraId}` : null,
    tseSqCandidato: sq, camaraId: dep?.camaraId ?? antigo?.camaraId ?? null, senadoCodigo: null,
    status: statusDe(c, !!dep && c.cargo === "deputado_federal"),
    votos2026: c.votosUf, updatedAt: AGORA,
  });
}
for (const s of senadores) {
  const t = tse.find((p) => p.tseSqCandidato === s.tseSqCandidato);
  const slug = novoSlug(t?.nomeUrna ?? s.nome);
  politicos.push({
    id: slug, slug, cargo: "senador", nome: s.nomeCompleto, nomeUrna: t?.nomeUrna ?? s.nome, uf: UF, partido: s.partido,
    genero: s.sexo === "Feminino" ? "feminino" : s.sexo === "Masculino" ? "masculino" : null,
    listaId: null, federacao: null, numeroUrna: null, fotoUrl: s.fotoUrl, email: s.email, urlPerfil: s.urlPagina,
    telefone: s.telefones[0] ?? null, redesSociais: [],
    tseSqCandidato: s.tseSqCandidato, camaraId: null, senadoCodigo: s.senadoCodigo, status: "em_exercicio", votos2026: null, updatedAt: AGORA,
  });
}
const amostraFora = tse.filter((p) => !politicos.some((x) => x.tseSqCandidato === p.tseSqCandidato));
if (amostraFora.length) throw new Error(`amostra fora de politicos: ${amostraFora.map((p) => p.nomeUrna).join(", ")}`);
const porCamara = new Map(politicos.filter((p) => p.camaraId).map((p) => [p.camaraId!, p.id]));
const porSenado = new Map(politicos.filter((p) => p.senadoCodigo).map((p) => [p.senadoCodigo!, p.id]));
const porSq = new Map(politicos.map((p) => [p.tseSqCandidato, p.id]));

// ------------------------------------------------------------------ mandatos e afastamentos
const mandatos: Mandato[] = [];
const afastamentos: Afastamento[] = [];
const juntar = (r: { mandatos: Mandato[]; afastamentos: Afastamento[] }) => { mandatos.push(...r.mandatos); afastamentos.push(...r.afastamentos); };
for (const d of bancada) { const id = porCamara.get(d.camaraId); if (id) juntar(deHistoricoCamara(id, d.historico, HOJE)); }
for (const p of camaraAmostra.filter((x) => !x.emExercicio)) { const id = porCamara.get(p.camaraId); if (id) juntar(deHistoricoCamara(id, p.historico, HOJE)); }
for (const s of senadores) juntar(deSenado(porSenado.get(s.senadoCodigo)!, s.mandatos, s.licencas, HOJE));

// ------------------------------------------------------------------ listas, municípios, top-20
const listas: ListaEleitoral[] = quoc.listas.map((l) => ({
  id: listaId(l.id), uf: UF, ano: ANO, cargo: "deputado_federal", nome: l.nome, composicao: l.composicao, votosValidos: l.votosValidos, eleitos: l.total,
}));
const municipios: Municipio[] = mun.municipios.map((m) => {
  if (m.ibge === null) throw new Error(`município sem código IBGE: ${m.nome}`);
  return { ibge: m.ibge, tse: m.tse, nome: m.nome, uf: UF };
});
const eleitosMun: EleitoMunicipio[] = mun.municipios.flatMap((m) => (["deputado_federal", "senador"] as const).flatMap((cargo) =>
  m[cargo].map(([sq, votos]) => ({
    municipioIbge: m.ibge!, cargo, politicoId: porSq.get(sq)!, votos,
    posicao: 1 + m[cargo].filter(([, v]) => v > votos).length, // empatados dividem a posição
  }))));

// ------------------------------------------------------------------ CEAP
const despesasMes: DespesaMes[] = despesas.despesas.filter((d) => porCamara.has(d.camaraId))
  .map((d) => ({ politicoId: porCamara.get(d.camaraId)!, ano: d.ano, mes: d.mes, total: d.total, porCategoria: d.porCategoria }));
// Mês fechado: total da bancada idêntico entre esta coleta e a anterior (data/sonda/despesas-coleta-anterior.json).
const anterior = ler<{ geradoEm: string; mediaUf: MediaUfMes[] }>("despesas-coleta-anterior.json");
const fechados = mesesFechados(despesas.mediaUf, anterior.mediaUf);
const mediasUf: DespesaMediaUf[] = despesas.mediaUf.map((m) => ({ uf: m.uf, ano: m.ano, mes: m.mes, media: m.media, deputados: m.deputados, total: m.total, fechado: fechados.has(m.ano * 100 + m.mes) }));
const ref = mediasUf.filter((m) => m.fechado).at(-1);
console.log(`CEAP: coleta anterior ${anterior.geradoEm} · mês de referência (último fechado): ${ref ? `${ref.ano}-${String(ref.mes).padStart(2, "0")}` : "nenhum"}`);

// ------------------------------------------------------------------ votações, votos, orientações
const votacoes: Votacao[] = [
  ...vCam.map((v) => linhaVotacaoCamara(v, v.placar)),
  ...vSen.map((v) => linhaVotacaoSenado(v, v.placar)),
].sort((a, b) => a.data.localeCompare(b.data) || a.id.localeCompare(b.id));
const idsVotacao = new Set(votacoes.map((v) => v.id));

const votos: Voto[] = [
  ...votosCam.filter((v) => porCamara.has(v.camaraId)).map((v) => linhaVotoCamara(v, porCamara.get(v.camaraId)!)),
  ...votosSen.map((v) => linhaVotoSenado(v, porSenado.get(v.senadoCodigo)!)),
];
const orientacoes: Orientacao[] = [
  ...oCam.map((o) => linhaOrientacao("camara", o)),
  ...oSen.map((o) => linhaOrientacao("senado", o)),
].filter((o) => idsVotacao.has(o.votacaoId));

// ------------------------------------------------------------------ escrita
function gravar<T extends object>(tabela: string, linhas: T[]) {
  const corpo = linhas.map((l) => JSON.stringify(paraLinha(l))).join(",\n");
  writeFileSync(`data/${tabela}.json`, `[\n${corpo}\n]\n`);
  console.log(`  data/${tabela}.json`.padEnd(34), String(linhas.length).padStart(6));
}
console.log("tabelas:");
gravar("politicos", politicos);
gravar("mandatos", mandatos);
gravar("afastamentos", afastamentos);
gravar("listas", listas);
gravar("municipios", municipios);
gravar("eleitos_mun", eleitosMun);
gravar("despesas_mes", despesasMes);
gravar("despesas_media_uf", mediasUf);
gravar("votacoes", votacoes);
gravar("votos", votos);
gravar("orientacoes", orientacoes);

const st = new Map<string, number>();
for (const p of politicos) st.set(`${p.cargo}/${p.status}`, (st.get(`${p.cargo}/${p.status}`) ?? 0) + 1);
console.log("\nstatus:", Object.fromEntries(st));
console.log(`com camaraId: ${politicos.filter((p) => p.camaraId).length} · com e-mail: ${politicos.filter((p) => p.email).length} · foto do TSE: ${politicos.filter((p) => p.fotoUrl?.includes("resultados.tse")).length}`);
console.log(`votos de deputados da bancada fora de politicos (não estão em nenhum top-20): ${votosCam.filter((v) => !porCamara.has(v.camaraId)).length}`);
