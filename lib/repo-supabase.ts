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
import { chaveMateria, type MateriaRef } from "./pauta";
import type { Noticia } from "./noticias";
import type { PaginaDados } from "./pagina";
import { ultimaColeta, type EleitoNaCidade, type Repo } from "./repo";
import { cliente, selecionar, type Cliente } from "./supabase";
import { normalizar } from "./texto";
import type { VotacaoPagina } from "./votacao";
import type {
  Afastamento, Atualizacao, CandidatoExecutivo, Cargo, ExecutivoEleito, ItemPauta, Casa, DespesaMediaUf, DespesaMes, Linha, ListaEleitoral, Mandato, Municipio, Orientacao, Politico,
  Proposicao, ProposicaoContagem, Votacao, Voto,
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
  /** Todos os resumos de uma vez (só o `numeros` do card, ~3,7 mil linhas), guardados por TTL_MS. */
  async listarNumeros(ids: string[]) {
    const todos = await this.lembrar("numeros", async () => {
      const ls = await selecionar<{ politico_id: string; numeros: CardDados["numeros"] | null }>(this.cli, "resumos", "select=politico_id,numeros:card->numeros&order=politico_id");
      return new Map(ls.filter((l) => l.numeros).map((l) => [l.politico_id, l.numeros!]));
    });
    const quer = new Set(ids);
    return new Map([...todos].filter(([id]) => quer.has(id)));
  }
  async getAutorias(id: string) {
    const ls = await selecionar<{ ordem: number; proposicao: Linha<Proposicao> }>(this.cli, "proposicoes_autores",
      `select=ordem,proposicao:proposicoes(*)&politico_id=eq.${v(id)}&order=proposicao_id`);
    return ls.map((l) => ({ ordem: l.ordem, proposicao: deLinha<Proposicao>(l.proposicao) }));
  }
  getContagemProposicoes(id: string) {
    return this.linhas<ProposicaoContagem>("proposicoes_contagem", `select=*&politico_id=eq.${v(id)}&order=casa,ano,tipo`);
  }
  getAtualizacoes() {
    return this.lembrar("atualizacoes", () => this.linhas<Atualizacao>("atualizacoes", "select=*&order=fonte"));
  }
  listarMandatosEmCurso() {
    return this.linhas<Mandato>("mandatos", "select=*&fim=is.null&order=politico_id,inicio");
  }
  listarAfastamentosEm(data: string) {
    return this.linhas<Afastamento>("afastamentos", `select=*&inicio=lte.${v(data)}&or=(fim.is.null,fim.gte.${v(data)})&order=politico_id,inicio`);
  }
  ultimasVotacoes(casa: Casa, limite: number) {
    return this.linhas<Votacao>("votacoes", `select=*&casa=eq.${v(casa)}&order=data.desc,id.desc&limit=${limite}`);
  }
  async getFidelidade() {
    return null; // a página lê o resumo pronto do cron (resumos.pagina), que já traz o número
  }
  listarDatasVotacoes() {
    return this.lembrar("datas-votacoes", () => selecionar<{ data: string; casa: Casa }>(this.cli, "votacoes", "select=data,casa&order=data,id"));
  }
  votacoesEntre(inicio: string, fim: string) {
    return this.linhas<Votacao>("votacoes", `select=*&data=gte.${v(inicio)}&data=lte.${v(fim)}&order=data.desc,id.desc`);
  }
  async ultimasNormas(limite: number) {
    const ls = await selecionar<Linha<Proposicao> & { autores: { politico_id: string; ordem: number }[] }>(this.cli, "proposicoes",
      `select=*,autores:proposicoes_autores(politico_id,ordem)&virou_norma=is.true&order=apresentacao.desc,id.desc&limit=${limite}`);
    return ls.map(({ autores, ...p }) => ({ proposicao: deLinha<Proposicao>(p as Linha<Proposicao>), autores: autores.map((a) => ({ politicoId: a.politico_id, ordem: a.ordem })) }));
  }
  async autoresDasMaterias(materias: MateriaRef[]) {
    const r = new Map<string, string[]>();
    for (const casa of ["camara", "senado"] as const) {
      const ms = materias.filter((m) => m.casa === casa);
      if (!ms.length) continue;
      const ou = ms.map((m) => `and(tipo.eq.${v(m.tipo)},numero.eq.${m.numero},ano.eq.${m.ano})`).join(",");
      const ls = await selecionar<{ casa: Casa; tipo: string; numero: number; ano: number; autores: { politico_id: string }[] }>(this.cli, "proposicoes",
        `select=casa,tipo,numero,ano,autores:proposicoes_autores(politico_id)&casa=eq.${casa}&or=(${ou})&order=id`);
      for (const l of ls) r.set(chaveMateria(l), l.autores.map((a) => a.politico_id));
    }
    return r;
  }
  noticiasDe(politicoId: string, limite: number) {
    return this.linhas<Noticia>("noticias", `select=*&politicos=cs.{${v(politicoId)}}&order=data.desc,id&limit=${limite}`);
  }
  listarCandidatosExecutivo() {
    return this.lembrar("candidatos_executivo", () => this.linhas<CandidatoExecutivo>("candidatos_executivo", "select=*&order=id"));
  }
  async listarPauta(desde: string) {
    return ultimaColeta(await this.linhas<ItemPauta>("pauta", `select=*&data=gte.${v(desde)}&order=data,id`));
  }
  listarExecutivos() {
    return this.lembrar("executivos", () => this.linhas<ExecutivoEleito>("executivos", "select=*&order=id"));
  }
  async getVotacaoPagina(id: string) {
    const [r] = await selecionar<{ pagina: VotacaoPagina }>(this.cli, "resumos_votacao", `select=pagina&votacao_id=eq.${v(id)}&order=votacao_id`);
    return r?.pagina ?? null;
  }
  async getPagina(id: string) {
    const [r] = await selecionar<{ pagina: PaginaDados }>(this.cli, "resumos", `select=pagina&politico_id=eq.${v(id)}&order=politico_id`);
    return r?.pagina ?? null;
  }
  async getPolitico(id: string) {
    // Uma linha só (~1 KB), em vez da lista inteira (~1 MB), quando a lista não está em memória.
    const m = this.memo.get("politicos");
    if (m && m.ate > Date.now()) return ((await m.valor) as Politico[]).find((p) => p.id === id) ?? null;
    const [p] = await this.linhas<Politico>("politicos", `select=*&id=eq.${v(id)}&order=id`);
    return p ?? null;
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
