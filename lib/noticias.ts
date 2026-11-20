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
  /** Matérias citadas no texto, no formato das votações ("PLP 186/2026"); opcional (E23u, 2026-11-20). */
  materias?: string[] | null;
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

/** Nome por extenso das matérias como as agências escrevem → sigla das votações (a mais longa primeiro). */
const SIGLAS: [string, string][] = [
  ["projeto de lei do congresso nacional", "PLN"], ["projetos de lei do congresso nacional", "PLN"],
  ["projeto de lei complementar", "PLP"], ["projetos de lei complementar", "PLP"],
  ["proposta de emenda a constituicao", "PEC"], ["propostas de emenda a constituicao", "PEC"],
  ["projeto de decreto legislativo", "PDL"], ["medida provisoria", "MPV"], ["projeto de resolucao", "PRC"],
  ["projeto de lei", "PL"], ["projetos de lei", "PL"],
];
const POR_SIGLA: Record<string, string> = { PL: "PL", PLP: "PLP", PEC: "PEC", PDL: "PDL", PLN: "PLN", PRS: "PRS", PRC: "PRC", MP: "MPV", MPV: "MPV" };

/**
 * Matérias citadas no texto de uma notícia (E23u): "Projeto de Lei 928/26" (Câmara), "PLP 299/2026" (Senado),
 * "Medida Provisória 1.300/25". Ano de 2 dígitos vira 20xx; o número perde os pontos. Formato das votações.
 */
export function materiasCitadas(texto: string): string[] {
  const achadas = new Set<string>();
  // Sem acento e em minúsculas, mas com "/" e "." (a normalizar() da busca tira os dois).
  const t = texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ");
  for (const m of t.matchAll(/\b((?:projetos? de lei(?: do congresso nacional| complementar)?)|(?:propostas? de emenda a constituicao)|(?:projeto de decreto legislativo)|(?:medida provisoria)|(?:projeto de resolucao)|plp|pln|pec|pdl|prs|prc|mpv|mp|pl)\s+(?:n[o.º°]*\s*)?(\d{1,2}(?:\.?\d{3})*|\d{1,5})\s*\/\s*(\d{4}|\d{2})\b/g)) {
    const nome = m[1]!;
    const sigla = SIGLAS.find(([n]) => n === nome)?.[1] ?? POR_SIGLA[nome.toUpperCase()];
    if (!sigla) continue;
    const ano = m[3]!.length === 2 ? `20${m[3]}` : m[3]!;
    achadas.add(`${sigla} ${Number(m[2]!.replace(/\./g, ""))}/${ano}`);
  }
  return [...achadas].sort();
}

/** Título de agência para uma votação: a notícia, o link e de qual agência. */
export interface TituloAgencia { titulo: string; url: string; fonte: Noticia["fonte"] }

const diasEntre = (a: string, b: string) => (Date.parse(b.slice(0, 10)) - Date.parse(a.slice(0, 10))) / 86_400_000;

/**
 * Manchete de agência para uma votação do Plenário (E23u): notícia da agência da mesma Casa, publicada no dia ou até
 * 3 dias depois, que cita a matéria. Fora: notícia de comissão ("Comissão aprova...", que é outra votação) e a que cita
 * mais de 3 matérias (resumo de sessão). "Áudio:" e "Vídeo:" saem do título. Sem notícia, null.
 */
export function tituloDaAgencia(v: { proposicao: string | null; data: string; casa: Noticia["fonte"] }, noticias: Noticia[]): TituloAgencia | null {
  if (!v.proposicao) return null;
  const ok = noticias.filter((n) => n.materias?.includes(v.proposicao!) && n.fonte === v.casa && (n.materias?.length ?? 0) <= 3)
    .filter((n) => { const d = diasEntre(v.data, n.data); return d >= 0 && d <= 3; })
    .map((n) => ({ ...n, titulo: n.titulo.replace(/^(?:Áudio|Vídeo|Video)\s*:\s*/i, "").trim() }))
    .filter((n) => !/^comiss(ão|ões)\b/i.test(n.titulo))
    // Mais perto da votação e, no empate, a que cita menos matérias (mais específica).
    .sort((a, b) => a.data.localeCompare(b.data) || (a.materias!.length - b.materias!.length));
  const n = ok[0];
  return n ? { titulo: n.titulo, url: n.url, fonte: n.fonte } : null;
}
