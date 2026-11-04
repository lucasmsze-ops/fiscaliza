/**
 * Sigla de partido numa grafia só. O TSE e as Casas escrevem algumas siglas de jeitos diferentes
 * (TSE "PCDOB", Câmara e Senado "PCdoB"): sem isso o mesmo partido vira duas bancadas. Vale a grafia
 * oficial do partido, a mesma da Câmara e do Senado.
 */
const CANONICA: Record<string, string> = { PCDOB: "PCdoB" };

export const siglaPartido = (s: string) => CANONICA[s.toUpperCase().replace(/\s+/g, "")] ?? s;

/**
 * Nome completo por sigla (canônica): NM_PARTIDO do `consulta_cand` 2026 do TSE, em caixa de título.
 * Acentos e espaço duplo que o TSE omite ou repete (PRD, PSTU) corrigidos para o nome oficial.
 */
export const NOME_PARTIDO: Record<string, string> = {
  AGIR: "Agir", AVANTE: "Avante", CIDADANIA: "Cidadania", DC: "Democracia Cristã", DEMOCRATA: "Democrata",
  MDB: "Movimento Democrático Brasileiro", MISSÃO: "Partido Missão", MOBILIZA: "Mobilização Nacional", NOVO: "Partido Novo",
  PCB: "Partido Comunista Brasileiro", PCdoB: "Partido Comunista do Brasil", PCO: "Partido da Causa Operária",
  PDT: "Partido Democrático Trabalhista", PL: "Partido Liberal", PODE: "Podemos", PP: "Progressistas",
  PRD: "Partido Renovação Democrática", PRTB: "Partido Renovador Trabalhista Brasileiro", PSB: "Partido Socialista Brasileiro",
  PSD: "Partido Social Democrático", PSDB: "Partido da Social Democracia Brasileira", PSOL: "Partido Socialismo e Liberdade",
  PSTU: "Partido Socialista dos Trabalhadores Unificado", PT: "Partido dos Trabalhadores", PV: "Partido Verde",
  REDE: "Rede Sustentabilidade", REPUBLICANOS: "Republicanos", SOLIDARIEDADE: "Solidariedade", UNIÃO: "União Brasil",
  UP: "Unidade Popular", "S/Partido": "sem partido",
};

export const nomePartido = (sigla: string) => NOME_PARTIDO[siglaPartido(sigla)] ?? null;
