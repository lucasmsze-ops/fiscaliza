/**
 * Dados do PoliticoCard: o que o card mostra, já calculado. O componente só exibe.
 * Regras em docs/METODOLOGIA.md. Nada é preenchido sem fonte: o que falta vira `null` e o
 * card omite o bloco (ou mostra a lacuna com texto fixo, como "primeiro voto em fevereiro").
 */
import { diasAfastado, governismo, participacao, type Indicador, type Periodo } from "./indicadores";
import type { Repo } from "./repo";
import { fraseVotoContou, nomeCurtoLista } from "./quociente";
import { normalizar } from "./texto";
import type { Cargo, Casa, DespesaMediaUf, Politico } from "./types";

/** Período de governo atual: o corte do governismo é 01/01/2027. */
export const PERIODO_GOVERNO: Periodo = { inicio: "2023-01-01", fim: "2026-12-31" };
const ROTULO_PERIODO = "2023–2026";

export type NumerosCard =
  | { tipo: "mandato"; casa: Casa; periodo: string; participacao: Indicador; diasAfastado: number; textoAfastado: string | null; governismo: Indicador }
  /** Eleito(a) em 2026 sem mandato no período: os números começam com a posse. */
  | { tipo: "primeiro_voto" }
  /** Suplente ou não eleito(a) sem mandato no período. */
  | { tipo: "sem_mandato"; periodo: string };

export interface CeapCard {
  /** "jul/2026": último mês fechado (lib/ceap.ts). */
  mes: string;
  /** Null = sem lançamento no mês (não é zero: a fonte não registrou despesa). */
  valor: number | null;
  mediaUf: number;
  uf: string;
  urlOficial: string;
}

export interface CobrarCard {
  email: string;
  href: string;
}

/** Cabeçalho do card: o que a busca e a lista da cidade mostram (variante compacta). */
export interface CardResumo {
  id: string;
  nomeUrna: string;
  fotoUrl: string | null;
  /** Rótulo flexionado ("Deputada federal"). */
  cargo: string;
  cargoChave: Cargo;
  partidoUf: string;
  status: string;
}

export function resumoCard(p: Politico): CardResumo {
  return { id: p.id, nomeUrna: p.nomeUrna, fotoUrl: p.fotoUrl, cargo: rotuloCargo(p), cargoChave: p.cargo, partidoUf: `${p.partido}-${p.uf}`, status: rotuloStatus(p) };
}

/** Entrada do índice de busca por nome (JSON estático /dados/politicos). */
export interface ItemBusca extends CardResumo {
  /** Nome de urna + nome civil normalizados (sem acento, minúsculas). */
  busca: string;
}
export const itemBusca = (p: Politico): ItemBusca => ({ ...resumoCard(p), busca: normalizar(`${p.nomeUrna} ${p.nome}`) });

/** "Seu voto contou para": só deputado federal de 2026 (sistema proporcional). Senador: null. */
export interface ListaCard {
  frase: string;
  /** Nome curto exibido ("Federação PT/PC do B/PV" ou "PL"). */
  nomeCurto: string;
  /** Nome oficial completo do TSE, para o tooltip. */
  nomeOficial: string;
  eleitos: number;
}

export interface CardDados extends CardResumo {
  numeros: NumerosCard;
  lista: ListaCard | null;
  /** Só existe quando o usuário respondeu o quiz (E13); até lá, oculto. */
  concordancia: Indicador | null;
  ceap: CeapCard | null;
  cobrar: CobrarCard | null;
  urlPerfil: string | null;
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const fem = (p: Politico) => p.genero === "feminino";

export function rotuloCargo(p: Politico): string {
  if (p.genero === null) return p.cargo === "senador" ? "Senado Federal" : "Câmara dos Deputados";
  if (p.cargo === "senador") return fem(p) ? "Senadora" : "Senador";
  return fem(p) ? "Deputada federal" : "Deputado federal";
}

export function rotuloStatus(p: Politico): string {
  const a = fem(p) ? "a" : "o";
  switch (p.status) {
    case "reeleito": return `Reeleit${a} em 2026`;
    case "eleito": return `Eleit${a} em 2026`;
    case "suplente": return "Suplente em 2026";
    case "nao_eleito": return `Não eleit${a} em 2026`;
    case "em_exercicio": return "Em exercício";
  }
}

function tratamento(p: Politico): string {
  if (p.cargo === "senador") return fem(p) ? "Senadora" : "Senador";
  return fem(p) ? "Deputada" : "Deputado";
}

/** mailto com assunto e corpo neutros; a votação discordante entra na E13, quando houver quiz. */
export function hrefCobrar(p: Politico, email: string): string {
  const assunto = `Mensagem de eleitor(a) de ${p.uf}`;
  const corpo = `Olá, ${tratamento(p)} ${p.nomeUrna}.\n\nSou eleitor(a) de ${p.uf} e acompanho seu mandato pelo Fiscaliza.\n\n`;
  return `mailto:${email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
}

/** Último mês fechado da média da UF, ou null se nenhum estiver fechado. */
export function mesReferencia(medias: DespesaMediaUf[]): DespesaMediaUf | null {
  return [...medias].filter((m) => m.fechado).sort((a, b) => a.ano * 100 + a.mes - (b.ano * 100 + b.mes)).at(-1) ?? null;
}

export async function montarCard(repo: Repo, id: string, hoje = new Date().toISOString().slice(0, 10)): Promise<CardDados | null> {
  const p = await repo.getPolitico(id);
  if (!p) return null;

  const casa: Casa | null = p.senadoCodigo ? "senado" : p.camaraId ? "camara" : null;
  let numeros: NumerosCard;
  if (casa) {
    const cargoDaCasa = casa === "senado" ? "senador" : "deputado_federal";
    const [votacoes, votos, mandatos, afastamentos, orientacoes] = await Promise.all([
      repo.getVotacoes(casa), repo.getVotos(p.id), repo.getMandatos(p.id), repo.getAfastamentos(p.id), repo.getOrientacoes(casa, "Governo"),
    ]);
    const exercicio = mandatos.filter((m) => m.cargo === cargoDaCasa);
    const part = participacao(votacoes, votos, PERIODO_GOVERNO, exercicio);
    const dias = diasAfastado(afastamentos, PERIODO_GOVERNO, hoje);
    const textoAfastado = dias > 0 ? `${fem(p) ? "afastada" : "afastado"} ${dias.toLocaleString("pt-BR")} ${dias === 1 ? "dia" : "dias"}` : null;
    numeros = part.denominador > 0
      ? { tipo: "mandato", casa, periodo: ROTULO_PERIODO, participacao: part, diasAfastado: dias, textoAfastado, governismo: governismo(votacoes, votos, orientacoes, PERIODO_GOVERNO) }
      : p.status === "eleito" || p.status === "reeleito" ? { tipo: "primeiro_voto" } : { tipo: "sem_mandato", periodo: ROTULO_PERIODO };
  } else {
    numeros = p.status === "eleito" || p.status === "reeleito" ? { tipo: "primeiro_voto" } : { tipo: "sem_mandato", periodo: ROTULO_PERIODO };
  }

  let ceap: CeapCard | null = null;
  if (p.camaraId && numeros.tipo === "mandato" && numeros.casa === "camara") {
    const [despesas, medias] = await Promise.all([repo.getDespesas(p.id), repo.getMediasUf(p.uf)]);
    const ref = mesReferencia(medias);
    if (ref && despesas.length) {
      const doMes = despesas.find((d) => d.ano === ref.ano && d.mes === ref.mes);
      ceap = {
        mes: `${MESES[ref.mes - 1]}/${ref.ano}`, valor: doMes?.total ?? null, mediaUf: ref.media, uf: p.uf,
        urlOficial: `https://www.camara.leg.br/transparencia/gastos-parlamentares?legislatura=57&ano=${ref.ano}&mes=${ref.mes}&por=deputado&deputado=${p.camaraId}`,
      };
    }
  }

  let lista: ListaCard | null = null;
  if (p.cargo === "deputado_federal" && p.listaId) {
    const l = await repo.getLista(p.listaId);
    if (l) lista = { frase: fraseVotoContou(l, l.eleitos, l.uf), nomeCurto: nomeCurtoLista(l), nomeOficial: l.nome, eleitos: l.eleitos };
  }

  return {
    ...resumoCard(p), numeros, lista, concordancia: null, ceap,
    cobrar: p.email ? { email: p.email, href: hrefCobrar(p, p.email) } : null,
    urlPerfil: p.urlPerfil,
  };
}

/** Os números em uma linha, só com dado da fonte (texto do preview e da imagem OG). */
export function resumoNumeros(c: CardDados): string {
  const n = c.numeros;
  if (n.tipo === "primeiro_voto") return "primeiro voto em fevereiro de 2027";
  if (n.tipo === "sem_mandato") return `sem mandato no Congresso em ${n.periodo}`;
  const gov = pct(n.governismo);
  return `${n.casa === "senado" ? "Senado" : "Câmara"} ${n.periodo}: participação em votações ${pct(n.participacao)}${gov ? `, governismo ${gov}` : ""}`;
}

// Formatação pt-BR usada pelo card.
export const pct = (i: Indicador) => (i.percentual === null ? null : `${i.percentual.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`);
export const inteiro = (v: number) => v.toLocaleString("pt-BR");
export const reais = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
