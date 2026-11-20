/** Normaliza para busca: sem acento, minúsculas, só letras e dígitos separados por espaço. Roda no servidor e no navegador. */
export const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Oculta números no formato de CPF em textos oficiais (descrição de votação, ementa). A fonte
 * publica, mas o Fiscaliza nunca grava CPF (CLAUDE.md). Ex.: votação sobre prisão de deputado.
 */
export const semCpf = (s: string) => s.replace(/\d{3}\.\d{3}\.\d{3}-\d{2}/g, "[CPF omitido]");

/** Slug do político: nome de urna + UF (decisão de 2026-11-01), ex.: "kiko-celeguim-sp". */
export const slugPolitico = (nomeUrna: string, uf: string) =>
  `${nomeUrna.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${uf.toLowerCase()}`;

/**
 * Telefone de gabinete do Congresso para mostrar e para ligar. A Câmara ("3215-5966") e o Senado ("33032191") escrevem
 * sem o DDD: os gabinetes ficam em Brasília (61). Com DDD, mantém o que veio. Sem dígitos suficientes, null.
 */
export function telefoneGabinete(t: string | null | undefined): { texto: string; tel: string } | null {
  const d = (t ?? "").replace(/\D/g, "").replace(/^0+/, "").replace(/^55(?=\d{10,11}$)/, "");
  const com = d.length === 8 || d.length === 9 ? `61${d}` : d;
  if (com.length !== 10 && com.length !== 11) return null;
  const ddd = com.slice(0, 2), num = com.slice(2);
  return { texto: `(${ddd}) ${num.slice(0, -4)}-${num.slice(-4)}`, tel: `+55${com}` };
}
