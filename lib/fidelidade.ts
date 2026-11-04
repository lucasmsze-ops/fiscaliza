/**
 * "Votou com o partido?" (E23i): o voto de cada parlamentar comparado com a orientação da bancada
 * do partido dele no dia da votação. Regras em docs/METODOLOGIA.md. Nada é adivinhado: votação em
 * que não dá para saber qual bancada orientou o partido fica fora da conta.
 *
 * Na Câmara, um partido orienta sozinho, pela federação ("Fdr PT-PCdoB-PV") ou pelo bloco. O nome do
 * bloco vem abreviado e às vezes cortado ("Bl UniPpFdrPsdbCid..."): só vale quando o partido aparece
 * no nome; o que está depois do "..." é desconhecido.
 */
import type { TipoVoto } from "./types";

/** Abreviações dos nomes de bloco da Câmara (todas as que aparecem em 2023–2026). Mais longas primeiro. */
const TOKENS: [string, string[]][] = [
  ["Solid", ["SOLIDARIEDADE"]], ["Patri", ["PATRIOTA"]], ["Avan", ["AVANTE"]], ["Pode", ["PODE"]], ["Psdb", ["PSDB"]],
  ["Pros", ["PROS"]], ["Fdr", []], ["Uni", ["UNIÃO"]], ["Psd", ["PSD"]], ["Mdb", ["MDB"]], ["Rep", ["REPUBLICANOS"]],
  ["Psc", ["PSC"]], ["Prd", ["PRD"]], ["Cid", ["CIDADANIA"]], ["PT", ["PT", "PCdoB", "PV"]], ["Pt", ["PT", "PCdoB", "PV"]],
  ["Pl", ["PL"]], ["Pp", ["PP"]],
];

/** Partidos listados no nome abreviado do bloco; null se o nome não é de bloco ou não se decifra inteiro. */
export function decodificarBloco(nome: string): { partidos: string[]; truncado: boolean } | null {
  const m = /^Bl (\S+?)(\.\.\.)?$/.exec(nome.trim());
  if (!m) return null;
  let resto = m[1]!;
  const partidos: string[] = [];
  while (resto) {
    const t = TOKENS.find(([ab]) => resto.startsWith(ab));
    if (!t) return null; // abreviação desconhecida: o bloco inteiro fica de fora
    partidos.push(...t[1]);
    resto = resto.slice(t[0].length);
  }
  return { partidos, truncado: Boolean(m[2]) };
}

/** "Fdr PT-PCdoB-PV" → os partidos da federação. */
export function decodificarFederacao(nome: string): string[] | null {
  const m = /^Fdr (.+)$/.exec(nome.trim());
  return m ? m[1]!.split("-").map((s) => s.trim()).filter(Boolean) : null;
}

/** Grafias das bancadas do Senado e das Casas para a sigla dos votos. */
const SINONIMO: Record<string, string> = { Republica: "REPUBLICANOS", Republicanos: "REPUBLICANOS", Podemos: "PODE", Progressistas: "PP" };
const sigla = (s: string) => SINONIMO[s] ?? s.toUpperCase();

/** Bancadas que não são de partido (orientam todos, ou um grupo): nunca valem como a do partido. */
const NAO_PARTIDO = new Set(["Governo", "Oposição", "Maioria", "Minoria", "Banc Fem", "B.Feminina", "Bloco Parlamentar"]);

/**
 * Orientação que valeu para o partido na votação: a do próprio partido; senão a da federação que o
 * inclui; senão a do bloco cujo nome o lista. Sem nenhuma dessas, null (a votação fica fora).
 */
export function orientacaoDoPartido(partido: string, orientacoes: { bancada: string; orientacao: string }[]): { orientacao: string; via: "partido" | "federacao" | "bloco" } | null {
  const p = sigla(partido);
  if (p === "S/PARTIDO" || p === "S.PART.") return null;
  const deBancadas = orientacoes.filter((o) => !NAO_PARTIDO.has(o.bancada));
  const propria = deBancadas.find((o) => !o.bancada.startsWith("Fdr ") && !o.bancada.startsWith("Bl ") && sigla(o.bancada) === p);
  if (propria) return { orientacao: propria.orientacao, via: "partido" };
  const fed = deBancadas.find((o) => decodificarFederacao(o.bancada)?.some((x) => sigla(x) === p));
  if (fed) return { orientacao: fed.orientacao, via: "federacao" };
  const bloco = deBancadas.find((o) => decodificarBloco(o.bancada)?.partidos.some((x) => x === p));
  if (bloco) return { orientacao: bloco.orientacao, via: "bloco" };
  return null;
}

const PARA_VOTO: Record<string, TipoVoto> = { Sim: "sim", Não: "nao", Obstrução: "obstrucao" };
const POSICIONAL = new Set<TipoVoto>(["sim", "nao", "obstrucao"]);

/**
 * Com o partido / contra: só votações em que a bancada do partido orientou Sim, Não ou Obstrução
 * (Liberado e sem orientação ficam fora) e a pessoa votou Sim, Não ou Obstrução (a mesma regra do
 * governismo; abstenção, ausência e voto secreto ficam fora).
 */
export function contarComPartido(itens: { voto: TipoVoto; orientacao: string | null }[]): { com: number; contra: number } {
  let com = 0, contra = 0;
  for (const { voto, orientacao } of itens) {
    const esperado = orientacao ? PARA_VOTO[orientacao] : undefined;
    if (!esperado || !POSICIONAL.has(voto)) continue;
    if (voto === esperado) com++; else contra++;
  }
  return { com, contra };
}
