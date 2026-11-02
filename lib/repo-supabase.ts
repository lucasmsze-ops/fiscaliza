/**
 * `Repo` sobre o Supabase (E20), pela API REST com a chave publicável (só leitura). Mesmo
 * contrato do JsonRepo: mesmas linhas em snake_case, mesmos tipos de lib/types.ts.
 *
 * Card e página vêm prontos da tabela `resumos` (scripts/precalcular.ts): uma página lê ~20 KB em
 * vez de todas as votações da Casa (~1 MB), o que mantém o egress dentro do plano free.
 * Listas inteiras (políticos, municípios, votações) ficam em memória por 5 minutos no processo:
 * o build não repete a mesma consulta centenas de vezes, e o dado novo do cron aparece logo.
 */
import type { CardDados } from "./card";
import { ordemNaCidade } from "./cidade";
import { deLinha } from "./linhas";
import type { PaginaDados } from "./pagina";
import type { EleitoNaCidade, Repo } from "./repo";
import { cliente, selecionar, type Cliente } from "./supabase";
import { normalizar } from "./texto";
import type {
  Afastamento, Cargo, Casa, DespesaMediaUf, DespesaMes, Linha, ListaEleitoral, Mandato, Municipio, Orientacao, Politico, Votacao, Voto,
} from "./types";

const TTL_MS = 5 * 60_000;
const v = (x: string | number) => encodeURIComponent(String(x));

export class SupabaseRepo implements Repo {
  private c: Cliente | null = null;
  private memo = new Map<string, { ate: number; valor: Promise<unknown> }>();

  /** Cliente criado na primeira consulta: importar o módulo não exige as variáveis de ambiente. */
  private get cli(): Cliente {
    return (this.c ??= cliente("publicavel"));
  }

  private linhas<T extends object>(tabela: string, consulta: string): Promise<T[]> {
    return selecionar<Linha<T>>(this.cli, tabela, consulta).then((ls) => ls.map((l) => deLinha<T>(l)));
  }

  private lembrar<T>(chave: string, f: () => Promise<T>): Promise<T> {
    const m = this.memo.get(chave);
    if (m && m.ate > Date.now()) return m.valor as Promise<T>;
    const valor = f();
    this.memo.set(chave, { ate: Date.now() + TTL_MS, valor });
    valor.catch(() => this.memo.delete(chave)); // falha não fica guardada
    return valor;
  }

  async getCard(id: string) {
    const [r] = await selecionar<{ card: CardDados }>(this.cli, "resumos", `select=card&politico_id=eq.${v(id)}&order=politico_id`);
    return r?.card ?? null;
  }
  async getPagina(id: string) {
    const [r] = await selecionar<{ pagina: PaginaDados }>(this.cli, "resumos", `select=pagina&politico_id=eq.${v(id)}&order=politico_id`);
    return r?.pagina ?? null;
  }
  async getPolitico(id: string) {
    return (await this.listarPoliticos()).find((p) => p.id === id) ?? null;
  }
  listarPoliticos() {
    return this.lembrar("politicos", () => this.linhas<Politico>("politicos", "select=*&order=id"));
  }
  async buscarPorNome(termo: string, limite = 20) {
    const t = normalizar(termo);
    if (t.length < 2) return [];
    return (await this.listarPoliticos())
      .filter((p) => normalizar(p.nomeUrna).includes(t) || normalizar(p.nome).includes(t))
      .sort((a, b) => (b.votos2026 ?? 0) - (a.votos2026 ?? 0))
      .slice(0, limite);
  }
  listarMunicipios() {
    return this.lembrar("municipios", () => this.linhas<Municipio>("municipios", "select=*&order=ibge"));
  }
  async getMunicipio(ibge: number) {
    return (await this.listarMunicipios()).find((m) => m.ibge === ibge) ?? null;
  }
  async buscarPorCidade(ibge: number): Promise<EleitoNaCidade[]> {
    const ls = await selecionar<{ cargo: Cargo; posicao: number; votos: number; politico: Linha<Politico> }>(
      this.cli, "eleitos_mun", `select=cargo,posicao,votos,politico:politicos(*)&municipio_ibge=eq.${v(ibge)}&order=cargo,posicao,politico_id`);
    return ls.map((l) => ({ cargo: l.cargo, posicao: l.posicao, votos: l.votos, politico: deLinha<Politico>(l.politico) }))
      .sort(ordemNaCidade);
  }
  async getLista(id: string) {
    const [l] = await this.linhas<ListaEleitoral>("listas", `select=*&id=eq.${v(id)}&order=id`);
    return l ?? null;
  }
  getMandatos(politicoId: string) {
    return this.linhas<Mandato>("mandatos", `select=*&politico_id=eq.${v(politicoId)}&order=cargo,inicio`);
  }
  getAfastamentos(politicoId: string) {
    return this.linhas<Afastamento>("afastamentos", `select=*&politico_id=eq.${v(politicoId)}&order=inicio,motivo`);
  }
  getVotacoes(casa: Casa) {
    return this.lembrar(`votacoes:${casa}`, () => this.linhas<Votacao>("votacoes", `select=*&casa=eq.${v(casa)}&order=id`));
  }
  getVotos(politicoId: string) {
    return this.linhas<Voto>("votos", `select=*&politico_id=eq.${v(politicoId)}&order=votacao_id`);
  }
  getOrientacoes(casa: Casa, bancada: string) {
    return this.lembrar(`orientacoes:${casa}:${bancada}`, () =>
      this.linhas<Orientacao>("orientacoes", `select=*&bancada=eq.${v(bancada)}&votacao_id=like.${v(`${casa}:*`)}&order=votacao_id`));
  }
  getDespesas(politicoId: string) {
    return this.linhas<DespesaMes>("despesas_mes", `select=*&politico_id=eq.${v(politicoId)}&order=casa,ano,mes`);
  }
  getMediasUf(uf: string, casa: Casa) {
    return this.lembrar(`medias:${casa}:${uf}`, () => this.linhas<DespesaMediaUf>("despesas_media_uf", `select=*&casa=eq.${casa}&uf=eq.${v(uf)}&order=ano,mes`));
  }
}
