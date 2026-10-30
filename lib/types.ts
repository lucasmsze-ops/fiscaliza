/**
 * Tipos internos do Fiscaliza.
 *
 * Nenhum componente ou script conhece o shape das APIs (TSE, Câmara, Senado):
 * os adapters em `lib/{tse,camara,senado}.ts` convertem para estes tipos.
 * Versão inicial (E0); será revisada na E8 com o que o dado real mostrar.
 */

export type Cargo = "deputado_federal" | "senador";

export type Casa = "camara" | "senado";

/** Situação do político em relação ao mandato que começa em 01/02/2027. */
export type Status =
  | "eleito"
  | "reeleito"
  | "nao_eleito"
  | "suplente"
  | "em_exercicio";

export interface Politico {
  /** Identificador interno estável (slug + cargo). */
  id: string;
  cargo: Cargo;
  nome: string;
  nomeUrna: string;
  slug: string;
  uf: string;
  partido: string;
  /** Federação partidária, se houver (tratada como lista única no quociente). */
  federacao: string | null;
  fotoUrl: string | null;
  /** SHA-256 do CPF. Nunca o CPF. Usado só para o join entre fontes. */
  cpfHash: string | null;
  tseSqCandidato: string | null;
  camaraId: number | null;
  senadoCodigo: string | null;
  status: Status;
  votos2026: number | null;
  updatedAt: string;
}

export interface Mandato {
  politicoId: string;
  cargo: Cargo;
  /** ISO date. */
  inicio: string;
  fim: string | null;
  titular: boolean;
}

/** Linha do top-20 de votação por município e cargo (fonte: TSE). */
export interface EleitoMunicipio {
  municipioIbge: string;
  cargo: Cargo;
  politicoId: string;
  votos: number;
  /** 1 = mais votado no município. */
  posicao: number;
}

export interface DespesaMes {
  politicoId: string;
  ano: number;
  mes: number;
  total: number;
  porCategoria: Record<string, number>;
}

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

export interface Votacao {
  idExterno: string;
  casa: Casa;
  data: string;
  objeto: string;
  resultado: string | null;
  urlOficial: string;
  /** Entra no quiz de concordância. */
  quiz: boolean;
}

/**
 * Os 5 valores de `tipoVoto` da Câmara, mais `nao_informado` (voto registrado com
 * `tipoVoto: null`, visto em votações de pessoa) e `ausente` (quem não aparece no array
 * de votos). Todos tratados explicitamente no cálculo de participação.
 */
export type TipoVoto =
  | "sim"
  | "nao"
  | "abstencao"
  | "obstrucao"
  | "art17"
  | "nao_informado"
  | "ausente";

export interface Voto {
  votacaoId: string;
  politicoId: string;
  voto: TipoVoto;
}

export interface Orientacao {
  votacaoId: string;
  /** Ex.: "Governo", "PT", "PL", "Minoria". */
  bancada: string;
  orientacao: string;
}
