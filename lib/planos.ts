/**
 * PDFs dos planos de governo dos eleitos de 2026 (E23n), na release `planos-2026` do GitHub (decisão do usuário de
 * 2026-11-20: custo zero, fora do repositório). `data/planos/2026.json` é gerado por `scripts/tse/planos.py` a partir
 * dos zips oficiais do TSE; os arquivos são os do TSE, sem alteração.
 */
import dados from "@/data/planos/2026.json";

export interface ArquivoPlano { nome: string; bytes: number; url: string }

const INDICE = dados as { zip: string; planos: Record<string, ArquivoPlano[]> };

/** Os PDFs do plano registrado no TSE (alguns eleitos registraram em partes); vazio se o TSE não tiver. */
export const arquivosDoPlano = (tseSqCandidato: string): ArquivoPlano[] => INDICE.planos[tseSqCandidato] ?? [];

/** O zip oficial do TSE com os planos de todos os candidatos do estado (BR para presidente). */
export const zipDoTse = (uf: string | null) => INDICE.zip.replace("{uf}", uf ?? "BR");

/** "7,4 MB". */
export const tamanho = (bytes: number) => `${(bytes / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
