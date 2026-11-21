/**
 * E23x — Adapter do Ipeadata (Ipea), API OData pública e sem chave: `https://www.ipeadata.gov.br/api/odata4`.
 *
 * Usado para o IDH: a série `IDHM` é o IDHM do Atlas do Desenvolvimento Humano no Brasil (PNUD, Ipea e FJP), anual, do
 * Brasil, das regiões e das 27 UFs, "encadeada": 1991, 2000 e 2010 pelo Censo e de 2012 em diante pela PNAD Contínua
 * (atualizada em 2026-05-29 com 2024; SP 0,838 e Brasil 0,805, iguais ao Atlas). O site do PNUD recusa acesso
 * automático e o Atlas só mostra o número no HTML: o Ipeadata é o caminho por API.
 */
import { fetchJson } from "./http";
import { UF_IBGE } from "./siconfi";
import type { IndicadorLocal } from "./types";

export const IPEADATA = "https://www.ipeadata.gov.br/api/odata4";

interface ValorIpea { SERCODIGO: string; VALDATA: string; VALVALOR: number | null; NIVNOME: string; TERCODIGO: string }

const SIGLA_UF = Object.fromEntries(Object.entries(UF_IBGE).map(([s, c]) => [String(c), s]));

/** IDH do Brasil e das UFs desde `desde` (ano), da série IDHM do Ipeadata. Regiões e outros países ficam de fora. */
export async function idhm(desde: number): Promise<IndicadorLocal[]> {
  const r = await fetchJson<{ value: ValorIpea[] }>(`${IPEADATA}/ValoresSerie(SERCODIGO='IDHM')`, { label: "ipea:IDHM", timeoutMs: 60_000 });
  const out: IndicadorLocal[] = [];
  for (const v of r.value) {
    const ano = Number(v.VALDATA.slice(0, 4));
    if (ano < desde || v.VALVALOR === null || !Number.isFinite(v.VALVALOR)) continue;
    const local = v.NIVNOME === "Brasil" ? "BR" : v.NIVNOME === "Estados" ? SIGLA_UF[v.TERCODIGO] : null;
    if (local === undefined) throw new Error(`ipea IDHM: UF desconhecida ${v.TERCODIGO}`);
    if (local) out.push({ local, indicador: "idh", periodo: String(ano), valor: v.VALVALOR, area: null });
  }
  return out;
}
