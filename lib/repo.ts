/**
 * Camada de dados do site. Componentes e páginas falam só com `Repo`; a origem muda sem tocar
 * neles: `JsonRepo` (protótipo, lê data/*.json) agora, `SupabaseRepo` na E17. As duas leem as
 * mesmas linhas em snake_case e devolvem os tipos de lib/types.ts.
 *
 * Só roda no servidor (lê arquivos). Nenhuma requisição de usuário chama API externa.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { deLinha } from "./linhas";
import type {
  Afastamento, Cargo, Casa, DespesaMediaUf, DespesaMes, EleitoMunicipio, Linha, ListaEleitoral, Mandato, Municipio,
  Orientacao, Politico, QuizItem, Votacao, Voto,
} from "./types";

export interface EleitoNaCidade {
  cargo: Cargo;
  posicao: number;
  votos: number;
  politico: Politico;
}

export interface Repo {
  getPolitico(id: string): Promise<Politico | null>;
  listarPoliticos(): Promise<Politico[]>;
  /** Busca por nome de urna ou nome civil, sem acento nem caixa. */
  buscarPorNome(termo: string, limite?: number): Promise<Politico[]>;
  listarMunicipios(): Promise<Municipio[]>;
  getMunicipio(ibge: number): Promise<Municipio | null>;
  /** Top-20 do município (com empatados), por cargo e posição. */
  buscarPorCidade(ibge: number): Promise<EleitoNaCidade[]>;
  getLista(id: string): Promise<ListaEleitoral | null>;
  getMandatos(politicoId: string): Promise<Mandato[]>;
  getAfastamentos(politicoId: string): Promise<Afastamento[]>;
  getVotacoes(casa: Casa): Promise<Votacao[]>;
  getVotos(politicoId: string): Promise<Voto[]>;
  getOrientacoes(casa: Casa, bancada: string): Promise<Orientacao[]>;
  getDespesas(politicoId: string): Promise<DespesaMes[]>;
  getMediasUf(uf: string): Promise<DespesaMediaUf[]>;
  /** Perguntas do quiz em ordem, com as votações de cada Casa. */
  getVotacoesQuiz(): Promise<{ item: QuizItem; camara: Votacao | null; senado: Votacao | null }[]>;
}

export { normalizar } from "./texto";
import { normalizar } from "./texto";

type Tabelas = {
  politicos: Politico; mandatos: Mandato; afastamentos: Afastamento; listas: ListaEleitoral; municipios: Municipio;
  eleitos_mun: EleitoMunicipio; despesas_mes: DespesaMes; despesas_media_uf: DespesaMediaUf; votacoes: Votacao;
  votos: Voto; orientacoes: Orientacao; quiz: QuizItem;
};

/** Lê data/*.json uma vez por processo (cada tabela só quando pedida). */
export class JsonRepo implements Repo {
  private cache = new Map<keyof Tabelas, Promise<unknown[]>>();
  constructor(private dir = path.join(process.cwd(), "data")) {}

  private tabela<K extends keyof Tabelas>(nome: K): Promise<Tabelas[K][]> {
    let p = this.cache.get(nome);
    if (!p) {
      p = readFile(path.join(this.dir, `${nome}.json`), "utf8").then((t) =>
        (JSON.parse(t) as Linha<Tabelas[K]>[]).map((l) => deLinha<Tabelas[K]>(l)));
      this.cache.set(nome, p);
    }
    return p as Promise<Tabelas[K][]>;
  }

  async getPolitico(id: string) {
    return (await this.tabela("politicos")).find((p) => p.id === id) ?? null;
  }
  async listarPoliticos() {
    return this.tabela("politicos");
  }
  async buscarPorNome(termo: string, limite = 20) {
    const t = normalizar(termo);
    if (t.length < 2) return [];
    return (await this.tabela("politicos"))
      .filter((p) => normalizar(p.nomeUrna).includes(t) || normalizar(p.nome).includes(t))
      .sort((a, b) => (b.votos2026 ?? 0) - (a.votos2026 ?? 0))
      .slice(0, limite);
  }
  async listarMunicipios() {
    return this.tabela("municipios");
  }
  async getMunicipio(ibge: number) {
    return (await this.tabela("municipios")).find((m) => m.ibge === ibge) ?? null;
  }
  async buscarPorCidade(ibge: number) {
    const [linhas, politicos] = await Promise.all([this.tabela("eleitos_mun"), this.tabela("politicos")]);
    const porId = new Map(politicos.map((p) => [p.id, p]));
    return linhas.filter((l) => l.municipioIbge === ibge)
      .map((l) => ({ cargo: l.cargo, posicao: l.posicao, votos: l.votos, politico: porId.get(l.politicoId)! }))
      .sort((a, b) => a.cargo.localeCompare(b.cargo) || a.posicao - b.posicao || b.votos - a.votos);
  }
  async getLista(id: string) {
    return (await this.tabela("listas")).find((l) => l.id === id) ?? null;
  }
  async getMandatos(politicoId: string) {
    return (await this.tabela("mandatos")).filter((m) => m.politicoId === politicoId);
  }
  async getAfastamentos(politicoId: string) {
    return (await this.tabela("afastamentos")).filter((a) => a.politicoId === politicoId);
  }
  async getVotacoes(casa: Casa) {
    return (await this.tabela("votacoes")).filter((v) => v.casa === casa);
  }
  async getVotos(politicoId: string) {
    return (await this.tabela("votos")).filter((v) => v.politicoId === politicoId);
  }
  async getOrientacoes(casa: Casa, bancada: string) {
    return (await this.tabela("orientacoes")).filter((o) => o.bancada === bancada && o.votacaoId.startsWith(`${casa}:`));
  }
  async getDespesas(politicoId: string) {
    return (await this.tabela("despesas_mes")).filter((d) => d.politicoId === politicoId);
  }
  async getMediasUf(uf: string) {
    return (await this.tabela("despesas_media_uf")).filter((m) => m.uf === uf);
  }
  async getVotacoesQuiz() {
    const [quiz, votacoes] = await Promise.all([this.tabela("quiz"), this.tabela("votacoes")]);
    const porId = new Map(votacoes.map((v) => [v.id, v]));
    return [...quiz].sort((a, b) => a.ordem - b.ordem).map((item) => ({
      item,
      camara: item.votacaoCamaraId ? porId.get(item.votacaoCamaraId) ?? null : null,
      senado: item.votacaoSenadoId ? porId.get(item.votacaoSenadoId) ?? null : null,
    }));
  }
}

/** A origem de dados do site. A E17 troca por `SupabaseRepo` aqui, num lugar só. */
export const repo: Repo = new JsonRepo();
