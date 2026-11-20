/**
 * Notícias das agências oficiais (E23r, decisão do usuário de 2026-11-19): Agência Câmara e Agência Senado,
 * pelo RSS público, coletadas pelo cron uma vez por dia (nunca na visita). Do RSS só ficam título, link, data e
 * quem do site é citado: o texto da matéria é lido para achar as menções e descartado.
 *
 * Ligação ao político: as duas agências citam parlamentares como "Nome (PARTIDO-UF)". Vale a menção cujo trecho
 * antes do parêntese termina no nome de urna ou no nome parlamentar oficial do político (sem acento nem caixa) e
 * cuja UF é a dele (da candidatura ou da cadeira). O partido não entra na regra: muda de grafia ("Republicanos", "REPUBLICANOS") e de sigla.
 */
import { normalizar } from "./texto";

export interface Noticia {
  /** O link da matéria (estável nas duas agências). */
  id: string;
  fonte: "camara" | "senado";
  titulo: string;
  url: string;
  /** ISO 8601 (data e hora da publicação). */
  data: string;
  /** Ids dos políticos do site citados como "Nome (PARTIDO-UF)". */
  politicos: string[];
}

export const NOME_FONTE: Record<Noticia["fonte"], string> = { camara: "Agência Câmara", senado: "Agência Senado" };

/** Texto sem tags e entidades HTML básicas (o RSS traz a matéria em HTML). */
export const semHtml = (h: string) =>
  h.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ");

/** Nomes pelos quais o político é citado: o de urna (TSE) e o parlamentar oficial (Câmara, Senado), e as UFs dele. */
export interface PoliticoParaNoticia { id: string; nomes: string[]; ufs: string[] }

/**
 * Índice para achar o político pela menção: por UF, os nomes normalizados (de urna e parlamentar). Nome de uma
 * palavra só ("TIRIRICA") vale; nome de duas pessoas diferentes na mesma UF fica de fora (ambíguo, nunca chutado).
 */
export function indicePorUf(ps: PoliticoParaNoticia[]): Map<string, Map<string, string>> {
  const porUf = new Map<string, Map<string, string | null>>();
  for (const p of ps) for (const uf of new Set(p.ufs)) for (const nome of new Set(p.nomes.map(normalizar))) {
    if (!nome) continue;
    const m = porUf.get(uf) ?? new Map<string, string | null>();
    m.set(nome, m.has(nome) && m.get(nome) !== p.id ? null : p.id);
    porUf.set(uf, m);
  }
  return new Map([...porUf].map(([uf, m]) => [uf, new Map([...m].filter((e): e is [string, string] => e[1] !== null))]));
}

/** Ids dos políticos citados no texto como "Nome (PARTIDO-UF)". */
export function citados(texto: string, indice: Map<string, Map<string, string>>): string[] {
  const achados = new Set<string>();
  for (const m of texto.matchAll(/([^()]{1,80})\(\s*[A-Za-zÀ-ú.]+(?:\s+[A-Za-zÀ-ú.]+)?\s*[-–]\s*([A-Z]{2})\s*\)/g)) {
    const antes = ` ${normalizar(m[1]!)}`, nomes = indice.get(m[2]!);
    if (!nomes) continue;
    // O nome mais longo que fecha o trecho ("joao paulo cunha" antes de "paulo cunha").
    let melhor: string | null = null;
    for (const [n, id] of nomes) if (antes.endsWith(` ${n}`) && (!melhor || n.length > melhor.length)) { melhor = n; achados.add(id); }
    if (melhor) for (const [n, id] of nomes) if (n !== melhor && antes.endsWith(` ${n}`)) achados.delete(id);
  }
  return [...achados].sort();
}

export interface ItemRss { titulo: string; url: string; data: string; texto: string }

const tag = (item: string, nome: string) => {
  const m = item.match(new RegExp(`<${nome}(?:\\s[^>]*)?>([\\s\\S]*?)</${nome}>`));
  if (!m) return "";
  const cdata = m[1]!.match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);
  // Fora de CDATA o HTML vem escapado (&lt;p&gt;): desfaz antes de tirar as tags.
  return cdata ? cdata[1]! : m[1]!.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
};

/**
 * Itens de um RSS 2.0 das agências: título, link, data (ISO) e o texto da matéria sem HTML (Câmara em
 * `content:encoded`, Senado em `description`). Sem biblioteca: os dois feeds são simples e estáveis.
 */
export function lerRss(xml: string): ItemRss[] {
  return xml.split(/<item(?:\s[^>]*)?>/).slice(1).map((bruto) => {
    const item = bruto.split("</item>")[0]!;
    const quando = new Date(semHtml(tag(item, "pubDate")).trim());
    return {
      titulo: semHtml(tag(item, "title")).trim(),
      url: semHtml(tag(item, "link")).trim(),
      data: Number.isNaN(quando.getTime()) ? "" : quando.toISOString(),
      texto: semHtml(`${tag(item, "content:encoded")} ${tag(item, "description")}`),
    };
  }).filter((x) => x.titulo && /^https:\/\//.test(x.url) && x.data);
}
