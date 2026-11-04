/**
 * Sigla de partido numa grafia só. O TSE e as Casas escrevem algumas siglas de jeitos diferentes
 * (TSE "PCDOB", Câmara e Senado "PCdoB"): sem isso o mesmo partido vira duas bancadas. Vale a grafia
 * oficial do partido, a mesma da Câmara e do Senado.
 */
const CANONICA: Record<string, string> = { PCDOB: "PCdoB" };

export const siglaPartido = (s: string) => CANONICA[s.toUpperCase().replace(/\s+/g, "")] ?? s;
