/**
 * Regiões e nomes dos estados (IBGE), para o mapa e os filtros. Cores das regiões (pedido de 2026-11-14): Norte
 * verde, Nordeste laranja, Centro-Oeste roxo, Sudeste rosa, Sul azul, nos tons da paleta de partidos do Congresso
 * (skill dataviz), escolhidos para vizinhas se distinguirem com daltonismo (pior par ΔE 9,0 simulado). Roxo e
 * azul (Centro-Oeste e Sul) ficam mais próximos em visão normal (ΔE 13,4): o roxo é o mais fechado da paleta, e
 * as divisas e as siglas separam os estados.
 */
export const NOME_UF: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia", CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo",
  GO: "Goiás", MA: "Maranhão", MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais", PA: "Pará", PB: "Paraíba",
  PR: "Paraná", PE: "Pernambuco", PI: "Piauí", RJ: "Rio de Janeiro", RN: "Rio Grande do Norte", RS: "Rio Grande do Sul",
  RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina", SP: "São Paulo", SE: "Sergipe", TO: "Tocantins",
};

export const REGIOES = [
  { k: "N", nome: "Norte", cor: "#199e70", ufs: ["AC", "AM", "AP", "PA", "RO", "RR", "TO"] },
  { k: "NE", nome: "Nordeste", cor: "#d95926", ufs: ["AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE"] },
  { k: "CO", nome: "Centro-Oeste", cor: "#6250d6", ufs: ["DF", "GO", "MS", "MT"] },
  { k: "SE", nome: "Sudeste", cor: "#e87ba4", ufs: ["ES", "MG", "RJ", "SP"] },
  { k: "S", nome: "Sul", cor: "#3987e5", ufs: ["PR", "RS", "SC"] },
] as const;

/** Cor do texto sobre a cor de uma região (sigla no mapa, letra na lista): a de maior contraste (todas ≥ 4,4:1). */
const BRANCO_EM = new Set(["#6250d6"]);
export const rotuloRegiao = (cor: string) => (BRANCO_EM.has(cor) ? "#ffffff" : "#1c1c1e");

export const regiaoDe = (uf: string) => REGIOES.find((r) => (r.ufs as readonly string[]).includes(uf));

/** "pelo Pará", "pela Bahia", "por São Paulo": como se diz que alguém representa o estado. */
const PREPOSICAO_UF: Record<string, string> = {
  AC: "pelo", AL: "por", AP: "pelo", AM: "pelo", BA: "pela", CE: "pelo", DF: "pelo", ES: "pelo", GO: "por", MA: "pelo",
  MT: "por", MS: "por", MG: "por", PA: "pelo", PB: "pela", PR: "pelo", PE: "por", PI: "pelo", RJ: "pelo", RN: "pelo",
  RS: "pelo", RO: "por", RR: "por", SC: "por", SP: "por", SE: "por", TO: "pelo",
};
/** "do Paraná", "da Bahia", "de São Paulo": como se diz "de" com o nome do estado. */
export const doUf = (uf: string) => {
  const p = PREPOSICAO_UF[uf];
  return NOME_UF[uf] ? `${p === "pelo" ? "do" : p === "pela" ? "da" : "de"} ${NOME_UF[uf]}` : uf;
};

/** "o Paraná", "a Bahia", "São Paulo": o nome do estado com o artigo, quando ele leva. */
export const ufComArtigo = (uf: string) => {
  const p = PREPOSICAO_UF[uf];
  return NOME_UF[uf] ? `${p === "pelo" ? "o " : p === "pela" ? "a " : ""}${NOME_UF[uf]}` : uf;
};
export const pelaUf = (uf: string) => (NOME_UF[uf] ? `${PREPOSICAO_UF[uf]} ${NOME_UF[uf]}` : uf);
