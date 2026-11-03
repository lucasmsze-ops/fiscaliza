/**
 * Job `proposicoes` (E21e): proposições de autoria dos parlamentares do site, desde 2023.
 *
 * Câmara: arquivos anuais `proposicoes` e `proposicoesAutores` (CSV; chegam cortados, por isso
 * `baixarArquivo` retoma). Autor = linha com `proponente = 1` (os demais são apoiadores);
 * `ordemAssinatura = 1` é o primeiro autor.
 * Senado: `/processo?codigoParlamentarAutor` por senador e ano, e `/processo/{id}` só das que podem
 * virar lei, para a ordem dos autores (não muda: fica em cache para sempre).
 *
 * Tipos que podem virar lei (`TIPOS_LEGISLATIVOS`) entram com a íntegra em `proposicoes` (só se
 * algum autor está no site) e o vínculo em `proposicoes_autores`; os demais, só a contagem por
 * político, ano e tipo em `proposicoes_contagem`.
 *
 * Situação muda em proposição antiga: o ano corrente é baixado de novo todo dia, os anteriores
 * uma vez por semana. Da Câmara fica só um extrato por ano; os CSVs são apagados.
 */
import { DuckDBInstance } from "@duckdb/node-api";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { mapLimite } from "../../lib/async";
import { arquivoAnualCamara } from "../../lib/camara";
import { TIPOS_LEGISLATIVOS } from "../../lib/esquema";
import { baixarArquivo } from "../../lib/http";
import { getAutoriaProcesso, listarProcessosDoAutor, type AutoriaSenado, type ProcessoSenado } from "../../lib/senado";
import { semCpf } from "../../lib/texto";
import { FONTES, lerTabela, type LinhaBruta } from "./estado";

const ANO_INICIAL = 2023; // decisão de 2026-11-02: dados desde 2023
const EM_VOO = 2; // o Senado responde 429 com 3 em voo
const DIR_CAMARA = `${FONTES}/camara-arquivos`;
const DIR_SENADO = `${FONTES}/senado-processos`;

const ler = <T>(f: string): T => JSON.parse(readFileSync(f, "utf8")) as T;

/** O que fica de um ano dos arquivos da Câmara (`estado/fontes/camara-arquivos/extrato-{ano}.json`). */
interface ExtratoCamara {
  buscadoEm: string;
  /** Só as que podem virar lei e têm algum deputado proponente. */
  proposicoes: { id: string; tipo: string; numero: number; ano: number; ementa: string | null; apresentacao: string; situacao: string | null }[];
  /** Deputados proponentes dessas proposições. */
  autores: { id: string; dep: string; ordem: number }[];
  /** Demais tipos, por deputado proponente, ano e tipo. */
  contagem: { dep: string; ano: number; tipo: string; n: number }[];
  total: { proposicoes: number; autorias: number };
}
const dias = (a: string, b: string) => Math.round((Date.parse(a) - Date.parse(b)) / 86_400_000);
/** "Transformado em Norma Jurídica" (Câmara), "TRANSFORMADA EM NORMA JURÍDICA COM VETO PARCIAL" (Senado). */
const virouNorma = (situacao: string | null) => /transformad[oa] em norma jur/i.test(situacao ?? "");
const textoOficial = (s: string | null | undefined) => (s && s.trim() ? semCpf(s.trim()) : null);

export async function jobProposicoes(hoje: string): Promise<{ tabelas: Record<string, LinhaBruta[]>; relatorio: string[]; falhas: number; atualizadas: string[] }> {
  const relatorio: string[] = [];
  const atualizadas: string[] = [];
  let falhas = 0;
  const anoHoje = Number(hoje.slice(0, 4));
  const anos = Array.from({ length: anoHoje - ANO_INICIAL + 1 }, (_, i) => ANO_INICIAL + i);
  /** Ano corrente: diário; anteriores: semanal. */
  const velho = (buscadoEm: string | undefined, ano: number) => !buscadoEm || (ano === anoHoje ? buscadoEm < hoje : dias(hoje, buscadoEm) >= 7);

  const politicos = lerTabela("politicos");
  const porCamara = new Map(politicos.filter((p) => p.camara_id).map((p) => [String(p.camara_id), String(p.id)]));
  const porSenado = new Map(politicos.filter((p) => p.senado_codigo).map((p) => [String(p.senado_codigo), String(p.id)]));

  const proposicoes: LinhaBruta[] = [];
  const autores: LinhaBruta[] = [];
  const contagem: LinhaBruta[] = [];

  // ---------------------------------------------------------------- Câmara
  // Um extrato por ano (só o que o site usa), e os CSVs apagados em seguida: cada proposição está em
  // um único arquivo anual, com os autores no arquivo do mesmo ano (conferido 2023–2026), então
  // processar ano a ano dá o mesmo resultado e o cache do Actions não carrega 356 MB de CSV.
  try {
    mkdirSync(DIR_CAMARA, { recursive: true });
    const tipos = TIPOS_LEGISLATIVOS.camara.map((t) => `'${t}'`).join(",");
    let baixadosAgora = 0, np = 0, na = 0;
    const extratos: ExtratoCamara[] = [];
    for (const ano of anos) {
      const arq = `${DIR_CAMARA}/extrato-${ano}.json`;
      const anterior = existsSync(arq) ? ler<ExtratoCamara>(arq) : null;
      if (anterior && !velho(anterior.buscadoEm, ano)) { extratos.push(anterior); np += anterior.total.proposicoes; na += anterior.total.autorias; continue; }
      const csvP = `${DIR_CAMARA}/proposicoes-${ano}.csv`, csvA = `${DIR_CAMARA}/proposicoesAutores-${ano}.csv`;
      await baixarArquivo(arquivoAnualCamara("proposicoes", ano), csvP, { label: "camara:/arquivos/proposicoes" });
      await baixarArquivo(arquivoAnualCamara("proposicoesAutores", ano), csvA, { label: "camara:/arquivos/proposicoesAutores" });
      baixadosAgora += 2;
      const c = await (await DuckDBInstance.create(":memory:")).connect();
      const csv = (f: string) => `read_csv('${f}', delim=';', header=true, quote='"', all_varchar=true)`;
      await c.run(`create table p as select id, siglaTipo tipo, numero, ano, ementa, left(dataApresentacao, 10) apresentacao, ultimoStatus_descricaoSituacao situacao
        from ${csv(csvP)} where dataApresentacao >= '${ANO_INICIAL}-01-01'`);
      await c.run(`create table a as select idProposicao id, idDeputadoAutor dep, min(cast(ordemAssinatura as integer)) ordem
        from ${csv(csvA)} where proponente = '1' and idDeputadoAutor <> '' group by 1, 2`);
      const sel = async <T>(sql: string) => (await (await c.run(sql)).getRowObjectsJson()) as unknown as T[];
      const leg = await sel<{ id: string; tipo: string; numero: string; ano: string; ementa: string | null; apresentacao: string; situacao: string | null }>(
        `select * from p where tipo in (${tipos}) and id in (select id from a) order by id`);
      const autLeg = await sel<{ id: string; dep: string; ordem: number }>(`select a.* from a join p using (id) where p.tipo in (${tipos}) order by id, ordem`);
      const resto = await sel<{ dep: string; ano: string; tipo: string; n: string }>(`select a.dep, year(cast(p.apresentacao as date)) ano, p.tipo, count(*) n
        from p join a using (id) where p.tipo not in (${tipos}) group by 1, 2, 3 order by 1, 2, 3`);
      const tot = (await sel<{ np: string; na: string }>(`select (select count(*) from p) np, (select count(*) from a) na`))[0]!;
      const extrato: ExtratoCamara = {
        buscadoEm: hoje,
        proposicoes: leg.map((r) => ({ id: r.id, tipo: r.tipo, numero: Number(r.numero), ano: Number(r.ano), ementa: textoOficial(r.ementa), apresentacao: r.apresentacao, situacao: textoOficial(r.situacao) })),
        autores: autLeg.map((r) => ({ id: r.id, dep: r.dep, ordem: Number(r.ordem) })),
        contagem: resto.map((r) => ({ dep: r.dep, ano: Number(r.ano), tipo: r.tipo, n: Number(r.n) })),
        total: { proposicoes: Number(tot.np), autorias: Number(tot.na) },
      };
      writeFileSync(arq, JSON.stringify(extrato));
      // Os CSVs não ficam: um deles traz CPF por extenso num texto oficial, e o cache do Actions de um repositório público não é lugar para isso.
      rmSync(csvP); rmSync(csvA);
      extratos.push(extrato); np += extrato.total.proposicoes; na += extrato.total.autorias;
    }
    const porId = new Map(extratos.flatMap((e) => e.proposicoes.map((p) => [p.id, p] as const)));
    const vistas = new Set<string>();
    for (const a of extratos.flatMap((e) => e.autores)) {
      const politicoId = porCamara.get(a.dep);
      if (!politicoId) continue;
      const r = porId.get(a.id)!, id = `camara:${a.id}`;
      if (!vistas.has(id)) {
        vistas.add(id);
        proposicoes.push({ id, id_externo: r.id, casa: "camara", tipo: r.tipo, numero: r.numero, ano: r.ano, ementa: r.ementa,
          apresentacao: r.apresentacao, situacao: r.situacao, virou_norma: virouNorma(r.situacao), url_oficial: `https://www.camara.leg.br/propostas-legislativas/${r.id}` });
      }
      autores.push({ proposicao_id: id, politico_id: politicoId, ordem: a.ordem });
    }
    // Soma entre extratos: o arquivo de um ano traz proposições apresentadas no ano anterior (382 no de 2026).
    const somadas = new Map<string, { dep: string; ano: number; tipo: string; n: number }>();
    for (const r of extratos.flatMap((e) => e.contagem)) {
      const k = `${r.dep}|${r.ano}|${r.tipo}`, e = somadas.get(k);
      if (e) e.n += r.n; else somadas.set(k, { ...r });
    }
    let contCamara = 0;
    for (const r of [...somadas.values()].sort((x, y) => x.dep.localeCompare(y.dep) || x.ano - y.ano || x.tipo.localeCompare(y.tipo))) {
      const politicoId = porCamara.get(r.dep);
      if (politicoId) { contagem.push({ politico_id: politicoId, casa: "camara", ano: r.ano, tipo: r.tipo, autorias: r.n }); contCamara++; }
    }
    atualizadas.push("camara_proposicoes");
    relatorio.push(`Câmara: ${baixadosAgora} arquivos baixados; ${np} proposições desde ${ANO_INICIAL}, ${na} autorias de deputados; ${vistas.size} que podem virar lei com autor no site, ${contCamara} contagens`);
  } catch (e) {
    falhas++;
    relatorio.push(`Câmara FALHOU: ${(e as Error).message}`);
  }

  // ---------------------------------------------------------------- Senado
  try {
    mkdirSync(`${DIR_SENADO}/lista`, { recursive: true });
    mkdirSync(`${DIR_SENADO}/autoria`, { recursive: true });
    const tarefas = [...porSenado.keys()].flatMap((cod) => anos.map((ano) => ({ cod, ano, arq: `${DIR_SENADO}/lista/${cod}-${ano}.json` })));
    const res = await mapLimite(tarefas, EM_VOO, async ({ cod, ano, arq }) => {
      const c = existsSync(arq) ? ler<{ buscadoEm: string; processos: ProcessoSenado[] }>(arq) : null;
      if (c && !velho(c.buscadoEm, ano)) return { cod, processos: c.processos, baixado: false };
      const processos = await listarProcessosDoAutor(cod, `${ano}-01-01`, ano === anoHoje ? hoje : `${ano}-12-31`);
      writeFileSync(arq, JSON.stringify({ buscadoEm: hoje, processos }));
      return { cod, processos, baixado: true };
    });
    if (res.falhas.length) throw new Error(`${res.falhas.length} listagens falharam (ex.: ${String(res.falhas[0]!.erro).slice(0, 120)})`);

    const tiposSenado = new Set<string>(TIPOS_LEGISLATIVOS.senado);
    const legislativos = new Map<string, ProcessoSenado>();
    const porTipo = new Map<string, Set<string>>(); // "cod|ano|tipo" → ids
    for (const { cod, processos } of res.ok) for (const p of processos) {
      if (p.apresentacao < `${ANO_INICIAL}-01-01`) continue;
      if (tiposSenado.has(p.sigla)) legislativos.set(p.id, p);
      else {
        const k = `${cod}|${p.apresentacao.slice(0, 4)}|${p.sigla}`;
        porTipo.set(k, (porTipo.get(k) ?? new Set()).add(p.id));
      }
    }
    for (const [k, ids] of [...porTipo].sort((x, y) => x[0].localeCompare(y[0]))) {
      const [cod, ano, tipo] = k.split("|") as [string, string, string];
      contagem.push({ politico_id: porSenado.get(cod), casa: "senado", ano: Number(ano), tipo, autorias: ids.size });
    }

    const det = await mapLimite([...legislativos.keys()], EM_VOO, async (id) => {
      const arq = `${DIR_SENADO}/autoria/${id}.json`;
      if (existsSync(arq)) return { id, autoria: ler<AutoriaSenado[]>(arq) };
      const autoria = await getAutoriaProcesso(id);
      writeFileSync(arq, JSON.stringify(autoria));
      return { id, autoria };
    });
    if (det.falhas.length) throw new Error(`${det.falhas.length} autorias falharam (ex.: ${String(det.falhas[0]!.erro).slice(0, 120)})`);

    let semMateria = 0, semNaAutoria = 0;
    const listadoPor = new Map<string, Set<string>>();
    for (const { cod, processos } of res.ok) for (const p of processos) if (legislativos.has(p.id)) listadoPor.set(p.id, (listadoPor.get(p.id) ?? new Set()).add(cod));
    for (const { id, autoria } of det.ok.sort((a, b) => a.id.localeCompare(b.id))) {
      const p = legislativos.get(id)!;
      const doSite = autoria.filter((a) => a.senadoCodigo && porSenado.has(a.senadoCodigo));
      // A listagem por autor e a autoria de iniciativa deveriam concordar; quando não, fica a autoria (tem a ordem).
      for (const cod of listadoPor.get(id) ?? []) if (!autoria.some((a) => a.senadoCodigo === cod)) semNaAutoria++;
      if (!doSite.length) continue;
      if (p.codigoMateria === null) semMateria++;
      const pid = `senado:${id}`;
      proposicoes.push({ id: pid, id_externo: id, casa: "senado", tipo: p.sigla, numero: p.numero, ano: p.ano, ementa: textoOficial(p.ementa),
        apresentacao: p.apresentacao, situacao: textoOficial(p.situacao), virou_norma: virouNorma(p.situacao),
        url_oficial: p.codigoMateria !== null ? `https://www25.senado.leg.br/web/atividade/materias/-/materia/${p.codigoMateria}` : `https://legis.senado.leg.br/dadosabertos/processo/${id}` });
      for (const a of doSite) autores.push({ proposicao_id: pid, politico_id: porSenado.get(a.senadoCodigo!), ordem: a.ordem });
    }
    atualizadas.push("senado_proposicoes");
    relatorio.push(`Senado: ${res.ok.filter((r) => r.baixado).length} listagens baixadas, ${res.ok.filter((r) => !r.baixado).length} do cache; ${legislativos.size} que podem virar lei (${det.ok.length} autorias), ${[...porTipo.keys()].length} contagens; ${semNaAutoria} vínculos da listagem ausentes da autoria de iniciativa, ${semMateria} sem código de matéria`);
  } catch (e) {
    falhas++;
    relatorio.push(`Senado FALHOU: ${(e as Error).message}`);
  }

  const norma = proposicoes.filter((p) => p.virou_norma).length;
  relatorio.push(`total: ${proposicoes.length} proposições (${norma} viraram norma), ${autores.length} vínculos de autoria, ${contagem.length} contagens`);
  // Uma Casa que falhou não manda nada: sem ela, as tabelas mescladas continuam com o que já havia.
  return { tabelas: { proposicoes, proposicoes_autores: autores, proposicoes_contagem: contagem }, relatorio, falhas, atualizadas };
}
