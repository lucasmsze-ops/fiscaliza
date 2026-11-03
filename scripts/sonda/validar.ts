/**
 * E8 — Validação de data/*.json (critério de pronto da E8; o cron roda o mesmo antes de gravar).
 *
 * 1. Toda chave estrangeira aponta para um registro que existe (politico_id, votacao_id,
 *    lista_id, municipio_ibge).
 * 2. Nenhum campo obrigatório vazio (null, "" ou ausente) e nenhuma chave fora do tipo.
 * 3. Chaves primárias únicas e valores de enum dentro do domínio.
 * 4. Coerência: votação secreta sem placar e sem voto Sim/Não; nenhum CPF ou hash de CPF em
 *    lugar nenhum.
 * Sai com código 1 se houver qualquer erro. Avisos (campos opcionais nulos) não falham.
 * `DATA_DIR=outro/dir` valida outra pasta (usado para testar o próprio validador).
 */
import { readFileSync } from "node:fs";
import type { Linha, Politico, Votacao } from "../../lib/types";

const DIR = process.env.DATA_DIR ?? "data";
const tab = <T>(t: string): T[] => JSON.parse(readFileSync(`${DIR}/${t}.json`, "utf8")) as T[];
type L = Record<string, unknown>;
const erros: string[] = [];
const avisos: string[] = [];
const erro = (m: string) => { if (erros.length < 200) erros.push(m); else if (erros.length === 200) erros.push("…"); };

/** Colunas de cada tabela: obrigatórias (não podem ser null/"") e opcionais (podem ser null). */
const ESQUEMA: Record<string, { pk: string[]; obrig: string[]; opc: string[] }> = {
  politicos: { pk: ["id"], obrig: ["id", "slug", "cargo", "nome", "nome_urna", "uf", "partido", "status", "updated_at", "redes_sociais"], opc: ["telefone", "genero", "lista_id", "federacao", "numero_urna", "foto_url", "email", "url_perfil", "tse_sq_candidato", "camara_id", "senado_codigo", "votos_2026"] },
  mandatos: { pk: ["politico_id", "cargo", "inicio"], obrig: ["politico_id", "cargo", "inicio", "titular"], opc: ["fim"] },
  afastamentos: { pk: ["politico_id", "inicio", "motivo"], obrig: ["politico_id", "inicio", "motivo"], opc: ["fim"] },
  listas: { pk: ["id"], obrig: ["id", "uf", "ano", "cargo", "nome", "votos_validos", "eleitos"], opc: ["composicao"] },
  municipios: { pk: ["ibge"], obrig: ["ibge", "tse", "nome", "uf"], opc: [] },
  eleitos_mun: { pk: ["municipio_ibge", "cargo", "politico_id"], obrig: ["municipio_ibge", "cargo", "politico_id", "votos", "posicao"], opc: [] },
  despesas_mes: { pk: ["politico_id", "casa", "ano", "mes"], obrig: ["politico_id", "casa", "uf", "ano", "mes", "total", "por_categoria"], opc: [] },
  despesas_media_uf: { pk: ["casa", "uf", "ano", "mes"], obrig: ["casa", "uf", "ano", "mes", "media", "parlamentares", "total", "fechado"], opc: [] },
  votacoes: { pk: ["id"], obrig: ["id", "id_externo", "casa", "data", "descricao", "secreta", "url_oficial"], opc: ["proposicao", "ementa", "objeto", "resultado", "placar"] },
  votos: { pk: ["votacao_id", "politico_id"], obrig: ["votacao_id", "politico_id", "voto"], opc: ["detalhe"] },
  orientacoes: { pk: ["votacao_id", "bancada"], obrig: ["votacao_id", "bancada"], opc: ["orientacao"] },
  proposicoes: { pk: ["id"], obrig: ["id", "id_externo", "casa", "tipo", "numero", "ano", "apresentacao", "virou_norma", "url_oficial"], opc: ["ementa", "situacao"] },
  proposicoes_autores: { pk: ["proposicao_id", "politico_id"], obrig: ["proposicao_id", "politico_id", "ordem"], opc: [] },
  proposicoes_contagem: { pk: ["politico_id", "casa", "ano", "tipo"], obrig: ["politico_id", "casa", "ano", "tipo", "autorias"], opc: [] },
  atualizacoes: { pk: ["fonte"], obrig: ["fonte", "coletado_em"], opc: [] },
};
const ENUM: Record<string, Record<string, readonly unknown[]>> = {
  politicos: { genero: ["feminino", "masculino", null], cargo: ["deputado_federal", "senador"], status: ["eleito", "reeleito", "nao_eleito", "suplente", "em_exercicio"] },
  mandatos: { cargo: ["deputado_federal", "senador"] },
  eleitos_mun: { cargo: ["deputado_federal", "senador"] },
  votacoes: { casa: ["camara", "senado"], resultado: ["aprovada", "rejeitada", null] },
  votos: { voto: ["sim", "nao", "abstencao", "obstrucao", "art17", "nao_informado", "secreto", "ausente"] },
  orientacoes: { orientacao: ["Sim", "Não", "Obstrução", "Liberado", ""] },
  proposicoes: { casa: ["camara", "senado"], virou_norma: [true, false] },
  proposicoes_contagem: { casa: ["camara", "senado"] },
};

const dados: Record<string, L[]> = {};
for (const [t, e] of Object.entries(ESQUEMA)) {
  const linhas = tab<L>(t);
  dados[t] = linhas;
  const colunas = new Set([...e.obrig, ...e.opc]);
  const vistos = new Set<string>();
  linhas.forEach((l, i) => {
    for (const k of Object.keys(l)) if (!colunas.has(k)) erro(`${t}[${i}]: coluna fora do esquema "${k}"`);
    for (const k of e.obrig) if (l[k] === null || l[k] === undefined || l[k] === "") erro(`${t}[${i}]: obrigatório vazio "${k}"`);
    for (const k of e.opc) if (!(k in l)) erro(`${t}[${i}]: coluna opcional omitida "${k}" (usar null)`);
    for (const [k, dom] of Object.entries(ENUM[t] ?? {})) if (!dom.includes(l[k])) erro(`${t}[${i}]: ${k}=${JSON.stringify(l[k])} fora do domínio`);
    const pk = e.pk.map((k) => String(l[k])).join("|");
    if (vistos.has(pk)) erro(`${t}: chave duplicada ${pk}`);
    vistos.add(pk);
  });
}

// Chaves estrangeiras.
const ids = (t: string, k = "id") => new Set(dados[t]!.map((l) => l[k]));
const politicos = ids("politicos"), votacoes = ids("votacoes"), listas = ids("listas"), municipios = ids("municipios", "ibge");
const fk = (t: string, k: string, alvo: Set<unknown>, nome: string, opcional = false) => {
  let n = 0;
  for (const l of dados[t]!) { if (opcional && l[k] === null) continue; if (!alvo.has(l[k])) { n++; if (n <= 5) erro(`${t}.${k}=${JSON.stringify(l[k])} não existe em ${nome}`); } }
  if (n > 5) erro(`${t}.${k}: mais ${n - 5} referências quebradas`);
};
for (const t of ["mandatos", "afastamentos", "eleitos_mun", "despesas_mes", "votos", "proposicoes_autores", "proposicoes_contagem"]) fk(t, "politico_id", politicos, "politicos");
fk("proposicoes_autores", "proposicao_id", ids("proposicoes"), "proposicoes");
// Toda proposição tem pelo menos um autor no site (é o critério para entrar) e um primeiro autor no máximo.
const comAutor = ids("proposicoes_autores", "proposicao_id");
for (const p of dados.proposicoes!) if (!comAutor.has(p.id)) erro(`proposicoes ${p.id}: sem autor no site`);
const primeiros = new Map<unknown, number>();
for (const a of dados.proposicoes_autores!) if (a.ordem === 1) primeiros.set(a.proposicao_id, (primeiros.get(a.proposicao_id) ?? 0) + 1);
for (const [id, n] of primeiros) if (n > 1) erro(`proposicoes ${id}: ${n} primeiros autores`);
for (const t of ["votos", "orientacoes"]) fk(t, "votacao_id", votacoes, "votacoes");
fk("politicos", "lista_id", listas, "listas", true);
fk("eleitos_mun", "municipio_ibge", municipios, "municipios");

// Coerência.
const vs = dados.votacoes as unknown as Linha<Votacao>[];
const porId = new Map(vs.map((v) => [v.id, v]));
for (const v of vs) {
  if (v.secreta && v.placar !== null) erro(`votacoes ${v.id}: secreta com placar`);
  if (!v.id.startsWith(`${v.casa}:`)) erro(`votacoes ${v.id}: id não começa pela casa`);
}
for (const v of dados.votos!) {
  const vot = porId.get(v.votacao_id as string);
  if (vot?.secreta && (v.voto === "sim" || v.voto === "nao")) erro(`votos: Sim/Não em votação secreta ${v.votacao_id}`);
  if (vot?.casa === "camara" && v.voto === "secreto") erro(`votos: "secreto" na Câmara ${v.votacao_id}`);
}
const ps = dados.politicos as unknown as Linha<Politico>[];
for (const p of ps) {
  if (p.id !== p.slug) erro(`politicos ${p.id}: id ≠ slug`);
  if (!p.id.endsWith(`-${p.uf.toLowerCase()}`)) erro(`politicos ${p.id}: slug sem a UF no fim`);
  if (p.cargo === "deputado_federal" && p.status !== "em_exercicio" && !p.lista_id) erro(`politicos ${p.id}: deputado de 2026 sem lista`);
  if (p.status === "reeleito" && !p.camara_id && !p.senado_codigo) erro(`politicos ${p.id}: reeleito sem registro na Casa`);
}
const texto = ["politicos", "mandatos", "votos", "despesas_mes"].map((t) => readFileSync(`${DIR}/${t}.json`, "utf8")).join("");
if (/cpf/i.test(texto)) erro("algum arquivo menciona CPF");
if (/\b[0-9a-f]{64}\b/.test(texto)) erro("há um hash SHA-256 nos dados");

// Mês fechado: contíguo desde o primeiro mês de cada bancada (não pode haver aberto antes de fechado).
const bancadas = new Map<string, L[]>();
for (const m of dados.despesas_media_uf!) bancadas.set(`${m.casa} ${m.uf}`, [...(bancadas.get(`${m.casa} ${m.uf}`) ?? []), m]);
for (const [b, ms] of bancadas) {
  const meds = [...ms].sort((a, b) => (a.ano as number) * 100 + (a.mes as number) - ((b.ano as number) * 100 + (b.mes as number)));
  if (meds.some((m, i) => m.fechado && meds.slice(0, i).some((x) => !x.fechado))) erro(`despesas_media_uf ${b}: mês fechado depois de um aberto`);
}
// Toda despesa do site tem a média da sua bancada no mesmo mês (o card compara as duas).
const chavesMedia = new Set(dados.despesas_media_uf!.map((m) => `${m.casa} ${m.uf} ${m.ano} ${m.mes}`));
for (const d of dados.despesas_mes!) if (!chavesMedia.has(`${d.casa} ${d.uf} ${d.ano} ${d.mes}`)) erro(`despesas_mes ${d.politico_id} ${d.casa} ${d.ano}-${d.mes}: sem média da bancada ${d.uf}`);
for (const t of ["despesas_mes", "despesas_media_uf"]) for (const l of dados[t]!) if (l.casa !== "camara" && l.casa !== "senado") erro(`${t}: casa inválida ${l.casa}`);

// Avisos: opcionais nulos que o card vai precisar tratar (não são erro: a fonte não tem).
const nulos = (k: keyof Linha<Politico>) => ps.filter((p) => p[k] === null).length;
avisos.push(`politicos sem foto: ${nulos("foto_url")} · sem e-mail: ${nulos("email")} (Cobrar oculto) · sem votos_2026: ${nulos("votos_2026")}`);
avisos.push(`votacoes sem ementa: ${vs.filter((v) => !v.ementa).length} · sem resultado: ${vs.filter((v) => !v.resultado).length} · secretas: ${vs.filter((v) => v.secreta).length}`);
const comVoto = new Set(dados.votos!.map((v) => v.politico_id));
const emExercicio = ps.filter((p) => p.camara_id || p.senado_codigo);
avisos.push(`com registro na Câmara/Senado: ${emExercicio.length} · com algum voto 2023–26: ${emExercicio.filter((p) => comVoto.has(p.id)).length}`);

console.log(`tabelas: ${Object.entries(dados).map(([t, l]) => `${t}=${l.length}`).join(" ")}`);
for (const a of avisos) console.log(`aviso: ${a}`);
if (erros.length) { console.log(`\n${erros.length} erro(s):`); for (const e of erros) console.log(`  ✗ ${e}`); process.exit(1); }
console.log("\nvalidação ok: todas as referências existem, nenhum obrigatório vazio, chaves únicas.");
