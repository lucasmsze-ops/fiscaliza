/** Normaliza para busca: sem acento, minúsculas, só letras e dígitos separados por espaço. Roda no servidor e no navegador. */
export const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Oculta números no formato de CPF em textos oficiais (descrição de votação, ementa). A fonte
 * publica, mas o Fiscaliza nunca grava CPF (CLAUDE.md). Ex.: votação sobre prisão de deputado.
 */
export const semCpf = (s: string) => s.replace(/\d{3}\.\d{3}\.\d{3}-\d{2}/g, "[CPF omitido]");
