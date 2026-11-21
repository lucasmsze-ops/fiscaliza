/**
 * Datas no fuso de Brasília. As fontes (Câmara, Senado, TSE) registram datas no horário de Brasília, e "hoje"
 * para o eleitor é o dia de Brasília. `new Date().toISOString().slice(0, 10)` dá o dia em UTC, que das 21h à
 * meia-noite já é o dia seguinte: a sessão da noite sumia de "Próximas votações" (2026-11-21).
 * Roda no servidor, no cron e no navegador.
 */

const FUSO = "America/Sao_Paulo";
/** en-CA formata como AAAA-MM-DD. */
const DIA = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" });

/** O dia (AAAA-MM-DD) em Brasília no instante dado; sem argumento, hoje. */
export const diaBrasil = (quando: Date = new Date()): string => DIA.format(quando);

/** Hoje em Brasília (AAAA-MM-DD). */
export const hojeBrasil = (): string => diaBrasil();

/** Soma dias a uma data AAAA-MM-DD (sem fuso: aritmética de calendário). */
export function somaDias(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
