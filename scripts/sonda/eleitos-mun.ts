/**
 * E7 — Sonda TSE: top-20 por município e cargo (deputado federal, senador) em SP, 2026.
 *
 * Entrada: data/raw/votacao_munzona/votacao_candidato_munzona_2026_SP.csv
 *          data/raw/consulta_cand/consulta_cand_2026_SP.csv (situação, partido, federação)
 *          IBGE: servicodados.ibge.gov.br/api/v1/localidades/estados/35/municipios (código IBGE)
 * Saída:   data/sonda/eleitos-mun.json
 * Conferência: compara o top-20 com o JSON oficial de resultados do TSE por município
 *   (lib/tse.ts#getResultadoMunicipio) em São Paulo, Santos e Borá; `--todos` confere os 645.
 * Top-20: os 20 mais votados (votos válidos) e mais quem empatar com o 20º, para não cortar
 *   empatados por um critério que a fonte não tem. Dentro do empate, ordem por número de urna
 *   (só para estabilidade).
 */
import { DuckDBInstance } from "@duckdb/node-api";
import { writeFileSync } from "node:fs";
import { mapLimite } from "../../lib/async";
import { fetchJson } from "../../lib/http";
import { getResultadoMunicipio, type CargoTse } from "../../lib/tse";

const TOP = 20;
const UF = "SP";
const CICLO = "ele2026", ELEICAO = "6259";
const CONFERIR = process.argv.includes("--todos") ? null : ["SÃO PAULO", "SANTOS", "BORÁ"];
const csv = (f: string) => `read_csv('data/raw/${f}', delim=';', header=true, quote='"', encoding='latin-1', all_varchar=true)`;
const t0 = Date.now();
const marca = () => `${((Date.now() - t0) / 1000).toFixed(0)}s`;

const inst = await DuckDBInstance.create(":memory:");
const c = await inst.connect();
const rows = async <T>(sql: string) => (await (await c.run(sql)).getRowObjectsJson()) as unknown as T[];

const CARGO: Record<string, CargoTse> = { "Deputado Federal": "deputado_federal", Senador: "senador" };
await c.run(`CREATE TABLE v AS
  SELECT CD_MUNICIPIO mun, any_value(NM_MUNICIPIO) nome, DS_CARGO cargo, SQ_CANDIDATO sq, any_value(NR_CANDIDATO) numero,
         sum(QT_VOTOS_NOMINAIS_VALIDOS::BIGINT) votos
  FROM ${csv("votacao_munzona/votacao_candidato_munzona_2026_SP.csv")}
  WHERE DS_CARGO IN ('Deputado Federal', 'Senador') GROUP BY mun, cargo, sq`);
// rank() dá o mesmo posto a empatados: "rank ≤ 20" inclui todos os que empatam com o 20º.
const top = await rows<{ mun: string; nome: string; cargo: string; sq: string; votos: string; pos: string }>(`
  WITH r AS (SELECT *, rank() OVER (PARTITION BY mun, cargo ORDER BY votos DESC) pos FROM v WHERE votos > 0)
  SELECT mun, nome, cargo, sq, votos, pos FROM r WHERE pos <= ${TOP} ORDER BY mun, cargo, votos DESC, numero::INT`);
const tamanhos = new Map<string, number>();
for (const t of top) tamanhos.set(`${t.mun}|${t.cargo}`, (tamanhos.get(`${t.mun}|${t.cargo}`) ?? 0) + 1);
const alongados = [...tamanhos.values()].filter((n) => n > TOP);
console.log(`[${marca()}] ${top.length} linhas · listas com empate na borda (> ${TOP}): ${alongados.length}, maior: ${Math.max(...tamanhos.values())}`);

// Candidatos que aparecem em algum top-20, com o que o card precisa da fonte.
const sqs = [...new Set(top.map((t) => t.sq))];
const cand = await rows<{ sq: string; nome: string; nomeUrna: string; numero: string; cargo: string; partido: string; federacao: string | null; lista: string; situacao: string; votos: string; genero: string }>(`
  SELECT c.SQ_CANDIDATO sq, NM_CANDIDATO nome, DS_GENERO genero, NM_URNA_CANDIDATO "nomeUrna", NR_CANDIDATO numero, DS_CARGO cargo, SG_PARTIDO partido,
         CASE WHEN NR_FEDERACAO = '-1' THEN NULL ELSE NM_FEDERACAO END federacao,
         CASE WHEN NR_FEDERACAO = '-1' THEN 'P' || NR_PARTIDO ELSE 'F' || NR_FEDERACAO END lista,
         DS_SIT_TOT_TURNO situacao, t.votos
  FROM ${csv("consulta_cand/consulta_cand_2026_SP.csv")} c
  JOIN (SELECT sq, sum(votos) votos FROM v GROUP BY sq) t ON t.sq = c.SQ_CANDIDATO
  WHERE c.SQ_CANDIDATO IN (${sqs.map((s) => `'${s}'`).join(",")})`);
// `lista` usa o mesmo id de scripts/sonda/quociente.ts (P + nº do partido isolado, F + nº da federação).
const candidatos = Object.fromEntries(cand.map((x) => [x.sq, {
  nome: x.nome, nomeUrna: x.nomeUrna, numero: x.numero, cargo: CARGO[x.cargo === "SENADOR" ? "Senador" : "Deputado Federal"],
  partido: x.partido, federacao: x.federacao, lista: x.lista, situacao: x.situacao, votosUf: Number(x.votos),
  genero: x.genero === "FEMININO" ? "feminino" : x.genero === "MASCULINO" ? "masculino" : null,
}]));
const situacoes = new Map<string, number>();
for (const x of cand) situacoes.set(`${x.cargo}: ${x.situacao}`, (situacoes.get(`${x.cargo}: ${x.situacao}`) ?? 0) + 1);
console.log(`[${marca()}] situação no TSE dos candidatos do top-20:`, Object.fromEntries(situacoes));
const semCadastro = sqs.filter((s) => !candidatos[s]);

// Código IBGE pelo nome (sem acento, maiúsculas, hífen e apóstrofo como espaço).
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[-'’]/g, " ").replace(/\s+/g, " ").trim();
const ibge = await fetchJson<{ id: number; nome: string }[]>("https://servicodados.ibge.gov.br/api/v1/localidades/estados/35/municipios", { label: "ibge:/localidades/estados/{uf}/municipios" });
const porNome = new Map(ibge.map((m) => [norm(m.nome), m]));
// Grafias que divergem entre TSE e IBGE, revisadas à mão (IBGE: "São Luiz do Paraitinga").
const DE_PARA: Record<string, string> = { "SAO LUIS DO PARAITINGA": "SAO LUIZ DO PARAITINGA" };
for (const [tse, ib] of Object.entries(DE_PARA)) if (porNome.has(ib)) porNome.set(tse, porNome.get(ib)!);
const munTse = [...new Map(top.map((t) => [t.mun, t.nome])).entries()];
const semIbge = munTse.filter(([, n]) => !porNome.has(norm(n)));
console.log(`[${marca()}] municípios: ${munTse.length} · IBGE: ${ibge.length} · sem par por nome: ${semIbge.length} ${semIbge.map(([, n]) => n).join(", ")}`);

const municipios = munTse.map(([mun, nome]) => {
  const linhas = top.filter((t) => t.mun === mun);
  const lista = (cargo: string) => linhas.filter((t) => t.cargo === cargo).map((t) => [t.sq, Number(t.votos)] as [string, number]);
  return { tse: mun, ibge: porNome.get(norm(nome))?.id ?? null, nome: porNome.get(norm(nome))?.nome ?? nome, nomeTse: nome,
    deputado_federal: lista("Deputado Federal"), senador: lista("Senador") };
}).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

// Conferência contra o JSON oficial de resultados.
const alvo = CONFERIR ? municipios.filter((m) => CONFERIR.includes(m.nomeTse)) : municipios;
const tarefas = alvo.flatMap((m) => (["deputado_federal", "senador"] as const).map((cargo) => ({ m, cargo })));
const conf = await mapLimite(tarefas, 6, async ({ m, cargo }) => {
  const r = await getResultadoMunicipio(CICLO, ELEICAO, UF, m.tse, cargo);
  const validos = r.candidatos.filter((x) => x.destinacao === "Válido" && x.votos > 0).sort((a, b) => b.votos - a.votos || Number(a.numero) - Number(b.numero));
  const corte = validos[TOP - 1]?.votos ?? 0;
  const oficial = validos.filter((x, i) => i < TOP || x.votos === corte).map((x) => [x.tseSqCandidato, x.votos]);
  const nosso = m[cargo];
  const igual = JSON.stringify(oficial) === JSON.stringify(nosso);
  return { municipio: m.nome, cargo, igual, n: nosso.length, totalizadoEm: r.totalizadoEm, primeiro: nosso[0] ? `${candidatos[nosso[0][0]]?.nomeUrna} ${nosso[0][1]}` : null,
    diff: igual ? null : { nosso: nosso.slice(0, 5), oficial: oficial.slice(0, 5) } };
});
const ok = conf.ok.filter((x) => x.igual).length;
console.log(`[${marca()}] conferência: ${ok}/${tarefas.length} iguais · ${conf.ok.length - ok} diferentes · ${conf.falhas.length} falhas de rede`);
if (CONFERIR) for (const x of conf.ok) console.log(`  ${x.igual ? "✓" : "✗"} ${x.municipio.padEnd(12)} ${x.cargo.padEnd(17)} top-${x.n} · 1º ${x.primeiro} · arquivo oficial totalizado em ${x.totalizadoEm}`);
for (const x of conf.ok.filter((y) => !y.igual)) console.log(`  ✗ ${x.municipio} ${x.cargo}`, JSON.stringify(x.diff));

writeFileSync("data/sonda/eleitos-mun.json", JSON.stringify({
  fonte: "TSE — votacao_candidato_munzona_2026 e consulta_cand_2026 (SP); código IBGE: API de localidades do IBGE",
  geradoEm: new Date().toISOString(), uf: UF, top: TOP,
  regra: "20 mais votados (votos válidos no município) e mais quem empatar com o 20º; posição = índice na lista; empate ordenado por número de urna",
  conferencia: { municipios: CONFERIR ?? "todos", iguais: ok, total: tarefas.length },
  candidatos, municipios,
}) + "\n");
console.log(`[${marca()}] gravados ${municipios.length} municípios, ${Object.keys(candidatos).length} candidatos (sem cadastro: ${semCadastro.length})`);
