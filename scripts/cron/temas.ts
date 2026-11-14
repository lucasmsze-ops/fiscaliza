/**
 * Temas oficiais (2026-11-13): a classificação de assunto que a Câmara (`/proposicoes/{id}/temas`) e o
 * Senado (`classificacoes` de `/processo/{id}`) dão a cada matéria, gravada nas votações e na pauta
 * (coluna `temas`), para o cartão mostrar do que se trata além do número. Nada escrito por nós.
 *
 * Cada matéria é consultada uma vez e fica em cache (estado/fontes/temas-*.json); o cache é refeito
 * depois de 90 dias. Roda depois das coletas e antes da validação; falha em uma matéria não para o resto.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { getIdProposicao, getTemasProposicao } from "../../lib/camara";
import { getClassificacoesMateria } from "../../lib/senado";
import { FONTES, gravarTabela, lerTabela, type LinhaBruta } from "./estado";

const VALIDADE_DIAS = 90;
type Cache = Record<string, { temas: string[]; em: string }>;
const lerCache = (nome: string): Cache => { const f = `${FONTES}/${nome}.json`; return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) as Cache : {}; };
const gravarCache = (nome: string, c: Cache) => writeFileSync(`${FONTES}/${nome}.json`, JSON.stringify(c));
const materiaSenado = (url: unknown) => /\/materia\/(\d+)/.exec(String(url))?.[1] ?? null;

async function emLotes<T>(itens: T[], emVoo: number, f: (x: T) => Promise<void>) {
  for (let i = 0; i < itens.length; i += emVoo) await Promise.all(itens.slice(i, i + emVoo).map(f));
}

export async function aplicarTemas(hoje: string): Promise<{ relatorio: string[]; falhas: number }> {
  const venceu = (em: string) => (Date.parse(hoje) - Date.parse(em)) / 864e5 > VALIDADE_DIAS;
  const votacoes = lerTabela("votacoes");
  const pauta = lerTabela("pauta");

  // Câmara: a matéria principal de cada votação vem do detalhe em cache; a da pauta, do id do item.
  const propDaVotacao = new Map<string, number>();
  const dir = `${FONTES}/camara-votacao`;
  if (existsSync(dir)) for (const f of readdirSync(dir).filter((x) => !x.startsWith(".") && x.endsWith(".json"))) {
    const d = (JSON.parse(readFileSync(`${dir}/${f}`, "utf8")) as { detalhe?: { idExterno: string; proposicoesAfetadas?: { proposicaoId: number }[] } }).detalhe;
    const id = d?.proposicoesAfetadas?.[0]?.proposicaoId;
    if (d && id) propDaVotacao.set(`camara:${d.idExterno}`, id);
  }
  const propDaPauta = (l: LinhaBruta) => Number(String(l.id).split(":")[3]) || null;

  // Sem o detalhe em cache (votações herdadas da sonda), o id sai da matéria: "PL 5809/2025" → /proposicoes.
  const cIds = lerCache("temas-camara-ids") as unknown as Record<string, { id: number | null; em: string }>;
  const materia = (s: unknown) => /^([A-Z]+) (\d+)\/(\d{4})/.exec(String(s ?? ""));
  const semDetalhe = [...new Set(votacoes.filter((v) => v.casa === "camara" && !propDaVotacao.has(String(v.id)) && materia(v.proposicao)).map((v) => materia(v.proposicao)![0]))];
  let falhasIds = 0;
  await emLotes(semDetalhe.filter((m) => !cIds[m] || (cIds[m]!.id === null && venceu(cIds[m]!.em))), 4, async (m) => {
    const [, tipo, num, ano] = materia(m)!;
    try { cIds[m] = { id: await getIdProposicao(tipo!, Number(num), Number(ano)), em: hoje }; } catch { falhasIds++; }
  });
  gravarCache("temas-camara-ids", cIds as unknown as Cache);
  for (const v of votacoes) {
    const m = materia(v.proposicao)?.[0];
    if (v.casa === "camara" && !propDaVotacao.has(String(v.id)) && m && cIds[m]?.id) propDaVotacao.set(String(v.id), cIds[m]!.id!);
  }

  const cCamara = lerCache("temas-camara"), cSenado = lerCache("temas-senado");
  const idsCamara = [...new Set([...propDaVotacao.values(), ...pauta.filter((l) => l.casa === "camara").map(propDaPauta).filter((x): x is number => !!x)])];
  const codsSenado = [...new Set([...votacoes, ...pauta].filter((l) => l.casa === "senado").map((l) => materiaSenado(l.url_oficial)).filter((x): x is string => !!x))];
  let falhas = falhasIds, novas = 0;
  await emLotes(idsCamara.filter((id) => !cCamara[id] || venceu(cCamara[id]!.em)), 4, async (id) => {
    try { cCamara[id] = { temas: await getTemasProposicao(id), em: hoje }; novas++; } catch { falhas++; }
  });
  // O /processo do Senado responde 429 com 3 em voo (CLAUDE.md): 2.
  await emLotes(codsSenado.filter((c) => !cSenado[c] || venceu(cSenado[c]!.em)), 2, async (c) => {
    try { cSenado[c] = { temas: await getClassificacoesMateria(c), em: hoje }; novas++; } catch { falhas++; }
  });
  gravarCache("temas-camara", cCamara); gravarCache("temas-senado", cSenado);

  const temasDe = (l: LinhaBruta, propCamara: number | null | undefined) => {
    const t = l.casa === "camara" ? (propCamara ? cCamara[propCamara]?.temas : undefined) : cSenado[materiaSenado(l.url_oficial) ?? ""]?.temas;
    return t?.length ? t : null;
  };
  let comTema = 0;
  for (const v of votacoes) { v.temas = temasDe(v, propDaVotacao.get(String(v.id))); if (v.temas) comTema++; }
  for (const p of pauta) p.temas = temasDe(p, propDaPauta(p));
  gravarTabela("votacoes", votacoes);
  gravarTabela("pauta", pauta);
  return {
    relatorio: [`${novas} matérias consultadas agora (${idsCamara.length} da Câmara e ${codsSenado.length} do Senado no total); ${comTema} de ${votacoes.length} votações com tema oficial; ${falhas} falhas (tentadas de novo na próxima execução)`],
    falhas,
  };
}
