/**
 * Adapter da API da Câmara (https://dadosabertos.camara.leg.br/api/v2).
 *
 * Único lugar que conhece o shape cru da API. Tudo sai daqui em tipos internos.
 * Só é chamado por scripts (sonda e cron), nunca em requisição de usuário.
 */
import { fetchJson } from "./http";

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
