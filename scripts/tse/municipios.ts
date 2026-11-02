/**
 * E21b — Municípios do TSE com o código do IBGE, gerados na máquina local e versionados em
 * data/municipios-ibge.json (a API do IBGE não responde ao runner do GitHub Actions; o cron só lê).
 * Par por UF + nome normalizado; as 13 grafias que divergem estão em DE_PARA, revisadas à mão.
 * Falha se sobrar município sem par ou se um código IBGE for usado duas vezes.
 * Uso: npx tsx scripts/tse/municipios.ts   (rodar de novo só se o TSE ou o IBGE mudarem a lista)
 */
import { DuckDBInstance } from "@duckdb/node-api";
import { writeFileSync } from "node:fs";
import { fetchJson } from "../../lib/http";

const RAW = process.env.FISCALIZA_TSE ?? "data/raw";
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[-'’]/g, " ").replace(/\s+/g, " ").trim();

/** "UF|nome no TSE" → nome no IBGE. Mesmo município, grafia diferente (ou nome antigo no TSE). */
const DE_PARA: Record<string, string> = {
  "GO|BOM JESUS": "Bom Jesus de Goiás",
  "MG|DONA EUSÉBIA": "Dona Euzébia",
  "MG|SÃO THOMÉ DAS LETRAS": "São Tomé das Letras",
  "MG|BARÃO DE MONTE ALTO": "Barão do Monte Alto",
  "MT|SANTO ANTÔNIO DO LEVERGER": "Santo Antônio de Leverger",
  "PA|ELDORADO DOS CARAJÁS": "Eldorado do Carajás",
  "PR|MUNHOZ DE MELLO": "Munhoz de Melo",
  "RN|BOA SAÚDE": "Januário Cicco", // nome atual do antigo município de Boa Saúde; o TSE mantém o antigo
  "RO|ESPIGÃO DO OESTE": "Espigão D'Oeste",
  "RO|ALVORADA DO OESTE": "Alvorada D'Oeste",
  "RR|SÃO LUIZ": "São Luiz do Anauá",
  "SE|AMPARO DE SÃO FRANCISCO": "Amparo do São Francisco",
  "SP|SÃO LUÍS DO PARAITINGA": "São Luiz do Paraitinga",
};

const inst = await DuckDBInstance.create(":memory:");
const c = await inst.connect();
const tse = (await (await c.run(`SELECT DISTINCT SG_UF uf, CD_MUNICIPIO cd, NM_MUNICIPIO nome
  FROM read_csv('${RAW}/votacao_munzona/votacao_candidato_munzona_2026_??.csv', delim=';', header=true, quote='"', encoding='latin-1', all_varchar=true)
  WHERE DS_CARGO = 'Deputado Federal' ORDER BY uf, cd`)).getRowObjectsJson()) as unknown as { uf: string; cd: string; nome: string }[];
const ibge = await fetchJson<Record<string, string | number>[]>("https://servicodados.ibge.gov.br/api/v1/localidades/municipios?view=nivelado", { label: "ibge:/localidades/municipios" });
const porNome = new Map(ibge.map((m) => [`${m["UF-sigla"]}|${norm(String(m["municipio-nome"]))}`, m]));

const usados = new Map<number, string>();
const linhas = tse.map((t) => {
  const alvo = DE_PARA[`${t.uf}|${t.nome}`] ?? t.nome;
  const m = porNome.get(`${t.uf}|${norm(alvo)}`);
  if (!m) throw new Error(`sem par no IBGE: ${t.uf} ${t.cd} "${t.nome}" (revisar e acrescentar em DE_PARA)`);
  const id = Number(m["municipio-id"]);
  if (usados.has(id)) throw new Error(`código IBGE ${id} usado por ${usados.get(id)} e ${t.uf} ${t.nome}`);
  usados.set(id, `${t.uf} ${t.nome}`);
  return { ibge: id, tse: t.cd, nome: String(m["municipio-nome"]), uf: t.uf };
}).sort((a, b) => a.ibge - b.ibge);

if (linhas.length !== ibge.length) throw new Error(`TSE ${linhas.length} municípios × IBGE ${ibge.length}`);
writeFileSync("data/municipios-ibge.json", `[\n${linhas.map((l) => JSON.stringify(l)).join(",\n")}\n]\n`);
const sp = linhas.filter((l) => l.uf === "SP").length;
console.log(`${linhas.length} municípios (${new Set(linhas.map((l) => l.uf)).size} UFs, SP ${sp}) · ${Object.keys(DE_PARA).length} pelo de-para · gravado data/municipios-ibge.json`);
