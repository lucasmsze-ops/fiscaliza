/**
 * Adapter da API da Câmara (https://dadosabertos.camara.leg.br/api/v2).
 *
 * Único lugar que conhece o shape cru da API. Tudo sai daqui em tipos internos.
 * Só é chamado por scripts (sonda e cron), nunca em requisição de usuário.
 */
import { fetchJson, HttpError } from "./http";
import type { TipoVoto } from "./types";

export const CAMARA_API = "https://dadosabertos.camara.leg.br/api/v2";

// ---------- tipos internos ----------

export interface DeputadoResumo {
  camaraId: number;
  nome: string;
  partido: string;
  uf: string;
  legislatura: number;
  fotoUrl: string;
  /** E-mail que a listagem traz (pode ser null; o oficial vem do perfil). */
  email: string | null;
}

export interface DeputadoPerfil {
  camaraId: number;
  nomeCivil: string;
  /** Nome parlamentar atual. */
  nome: string;
  nomeEleitoral: string | null;
  partido: string;
  uf: string;
  legislatura: number;
  fotoUrl: string;
  /** E-mail oficial do gabinete (ultimoStatus.gabinete.email). */
  emailGabinete: string | null;
  telefoneGabinete: string | null;
  /** Ex.: "Exercício", "Licença", "Afastado". */
  situacao: string | null;
  /** Ex.: "Titular", "Suplente". */
  condicaoEleitoral: string | null;
  redesSociais: string[];
  site: string | null;
  /** CPF cru. Usar só para gerar o hash; nunca persistir. */
  cpf: string | null;
  dataFalecimento: string | null;
}

export interface OrgaoDeputado {
  orgaoId: number;
  sigla: string;
  nome: string;
  titulo: string;
  inicio: string | null;
  fim: string | null;
}

export interface HistoricoDeputado {
  dataHora: string;
  partido: string;
  uf: string;
  legislatura: number;
  situacao: string | null;
  condicaoEleitoral: string | null;
  descricao: string | null;
}

// ---------- shapes crus (parciais) ----------

interface Envelope<T> { dados: T; links: { rel: string; href: string }[] }

interface RawListagem {
  id: number; nome: string; siglaPartido: string; siglaUf: string;
  idLegislatura: number; urlFoto: string; email: string | null;
}

interface RawPerfil {
  id: number; nomeCivil: string; cpf: string | null; urlWebsite: string | null;
  redeSocial: string[]; dataFalecimento: string | null;
  ultimoStatus: {
    nome: string; nomeEleitoral: string | null; siglaPartido: string; siglaUf: string;
    idLegislatura: number; urlFoto: string; situacao: string | null;
    condicaoEleitoral: string | null;
    gabinete: { telefone: string | null; email: string | null } | null;
  };
}

interface RawOrgao {
  idOrgao: number; siglaOrgao: string; nomeOrgao: string; titulo: string;
  dataInicio: string | null; dataFim: string | null;
}

interface RawHistorico {
  dataHora: string; siglaPartido: string; siglaUf: string; idLegislatura: number;
  situacao: string | null; condicaoEleitoral: string | null; descricaoStatus: string | null;
}

// ---------- chamadas ----------

async function paginar<T>(path: string, label: string): Promise<T[]> {
  const todos: T[] = [];
  let url: string | null = `${CAMARA_API}${path}${path.includes("?") ? "&" : "?"}itens=100`;
  while (url) {
    const r: Envelope<T[]> = await fetchJson<Envelope<T[]>>(url, { label });
    todos.push(...r.dados);
    url = r.links.find((l) => l.rel === "next")?.href ?? null;
  }
  return todos;
}

/** Deputados em exercício (sem `legislatura`) ou todos que passaram por uma legislatura. */
export async function listarDeputados(f: { uf?: string; legislatura?: number; nome?: string } = {}): Promise<DeputadoResumo[]> {
  const q = new URLSearchParams({ ordem: "ASC", ordenarPor: "nome" });
  if (f.uf) q.set("siglaUf", f.uf);
  if (f.legislatura) q.set("idLegislatura", String(f.legislatura));
  if (f.nome) q.set("nome", f.nome);
  const raw = await paginar<RawListagem>(`/deputados?${q}`, "camara:/deputados");
  return raw.map((d) => ({
    camaraId: d.id, nome: d.nome, partido: d.siglaPartido, uf: d.siglaUf,
    legislatura: d.idLegislatura, fotoUrl: d.urlFoto, email: d.email,
  }));
}

export async function getDeputado(id: number): Promise<DeputadoPerfil> {
  const { dados: d } = await fetchJson<Envelope<RawPerfil>>(`${CAMARA_API}/deputados/${id}`, { label: "camara:/deputados/{id}" });
  const s = d.ultimoStatus;
  return {
    camaraId: d.id, nomeCivil: d.nomeCivil, nome: s.nome, nomeEleitoral: s.nomeEleitoral,
    partido: s.siglaPartido, uf: s.siglaUf, legislatura: s.idLegislatura, fotoUrl: s.urlFoto,
    emailGabinete: s.gabinete?.email ?? null, telefoneGabinete: s.gabinete?.telefone ?? null,
    situacao: s.situacao, condicaoEleitoral: s.condicaoEleitoral,
    redesSociais: d.redeSocial ?? [], site: d.urlWebsite, cpf: d.cpf, dataFalecimento: d.dataFalecimento,
  };
}

export async function getOrgaos(id: number): Promise<OrgaoDeputado[]> {
  const raw = await paginar<RawOrgao>(`/deputados/${id}/orgaos?ordem=DESC&ordenarPor=dataInicio`, "camara:/deputados/{id}/orgaos");
  return raw.map((o) => ({ orgaoId: o.idOrgao, sigla: o.siglaOrgao, nome: o.nomeOrgao, titulo: o.titulo, inicio: o.dataInicio, fim: o.dataFim }));
}

export async function getHistorico(id: number): Promise<HistoricoDeputado[]> {
  const { dados } = await fetchJson<Envelope<RawHistorico[]>>(`${CAMARA_API}/deputados/${id}/historico`, { label: "camara:/deputados/{id}/historico" });
  return dados.map((h) => ({
    dataHora: h.dataHora, partido: h.siglaPartido, uf: h.siglaUf, legislatura: h.idLegislatura,
    situacao: h.situacao, condicaoEleitoral: h.condicaoEleitoral, descricao: h.descricaoStatus,
  }));
}

// ======================= votações do plenário =======================


export interface VotacaoCamara {
  idExterno: string;
  data: string;
  dataHoraRegistro: string;
  /** Ex.: "REQ 1260/2025" quando a listagem informa; senão null (vem do detalhe). */
  proposicaoObjeto: string | null;
  descricao: string;
  /** 1 aprovada, 0 rejeitada, null sem registro. */
  aprovacao: 0 | 1 | null;
  idEvento: number | null;
  /** Heurística: a descrição das votações nominais traz o placar "Sim: N; Não: M". */
  nominalPelaDescricao: boolean;
}

export interface ProposicaoRef {
  proposicaoId: number;
  tipo: string;
  numero: number;
  ano: number;
  ementa: string;
}

export interface VotacaoDetalhe extends VotacaoCamara {
  proposicoesAfetadas: ProposicaoRef[];
  objetosPossiveis: ProposicaoRef[];
}

export interface OrientacaoCamara {
  votacaoId: string;
  /** "Governo", "Oposição", "Minoria", "Maioria" ou sigla de partido/bloco. */
  bancada: string;
  /** "P" partido, "B" bloco/liderança. */
  tipoLideranca: string;
  orientacao: string;
}

export interface VotoCamara {
  votacaoId: string;
  camaraId: number;
  voto: Exclude<TipoVoto, "ausente">;
  partido: string;
  uf: string;
  dataHora: string;
}

interface RawVotacao {
  id: string; data: string; dataHoraRegistro: string; siglaOrgao: string;
  uriEvento: string | null; proposicaoObjeto: string | null; descricao: string; aprovacao: 0 | 1 | null;
}
interface RawProposicaoRef { id: number; siglaTipo: string; numero: number; ano: number; ementa: string }
interface RawVotacaoDetalhe extends RawVotacao {
  idEvento: number | null;
  proposicoesAfetadas: RawProposicaoRef[] | null;
  objetosPossiveis: RawProposicaoRef[] | null;
}
interface RawOrientacao { orientacaoVoto: string; codTipoLideranca: string; siglaPartidoBloco: string }
interface RawVoto {
  tipoVoto: string | null; dataRegistroVoto: string;
  deputado_: { id: number; siglaPartido: string; siglaUf: string };
}

const PLACAR = /\bSim:\s*\d+/;

function paraVotacao(v: RawVotacao): VotacaoCamara {
  return {
    idExterno: v.id, data: v.data, dataHoraRegistro: v.dataHoraRegistro,
    proposicaoObjeto: v.proposicaoObjeto, descricao: v.descricao, aprovacao: v.aprovacao,
    idEvento: v.uriEvento ? Number(v.uriEvento.split("/").pop()) : null,
    nominalPelaDescricao: PLACAR.test(v.descricao ?? ""),
  };
}

function paraRef(p: RawProposicaoRef): ProposicaoRef {
  return { proposicaoId: p.id, tipo: p.siglaTipo, numero: p.numero, ano: p.ano, ementa: p.ementa };
}

/** A API aceita no máximo 3 meses por chamada; divide o intervalo em janelas de ~90 dias. */
export function janelas(inicio: string, fim: string, dias = 90): [string, string][] {
  const out: [string, string][] = [];
  let a = new Date(inicio + "T00:00:00Z");
  const z = new Date(fim + "T00:00:00Z");
  while (a <= z) {
    const b = new Date(Math.min(a.getTime() + (dias - 1) * 86_400_000, z.getTime()));
    out.push([a.toISOString().slice(0, 10), b.toISOString().slice(0, 10)]);
    a = new Date(b.getTime() + 86_400_000);
  }
  return out;
}

/** Votações do plenário (idOrgao=180) entre duas datas, em qualquer intervalo. */
export async function listarVotacoesPlenario(inicio: string, fim: string): Promise<VotacaoCamara[]> {
  const todas: VotacaoCamara[] = [];
  for (const [a, b] of janelas(inicio, fim)) {
    const raw = await paginar<RawVotacao>(
      `/votacoes?idOrgao=180&dataInicio=${a}&dataFim=${b}&ordem=ASC&ordenarPor=dataHoraRegistro`,
      "camara:/votacoes",
    );
    todas.push(...raw.map(paraVotacao));
  }
  return todas;
}

export async function getVotacao(id: string): Promise<VotacaoDetalhe> {
  const { dados: d } = await fetchJson<Envelope<RawVotacaoDetalhe>>(`${CAMARA_API}/votacoes/${id}`, { label: "camara:/votacoes/{id}" });
  return {
    ...paraVotacao(d), idEvento: d.idEvento,
    proposicoesAfetadas: (d.proposicoesAfetadas ?? []).map(paraRef),
    objetosPossiveis: (d.objetosPossiveis ?? []).map(paraRef),
  };
}

export async function getOrientacoes(id: string): Promise<OrientacaoCamara[]> {
  const { dados } = await fetchJson<Envelope<RawOrientacao[]>>(`${CAMARA_API}/votacoes/${id}/orientacoes`, { label: "camara:/votacoes/{id}/orientacoes" });
  return dados.map((o) => ({ votacaoId: id, bancada: o.siglaPartidoBloco, tipoLideranca: o.codTipoLideranca, orientacao: o.orientacaoVoto }));
}

const TIPO_VOTO: Record<string, Exclude<TipoVoto, "ausente">> = {
  "Sim": "sim", "Não": "nao", "Abstenção": "abstencao", "Obstrução": "obstrucao", "Artigo 17": "art17",
};

/**
 * Votos nominais. Array vazio = votação simbólica. Quem não aparece = ausente (decidido por quem calcula).
 * A API responde 404 em ~1% das votações listadas: tratado como "sem votos", não como falha.
 */
export async function getVotos(id: string): Promise<VotoCamara[]> {
  let dados: RawVoto[];
  try {
    ({ dados } = await fetchJson<Envelope<RawVoto[]>>(`${CAMARA_API}/votacoes/${id}/votos`, { label: "camara:/votacoes/{id}/votos" }));
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) return [];
    throw e;
  }
  return dados.map((v) => {
    const voto = v.tipoVoto === null ? "nao_informado" : TIPO_VOTO[v.tipoVoto];
    if (!voto) throw new Error(`tipoVoto desconhecido em ${id}: ${v.tipoVoto}`);
    return { votacaoId: id, camaraId: v.deputado_.id, voto, partido: v.deputado_.siglaPartido, uf: v.deputado_.siglaUf, dataHora: v.dataRegistroVoto };
  });
}

// ======================= arquivos anuais =======================

/** Arquivo anual em lote (CSV, `;`, UTF-8 com BOM): `proposicoes`, `proposicoesAutores`... Baixar com `baixarArquivo` (chega cortado). */
export const arquivoAnualCamara = (nome: string, ano: number) => `https://dadosabertos.camara.leg.br/arquivos/${nome}/csv/${nome}-${ano}.csv`;

// ======================= despesas (CEAP) =======================

export interface DespesaCamara {
  camaraId: number;
  /** Identificador do documento na Câmara; vazio nas passagens SIGEPA. */
  codDocumento: string;
  /** Número da parcela (0 = à vista). O mesmo codDocumento pode ter várias parcelas em meses diferentes. */
  parcela: number;
  ano: number;
  mes: number;
  tipo: string;
  valorDocumento: number;
  valorGlosa: number;
  valorLiquido: number;
  fornecedor: string;
  dataDocumento: string | null;
  urlDocumento: string | null;
}

interface RawDespesa {
  codDocumento: string; parcela: number; ano: number; mes: number; tipoDespesa: string; valorDocumento: number; valorGlosa: number;
  valorLiquido: number; nomeFornecedor: string; dataDocumento: string | null; urlDocumento: string | null;
}

/**
 * Despesas da cota parlamentar de um deputado num ano. `ano` sozinho devolve vazio (observado em
 * 2026-10-29); só funciona junto com `idLegislatura`. `mes` é o mês de competência.
 */
export async function listarDespesas(camaraId: number, legislatura: number, ano: number, mes?: number): Promise<DespesaCamara[]> {
  const q = `idLegislatura=${legislatura}&ano=${ano}${mes ? `&mes=${mes}` : ""}`;
  const raw = await paginar<RawDespesa>(`/deputados/${camaraId}/despesas?${q}`, "camara:/deputados/{id}/despesas");
  return raw.map((d) => ({
    camaraId, codDocumento: d.codDocumento, parcela: d.parcela, ano: d.ano, mes: d.mes, tipo: d.tipoDespesa, valorDocumento: d.valorDocumento, valorGlosa: d.valorGlosa,
    valorLiquido: d.valorLiquido, fornecedor: d.nomeFornecedor, dataDocumento: d.dataDocumento, urlDocumento: d.urlDocumento,
  }));
}
