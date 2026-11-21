/**
 * Manchete de uma ementa (pedido de 2026-11-20): o mesmo texto oficial, mais curto, para bater o olho. Regras fixas,
 * sem LLM e sem escrever nada novo (decisão de 2026-11-13: "nada escrito por nós"):
 * - tira as datas das leis ("Lei nº 9.503, de 23 de setembro de 1997" → "Lei 9.503/1997") e "e dá outras providências";
 * - troca as leis mais citadas pelo nome com que a própria lei é conhecida ("Código de Trânsito");
 * - "Altera [lei] para [objetivo]" vira "[lei]: [objetivo]"; "Dispõe sobre X" vira "X".
 * A ementa inteira continua na página da votação e no link oficial.
 */

import { consertarCaracteres } from "./texto";

/** As leis mais citadas nas ementas (medido em 2026-11-20 em 28 mil ementas), com o artigo do nome. */
const LEIS: Record<string, [artigo: "o" | "a", nome: string]> = {
  "Decreto-Lei 2.848/1940": ["o", "Código Penal"],
  "Decreto-Lei 3.689/1941": ["o", "Código de Processo Penal"],
  "Decreto-Lei 5.452/1943": ["a", "CLT"],
  "Lei 10.406/2002": ["o", "Código Civil"],
  "Lei 13.105/2015": ["o", "Código de Processo Civil"],
  "Lei 8.069/1990": ["o", "Estatuto da Criança e do Adolescente"],
  "Lei 9.394/1996": ["a", "Lei de Diretrizes e Bases da Educação"],
  "Lei 8.078/1990": ["o", "Código de Defesa do Consumidor"],
  "Lei 11.340/2006": ["a", "Lei Maria da Penha"],
  "Lei 9.503/1997": ["o", "Código de Trânsito"],
  "Lei 9.605/1998": ["a", "Lei de Crimes Ambientais"],
  "Lei 13.146/2015": ["o", "Estatuto da Pessoa com Deficiência"],
  "Lei 8.080/1990": ["a", "Lei Orgânica da Saúde"],
  "Lei 8.213/1991": ["a", "Lei de Benefícios da Previdência"],
  "Lei 8.212/1991": ["a", "Lei de Custeio da Previdência"],
  "Lei 7.210/1984": ["a", "Lei de Execução Penal"],
  "Lei 9.656/1998": ["a", "Lei dos Planos de Saúde"],
  "Lei 8.072/1990": ["a", "Lei dos Crimes Hediondos"],
  "Lei 8.742/1993": ["a", "Lei Orgânica da Assistência Social"],
  "Lei 14.133/2021": ["a", "Lei de Licitações"],
  "Lei 8.666/1993": ["a", "antiga Lei de Licitações"],
  "Lei 12.965/2014": ["o", "Marco Civil da Internet"],
  "Lei 13.709/2018": ["a", "Lei Geral de Proteção de Dados"],
  "Lei 10.826/2003": ["o", "Estatuto do Desarmamento"],
  "Lei Complementar 101/2000": ["a", "Lei de Responsabilidade Fiscal"],
  "Lei 12.764/2012": ["a", "Lei do Autismo"],
  "Lei 10.741/2003": ["o", "Estatuto da Pessoa Idosa"],
  "Lei 9.504/1997": ["a", "Lei das Eleições"],
  "Lei 9.096/1995": ["a", "Lei dos Partidos Políticos"],
  "Lei 4.737/1965": ["o", "Código Eleitoral"],
  "Lei Complementar 123/2006": ["o", "Estatuto da Microempresa"],
  "Lei 14.601/2023": ["a", "Lei do Bolsa Família"],
  "Lei 8.036/1990": ["a", "Lei do FGTS"],
  "Lei 14.597/2023": ["a", "Lei Geral do Esporte"],
  "Lei 5.172/1966": ["o", "Código Tributário Nacional"],
  "Lei 8.112/1990": ["o", "Estatuto dos Servidores Federais"],
  "Lei 11.343/2006": ["a", "Lei de Drogas"],
  "Lei 8.429/1992": ["a", "Lei de Improbidade Administrativa"],
  "Lei 7.565/1986": ["o", "Código Brasileiro de Aeronáutica"],
  "Lei 12.651/2012": ["o", "Código Florestal"],
  "Lei 6.015/1973": ["a", "Lei de Registros Públicos"],
  "Lei 8.906/1994": ["o", "Estatuto da Advocacia"],
  "Lei 9.472/1997": ["a", "Lei Geral de Telecomunicações"],
  "Lei 10.257/2001": ["o", "Estatuto da Cidade"],
  "Lei 9.250/1995": ["a", "Lei do Imposto de Renda"],
  "Lei 14.790/2023": ["a", "Lei das Apostas de Quota Fixa"],
};
/** Os mesmos nomes por extenso ou abreviados como as ementas os escrevem, para não repetir o nome duas vezes. */
const APELIDOS: [RegExp, string][] = [
  [/Consolidação das Leis do Trabalho(?:\s*[-–(]\s*CLT\)?)?/g, "CLT"],
  [/Lei Geral de Proteção de Dados(?: Pessoais)?(?:\s*\(LGPD\))?/g, "Lei Geral de Proteção de Dados"],
];

const MES = "(?:janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)";
const DATA = `,?\\s+de\\s+(?:\\d{1,2}º?\\s+de\\s+${MES}\\s+de\\s+)?(\\d{4})`;
const REF = new RegExp(`(Decreto-Lei|Lei Complementar|Lei|Decreto Legislativo|Decreto|Medida Provisória|Emenda Constitucional)\\s+n[ºo°ª]?\\.?\\s*(\\d[\\d.]*)${DATA}`, "gi");
const NOMES = [...new Set(Object.values(LEIS).map(([, n]) => n))].sort((a, b) => b.length - a.length);
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const maiuscula = (s: string) => (s ? s[0]!.toLocaleUpperCase("pt-BR") + s.slice(1) : s);
/** Artigo antes da lei, ajustado ao gênero do nome ("da Lei" → "do Código Penal"). */
const ARTIGO: Record<string, Record<"o" | "a", string>> = {
  a: { o: "o", a: "a" }, o: { o: "o", a: "a" }, da: { o: "do", a: "da" }, do: { o: "do", a: "da" },
  na: { o: "no", a: "na" }, no: { o: "no", a: "na" }, à: { o: "ao", a: "à" }, ao: { o: "ao", a: "à" },
  pela: { o: "pelo", a: "pela" }, pelo: { o: "pelo", a: "pela" },
};

/** O texto oficial sem datas, sem "e dá outras providências" e com o nome das leis conhecidas. */
export function ementaLimpa(ementa: string): string {
  let s = consertarCaracteres(ementa).trim().replace(/[.;]\s*$/, "");
  s = s.replace(/,?\s+e\s+dá\s+outras\s+providências\.?["”]?$/i, "").replace(/,?\s+para o fim que especifica$/i, "");
  // Lei citada: "Lei nº 9.503, de 23 de setembro de 1997" → marcador com "Lei 9.503/1997".
  s = s.replace(REF, (_, tipo: string, num: string, ano: string) => `\u0000${maiuscula(tipo.toLocaleLowerCase("pt-BR")).replace(/^Decreto-lei/, "Decreto-Lei").replace(/^Lei complementar/, "Lei Complementar")} ${num}/${ano}\u0001`);
  // Lista no plural ("Leis nºs 9.249, de 26 de dezembro de 1995, e 9.250, de ...") fica sem as datas.
  s = s.replace(/\bn[º°]s\.?\s+/g, "").replace(new RegExp(`(\\d[\\d.]*)${DATA}`, "g"), "$1/$2");
  // Marcador → nome conhecido (com o artigo ajustado e sem o aposto entre parênteses ou travessão) ou "Lei 1.234/2020".
  s = s.replace(/(?:\b(a|o|da|do|na|no|à|ao|pela|pelo)\s+)?\u0000([^\u0001]+)\u0001(?:\s*\([^)]*\)|\s*[-–]\s*[A-ZÁÉÍÓÚÂÊÔÃÕÇ][^,;]*?(?=,|;|\s+para\s|\s+a fim\s|$))?/g,
    (todo, art: string | undefined, ref: string) => {
      const lei = LEIS[ref];
      if (!lei) return todo.replace(/\u0000|\u0001/g, "");
      const novo = art ? ARTIGO[art.toLocaleLowerCase("pt-BR")]?.[lei[0]] ?? art : "";
      return `${novo ? `${novo} ` : ""}${lei[1]}`;
    });
  for (const [re, n] of APELIDOS) s = s.replace(re, n);
  for (const n of NOMES) {
    const q = esc(n);
    // "o Código Penal, que institui o Código Penal," / "(Código Penal)" / "Código Penal - Código Penal": uma vez só.
    s = s.replace(new RegExp(`(${q})\\s*,\\s*(?:que|o qual|a qual)\\s+(?:"[^"]*"|“[^”]*”|[^,;]*?)\\s*(?=,|;|\\s+para\\s|\\s+a fim\\s|$)`, "g"), "$1");
    s = s.replace(new RegExp(`(${q})\\s*(?:[-–]\\s*${q}|\\(\\s*${q}\\s*\\))`, "g"), "$1");
    s = s.replace(new RegExp(`\\(\\s*${q}\\s*\\)\\s*,?\\s*(?:aprovad[ao]\\s+pel[ao]\\s+)?(?:a\\s+|o\\s+)?${q}`, "g"), n);
    s = s.replace(new RegExp(`${q}\\s*,?\\s*aprovad[ao]\\s+pel[ao]\\s+${q}`, "g"), n);
  }
  s = s.replace(/\s*\(\s*(?:Lei|Decreto-Lei|Lei Complementar)\s+[\d.]+\/\d{4}\s*\)/g, "");
  return s.replace(/\s+,/g, ",").replace(/,\s*,/g, ",").replace(/\s{2,}/g, " ").trim().replace(/[,;:]$/, "");
}

/** Lei citada pelo número, como `ementaLimpa` a deixa ("Lei Complementar 200/2023", "Decreto-Lei 2.848/1940"). */
const LEI_NO_ALVO = /\b(?:Lei Complementar|Decreto-Lei|Lei|Decreto Legislativo|Decreto|Medida Provisória|Emenda Constitucional)\s+[\d.]+\/\d{4}/g;

/** Manchete: "Código Penal: aumento de pena para o crime de stalking". Sem padrão reconhecido, a ementa limpa. */
export function manchete(ementa: string | null | undefined): string {
  if (!ementa) return "";
  const s = ementaLimpa(ementa);
  const m = /^(?:Altera|Acrescenta|Modifica|Inclui)\s+(.+?),?\s+(?:para|a fim de|com o objetivo de|de modo a)\s+(.+)$/s.exec(s)
    ?? /^(?:Altera|Acrescenta|Modifica|Inclui)\s+(.+?),?\s+para\s+dispor\s+sobre\s+(.+)$/s.exec(s);
  if (m) {
    let alvo = m[1]!;
    const objetivo = m[2]!.split(/;\s*(?:e\s+)?(?:a|o|as|os)\s+(?:Lei|Decreto|Código|Estatuto|CLT)/)[0]!.replace(/^dispor\s+sobre\s+/, "").trim();
    const sobre = /\bpara\s+dispor\s+sobre\s+/.test(s) || /^dispor\s+sobre\s+/.test(m[2]!);
    // Três leis distintas ou mais no alvo ("Altera a Lei Complementar 200/2023, a Lei Complementar 176/2020, ... e a Lei
    // 9.796/1999"): a lista não cabe num título e vira "Várias leis"; a lista fica na ementa oficial. Sem o número: listas
    // no plural ("as Leis nºs 8.072, 12.694...") não dão para contar com certeza.
    const leis = new Set([...(alvo.match(LEI_NO_ALVO) ?? []).map((r) => LEIS[r]?.[1] ?? r), ...NOMES.filter((n) => alvo.includes(n))]);
    if (leis.size >= 3) alvo = "Várias leis";
    const conhecida = leis.size >= 3 ? undefined : NOMES.find((n) => alvo.includes(n));
    // Só o nome da lei (sem "o art. 323 do", "a redação do inciso I do caput do art. 4º da").
    alvo = conhecida ?? alvo.replace(/^(?:a|o|as|os)\s+/, "").replace(/^(?:redação\s+)?(?:(?:d[oa]s?\s+)?(?:inciso|alínea|parágrafo|caput|§+|arts?\.|artigos?)\s*[\w.º-]*(?:,|\s+e)?\s*)+(?:d[oa]s?\s+)?/i, "");
    const outras = (s.match(/;\s*(?:e\s+)?(?:a|o|as|os)\s+(?:Lei|Decreto|Código|Estatuto|CLT)/g) ?? []).length;
    // "para dispor sobre a nomeação" → ": nomeação" (o artigo sobra quando o verbo sai).
    const fim = sobre ? objetivo.replace(/^(?:a|o|as|os)\s+/, "") : objetivo;
    if (alvo && fim) return `${maiuscula(alvo)}${outras ? ` e mais ${outras}` : ""}: ${fim}`;
  }
  const d = /^Dispõe\s+sobre\s+(?:(?:a|o|as|os)\s+)?(.+)$/s.exec(s);
  if (d) return maiuscula(d[1]!);
  return s;
}
