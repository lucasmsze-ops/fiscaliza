/** Normaliza para busca: sem acento, minúsculas, só letras e dígitos separados por espaço. Roda no servidor e no navegador. */
export const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
