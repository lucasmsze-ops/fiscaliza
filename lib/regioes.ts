/** Regiões e nomes dos estados (IBGE), para o mapa e os filtros. Cores das regiões: as do protótipo. */
export const NOME_UF: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia", CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo",
  GO: "Goiás", MA: "Maranhão", MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais", PA: "Pará", PB: "Paraíba",
  PR: "Paraná", PE: "Pernambuco", PI: "Piauí", RJ: "Rio de Janeiro", RN: "Rio Grande do Norte", RS: "Rio Grande do Sul",
  RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina", SP: "São Paulo", SE: "Sergipe", TO: "Tocantins",
};

export const REGIOES = [
  { k: "N", nome: "Norte", cor: "#65a556", ufs: ["AC", "AM", "AP", "PA", "RO", "RR", "TO"] },
  { k: "NE", nome: "Nordeste", cor: "#b07a12", ufs: ["AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE"] },
  { k: "CO", nome: "Centro-Oeste", cor: "#9f7ed6", ufs: ["DF", "GO", "MS", "MT"] },
  { k: "SE", nome: "Sudeste", cor: "#b0508a", ufs: ["ES", "MG", "RJ", "SP"] },
  { k: "S", nome: "Sul", cor: "#1aa3c2", ufs: ["PR", "RS", "SC"] },
] as const;

export const regiaoDe = (uf: string) => REGIOES.find((r) => (r.ufs as readonly string[]).includes(uf));

/** "pelo Pará", "pela Bahia", "por São Paulo": como se diz que alguém representa o estado. */
const PREPOSICAO_UF: Record<string, string> = {
  AC: "pelo", AL: "por", AP: "pelo", AM: "pelo", BA: "pela", CE: "pelo", DF: "pelo", ES: "pelo", GO: "por", MA: "pelo",
  MT: "por", MS: "por", MG: "por", PA: "pelo", PB: "pela", PR: "pelo", PE: "por", PI: "pelo", RJ: "pelo", RN: "pelo",
  RS: "pelo", RO: "por", RR: "por", SC: "por", SP: "por", SE: "por", TO: "pelo",
};
export const pelaUf = (uf: string) => (NOME_UF[uf] ? `${PREPOSICAO_UF[uf]} ${NOME_UF[uf]}` : uf);
