/**
 * Job `noticias` (E23r, 2026-11-20): matérias da Agência Câmara e da Agência Senado que citam políticos do site,
 * pelo RSS público, uma vez por dia (decisão do usuário). Grava só título, link, data, agência e quem é citado
 * (lib/noticias.ts); o texto da matéria serve só para achar as menções "Nome (PARTIDO-UF)".
 *
 * - Câmara: `/noticias/rss/ultimas-noticias` pagina (`?pagina=N`, 20 por página): lê até cobrir as últimas 48 h.
 * - Senado: `todasnoticias` e `noticias` (15 matérias cada, sem paginação): a coleta diária pega o fim do dia e
 *   perde parte das matérias da manhã (lacuna em docs/LACUNAS.md).
 * Nomes: o de urna (politicos) e o parlamentar oficial dos caches das fontes (perfil da Câmara e do Senado).
 */
import { existsSync, readFileSync } from "node:fs";
import { fetchText } from "../../lib/http";
import { citados, indicePorUf, lerRss, type ItemRss, type PoliticoParaNoticia } from "../../lib/noticias";
import { FONTES, lerTabela, type LinhaBruta } from "./estado";

const UA = { "User-Agent": "Fiscaliza (dados abertos; coleta diaria)" };
const CAMARA = "https://www.camara.leg.br/noticias/rss/ultimas-noticias";
const SENADO = ["https://www12.senado.leg.br/noticias/feed/todasnoticias/RSS", "https://www12.senado.leg.br/noticias/feed/noticias/RSS"];
const PAGINAS_MAX = 15;

const lerJson = <T>(arq: string): T | null => { try { return existsSync(arq) ? JSON.parse(readFileSync(arq, "utf8")) as T : null; } catch { return null; } };

function politicosParaNoticia(): PoliticoParaNoticia[] {
  const ufs = new Map<string, Set<string>>();
  for (const m of lerTabela("mandatos")) if (m.uf) (ufs.get(String(m.politico_id)) ?? ufs.set(String(m.politico_id), new Set()).get(String(m.politico_id))!).add(String(m.uf));
  return lerTabela("politicos").map((p) => {
    const nomes = [String(p.nome_urna)];
    const dep = p.camara_id ? lerJson<{ perfil: { nome?: string; nomeEleitoral?: string | null } }>(`${FONTES}/camara-deputados/${p.camara_id}.json`) : null;
    const sen = p.senado_codigo ? lerJson<{ perfil: { nome?: string } }>(`${FONTES}/senado-senadores/${p.senado_codigo}.json`) : null;
    for (const n of [dep?.perfil.nome, dep?.perfil.nomeEleitoral, sen?.perfil.nome]) if (n) nomes.push(n);
    return { id: String(p.id), nomes, ufs: [String(p.uf), ...(ufs.get(String(p.id)) ?? [])] };
  });
}

export async function jobNoticias(agora = new Date()): Promise<{ tabelas: Record<string, LinhaBruta[]>; relatorio: string[]; falhas: number; atualizadas: string[] }> {
  const indice = indicePorUf(politicosParaNoticia());
  const desde = new Date(agora.getTime() - 48 * 3600 * 1000).toISOString();
  let falhas = 0;
  const relatorio: string[] = [];
  const atualizadas: string[] = [];

  const camara: ItemRss[] = [];
  let paginas = 0;
  try {
    for (let pg = 1; pg <= PAGINAS_MAX; pg++) {
      const itens = lerRss(await fetchText(pg === 1 ? CAMARA : `${CAMARA}?pagina=${pg}`, { label: "agencia-camara:rss", headers: UA }));
      paginas = pg; camara.push(...itens);
      if (!itens.length || itens.every((x) => x.data < desde)) break;
    }
    atualizadas.push("camara_noticias");
  } catch (e) { falhas++; relatorio.push(`Câmara: RSS falhou (${(e as Error).message}); fica para a próxima coleta`); }

  const senado: ItemRss[] = [];
  for (const u of SENADO) {
    try { senado.push(...lerRss(await fetchText(u, { label: "agencia-senado:rss", headers: UA }))); }
    catch (e) { falhas++; relatorio.push(`Senado: ${u} falhou (${(e as Error).message})`); }
  }
  if (senado.length) atualizadas.push("senado_noticias");

  const linhas = new Map<string, LinhaBruta>();
  for (const [fonte, itens] of [["camara", camara], ["senado", senado]] as const) {
    for (const x of itens) {
      const ids = citados(x.texto, indice);
      if (ids.length) linhas.set(x.url, { id: x.url, fonte, titulo: x.titulo, url: x.url, data: x.data, politicos: ids });
    }
    const unicas = new Set(itens.map((x) => x.url)).size;
    const comCitacao = [...linhas.values()].filter((l) => l.fonte === fonte).length;
    const datas = itens.map((x) => x.data).sort();
    relatorio.push(`${fonte === "camara" ? `Câmara (${paginas} páginas)` : "Senado"}: ${unicas} matérias de ${datas[0]?.slice(0, 16) ?? "—"} a ${datas.at(-1)?.slice(0, 16) ?? "—"}, ${comCitacao} citam políticos do site`);
  }
  return { tabelas: { noticias: [...linhas.values()] }, relatorio, falhas, atualizadas };
}
