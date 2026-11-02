/**
 * Adapter do Senado Federal — https://legis.senado.leg.br/dadosabertos
 *
 * Confirmado no OpenAPI da API (v4.1.3, `/dadosabertos/v3/api-docs`, 2026-10-29):
 * - Votos nominais do plenário: `GET /votacao?dataInicio&dataFim` (janela ≤ 1 ano). Os paths antigos
 *   (`/plenario/lista/votacao/...`, `/senador/{codigo}/votacoes`, `/plenario/votacao/nominal/{ano}`)
 *   estão DEPRECATED e mandam usar este.
 * - Cada votação lista TODOS os senadores (81), com a sigla do voto ou do tipo de ausência.
 *   Votação secreta: sigla "Votou" (sem direção). Não há "quem não aparece = ausente" como na Câmara.
 * - Orientação de bancada: `GET /plenario/votacao/orientacaoBancada/{AAAAMMDD}/{AAAAMMDD}`
 *   (aceita o período inteiro). Junta com a votação por `sequencialVotacao`.
 * - Nenhum endpoint expõe CPF. Join com o TSE é por nome completo + UF (ver scripts/sonda/senadores.ts).
 * - A conversão XML→JSON devolve objeto em vez de array quando há um só item, e omite a chave quando
 *   não há nenhum. `arr()` normaliza.
 * Nada do shape cru sai deste arquivo.
 */
import { fetchJson } from "./http";
import type { TipoVoto } from "./types";

export const SENADO_API = "https://legis.senado.leg.br/dadosabertos";

const get = <T>(path: string, label: string) => fetchJson<T>(`${SENADO_API}${path}`, { label: `senado:${label}` });

const arr = <T>(x: T | T[] | undefined | null): T[] => (x == null ? [] : Array.isArray(x) ? x : [x]);

/** A API devolve `http://`; o site redireciona para https (legis.senado.leg.br/senadores/fotos-oficiais/{codigo}). */
const https = (u: string | null | undefined) => (u ? u.replace(/^http:\/\//, "https://") : null);

const vazio = (s: string | null | undefined) => (s && s.trim() ? s.trim() : null);

// ---------------------------------------------------------------- senadores

export interface SenadorResumo {
  senadoCodigo: string;
  /** Nome parlamentar (o que aparece no painel). */
  nome: string;
  nomeCompleto: string;
  partido: string;
  uf: string;
  /** "Titular", "1º Suplente", "2º Suplente". */
  participacao: string;
  titular: boolean;
  email: string | null;
  fotoUrl: string | null;
  bloco: string | null;
}

export interface SenadorPerfil {
  senadoCodigo: string;
  nome: string;
  nomeCompleto: string;
  sexo: string | null;
  partido: string;
  uf: string;
  email: string | null;
  fotoUrl: string | null;
  urlPagina: string | null;
  dataNascimento: string | null;
  naturalidade: string | null;
  telefones: string[];
}

export interface MandatoSenado {
  codigoMandato: string;
  uf: string;
  participacao: string;
  titular: boolean;
  /** Para suplente: de quem é suplente. */
  titularDe: { senadoCodigo: string; nome: string } | null;
  suplentes: { participacao: string; senadoCodigo: string; nome: string }[];
  /** As duas legislaturas do mandato de 8 anos. */
  legislaturas: { numero: number; inicio: string; fim: string }[];
  /** Períodos em que efetivamente exerceu (suplente só tem exercício quando convocado). */
  exercicios: { inicio: string; fim: string | null }[];
  partidos: { sigla: string; filiacao: string; desfiliacao: string | null }[];
}

export interface LicencaSenado {
  inicio: string;
  fim: string | null;
  tipo: string;
  descricao: string;
}

interface IdentificacaoRaw {
  CodigoParlamentar: string; NomeParlamentar: string; NomeCompletoParlamentar: string; SexoParlamentar?: string;
  UrlFotoParlamentar?: string; UrlPaginaParlamentar?: string; EmailParlamentar?: string;
  SiglaPartidoParlamentar?: string; UfParlamentar?: string; Bloco?: { NomeBloco?: string };
}
interface LegislaturaRaw { NumeroLegislatura: string; DataInicio: string; DataFim: string }
interface MandatoRaw {
  CodigoMandato: string; UfParlamentar: string; DescricaoParticipacao: string;
  PrimeiraLegislaturaDoMandato?: LegislaturaRaw; SegundaLegislaturaDoMandato?: LegislaturaRaw;
  Titular?: { CodigoParlamentar: string; NomeParlamentar: string };
  Suplentes?: { Suplente: { DescricaoParticipacao: string; CodigoParlamentar: string; NomeParlamentar: string }[] | object };
  Exercicios?: { Exercicio: { DataInicio: string; DataFim?: string }[] | object };
  Partidos?: { Partido: { Sigla: string; DataFiliacao: string; DataDesfiliacao?: string }[] | object };
}
interface ListaAtualRaw {
  ListaParlamentarEmExercicio: { Parlamentares?: { Parlamentar: { IdentificacaoParlamentar: IdentificacaoRaw; Mandato: MandatoRaw }[] | object } };
}

export async function listarSenadoresAtuais(filtro: { uf?: string; participacao?: "T" | "S" } = {}): Promise<SenadorResumo[]> {
  const q = new URLSearchParams();
  if (filtro.uf) q.set("uf", filtro.uf);
  if (filtro.participacao) q.set("participacao", filtro.participacao);
  const qs = q.size ? `?${q}` : "";
  const raw = await get<ListaAtualRaw>(`/senador/lista/atual${qs}`, "/senador/lista/atual");
  return arr(raw.ListaParlamentarEmExercicio.Parlamentares?.Parlamentar as { IdentificacaoParlamentar: IdentificacaoRaw; Mandato: MandatoRaw }[] | undefined).map((p) => {
    const i = p.IdentificacaoParlamentar;
    return {
      senadoCodigo: i.CodigoParlamentar, nome: i.NomeParlamentar, nomeCompleto: i.NomeCompletoParlamentar,
      partido: i.SiglaPartidoParlamentar ?? "", uf: i.UfParlamentar ?? p.Mandato.UfParlamentar,
      participacao: p.Mandato.DescricaoParticipacao, titular: p.Mandato.DescricaoParticipacao === "Titular",
      email: vazio(i.EmailParlamentar), fotoUrl: https(i.UrlFotoParlamentar), bloco: vazio(i.Bloco?.NomeBloco),
    };
  });
}

interface DetalheRaw {
  DetalheParlamentar: { Parlamentar: {
    IdentificacaoParlamentar: IdentificacaoRaw;
    DadosBasicosParlamentar?: { DataNascimento?: string; Naturalidade?: string; UfNaturalidade?: string };
    Telefones?: { Telefone: { NumeroTelefone: string }[] | object };
  } };
}

export async function getSenador(codigo: string): Promise<SenadorPerfil> {
  const raw = await get<DetalheRaw>(`/senador/${codigo}`, "/senador/{codigo}");
  const p = raw.DetalheParlamentar.Parlamentar;
  const i = p.IdentificacaoParlamentar;
  const b = p.DadosBasicosParlamentar;
  return {
    senadoCodigo: i.CodigoParlamentar, nome: i.NomeParlamentar, nomeCompleto: i.NomeCompletoParlamentar,
    sexo: vazio(i.SexoParlamentar), partido: i.SiglaPartidoParlamentar ?? "", uf: i.UfParlamentar ?? "",
    email: vazio(i.EmailParlamentar), fotoUrl: https(i.UrlFotoParlamentar), urlPagina: https(i.UrlPaginaParlamentar),
    dataNascimento: vazio(b?.DataNascimento),
    naturalidade: b?.Naturalidade ? `${b.Naturalidade}${b.UfNaturalidade ? `/${b.UfNaturalidade}` : ""}` : null,
    telefones: arr(p.Telefones?.Telefone as { NumeroTelefone: string }[] | undefined).map((t) => t.NumeroTelefone),
  };
}

interface MandatosRaw { MandatoParlamentar: { Parlamentar: { Mandatos?: { Mandato: MandatoRaw[] | object } } } }

function mandato(m: MandatoRaw): MandatoSenado {
  return {
    codigoMandato: m.CodigoMandato, uf: m.UfParlamentar, participacao: m.DescricaoParticipacao,
    titular: m.DescricaoParticipacao === "Titular",
    titularDe: m.Titular ? { senadoCodigo: m.Titular.CodigoParlamentar, nome: m.Titular.NomeParlamentar } : null,
    suplentes: arr(m.Suplentes?.Suplente as { DescricaoParticipacao: string; CodigoParlamentar: string; NomeParlamentar: string }[] | undefined)
      .map((s) => ({ participacao: s.DescricaoParticipacao, senadoCodigo: s.CodigoParlamentar, nome: s.NomeParlamentar })),
    legislaturas: [m.PrimeiraLegislaturaDoMandato, m.SegundaLegislaturaDoMandato].filter((l): l is LegislaturaRaw => !!l)
      .map((l) => ({ numero: Number(l.NumeroLegislatura), inicio: l.DataInicio, fim: l.DataFim })),
    exercicios: arr(m.Exercicios?.Exercicio as { DataInicio: string; DataFim?: string }[] | undefined)
      .map((e) => ({ inicio: e.DataInicio, fim: e.DataFim ?? null })),
    partidos: arr(m.Partidos?.Partido as { Sigla: string; DataFiliacao: string; DataDesfiliacao?: string }[] | undefined)
      .map((p) => ({ sigla: p.Sigla, filiacao: p.DataFiliacao, desfiliacao: p.DataDesfiliacao ?? null })),
  };
}

export async function getMandatos(codigo: string): Promise<MandatoSenado[]> {
  const raw = await get<MandatosRaw>(`/senador/${codigo}/mandatos`, "/senador/{codigo}/mandatos");
  return arr(raw.MandatoParlamentar.Parlamentar.Mandatos?.Mandato as MandatoRaw[] | undefined).map(mandato);
}

interface LicencasRaw {
  LicencaParlamentar: { Parlamentar: { Licencas?: { Licenca: { DataInicio: string; DataFim?: string; SiglaTipoAfastamento: string; DescricaoTipoAfastamento: string }[] | object } } };
}

const aaaammdd = (iso: string) => iso.replace(/-/g, "");

/** Licenças oficiais a partir de `inicio` (ISO). Sem `fim`, a API considera hoje. */
export async function getLicencas(codigo: string, inicio: string, fim?: string): Promise<LicencaSenado[]> {
  const q = new URLSearchParams({ dataInicio: aaaammdd(inicio) });
  if (fim) q.set("dataFim", aaaammdd(fim));
  const raw = await get<LicencasRaw>(`/senador/${codigo}/licencas?${q}`, "/senador/{codigo}/licencas");
  return arr(raw.LicencaParlamentar.Parlamentar.Licencas?.Licenca as { DataInicio: string; DataFim?: string; SiglaTipoAfastamento: string; DescricaoTipoAfastamento: string }[] | undefined)
    .map((l) => ({ inicio: l.DataInicio, fim: l.DataFim ?? null, tipo: l.SiglaTipoAfastamento, descricao: l.DescricaoTipoAfastamento }))
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
}

// ---------------------------------------------------------------- votações

export interface VotoSenado {
  votacaoId: string;
  senadoCodigo: string;
  nome: string;
  partido: string;
  uf: string;
  /** Sigla crua do painel: "Sim", "Não", "Votou" (secreta), "P-NRV", "LS", "MIS"... */
  sigla: string;
  voto: TipoVoto;
}

export interface VotacaoSenado {
  /** `codigoSessaoVotacao` da API: único por votação. */
  idExterno: string;
  casa: "senado";
  /** Chave de junção com a orientação de bancada; nula em ~2% das votações. */
  sequencialVotacao: number | null;
  data: string;
  secreta: boolean;
  casaSessao: string;
  tipoSessao: string;
  /** Colegiado do informe legislativo (quase sempre "PLEN"). */
  colegiado: string | null;
  proposicao: { sigla: string; numero: string; ano: number; identificacao: string; idProcesso: number | null; codigoMateria: number | null } | null;
  descricao: string;
  ementa: string | null;
  resultado: "aprovada" | "rejeitada" | null;
  urlOficial: string;
  votos: VotoSenado[];
}

/**
 * Siglas de voto do painel → tipo interno. Qualquer outra sigla é um tipo de comparecimento
 * (lista em /plenario/lista/tiposComparecimento: P-NRV, AP, MIS, LS, LP, LAP, NCom...) → `ausente`.
 * "Votou" só aparece em votação secreta; "Presidente (art. 51 RISF)" é o presidente da sessão.
 */
const SIGLA_VOTO: Record<string, TipoVoto> = {
  Sim: "sim", "Não": "nao", "Abstenção": "abstencao", "Obstrução": "obstrucao",
  Votou: "secreto", "Presidente (art. 51 RISF)": "art17", NA: "nao_informado",
};
const COMPARECIMENTO_CONHECIDO = new Set(["P-NRV", "AP", "MIS", "LS", "LP", "LAP", "LPA", "LSP", "NCom", "AUS", "AFO", "L1", "L2", "L3", "L4", "L5", "L6", "L7", "LG", "LA", "LAF", "LN", "LGA", "LCS", "LEG", "MER", "GR", "EP", "EPR", "DJ", "LL", "IL", "CAS", "FAL", "IMP"]);
const siglasAvisadas = new Set<string>();

export function tipoVotoSenado(sigla: string): TipoVoto {
  const t = SIGLA_VOTO[sigla];
  if (t) return t;
  if (!COMPARECIMENTO_CONHECIDO.has(sigla) && !siglasAvisadas.has(sigla)) {
    siglasAvisadas.add(sigla);
    console.error(`[senado] sigla de voto desconhecida tratada como ausente: "${sigla}"`);
  }
  return "ausente";
}

interface VotacaoRaw {
  codigoSessaoVotacao: number; sequencialVotacao: number | null; dataSessao: string; votacaoSecreta: "S" | "N";
  casaSessao: string; siglaTipoSessao: string; idProcesso: number | null; codigoMateria: number | null;
  identificacao: string | null; sigla: string | null; numero: string | null; ano: number | null; ementa: string | null;
  descricaoVotacao: string; resultadoVotacao: string | null;
  informeLegislativo?: { siglaColegiado?: string } | null;
  votos?: { codigoParlamentar: number; nomeParlamentar: string; siglaPartidoParlamentar: string; siglaUFParlamentar: string; siglaVotoParlamentar: string }[];
}

const RESULTADO: Record<string, "aprovada" | "rejeitada"> = { A: "aprovada", R: "rejeitada" };

function votacao(r: VotacaoRaw): VotacaoSenado {
  const id = String(r.codigoSessaoVotacao);
  return {
    idExterno: id, casa: "senado", sequencialVotacao: r.sequencialVotacao ?? null, data: r.dataSessao,
    secreta: r.votacaoSecreta === "S", casaSessao: r.casaSessao, tipoSessao: r.siglaTipoSessao,
    colegiado: r.informeLegislativo?.siglaColegiado ?? null,
    proposicao: r.sigla && r.numero ? { sigla: r.sigla, numero: r.numero, ano: r.ano ?? 0, identificacao: r.identificacao ?? `${r.sigla} ${r.numero}/${r.ano}`, idProcesso: r.idProcesso ?? null, codigoMateria: r.codigoMateria ?? null } : null,
    descricao: r.descricaoVotacao, ementa: vazio(r.ementa),
    resultado: r.resultadoVotacao ? RESULTADO[r.resultadoVotacao] ?? null : null,
    urlOficial: r.codigoMateria ? `https://www25.senado.leg.br/web/atividade/materias/-/materia/${r.codigoMateria}` : `${SENADO_API}/votacao?codigoSessao=${r.codigoSessaoVotacao}`,
    votos: (r.votos ?? []).map((v) => ({
      votacaoId: id, senadoCodigo: String(v.codigoParlamentar), nome: v.nomeParlamentar, partido: v.siglaPartidoParlamentar,
      uf: v.siglaUFParlamentar, sigla: v.siglaVotoParlamentar, voto: tipoVotoSenado(v.siglaVotoParlamentar),
    })),
  };
}

/** Janelas por ano-calendário, recortadas em [inicio, fim] (a API aceita no máximo 1 ano). */
export function janelasAnuais(inicio: string, fim: string): [string, string][] {
  const out: [string, string][] = [];
  for (let ano = Number(inicio.slice(0, 4)); ano <= Number(fim.slice(0, 4)); ano++) {
    const a = `${ano}-01-01` < inicio ? inicio : `${ano}-01-01`;
    const b = `${ano}-12-31` > fim ? fim : `${ano}-12-31`;
    if (a <= b) out.push([a, b]);
  }
  return out;
}

/** Votações nominais do plenário (abertas e secretas) entre `inicio` e `fim` (ISO), com os 81 votos de cada. */
export async function listarVotacoesPlenario(inicio: string, fim: string): Promise<VotacaoSenado[]> {
  const out: VotacaoSenado[] = [];
  for (const [a, b] of janelasAnuais(inicio, fim)) {
    const raw = await get<VotacaoRaw[]>(`/votacao?dataInicio=${a}&dataFim=${b}`, "/votacao");
    out.push(...raw.map(votacao));
  }
  return out.sort((x, y) => x.data.localeCompare(y.data) || x.idExterno.localeCompare(y.idExterno));
}

// ---------------------------------------------------------------- orientações

export interface OrientacaoSenado {
  sequencialVotacao: number;
  /** "Governo", "Oposição", "Maioria", "Minoria", "Banc Fem" ou sigla de partido como a API escreve. */
  bancada: string;
  /** Normalizada para o vocabulário da Câmara: "Sim", "Não", "Obstrução", "Liberado" ou "". */
  orientacao: string;
}

export interface VotacaoOrientacaoSenado {
  sequencialVotacao: number;
  codigoVotacaoSve: number;
  inicio: string;
  materia: string | null;
  descricao: string;
  tipoSessao: string;
  placar: { sim: number; nao: number; abstencao: number; obstrucao: number };
  orientacoes: OrientacaoSenado[];
}

const ORIENTACAO: Record<string, string> = { SIM: "Sim", "NÃO": "Não", "OBSTRUÇÃO": "Obstrução", LIVRE: "Liberado" };

interface OrientacaoRaw {
  votacoes?: {
    codigoVotacaoSve: number; sequencialVotacao: number; dataInicioVotacao: string; descricaoVotacao: string;
    siglaTipoMateria: string | null; numeroMateria: number | null; anoMateria: number | null; descricaoMateria: string | null;
    tipoSessao: string; qtdVotosSim: number; qtdVotosNao: number; qtdVotosAbstencao: number; qtdObstrucoes: number;
    orientacoesLideranca?: { partido: string; voto: string | null }[];
  }[];
}

/** Orientações de bancada das votações do plenário entre `inicio` e `fim` (ISO). Uma chamada; sem limite de janela observado. */
export async function listarOrientacoesPlenario(inicio: string, fim: string): Promise<VotacaoOrientacaoSenado[]> {
  const raw = await get<OrientacaoRaw>(`/plenario/votacao/orientacaoBancada/${aaaammdd(inicio)}/${aaaammdd(fim)}`, "/plenario/votacao/orientacaoBancada");
  return (raw.votacoes ?? []).map((v) => ({
    sequencialVotacao: v.sequencialVotacao, codigoVotacaoSve: v.codigoVotacaoSve, inicio: v.dataInicioVotacao,
    materia: v.siglaTipoMateria && v.numeroMateria ? `${v.siglaTipoMateria} ${v.numeroMateria}/${v.anoMateria}` : null,
    descricao: v.descricaoVotacao, tipoSessao: v.tipoSessao,
    placar: { sim: v.qtdVotosSim, nao: v.qtdVotosNao, abstencao: v.qtdVotosAbstencao, obstrucao: v.qtdObstrucoes },
    orientacoes: (v.orientacoesLideranca ?? []).map((o) => ({
      sequencialVotacao: v.sequencialVotacao, bancada: o.partido, orientacao: o.voto ? ORIENTACAO[o.voto] ?? o.voto : "",
    })),
  }));
}

// ======================= despesas (CEAPS) =======================

/** Uma despesa da CEAPS, sem fornecedor nem CPF/CNPJ (a cota é agregada por categoria; decisão de 2026-11-02). */
export interface DespesaSenado {
  senadoCodigo: string;
  /** Mês de competência. */
  ano: number;
  mes: number;
  /** Null em ~0,3% das despesas (todas "Recibo"): a fonte não informa o tipo. */
  tipo: string | null;
  /** Valor reembolsado; estornos vêm negativos. */
  valor: number;
}

interface DespesaCeapsRaw { codSenador: number; ano: number; mes: number; tipoDespesa: string | null; valorReembolsado: number }

/**
 * Despesas da CEAPS de todos os senadores num ano (uma chamada, ~10 MB para um ano inteiro). Outro
 * serviço do Senado (`adm.senado.gov.br`), em JSON puro: não passa pela conversão XML→JSON.
 * A resposta traz `cpfCnpj` e `fornecedor`; nenhum dos dois sai daqui.
 */
export async function listarDespesasCeaps(ano: number): Promise<DespesaSenado[]> {
  const raw = await fetchJson<DespesaCeapsRaw[]>(`https://adm.senado.gov.br/adm-dadosabertos/api/v1/senadores/despesas_ceaps/${ano}`, { label: "senado:/despesas_ceaps/{ano}" });
  return raw.map((d) => ({ senadoCodigo: String(d.codSenador), ano: d.ano, mes: d.mes, tipo: vazio(d.tipoDespesa), valor: d.valorReembolsado }));
}
