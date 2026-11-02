/**
 * Camada de dados do site. Componentes e páginas falam só com `Repo`; a origem muda sem tocar
 * neles: `JsonRepo` (data/*.json) ou `SupabaseRepo` (lib/repo-supabase.ts), escolhida por
 * FISCALIZA_DADOS. As duas leem as mesmas linhas em snake_case e devolvem os tipos de lib/types.ts.
 * Card e página: o JsonRepo calcula na hora; o SupabaseRepo lê o resumo pré-calculado (`resumos`).
 *
 * Só roda no servidor. Nenhuma requisição de usuário chama API externa (o Supabase é o banco do site).
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { montarCard, type CardDados } from "./card";
import { ordemNaCidade } from "./cidade";
import { deLinha } from "./linhas";
import { montarPagina, type PaginaDados } from "./pagina";
import type {
  Afastamento, Cargo, Casa, DespesaMediaUf, DespesaMes, EleitoMunicipio, Linha, ListaEleitoral, Mandato, Municipio,
  Orientacao, Politico, Votacao, Voto,
} from "./types";

export interface EleitoNaCidade {
  cargo: Cargo;
  posicao: number;
  votos: number;
  politico: Politico;
}

export interface Repo {
  /** O card pronto (lib/card.ts#montarCard). */
  getCard(id: string): Promise<CardDados | null>;
  /** A página do político pronta (lib/pagina.ts#montarPagina), com o card dentro. */
  getPagina(id: string): Promise<PaginaDados | null>;
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
}

export { normalizar } from "./texto";
import { SupabaseRepo } from "./repo-supabase";
import { normalizar } from "./texto";

type Tabelas = {
  politicos: Politico; mandatos: Mandato; afastamentos: Afastamento; listas: ListaEleitoral; municipios: Municipio;
  eleitos_mun: EleitoMunicipio; despesas_mes: DespesaMes; despesas_media_uf: DespesaMediaUf; votacoes: Votacao;
  votos: Voto; orientacoes: Orientacao;
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

  getCard(id: string) {
    return montarCard(this, id);
  }
  getPagina(id: string) {
    return montarPagina(this, id);
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
      .sort(ordemNaCidade);
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
}

/**
 * A origem de dados do site, num lugar só: FISCALIZA_DADOS=supabase lê do Supabase (precisa de
 * SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY); sem a variável, lê data/*.json.
 */
export const repo: Repo = process.env.FISCALIZA_DADOS === "supabase" ? new SupabaseRepo() : new JsonRepo();
