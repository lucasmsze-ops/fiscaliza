/**
 * Matérias da pauta do Plenário e seus autores (aba "Quem votei" da tela Monitorando, 2026-11-19): o item
 * da pauta traz a matéria como texto ("PL 479/2025"); aqui ela vira uma referência para achar, na tabela
 * `proposicoes`, quem do site é autor. Só a pauta e a autoria oficiais, sem nenhuma inferência.
 */
import type { Casa, ItemPauta } from "./types";

export interface MateriaRef { casa: Casa; tipo: string; numero: number; ano: number }

/** "PL 479/2025" → { tipo: "PL", numero: 479, ano: 2025 }; null se o texto não seguir esse formato. */
export function lerMateria(casa: Casa, texto: string | null): MateriaRef | null {
  const m = texto?.match(/^([A-Z]+)\s+(\d+)\/(\d{4})/);
  return m ? { casa, tipo: m[1]!, numero: Number(m[2]), ano: Number(m[3]) } : null;
}

export const chaveMateria = (m: Pick<MateriaRef, "casa" | "tipo" | "numero" | "ano">) => `${m.casa}:${m.tipo} ${m.numero}/${m.ano}`;

/** As matérias de um item: a própria e, num pedido (urgência, recurso), a matéria de que ele trata. */
export const materiasDoItem = (x: ItemPauta): MateriaRef[] =>
  [lerMateria(x.casa, x.materia), lerMateria(x.casa, x.relacionada)].filter((m): m is MateriaRef => m !== null);

/** Item da pauta com os autores do site (ids de políticos) da matéria ou da matéria relacionada. */
export interface ItemPautaAutores extends ItemPauta { autores: string[] }
