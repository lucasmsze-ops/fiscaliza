/**
 * Job `parlamentares` (E21c): políticos, mandatos e afastamentos do Brasil inteiro.
 *
 * Base: as tabelas do TSE 2026 geradas por scripts/tse/nacional.ts (estado/fontes/tse-2026).
 * Câmara: todos os que passaram pela legislatura 57 (perfil + histórico), ligados ao TSE pelo CPF
 * comparado em memória (2026 e 2022); só o par de ids vai para o cache, nunca o CPF.
 * Senado: os 81 em exercício (perfil, mandatos, licenças), ligados ao TSE por nome completo + UF
 * (2026, 2022, 2018); ligação ambígua ou ausente é relatada para revisão, nunca adivinhada.
 *
 * Entram: todos os políticos do TSE 2026 (top-20 e eleitos) e os parlamentares em exercício, mesmo
 * os que não disputaram 2026 (status "em_exercicio"). Quem passou pela Câmara na legislatura atual
 * e disputou 2026 ganha o camaraId (os números do mandato dependem dele).
 */
import { DuckDBInstance } from "@duckdb/node-api";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { mapLimite } from "../../lib/async";
import { getDeputado, getHistorico, listarDeputados, type DeputadoPerfil, type HistoricoDeputado } from "../../lib/camara";
import { deLinha, paraLinha } from "../../lib/linhas";
import { deHistoricoCamara, deSenado } from "../../lib/linhas-mandato";
import { getLicencas, getMandatos, getSenador, listarSenadoresAtuais, type LicencaSenado, type MandatoSenado, type SenadorPerfil } from "../../lib/senado";
import { siglaPartido } from "../../lib/partidos";
import { slugPolitico } from "../../lib/texto";
import type { Afastamento, Linha, Mandato, Politico, Status } from "../../lib/types";
import { canonico, FONTES, lerTabela, type LinhaBruta } from "./estado";

const RAW = process.env.FISCALIZA_TSE ?? "data/raw";
const TSE = `${FONTES}/tse-2026`;
const UFS = ["AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"];
const INICIO_LICENCAS = "2023-02-01"; // posse da 57ª legislatura
const EM_VOO = 2; // a Câmara devolve 504 em rajadas

const normaliza = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, " ").trim();
const soDigitos = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "").padStart(11, "0");
const ler = <T>(f: string): T => JSON.parse(readFileSync(f, "utf8")) as T;

export interface CandTse { ano: number; sq: string; uf: string; cargo: string; nome: string; nomeUrna: string; genero: string | null; cpf: string; foiUrna: boolean }
interface CacheDeputado { buscadoEm: string; perfil: Omit<DeputadoPerfil, "cpf">; historico: HistoricoDeputado[]; tse: { sq2026: string | null; sq2022: string | null } }
interface CacheSenador { buscadoEm: string; perfil: SenadorPerfil; mandatos: MandatoSenado[]; licencas: LicencaSenado[] }

/** Candidaturas de 2026, 2022 e 2018 com o CPF, só em memória (nunca gravadas). */
async function candidaturasTse(): Promise<CandTse[]> {
  const c = await (await DuckDBInstance.create(":memory:")).connect();
  const out: CandTse[] = [];
  for (const [ano, cargos] of [[2026, ["DEPUTADO FEDERAL", "SENADOR"]], [2022, ["DEPUTADO FEDERAL", "SENADOR", "1º SUPLENTE", "2º SUPLENTE"]], [2018, ["SENADOR", "1º SUPLENTE", "2º SUPLENTE"]]] as const) {
    const pasta = ano === 2026 ? "consulta_cand" : `consulta_cand_${ano}`;
    const arqs = `[${UFS.map((uf) => `'${RAW}/${pasta}/consulta_cand_${ano}_${uf}.csv'`).join(",")}]`;
    const rows = (await (await c.run(`SELECT SQ_CANDIDATO sq, SG_UF uf, DS_CARGO cargo, NM_CANDIDATO nome, NM_URNA_CANDIDATO "nomeUrna", DS_GENERO genero, NR_CPF_CANDIDATO cpf, coalesce(DS_SIT_TOT_TURNO, '#NULO') <> '#NULO' "foiUrna"
      FROM read_csv(${arqs}, delim=';', header=true, quote='"', encoding='latin-1', all_varchar=true) WHERE DS_CARGO IN (${cargos.map((x) => `'${x}'`).join(",")})`)).getRowObjectsJson()) as unknown as Omit<CandTse, "ano">[];
    for (const r of rows) out.push({ ...r, ano, genero: r.genero === "FEMININO" ? "feminino" : r.genero === "MASCULINO" ? "masculino" : null });
  }
  return out;
}

/**
 * Candidatura por CPF. O mesmo CPF pode ter mais de uma no ano (registro cancelado e refeito, troca
 * de cargo): vale a que foi à urna e, no empate, o registro mais recente. Nunca a ordem das linhas,
 * que muda quando o TSE regenera os arquivos.
 */
export function porCpf(cands: CandTse[]): Map<string, CandTse> {
  const m = new Map<string, CandTse>();
  for (const c of cands) {
    const k = soDigitos(c.cpf), a = m.get(k);
    if (!a || (c.foiUrna !== a.foiUrna ? c.foiUrna : Number(c.sq) > Number(a.sq))) m.set(k, c);
  }
  return m;
}

export interface ResultadoParlamentares {
  tabelas: Record<string, LinhaBruta[]>;
  relatorio: string[];
  falhas: number;
}

export async function jobParlamentares(hoje: string): Promise<ResultadoParlamentares> {
  if (!existsSync(`${TSE}/politicos.json`)) throw new Error(`faltam as tabelas do TSE 2026 em ${TSE}: rodar scripts/tse/nacional.ts`);
  const relatorio: string[] = [];
  let falhas = 0;
  const tsePoliticos = ler<Linha<Politico>[]>(`${TSE}/politicos.json`).map((l) => deLinha<Politico>(l));
  const candidatos = new Map(ler<LinhaBruta[]>(`${TSE}/candidatos.json`).map((c) => [String(c.tse_sq_candidato), c]));
  const cands = await candidaturasTse();
  const porCpf2026 = porCpf(cands.filter((c) => c.ano === 2026));
  const porCpf2022 = porCpf(cands.filter((c) => c.ano === 2022 && c.cargo === "DEPUTADO FEDERAL"));
  const porSq = new Map(cands.map((c) => [c.sq, c]));

  // ---------------------------------------------------------------- Câmara
  const dirDep = `${FONTES}/camara-deputados`;
  mkdirSync(dirDep, { recursive: true });
  const emExercicio = new Set((await listarDeputados()).map((d) => d.camaraId));
  // A lista da legislatura (`idLegislatura=57`) leva 12–15 s por página quando a API está lenta e o
  // gateway corta em 15 s (504 o dia todo em 2026-11-04, em qualquer tamanho de página); a de quem
  // está em exercício responde em 0,2 s. Sem a da legislatura, vale quem o cron já conhece mais quem
  // está em exercício: quem assume uma cadeira aparece na segunda.
  let leg57: { camaraId: number }[];
  try {
    leg57 = [...new Map((await listarDeputados({ legislatura: 57 })).map((d) => [d.camaraId, d])).values()];
  } catch (e) {
    const conhecidos = readdirSync(dirDep).filter((f) => /^\d+\.json$/.test(f)).map((f) => Number(f.slice(0, -5)));
    leg57 = [...new Set([...conhecidos, ...emExercicio])].map((camaraId) => ({ camaraId }));
    relatorio.push(`lista da legislatura 57 indisponível (${(e as Error).message.slice(0, 80)}): usados ${conhecidos.length} deputados já conhecidos + os ${emExercicio.size} em exercício (${leg57.length})`);
  }
  const velho = (c: CacheDeputado | null, id: number) => !c || (emExercicio.has(id) ? c.buscadoEm < hoje : Date.parse(hoje) - Date.parse(c.buscadoEm) > 7 * 86_400_000);
  const deps = await mapLimite(leg57, EM_VOO, async (d) => {
    const arq = `${dirDep}/${d.camaraId}.json`;
    const anterior = existsSync(arq) ? ler<CacheDeputado>(arq) : null;
    if (!velho(anterior, d.camaraId)) return anterior!;
    try {
      const [p, historico] = await Promise.all([getDeputado(d.camaraId), getHistorico(d.camaraId)]);
      const cpf = soDigitos(p.cpf);
      const { cpf: _cpf, ...perfil } = p; // o CPF fica só nesta função
      const novo: CacheDeputado = { buscadoEm: hoje, perfil, historico, tse: { sq2026: p.cpf ? porCpf2026.get(cpf)?.sq ?? null : null, sq2022: p.cpf ? porCpf2022.get(cpf)?.sq ?? null : null } };
      writeFileSync(arq, JSON.stringify(novo));
      return novo;
    } catch (e) {
      if (anterior) { falhas++; return anterior; } // falha de rede: segue com o que já sabia
      throw e;
    }
  });
  falhas += deps.falhas.length;
  relatorio.push(`Câmara: ${leg57.length} deputados na legislatura 57, ${emExercicio.size} em exercício; ${deps.ok.length} com perfil, ${deps.falhas.length} sem perfil (falha)`);

  // ---------------------------------------------------------------- Senado
  const dirSen = `${FONTES}/senado-senadores`;
  mkdirSync(dirSen, { recursive: true });
  const atuais = await listarSenadoresAtuais();
  const sens = await mapLimite(atuais, 3, async (s) => {
    const arq = `${dirSen}/${s.senadoCodigo}.json`;
    const anterior = existsSync(arq) ? ler<CacheSenador>(arq) : null;
    if (anterior && anterior.buscadoEm >= hoje) return { s, c: anterior };
    try {
      const [perfil, mandatos, licencas] = await Promise.all([getSenador(s.senadoCodigo), getMandatos(s.senadoCodigo), getLicencas(s.senadoCodigo, INICIO_LICENCAS)]);
      const c: CacheSenador = { buscadoEm: hoje, perfil, mandatos, licencas };
      writeFileSync(arq, JSON.stringify(c));
      return { s, c };
    } catch (e) {
      if (anterior) { falhas++; return { s, c: anterior }; }
      throw e;
    }
  });
  falhas += sens.falhas.length;
  // Ligação com o TSE por nome completo + UF: 2026 primeiro (disputou agora), depois 2022 e 2018.
  const ligSen = new Map<string, CandTse>();
  const semLigacao: string[] = [];
  for (const { c } of sens.ok) {
    let achado: CandTse | null = null;
    for (const ano of [2026, 2022, 2018]) {
      const m = cands.filter((x) => x.ano === ano && x.uf === c.perfil.uf && normaliza(x.nome) === normaliza(c.perfil.nomeCompleto));
      if (m.length === 1) { achado = m[0]!; break; }
      if (m.length > 1) { semLigacao.push(`${c.perfil.nome} (${c.perfil.uf}): ${m.length} candidaturas em ${ano}`); break; }
    }
    if (achado) ligSen.set(c.perfil.senadoCodigo, achado);
    else if (!semLigacao.some((x) => x.startsWith(c.perfil.nome))) semLigacao.push(`${c.perfil.nome} (${c.perfil.uf}): sem candidatura com o nome completo "${c.perfil.nomeCompleto}"`);
  }
  relatorio.push(`Senado: ${atuais.length} em exercício, ${sens.ok.length} com perfil; ligados ao TSE ${ligSen.size} (2026: ${[...ligSen.values()].filter((x) => x.ano === 2026).length}); sem ligação: ${semLigacao.length}`);
  for (const x of semLigacao) relatorio.push(`  revisar: ${x}`);

  // ---------------------------------------------------------------- políticos
  const porTseSq = new Map(tsePoliticos.map((p) => [p.tseSqCandidato!, p]));
  /** Político a partir de uma candidatura de 2026 fora do top-20 (só quem está em exercício). */
  const deCandidato = (sq: string): Politico | null => {
    const c = candidatos.get(sq);
    if (!c) return null;
    const nomeUrna = String(c.nome_urna), uf = String(c.uf), slug = slugPolitico(nomeUrna, uf);
    return {
      id: slug, slug, cargo: c.cargo as Politico["cargo"], nome: String(c.nome), nomeUrna, genero: c.genero as Politico["genero"], uf,
      partido: String(c.partido), listaId: (c.lista_id as string | null), federacao: (c.federacao as string | null), numeroUrna: (c.numero_urna as string | null),
      fotoUrl: String(c.foto_url), email: null, telefone: null, redesSociais: [], urlPerfil: null, tseSqCandidato: sq, camaraId: null, senadoCodigo: null,
      status: (c.status as Status | null) ?? "em_exercicio", votos2026: (c.votos_2026 as number | null), updatedAt: "",
    };
  };
  const politicos = new Map(tsePoliticos.map((p) => [p.id, { ...p }]));
  const porSqAtual = (sq: string) => { const p = porTseSq.get(sq); return p ? politicos.get(p.id)! : null; };
  const novos: Politico[] = [];
  const mandatos: Mandato[] = [], afastamentos: Afastamento[] = [];
  const juntar = (r: { mandatos: Mandato[]; afastamentos: Afastamento[] }) => { mandatos.push(...r.mandatos); afastamentos.push(...r.afastamentos); };

  for (const d of deps.ok) {
    const id = d.perfil.camaraId, ativo = emExercicio.has(id);
    let p = d.tse.sq2026 ? porSqAtual(d.tse.sq2026) : null;
    if (!p && d.tse.sq2026 && ativo) { p = deCandidato(d.tse.sq2026); if (p) novos.push(p); }
    if (!p && ativo) {
      // Em exercício e sem candidatura de 2026 a deputado federal ou senador.
      const c22 = d.tse.sq2022 ? porSq.get(d.tse.sq2022) : undefined;
      const nomeUrna = c22?.nomeUrna ?? d.perfil.nomeEleitoral ?? d.perfil.nome, slug = slugPolitico(nomeUrna, d.perfil.uf);
      p = { id: slug, slug, cargo: "deputado_federal", nome: d.perfil.nomeCivil, nomeUrna, genero: c22?.genero as Politico["genero"] ?? null, uf: d.perfil.uf,
        partido: d.perfil.partido, listaId: null, federacao: null, numeroUrna: null, fotoUrl: null, email: null, telefone: null, redesSociais: [], urlPerfil: null,
        tseSqCandidato: d.tse.sq2022, camaraId: null, senadoCodigo: null, status: "em_exercicio", votos2026: null, updatedAt: "" };
      novos.push(p);
    }
    if (!p) continue; // passou pela legislatura, saiu e não disputou 2026: fora do escopo
    p.camaraId = id;
    if (ativo) {
      p.partido = d.perfil.partido; p.fotoUrl = d.perfil.fotoUrl; p.email = d.perfil.emailGabinete; p.telefone = d.perfil.telefoneGabinete;
      p.redesSociais = d.perfil.redesSociais; p.urlPerfil = `https://www.camara.leg.br/deputados/${id}`;
      if (p.status === "eleito" && p.cargo === "deputado_federal") p.status = "reeleito";
    }
    juntar(deHistoricoCamara(p.id, d.historico, hoje));
  }

  for (const { c } of sens.ok) {
    const t = ligSen.get(c.perfil.senadoCodigo);
    let p = t?.ano === 2026 ? porSqAtual(t.sq) : null;
    if (!p && t?.ano === 2026) { p = deCandidato(t.sq); if (p) novos.push(p); }
    if (!p) {
      const nomeUrna = t?.nomeUrna ?? c.perfil.nome, slug = slugPolitico(nomeUrna, c.perfil.uf);
      p = { id: slug, slug, cargo: "senador", nome: c.perfil.nomeCompleto, nomeUrna, uf: c.perfil.uf, partido: c.perfil.partido,
        genero: c.perfil.sexo === "Feminino" ? "feminino" : c.perfil.sexo === "Masculino" ? "masculino" : null,
        listaId: null, federacao: null, numeroUrna: null, fotoUrl: c.perfil.fotoUrl, email: c.perfil.email, urlPerfil: c.perfil.urlPagina,
        telefone: c.perfil.telefones[0] ?? null, redesSociais: [], tseSqCandidato: t?.sq ?? null, camaraId: null, senadoCodigo: c.perfil.senadoCodigo,
        status: "em_exercicio", votos2026: null, updatedAt: "" };
      novos.push(p);
    } else {
      p.senadoCodigo = c.perfil.senadoCodigo; p.partido = c.perfil.partido; p.fotoUrl = c.perfil.fotoUrl; p.email = c.perfil.email;
      p.telefone = c.perfil.telefones[0] ?? null; p.urlPerfil = c.perfil.urlPagina;
      if (p.status === "eleito" && p.cargo === "senador") p.status = "reeleito";
    }
    juntar(deSenado(p.id, c.mandatos, c.licencas, hoje));
  }

  // Ids únicos: homônimo na mesma UF é erro a decidir à mão, nunca sufixo por ordem.
  const repetidos: string[] = [];
  for (const n of novos) {
    const ja = politicos.get(n.id);
    if (ja && ja !== n) repetidos.push(`${n.id}: ${ja.nome} e ${n.nome}`);
    else politicos.set(n.id, n);
  }
  if (repetidos.length) throw new Error(`slugs repetidos (decidir à mão):\n  ${repetidos.join("\n  ")}`);

  // Ligações já conhecidas não se perdem (ex.: ex-deputado de outra legislatura, ligado na sonda) e
  // updated_at só muda quando algum outro campo mudou (senão o diff regravaria todos todo dia).
  const noEstado = new Map(lerTabela("politicos").map((l) => [String(l.id), l]));
  const agora = new Date().toISOString();
  const linhasPol = [...politicos.values()].map((p) => {
    const a = noEstado.get(p.id);
    if (a) { p.camaraId ??= (a.camara_id as number | null); p.senadoCodigo ??= (a.senado_codigo as string | null); }
    const l = paraLinha({ ...p, partido: siglaPartido(p.partido), updatedAt: "" }) as unknown as LinhaBruta;
    const igual = a && canonico({ ...a, updated_at: "" }) === canonico(l);
    return { ...l, updated_at: igual ? a!.updated_at : agora };
  });

  const tse = (nome: string) => ler<LinhaBruta[]>(`${TSE}/${nome}.json`);
  relatorio.push(`políticos: ${linhasPol.length} (${novos.length} além do TSE 2026: em exercício sem candidatura no top-20); mandatos ${mandatos.length}, afastamentos ${afastamentos.length}`);
  return {
    tabelas: {
      listas: tse("listas"), politicos: linhasPol, mandatos: mandatos.map((m) => paraLinha(m) as unknown as LinhaBruta),
      afastamentos: afastamentos.map((a) => paraLinha(a) as unknown as LinhaBruta), municipios: tse("municipios"), eleitos_mun: tse("eleitos_mun"),
    },
    relatorio, falhas,
  };
}
