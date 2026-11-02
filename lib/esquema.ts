/**
 * As tabelas na ordem de carga (chaves estrangeiras antes de quem as usa) e a chave primária de
 * cada uma: a mesma de `supabase/migrations/0001_init.sql` e de `scripts/sonda/validar.ts`.
 * Usado pelo seed, pela conferência e, depois, pelo cron (upsert por chave).
 */
export const TABELAS: readonly { nome: string; pk: readonly string[] }[] = [
  { nome: "listas", pk: ["id"] },
  { nome: "politicos", pk: ["id"] },
  { nome: "mandatos", pk: ["politico_id", "cargo", "inicio"] },
  { nome: "afastamentos", pk: ["politico_id", "inicio", "motivo"] },
  { nome: "municipios", pk: ["ibge"] },
  { nome: "eleitos_mun", pk: ["municipio_ibge", "cargo", "politico_id"] },
  { nome: "despesas_mes", pk: ["politico_id", "ano", "mes"] },
  { nome: "despesas_media_uf", pk: ["uf", "ano", "mes"] },
  { nome: "votacoes", pk: ["id"] },
  { nome: "votos", pk: ["votacao_id", "politico_id"] },
  { nome: "orientacoes", pk: ["votacao_id", "bancada"] },
];
