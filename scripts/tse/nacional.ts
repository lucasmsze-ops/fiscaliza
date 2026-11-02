/**
 * E21b — TSE 2026 no Brasil inteiro: candidatos que aparecem em algum top-20 de cidade (e todos os eleitos), top-20 das
 * 5.571 cidades (deputado federal e senador), listas e quociente dos 27 estados. Mesmas regras da
 * sonda de SP (scripts/sonda/eleitos-mun.ts e quociente.ts), generalizadas.
 *
 * Só gera e confere; grava em estado/fontes/tse-2026/ (tabelas no formato de data/*.json). A
 * publicação vem com a E21c: sem o cruzamento com Câmara e Senado, quem está em exercício fora de
 * SP apareceria com "primeiro voto em fevereiro" (casa desconhecida), o que seria falso.
 *
 * Conferências (o script falha se alguma não bater):
 *  1. Quociente, candidato a candidato, contra DS_SIT_TOT_TURNO do TSE (ELEITO POR QP / POR MÉDIA)
 *     nos 27 estados. Vagas de cada estado = eleitos para deputado federal no próprio TSE.
 *  2. Top-20 da maior cidade de cada estado contra o JSON oficial de resultados (54 listas).
 *  3. SP: listas, municípios e top-20 iguais às linhas atuais (conferidas na sonda).
 * Uso: npx tsx scripts/tse/nacional.ts   (FISCALIZA_TSE=pasta dos CSVs; padrão data/raw)
 */
import { DuckDBInstance } from "@duckdb/node-api";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mapLimite } from "../../lib/async";
import { paraLinha } from "../../lib/linhas";
import { distribuirVagas, type Lista } from "../../lib/quociente";
import { fotoUrlTse, getResultadoMunicipio } from "../../lib/tse";
import type { Cargo, EleitoMunicipio, ListaEleitoral, Municipio, Politico, Status } from "../../lib/types";
import { FONTES } from "../cron/estado";

const RAW = process.env.FISCALIZA_TSE ?? "data/raw";
const SAIDA = `${FONTES}/tse-2026`;
const TOP = 20, ANO = 2026, CICLO = "ele2026", ELEICAO = "6259";
const UFS = ["AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"];
const t0 = Date.now();
const marca = () => `${((Date.now() - t0) / 1000).toFixed(0)}s`;
const arquivos = (pasta: string, prefixo: string) => `[${UFS.map((uf) => `'${RAW}/${pasta}/${prefixo}_${uf}.csv'`).join(",")}]`;
const csv = (pasta: string, prefixo: string) => `read_csv(${arquivos(pasta, prefixo)}, delim=';', header=true, quote='"', encoding='latin-1', all_varchar=true)`;

const inst = await DuckDBInstance.create(":memory:");
const c = await inst.connect();
const rows = async <T>(sql: string) => (await (await c.run(sql)).getRowObjectsJson()) as unknown as T[];
const listaSql = `CASE WHEN NR_FEDERACAO = '-1' THEN 'P' || NR_PARTIDO ELSE 'F' || NR_FEDERACAO END`;

// ---------------------------------------------------------------- votos por cidade
await c.run(`CREATE TABLE v AS
  SELECT SG_UF uf, CD_MUNICIPIO mun, DS_CARGO cargo, SQ_CANDIDATO sq, any_value(NR_CANDIDATO) numero,
         any_value(${listaSql}) lista, sum(QT_VOTOS_NOMINAIS_VALIDOS::BIGINT) votos
  FROM ${csv("votacao_munzona", "votacao_candidato_munzona_2026")}
  WHERE DS_CARGO IN ('Deputado Federal', 'Senador') GROUP BY uf, mun, cargo, sq`);
const top = await rows<{ uf: string; mun: string; cargo: string; sq: string; votos: string }>(`
  WITH r AS (SELECT *, rank() OVER (PARTITION BY mun, cargo ORDER BY votos DESC) pos FROM v WHERE votos > 0)
  SELECT uf, mun, cargo, sq, votos FROM r WHERE pos <= ${TOP} ORDER BY mun, cargo, votos DESC, numero::INT`);
console.log(`[${marca()}] ${top.length} linhas de top-20 em ${new Set(top.map((t) => t.mun)).size} cidades`);

// ---------------------------------------------------------------- candidatos
const cand = await rows<{ sq: string; uf: string; nome: string; nomeUrna: string; numero: string; cargo: string; partido: string; federacao: string | null; lista: string; situacao: string; genero: string; nasc: string }>(`
  SELECT SQ_CANDIDATO sq, SG_UF uf, NM_CANDIDATO nome, NM_URNA_CANDIDATO "nomeUrna", NR_CANDIDATO numero, DS_CARGO cargo, SG_PARTIDO partido,
         CASE WHEN NR_FEDERACAO = '-1' THEN NULL ELSE NM_FEDERACAO END federacao, ${listaSql} lista,
         DS_SIT_TOT_TURNO situacao, DS_GENERO genero, DT_NASCIMENTO nasc
  FROM ${csv("consulta_cand", "consulta_cand_2026")} WHERE DS_CARGO IN ('DEPUTADO FEDERAL', 'SENADOR')`);
const porSq = new Map(cand.map((x) => [x.sq, x]));
const votosUf = new Map((await rows<{ sq: string; votos: string }>(`SELECT sq, sum(votos) votos FROM v GROUP BY sq`)).map((r) => [r.sq, Number(r.votos)]));
const cargoDe = (ds: string): Cargo => (ds.toUpperCase() === "SENADOR" ? "senador" : "deputado_federal");

// ---------------------------------------------------------------- quociente, estado a estado
const isoBr = (d: string | undefined) => (d && /^\d\d\/\d\d\/\d{4}$/.test(d) ? `${d.slice(6)}-${d.slice(3, 5)}-${d.slice(0, 2)}` : null);
const listasRaw = await rows<{ uf: string; id: string; nome: string; composicao: string | null; legenda: string }>(`
  SELECT SG_UF uf, ${listaSql} id, any_value(CASE WHEN NR_FEDERACAO = '-1' THEN SG_PARTIDO ELSE NM_FEDERACAO END) nome,
         any_value(CASE WHEN NR_FEDERACAO = '-1' THEN NULL ELSE SG_FEDERACAO END) composicao, sum(QT_TOTAL_VOTOS_LEG_VALIDOS::BIGINT) legenda
  FROM ${csv("votacao_partido", "votacao_partido_munzona_2026")} WHERE DS_CARGO = 'Deputado Federal' GROUP BY 1, 2`);
const candDep = await rows<{ uf: string; sq: string; lista: string; votos: string }>(`
  SELECT uf, sq, any_value(lista) lista, sum(votos) votos FROM v WHERE cargo = 'Deputado Federal' GROUP BY uf, sq`);
const listaId = (uf: string, lista: string) => `${uf.toLowerCase()}-${ANO}-deputado_federal-${lista.toLowerCase()}`;
const listas: ListaEleitoral[] = [];
const esperado = (sit: string | undefined) => (sit === "ELEITO POR QP" ? "qp" : sit === "ELEITO POR MÉDIA" ? "media" : null);
const conferenciaQuociente: string[] = [];
let divergentes = 0;
for (const uf of UFS) {
  const vagas = cand.filter((x) => x.uf === uf && cargoDe(x.cargo) === "deputado_federal" && x.situacao.startsWith("ELEITO")).length;
  const doUf = listasRaw.filter((l) => l.uf === uf);
  const ls: Lista[] = doUf.map((l) => ({
    id: l.id, votosLegenda: Number(l.legenda),
    candidatos: candDep.filter((x) => x.uf === uf && x.lista === l.id).map((x) => ({ id: x.sq, votos: Number(x.votos), nascimento: isoBr(porSq.get(x.sq)?.nasc) })),
  }));
  const d = distribuirVagas(vagas, ls);
  const calc = new Map(d.eleitos.map((e) => [e.candidatoId, e.por === "qp" ? "qp" : "media"]));
  let dif = 0;
  for (const x of candDep.filter((y) => y.uf === uf)) if ((calc.get(x.sq) ?? null) !== esperado(porSq.get(x.sq)?.situacao)) dif++;
  divergentes += dif;
  conferenciaQuociente.push(`${uf} ${String(vagas).padStart(2)} vagas · QE ${d.qe} · ${d.listas.filter((l) => l.total > 0).length} listas elegeram · ${dif ? `${dif} DIVERGENTES` : "ok"}`);
  for (const r of d.listas) {
    const l = doUf.find((x) => x.id === r.id)!;
    listas.push({ id: listaId(uf, r.id), uf, ano: ANO, cargo: "deputado_federal", nome: l.nome, composicao: l.composicao, votosValidos: r.votosValidos, eleitos: r.total });
  }
}
console.log(`[${marca()}] quociente nos 27 estados: ${divergentes} candidatos divergentes do TSE`);
for (const l of conferenciaQuociente) console.log(`  ${l}`);

// ---------------------------------------------------------------- políticos, municípios, top-20
const slugDe = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const statusDe = (sit: string): Status => {
  if (sit.startsWith("ELEITO")) return "eleito"; // "reeleito" sai do cruzamento com Câmara/Senado (E21c)
  if (sit === "SUPLENTE") return "suplente";
  if (sit === "NÃO ELEITO") return "nao_eleito";
  throw new Error(`situação do TSE sem mapeamento: ${sit}`);
};
const agora = new Date().toISOString();
// Quem aparece em algum top-20 e todos os eleitos: há eleito por média sem top-20 em cidade nenhuma
// (votos espalhados; em 2026, 1 no RJ), e ele precisa de página e busca como os outros.
const eleitos = cand.filter((x) => x.situacao.startsWith("ELEITO")).map((x) => x.sq);
const sqsTop = [...new Set([...top.map((t) => t.sq), ...eleitos])];
const politicos: Politico[] = [];
const slugs = new Map<string, string>();
const homonimos: string[] = [];
for (const sq of sqsTop.sort((a, b) => (votosUf.get(b) ?? 0) - (votosUf.get(a) ?? 0))) {
  const x = porSq.get(sq);
  if (!x) throw new Error(`candidato ${sq} do top-20 sem cadastro no consulta_cand`);
  const slug = `${slugDe(x.nomeUrna)}-${x.uf.toLowerCase()}`;
  if (slugs.has(slug)) { homonimos.push(`${slug}: ${slugs.get(slug)} e ${sq}`); continue; }
  slugs.set(slug, sq);
  const cargo = cargoDe(x.cargo);
  politicos.push({
    id: slug, slug, cargo, nome: x.nome, nomeUrna: x.nomeUrna,
    genero: x.genero === "FEMININO" ? "feminino" : x.genero === "MASCULINO" ? "masculino" : null,
    uf: x.uf, partido: x.partido, listaId: cargo === "deputado_federal" ? listaId(x.uf, x.lista) : null, federacao: x.federacao,
    numeroUrna: x.numero, fotoUrl: fotoUrlTse(CICLO, ELEICAO, x.uf, sq), email: null, telefone: null, redesSociais: [], urlPerfil: null,
    tseSqCandidato: sq, camaraId: null, senadoCodigo: null, status: statusDe(x.situacao), votos2026: votosUf.get(sq) ?? null, updatedAt: agora,
  });
}
if (homonimos.length) throw new Error(`slugs repetidos na mesma UF (decidir desempate à mão):\n  ${homonimos.join("\n  ")}`);
const idPorSq = new Map(politicos.map((p) => [p.tseSqCandidato!, p.id]));

const municipios = JSON.parse(readFileSync("data/municipios-ibge.json", "utf8")) as Municipio[];
const ibgePorTse = new Map(municipios.map((m) => [m.tse, m.ibge]));
const eleitosMun: EleitoMunicipio[] = [];
const porCidadeCargo = new Map<string, { sq: string; votos: number }[]>();
for (const t of top) {
  const k = `${t.mun}|${t.cargo}`;
  (porCidadeCargo.get(k) ?? porCidadeCargo.set(k, []).get(k)!).push({ sq: t.sq, votos: Number(t.votos) });
}
for (const [k, lista] of porCidadeCargo) {
  const [mun, ds] = k.split("|") as [string, string];
  const ibge = ibgePorTse.get(mun);
  if (!ibge) throw new Error(`cidade do TSE ${mun} sem código IBGE (rodar scripts/tse/municipios.ts)`);
  for (const x of lista) eleitosMun.push({ municipioIbge: ibge, cargo: cargoDe(ds), politicoId: idPorSq.get(x.sq)!, votos: x.votos, posicao: 1 + lista.filter((y) => y.votos > x.votos).length });
}

// ---------------------------------------------------------------- conferência 2: JSON oficial da maior cidade de cada estado
const maiores = await rows<{ uf: string; mun: string }>(`
  SELECT uf, arg_max(mun, total) mun FROM (SELECT uf, mun, sum(votos) total FROM v WHERE cargo = 'Deputado Federal' GROUP BY uf, mun) GROUP BY uf`);
const tarefas = maiores.flatMap((m) => (["deputado_federal", "senador"] as const).map((cargo) => ({ ...m, cargo })));
const conf = await mapLimite(tarefas, 3, async (t) => {
  const r = await getResultadoMunicipio(CICLO, ELEICAO, t.uf.toLowerCase(), t.mun, t.cargo);
  const validos = r.candidatos.filter((x) => x.destinacao === "Válido" && x.votos > 0).sort((a, b) => b.votos - a.votos || Number(a.numero) - Number(b.numero));
  const corte = validos[TOP - 1]?.votos ?? 0;
  const oficial = validos.filter((x, i) => i < TOP || x.votos === corte).map((x) => `${x.tseSqCandidato}:${x.votos}`);
  const nosso = (porCidadeCargo.get(`${t.mun}|${t.cargo === "senador" ? "Senador" : "Deputado Federal"}`) ?? []).map((x) => `${x.sq}:${x.votos}`);
  return { ...t, igual: JSON.stringify(oficial) === JSON.stringify(nosso) };
});
const iguais = conf.ok.filter((x) => x.igual).length;
console.log(`[${marca()}] top-20 da maior cidade de cada estado × JSON oficial: ${iguais}/${tarefas.length} iguais, ${conf.falhas.length} falhas de rede`);
for (const x of conf.ok.filter((y) => !y.igual)) console.log(`  ✗ ${x.uf} ${x.mun} ${x.cargo}`);
for (const f of conf.falhas) console.log(`  falha ${f.item.uf} ${f.item.mun} ${f.item.cargo}: ${String(f.erro).slice(0, 160)}`);

// ---------------------------------------------------------------- conferência 3: SP igual ao que já está publicado
const linhas = <T extends object>(xs: T[]) => xs.map((x) => paraLinha(x) as Record<string, unknown>);
const canon = (o: Record<string, unknown>) => JSON.stringify(Object.keys(o).sort().map((k) => [k, o[k]]));
const compararSp = (nome: string, novas: Record<string, unknown>[], filtro: (l: Record<string, unknown>) => boolean, ignorar: string[] = []) => {
  const limpa = (l: Record<string, unknown>) => canon(Object.fromEntries(Object.entries(l).filter(([k]) => !ignorar.includes(k))));
  const atuais = (JSON.parse(readFileSync(`data/${nome}.json`, "utf8")) as Record<string, unknown>[]).map(limpa).sort();
  const nossas = novas.filter(filtro).map(limpa).sort();
  const iguaisSp = JSON.stringify(atuais) === JSON.stringify(nossas);
  console.log(`  SP ${nome}: ${nossas.length} × ${atuais.length} atuais · ${iguaisSp ? "iguais" : "DIFERENTES"}${ignorar.length ? ` (sem ${ignorar.join(", ")})` : ""}`);
  return iguaisSp;
};
console.log(`[${marca()}] SP contra os dados atuais:`);
const spOk = [
  compararSp("listas", linhas(listas), (l) => l.uf === "SP"),
  compararSp("municipios", linhas(municipios), (l) => l.uf === "SP"),
  compararSp("eleitos_mun", linhas(eleitosMun), (l) => String(l.municipio_ibge).startsWith("35")),
].every(Boolean);
const spPol = new Set(politicos.filter((p) => p.uf === "SP").map((p) => p.id));
const atuaisPol = (JSON.parse(readFileSync("data/politicos.json", "utf8")) as { id: string; senado_codigo: string | null }[]);
const faltamSp = atuaisPol.filter((p) => !p.senado_codigo && !spPol.has(p.id)).map((p) => p.id);
console.log(`  SP politicos: ${spPol.size} candidatos do top-20 · ids atuais sem par: ${faltamSp.length}${faltamSp.length ? ` (${faltamSp.join(", ")})` : ""}`);

// ---------------------------------------------------------------- saída
mkdirSync(SAIDA, { recursive: true });
const gravar = (nome: string, ls: Record<string, unknown>[]) => writeFileSync(`${SAIDA}/${nome}.json`, `[\n${ls.map((l) => JSON.stringify(l)).join(",\n")}\n]\n`);
gravar("politicos", linhas(politicos)); gravar("listas", linhas(listas)); gravar("municipios", linhas(municipios)); gravar("eleitos_mun", linhas(eleitosMun));
// Todos os candidatos a deputado federal e senador (sem CPF): base para quem está em exercício e
// disputou 2026 sem aparecer em nenhum top-20 (E21c). Mesmos campos de um político do TSE, sem id.
const todos = cand.map((x) => {
  const cargo = cargoDe(x.cargo);
  return {
    tse_sq_candidato: x.sq, cargo, nome: x.nome, nome_urna: x.nomeUrna, genero: x.genero === "FEMININO" ? "feminino" : x.genero === "MASCULINO" ? "masculino" : null,
    uf: x.uf, partido: x.partido, lista_id: cargo === "deputado_federal" ? listaId(x.uf, x.lista) : null, federacao: x.federacao, numero_urna: x.numero,
    // 421 candidaturas vêm com situação "#NULO" (sem resultado na totalização): status desconhecido, nunca inventado.
    foto_url: fotoUrlTse(CICLO, ELEICAO, x.uf, x.sq), status: x.situacao === "#NULO" ? null : statusDe(x.situacao), votos_2026: votosUf.get(x.sq) ?? null,
  };
});
gravar("candidatos", todos);
const porCargo = (c: Cargo) => politicos.filter((p) => p.cargo === c).length;
console.log(`[${marca()}] gravado ${SAIDA}: ${politicos.length} políticos (${porCargo("deputado_federal")} dep. federal, ${porCargo("senador")} senador), ${listas.length} listas, ${municipios.length} municípios, ${eleitosMun.length} linhas de top-20`);
const ok = divergentes === 0 && iguais === tarefas.length && conf.falhas.length === 0 && spOk && faltamSp.length === 0;
if (!ok) { console.error("conferência NÃO bateu: ver acima"); process.exit(1); }
console.log("conferências ok");
