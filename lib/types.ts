/**
 * Tipos internos do Fiscaliza (revisados na E8 com o dado real da sonda).
 *
 * Nenhum componente ou script conhece o shape das APIs (TSE, Câmara, Senado): os adapters em
 * `lib/{tse,camara,senado}.ts` convertem para estes tipos.
 *
 * Persistência: `data/*.json` (protótipo) e as tabelas do Supabase (passo 3) guardam as mesmas
 * linhas em snake_case. `Linha<T>` deriva o tipo da linha deste arquivo; `lib/linhas.ts` converte.
 * Um tipo por tabela; campos opcionais são `null`, nunca omitidos e nunca preenchidos por placeholder.
 */

export type Cargo = "deputado_federal" | "senador";

export type Casa = "camara" | "senado";

/**
 * Situação em relação ao mandato que começa em 01/02/2027 (deputado) ou ao exercício atual (senador).
 * - reeleito: eleito em 2026 para o cargo que já exerce (join por CPF com a Câmara/Senado).
 * - eleito: eleito em 2026 sem exercer o mesmo cargo hoje.
 * - suplente / nao_eleito: resultado do TSE em 2026.
 * - em_exercicio: senador com mandato até 2031 ou 2027 que não concorreu em 2026.
 */
export type Status = "eleito" | "reeleito" | "nao_eleito" | "suplente" | "em_exercicio";

/** Tabela `politicos`. Um registro por pessoa; `id` = `slug`. */
export interface Politico {
  id: string;
  /** Cargo que o card mostra: o disputado em 2026, ou o exercido para quem não disputou. */
  cargo: Cargo;
  /** Nome civil (TSE ou Senado). */
  nome: string;
  /** Nome de urna do TSE, como a fonte escreve. */
  nomeUrna: string;
  /** Gênero declarado ao TSE (`DS_GENERO`) ou no Senado (`SexoParlamentar`); flexiona os rótulos do card. */
  genero: "feminino" | "masculino" | null;
  slug: string;
  uf: string;
  /** Partido mais recente: Câmara/Senado para quem está em exercício, TSE 2026 para os demais. */
  partido: string;
  /** Lista do quociente (deputado 2026): `listas.id`. Null para senador e para quem não disputou. */
  listaId: string | null;
  /** Nome oficial da federação no TSE 2026, se o partido concorreu federado. */
  federacao: string | null;
  numeroUrna: string | null;
  /** Câmara > Senado > URL pública do TSE (resultados.tse.jus.br). Nunca proxiada. */
  fotoUrl: string | null;
  /** E-mail oficial do gabinete (Câmara `gabinete.email`, Senado `EmailParlamentar`). */
  email: string | null;
  /** Página oficial do parlamentar, se existir. */
  urlPerfil: string | null;
  tseSqCandidato: string | null;
  camaraId: number | null;
  senadoCodigo: string | null;
  status: Status;
  /** Votos válidos no estado em 2026; null para quem não disputou. */
  votos2026: number | null;
  updatedAt: string;
}

/** Tabela `mandatos`: períodos em exercício do cargo (posse → saída), da Câmara ou do Senado. */
export interface Mandato {
  politicoId: string;
  cargo: Cargo;
  /** ISO date. */
  inicio: string;
  /** ISO date; null = em curso. */
  fim: string | null;
  titular: boolean;
}

/**
 * Tabela `afastamentos`: licenças dentro de um mandato (secretaria de estado, saúde, missão...).
 * Fonte: `/deputados/{id}/historico` (Licença → Reassunção) e `/senador/{codigo}/licencas`.
 * Ficam à parte: a participação não os desconta (decisão pendente, docs/SONDA.md).
 */
export interface Afastamento {
  politicoId: string;
  inicio: string;
  fim: string | null;
  motivo: string;
}

/** Tabela `listas`: partido isolado ou federação no sistema proporcional (E7). */
export interface ListaEleitoral {
  /** Ex.: "sp-2026-deputado_federal-f102". */
  id: string;
  uf: string;
  ano: number;
  cargo: Cargo;
  /** Sigla do partido isolado ou nome oficial da federação. */
  nome: string;
  /** Composição da federação (ex.: "PSOL/REDE"); null para partido isolado. */
  composicao: string | null;
  votosValidos: number;
  /** Total de vagas obtidas pela lista (QP + médias). */
  eleitos: number;
}

/** Tabela `municipios`: códigos TSE e IBGE (join por nome, de-para revisado). */
export interface Municipio {
  ibge: number;
  tse: string;
  nome: string;
  uf: string;
}

/** Tabela `eleitos_mun`: top-20 por município e cargo (fonte: TSE), com os empatados no 20º. */
export interface EleitoMunicipio {
  municipioIbge: number;
  cargo: Cargo;
  politicoId: string;
  votos: number;
  /** 1 = mais votado no município. Empatados têm a mesma posição. */
  posicao: number;
}

/** Tabela `despesas_mes`: CEAP líquida (estornos somados) por deputado e mês. */
export interface DespesaMes {
  politicoId: string;
  ano: number;
  mes: number;
  total: number;
  porCategoria: Record<string, number>;
}

/** Tabela `despesas_media_uf`: média da bancada da UF no mês (só deputados com lançamento). */
export interface DespesaMediaUf {
  uf: string;
  ano: number;
  mes: number;
  media: number;
  deputados: number;
  total: number;
  /** Total idêntico em duas coletas, e todos os meses anteriores também (`lib/ceap.ts`). O card usa o último fechado. */
  fechado: boolean;
}

export interface Placar {
  sim: number;
  nao: number;
  abstencao: number;
  obstrucao: number;
}

/** Tabela `votacoes`: votações nominais do plenário das duas Casas. */
export interface Votacao {
  /** `${casa}:${idExterno}` — os ids das duas Casas não têm relação. */
  id: string;
  idExterno: string;
  casa: Casa;
  data: string;
  /** Matéria principal, ex.: "PEC 45/2019". */
  proposicao: string | null;
  ementa: string | null;
  /** Objeto imediato quando difere da matéria (requerimento, emenda, destaque). */
  objeto: string | null;
  descricao: string;
  resultado: "aprovada" | "rejeitada" | null;
  /** Null em votação secreta (Senado): a fonte não publica a direção dos votos. */
  placar: Placar | null;
  secreta: boolean;
  urlOficial: string;
  /** Entra no quiz de concordância (docs/QUIZ.md). */
  quiz: boolean;
}

/**
 * Os 5 valores de `tipoVoto` da Câmara, mais:
 * - `nao_informado`: voto registrado cujo valor a fonte não divulga (Câmara: `tipoVoto: null`
 *   em votações de pessoa; Senado: "NA – dispositivo não citado").
 * - `secreto`: votação secreta do Senado — a API diz só "Votou". Conta como participação,
 *   nunca entra em governismo ou concordância.
 * - `ausente`: não registrou voto (Câmara: não aparece no array; Senado: qualquer sigla de
 *   comparecimento — licença, missão, "presente, não registrou voto"...).
 */
export type TipoVoto = "sim" | "nao" | "abstencao" | "obstrucao" | "art17" | "nao_informado" | "secreto" | "ausente";

/**
 * Tabela `votos`. Câmara: só votos registrados (ausência é implícita). Senado: os 81 aparecem,
 * e a ausência vem com a sigla do motivo em `detalhe`.
 */
export interface Voto {
  votacaoId: string;
  politicoId: string;
  voto: TipoVoto;
  /** Sigla crua do painel do Senado quando informa algo além do voto (ex.: "MIS", "LS", "P-NRV"). */
  detalhe: string | null;
}

/** Tabela `orientacoes`. Vocabulário normalizado: "Sim", "Não", "Obstrução", "Liberado" ou "". */
export interface Orientacao {
  votacaoId: string;
  /** Ex.: "Governo", "PT", "PL", "Minoria". Grafia da fonte. */
  bancada: string;
  orientacao: string;
}

/** Tabela `quiz`: uma pergunta liga a votação de mérito da mesma matéria em cada Casa. */
export interface QuizItem {
  id: string;
  ordem: number;
  /** Matéria como a Câmara identifica (o Senado pode renumerar); só Senado quando a Câmara não votou. */
  materia: string;
  /** Nome curto e neutro, tirado da ementa. */
  titulo: string;
  /** Ementa oficial. */
  ementa: string;
  /** Três parágrafos: o que faz (ementa e palavras-chave oficiais), o que foi votado (dados), o que aconteceu depois (situação oficial). */
  explicacao: string[];
  /** Páginas oficiais da matéria e inteiro teor. */
  fontes: { rotulo: string; url: string }[];
  votacaoCamaraId: string | null;
  votacaoSenadoId: string | null;
}

/** Proposições de autoria (E-futura). Mantido do modelo; ainda sem dado na sonda. */
export interface Proposicao {
  idExterno: string;
  casa: Casa;
  politicoId: string;
  tipo: string;
  numero: number;
  ano: number;
  ementa: string;
  data: string;
  /** true só quando o político é proponente, não coautor. */
  proponente: boolean;
  status: string | null;
  urlOficial: string;
}

// ---------------------------------------------------------------- linhas (snake_case)

type Digito = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
/** camelCase → snake_case no nível de tipo; um bloco de dígitos vira um segmento (`votos2026` → `votos_2026`). */
type Snake<S extends string, Ant extends string = ""> = S extends `${infer H}${infer T}`
  ? `${H extends Digito
      ? Ant extends Digito | "" ? H : `_${H}`
      : H extends Lowercase<H> ? H : `_${Lowercase<H>}`}${Snake<T, H>}`
  : S;

/** Tipo da linha persistida: as mesmas chaves em snake_case (`nomeUrna` → `nome_urna`, `votos2026` → `votos_2026`). */
export type Linha<T> = { [K in keyof T & string as Snake<K>]: T[K] };
