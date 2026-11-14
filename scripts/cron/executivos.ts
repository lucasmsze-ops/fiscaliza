/**
 * Job `executivos` (2026-11-13; crachá em 2026-11-14): presidente e governadores eleitos em 2026, do TSE.
 * Não há fonte aberta de quem está no cargo hoje (governadores que renunciaram em abril de 2026 para
 * disputar a eleição), então só o eleito, com a data da posse (EC 111/2021: 5/1 e 6/1/2027).
 *
 * Fontes, todas do TSE e baixadas pelo workflow a cada execução (pasta FISCALIZA_TSE):
 * - `consulta_cand` 2026: o eleito, o vice (mesmo número e UF, cargo de vice, eleito), coligação,
 *   ocupação e grau de instrução declarados. A data de nascimento só vira a idade na posse (não é gravada).
 *   O arquivo traz cada UF num CSV e de novo no `_BRASIL`: lê só os das UFs e o `_BR` (presidente).
 * - `bem_candidato` 2026: o total dos bens declarados (sem descrever os bens).
 * - `historico_candidatura` 2026: as candidaturas anteriores (ano, cargo, lugar, partido, resultado).
 * - Resultado (`resultados.tse.jus.br`, JSON de divulgação): votos e % de válidos em cada turno.
 * CPF nunca é lido.
 */
import { DuckDBInstance } from "@duckdb/node-api";
import { fetchJson } from "../../lib/http";
import { siglaPartido } from "../../lib/partidos";
import { fotoUrlTse } from "../../lib/tse";
import type { LinhaBruta } from "./estado";

const RAW = process.env.FISCALIZA_TSE ?? "data/raw";
const UFS = ["AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"];
const RESULTADOS = "https://resultados.tse.jus.br/oficial/ele2026";
/** Eleição de cada turno (config ele-c.json do TSE): federal (presidente) e estadual (governador). */
const ELEICAO = { presidente: { t1: "6257", t2: "6258", cargo: "0001" }, governador: { t1: "6259", t2: "6260", cargo: "0003" } } as const;

const csv = (pasta: string, base: string, extra: string[] = []) =>
  `[${[...UFS, ...extra].map((uf) => `'${RAW}/${pasta}/${base}_${uf}.csv'`).join(",")}]`;
const ler = (arqs: string) => `read_csv(${arqs}, delim=';', header=true, quote='"', encoding='latin-1', all_varchar=true, union_by_name=true)`;

interface Turno { votos: number; pct: number }
type ResultadoJson = { carg?: { agr?: { par?: { cand?: { sqcand: string; vap: string; pvap: string }[] }[] }[] }[] };

/** Votos e % de válidos do candidato no turno, pelo JSON de divulgação; null se o turno não houve ali. */
async function votosNoTurno(cargo: "presidente" | "governador", turno: "t1" | "t2", uf: string, sq: string): Promise<Turno | null> {
  const e = ELEICAO[cargo], abr = cargo === "presidente" ? "br" : uf.toLowerCase();
  const url = `${RESULTADOS}/${e[turno]}/dados/${abr}/${abr}-c${e.cargo}-e00${e[turno]}-u.json`;
  let d: ResultadoJson;
  try { d = await fetchJson<ResultadoJson>(url, { label: "tse:resultado" }); } catch { return null; } // 404: não houve 2º turno
  for (const a of d.carg?.[0]?.agr ?? []) for (const p of a.par ?? []) for (const c of p.cand ?? []) {
    if (c.sqcand === sq) return { votos: Number(c.vap), pct: Number(c.pvap.replace(",", ".")) };
  }
  return null;
}

const idadeEm = (nasc: string | null, data: string) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(nasc ?? "");
  if (!m) return null;
  const [a, mes, dia] = [Number(data.slice(0, 4)), Number(data.slice(5, 7)), Number(data.slice(8, 10))];
  return a - Number(m[3]) - (mes < Number(m[2]) || (mes === Number(m[2]) && dia < Number(m[1])) ? 1 : 0);
};

export async function jobExecutivos(): Promise<{ tabelas: Record<string, LinhaBruta[]>; relatorio: string[]; falhas: number; atualizadas: string[] }> {
  const c = await (await DuckDBInstance.create(":memory:")).connect();
  const q = async <T>(sql: string) => (await (await c.run(sql)).getRowObjectsJson()) as unknown as T[];
  const cand = ler(csv("consulta_cand", "consulta_cand_2026", ["BR"]));

  const rows = await q<{ sq: string; uf: string; cargo: string; nomeUrna: string; nome: string; genero: string; partido: string; numero: string;
    coligacao: string | null; composicao: string | null; ocupacao: string | null; instrucao: string | null; nasc: string | null }>(
    `SELECT DISTINCT SQ_CANDIDATO sq, SG_UF uf, DS_CARGO cargo, NM_URNA_CANDIDATO "nomeUrna", NM_CANDIDATO nome, DS_GENERO genero, SG_PARTIDO partido,
      NR_CANDIDATO numero, NM_COLIGACAO coligacao, DS_COMPOSICAO_COLIGACAO composicao, DS_OCUPACAO ocupacao, DS_GRAU_INSTRUCAO instrucao, DT_NASCIMENTO nasc
    FROM ${cand} WHERE DS_CARGO IN ('PRESIDENTE', 'GOVERNADOR') AND DS_SIT_TOT_TURNO = 'ELEITO'`);
  const vices = await q<{ uf: string; cargo: string; numero: string; nomeUrna: string; partido: string }>(
    `SELECT DISTINCT SG_UF uf, DS_CARGO cargo, NR_CANDIDATO numero, NM_URNA_CANDIDATO "nomeUrna", SG_PARTIDO partido
    FROM ${cand} WHERE DS_CARGO IN ('VICE-PRESIDENTE', 'VICE-GOVERNADOR') AND DS_SIT_TOT_TURNO = 'ELEITO'`);
  const sqs = rows.map((r) => `'${r.sq}'`).join(",") || "''";
  const bens = await q<{ sq: string; total: string; n: string }>(
    `SELECT SQ_CANDIDATO sq, sum(replace(VR_BEM_CANDIDATO, ',', '.')::DOUBLE) total, count(*) n
    FROM ${ler(csv("bem_candidato", "bem_candidato_2026", ["BR"]))} WHERE SQ_CANDIDATO IN (${sqs}) GROUP BY 1`);
  const hist = await q<{ sq: string; ano: string; turno: string; cargo: string; uf: string; sgUe: string; ue: string; partido: string; resultado: string | null; situacao: string | null }>(
    `SELECT DISTINCT SQ_CANDIDATO_ATUAL sq, ANO_ELEICAO ano, NR_TURNO turno, DS_CARGO cargo, SG_UF uf, SG_UE "sgUe", NM_UE ue, SG_PARTIDO partido, DS_SIT_TOT_TURNO resultado,
      DS_SITUACAO_CANDIDATURA situacao
    FROM ${ler(csv("historico_candidatura", "historico_candidatura_2026", ["BR"]))} WHERE SQ_CANDIDATO_ATUAL IN (${sqs}) AND ANO_ELEICAO <> '2026'`);

  const linhas: LinhaBruta[] = [];
  for (const r of rows) {
    const cargo = r.cargo === "PRESIDENTE" ? "presidente" : "governador";
    const posse = cargo === "presidente" ? "2027-01-05" : "2027-01-06"; // EC 111/2021 (arts. 82 e 28 da Constituição)
    const vice = vices.find((v) => v.uf === r.uf && v.numero === r.numero && v.cargo === `VICE-${r.cargo}`);
    const b = bens.find((x) => x.sq === r.sq);
    // Uma linha por cargo e eleição (no 2º turno vêm duas): fica a do turno mais alto, com o resultado final.
    const porEleicao = new Map<string, (typeof hist)[number]>();
    for (const h of hist.filter((x) => x.sq === r.sq)) {
      const k = `${h.ano}|${h.cargo}|${h.ue}`, a = porEleicao.get(k);
      if (!a || Number(h.turno) > Number(a.turno)) porEleicao.set(k, h);
    }
    const historico = [...porEleicao.values()].sort((a, b) => Number(b.ano) - Number(a.ano) || a.cargo.localeCompare(b.cargo))
      .map((h) => ({
        ano: Number(h.ano), cargo: h.cargo,
        // Eleição estadual ou federal: só a UF (ou BR); municipal: a cidade e a UF.
        lugar: /^[A-Z]{2}$/.test(h.sgUe) ? h.uf : `${h.ue} (${h.uf})`,
        partido: siglaPartido(h.partido),
        resultado: h.resultado && !h.resultado.startsWith("#") ? h.resultado : null,
        // Sem resultado (ex.: candidatura indeferida), a situação do registro diz por quê.
        situacao: h.situacao && !h.situacao.startsWith("#") ? h.situacao : null,
      }));
    const [t1, t2] = await Promise.all([votosNoTurno(cargo, "t1", r.uf, r.sq), votosNoTurno(cargo, "t2", r.uf, r.sq)]);
    linhas.push({
      id: `2026:${r.sq}`, ano: 2026, cargo, uf: cargo === "presidente" ? null : r.uf,
      nome: r.nome, nome_urna: r.nomeUrna, genero: r.genero === "FEMININO" ? "feminino" : r.genero === "MASCULINO" ? "masculino" : null,
      partido: siglaPartido(r.partido), numero_urna: Number(r.numero), tse_sq_candidato: r.sq,
      // Fotos por eleição: presidente na federal (6257), governador na estadual (6259); ver ele-c.json do TSE.
      foto_url: fotoUrlTse("ele2026", cargo === "presidente" ? "6257" : "6259", r.uf, r.sq), posse,
      vice_nome_urna: vice?.nomeUrna ?? null, vice_partido: vice ? siglaPartido(vice.partido) : null,
      coligacao: r.coligacao && !r.coligacao.startsWith("#") ? r.coligacao : null,
      composicao: r.composicao && !r.composicao.startsWith("#") ? r.composicao : null,
      ocupacao: r.ocupacao && !r.ocupacao.startsWith("#") ? r.ocupacao : null,
      instrucao: r.instrucao && !r.instrucao.startsWith("#") ? r.instrucao : null,
      idade_na_posse: idadeEm(r.nasc, posse),
      votos: { t1, t2 }, bens_total: b ? Math.round(Number(b.total) * 100) / 100 : null, bens_n: b ? Number(b.n) : 0,
      historico,
    });
  }
  linhas.sort((a, b) => String(a.id).localeCompare(String(b.id)));

  // Conferência: 1 presidente e 1 governador por UF; senão o arquivo veio incompleto e nada muda.
  const gov = new Set(linhas.filter((l) => l.cargo === "governador").map((l) => l.uf));
  const pres = linhas.filter((l) => l.cargo === "presidente").length;
  if (pres !== 1 || gov.size !== 27 || linhas.length !== 28) {
    return { tabelas: {}, relatorio: [`eleitos inesperados no arquivo do TSE (presidente: ${pres}, governadores: ${gov.size} UFs em ${linhas.length - pres} linhas): nada gravado`], falhas: 1, atualizadas: [] };
  }
  const semVotos = linhas.filter((l) => !(l.votos as { t1: Turno | null }).t1).length;
  return {
    tabelas: { executivos: linhas },
    relatorio: [`1 presidente e 27 governadores eleitos em 2026 (posse em 5 e 6/1/2027); ${linhas.filter((l) => l.vice_nome_urna).length} com vice, ${linhas.filter((l) => l.bens_total !== null).length} com bens declarados, ${semVotos} sem votos no resultado`],
    falhas: semVotos ? 1 : 0, atualizadas: ["tse_executivos"],
  };
}
