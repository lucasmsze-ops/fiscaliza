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
  { nome: "executivos", pk: ["id"] },
  { nome: "candidatos_executivo", pk: ["id"] },
  { nome: "eleitos_mun", pk: ["municipio_ibge", "cargo", "politico_id"] },
  { nome: "despesas_mes", pk: ["politico_id", "casa", "ano", "mes"] },
  { nome: "despesas_media_uf", pk: ["casa", "uf", "ano", "mes"] },
  { nome: "votacoes", pk: ["id"] },
  { nome: "votos", pk: ["votacao_id", "politico_id"] },
  { nome: "orientacoes", pk: ["votacao_id", "bancada"] },
  { nome: "proposicoes", pk: ["id"] },
  { nome: "proposicoes_autores", pk: ["proposicao_id", "politico_id"] },
  { nome: "proposicoes_contagem", pk: ["politico_id", "casa", "ano", "tipo"] },
  { nome: "proposicoes_executivo", pk: ["id"] },
  { nome: "atualizacoes", pk: ["fonte"] },
  { nome: "pauta", pk: ["id"] },
  { nome: "noticias", pk: ["id"] },
];

/** Tipos de proposição que podem virar lei ou norma (decisão de 2026-11-02): ficam com a íntegra; os outros, só contagem. */
export const TIPOS_LEGISLATIVOS = { camara: ["PL", "PLP", "PEC", "PDL", "PRC"], senado: ["PL", "PLP", "PEC", "PDL", "PRS"] } as const;
/** O que o Executivo federal envia e entra no crachá do presidente (E23t); mensagens (MSC) e concessões (TVR) ficam de fora. */
export const TIPOS_EXECUTIVO = ["MPV", "PL", "PLP", "PEC", "PLN"] as const;
