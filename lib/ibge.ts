/**
 * E23x — Adapter do IBGE (SIDRA) para os indicadores do país e dos estados. Usa a API de valores
 * (`apisidra.ibge.gov.br/values`), JSON puro, sem chave; a API de localidades (`servicodados.ibge.gov.br`) não
 * respondia a runners do GitHub Actions em 2026-11-02 (CLAUDE.md).
 *
 * Tabelas (variável): desemprego 4099 (4099, trimestral), renda média real do trabalho 4660 (5933, anual), informalidade
 * 4708 (12466, anual), pobreza 5877 (9948, ODS 1.2.1, anual), inflação em 12 meses 7060 (2265, IPCA, mensal: Brasil, 10
 * regiões metropolitanas e 6 capitais) e crescimento do PIB em 4 trimestres 5932 (6562, só Brasil).
 */
import { fetchJson } from "./http";
import { UF_IBGE } from "./siconfi";
import type { IndicadorLocal, IndicadorPais } from "./types";

export const SIDRA = "https://apisidra.ibge.gov.br/values";

interface LinhaSidra { NC: string; D1C: string; D1N: string; D3C: string; V: string }

const SIGLA_UF = Object.fromEntries(Object.entries(UF_IBGE).map(([s, c]) => [String(c), s]));

/** "202603" → trimestre "2026-T3", mês "2026-03" ou ano "2025", conforme a periodicidade da tabela. */
function periodo(cod: string, tipo: "ano" | "trimestre" | "mes"): string {
  if (tipo === "ano") return cod;
  return tipo === "trimestre" ? `${cod.slice(0, 4)}-T${Number(cod.slice(4))}` : `${cod.slice(0, 4)}-${cod.slice(4)}`;
}

/** "São Paulo - SP" (N7) → "região metropolitana de São Paulo"; "Grande Vitória - ES" → "Grande Vitória"; "Rio Branco - AC" (N6) → "município de Rio Branco". */
export function areaIpca(nivel: string, nome: string): string {
  const n = nome.replace(/\s+-\s+[A-Z]{2}$/, "").trim();
  if (nivel === "6") return `município de ${n}`;
  return /^Grande /.test(n) ? n : `região metropolitana de ${n}`;
}

/**
 * Consulta uma variável de uma tabela para Brasil e UFs (ou para as áreas do IPCA), desde `desde` (código SIDRA do
 * período, ex. "201901"). Valor ausente na fonte ("...", "-", "X") fica de fora, nunca vira zero.
 */
export async function sidra(q: { indicador: IndicadorPais; tabela: number; variavel: number; niveis: string; classificacao?: string; tipo: "ano" | "trimestre" | "mes"; desde: string }): Promise<IndicadorLocal[]> {
  const url = `${SIDRA}/t/${q.tabela}/${q.niveis}/v/${q.variavel}/p/all${q.classificacao ? `/${q.classificacao}` : ""}`;
  const linhas = await fetchJson<LinhaSidra[]>(url, { label: `ibge:${q.tabela}`, timeoutMs: 60_000 });
  const out: IndicadorLocal[] = [];
  for (const l of linhas.slice(1)) {
    if (l.D3C < q.desde) continue;
    const v = Number(l.V);
    if (!/^-?\d/.test(l.V) || !Number.isFinite(v)) continue;
    // Brasil (N1), UF (N3), região metropolitana (N7, código começa pela UF) ou município (N6, idem).
    const local = l.NC === "1" ? "BR" : SIGLA_UF[l.D1C.slice(0, 2)];
    if (!local) throw new Error(`ibge ${q.tabela}: localidade desconhecida ${l.NC}/${l.D1C} ${l.D1N}`);
    out.push({ local, indicador: q.indicador, periodo: periodo(l.D3C, q.tipo), valor: v, area: q.indicador === "inflacao" && l.NC !== "1" ? areaIpca(l.NC, l.D1N) : null });
  }
  return out;
}

/** As consultas dos indicadores (desde 2019; o IPCA por área começa em 2020 nesta tabela). */
export const CONSULTAS: Parameters<typeof sidra>[0][] = [
  { indicador: "desemprego", tabela: 4099, variavel: 4099, niveis: "n1/all/n3/all", tipo: "trimestre", desde: "201901" },
  { indicador: "renda", tabela: 4660, variavel: 5933, niveis: "n1/all/n3/all", tipo: "ano", desde: "2019" },
  { indicador: "informalidade", tabela: 4708, variavel: 12466, niveis: "n1/all/n3/all", tipo: "ano", desde: "2019" },
  { indicador: "pobreza", tabela: 5877, variavel: 9948, niveis: "n1/all/n3/all", tipo: "ano", desde: "2019" },
  { indicador: "inflacao", tabela: 7060, variavel: 2265, niveis: "n1/all/n7/all/n6/all", classificacao: "c315/7169", tipo: "mes", desde: "202001" },
  { indicador: "pib", tabela: 5932, variavel: 6562, niveis: "n1/all", classificacao: "c11255/90707", tipo: "trimestre", desde: "201901" },
];
