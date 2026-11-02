/**
 * Mandatos e afastamentos a partir do histórico da Câmara e dos mandatos e licenças do Senado.
 * Uma regra só para a consolidação da sonda e para o cron (scripts/cron/parlamentares.ts).
 */
import type { HistoricoDeputado } from "./camara";
import type { LicencaSenado, MandatoSenado } from "./senado";
import type { Afastamento, Mandato } from "./types";

/** Legislatura N da Câmara: 1º/fev de 2023 − 4·(57 − N) até 31/jan quatro anos depois (CF, art. 44). */
const fimLegislatura = (n: number) => `${2027 - 4 * (57 - n)}-01-31`;

/**
 * Câmara: cada legislatura com posse ("Entrada", sem ser reassunção) vira um mandato, que termina
 * na saída definitiva ou no fim da legislatura (em curso = null). Afastamento = "Saída - Afastamento"
 * (não definitivo) até a reassunção seguinte; sem reassunção, até o fim do mandato.
 */
/**
 * A descrição pode vir com uma anotação livre antes do evento, separada por " / " (ex.: "SGM Adjunta
 * ... conversou com o deputado ... / Entrada - Posse de Eleito Titular"): o evento é o trecho que
 * começa com o prefixo procurado.
 */
const trecho = (descricao: string, prefixo: string) => descricao.split(" / ").map((x) => x.trim()).find((x) => x.startsWith(prefixo)) ?? null;

export function deHistoricoCamara(politicoId: string, historico: HistoricoDeputado[], hoje: string): { mandatos: Mandato[]; afastamentos: Afastamento[] } {
  const mandatos: Mandato[] = [], afastamentos: Afastamento[] = [];
  const ev = historico.filter((h) => h.situacao && h.descricao).sort((a, b) => a.dataHora.localeCompare(b.dataHora));
  for (const leg of [...new Set(ev.map((h) => h.legislatura))].sort()) {
    const doLeg = ev.filter((h) => h.legislatura === leg);
    const posse = doLeg.find((h) => { const t = trecho(h.descricao!, "Entrada"); return t !== null && !/Reassun/.test(t); });
    if (!posse) continue;
    const saida = doLeg.find((h) => trecho(h.descricao!, "Saída - Afastamento definitivo") !== null);
    const fimLeg = fimLegislatura(leg);
    const fim = saida ? saida.dataHora.slice(0, 10) : fimLeg < hoje ? fimLeg : null;
    mandatos.push({ politicoId, cargo: "deputado_federal", inicio: posse.dataHora.slice(0, 10), fim, titular: posse.condicaoEleitoral !== "Suplente" });
    let aberto: { inicio: string; motivo: string } | null = null;
    for (const h of doLeg) {
      const saidaTemp = trecho(h.descricao!, "Saída - Afastamento");
      if (saidaTemp && !saidaTemp.startsWith("Saída - Afastamento definitivo")) {
        aberto = { inicio: h.dataHora.slice(0, 10), motivo: saidaTemp.split(" - ").at(-1)! };
      } else if (aberto && /Reassun/.test(h.descricao!)) {
        afastamentos.push({ politicoId, ...aberto, fim: h.dataHora.slice(0, 10) }); aberto = null;
      }
    }
    if (aberto) afastamentos.push({ politicoId, ...aberto, fim });
  }
  return { mandatos, afastamentos };
}

/**
 * Senado: cada período de exercício de cada mandato; licenças oficiais como afastamentos. A API
 * repete a mesma licença (mesmo início e motivo) com fins diferentes, como prorrogação ou correção
 * (5 casos em 2023–26): fica o fim mais tardio, porque o período inteiro foi de licença.
 */
export function deSenado(politicoId: string, mandatosSenado: MandatoSenado[], licencas: LicencaSenado[], hoje: string): { mandatos: Mandato[]; afastamentos: Afastamento[] } {
  const mandatos: Mandato[] = [];
  for (const m of mandatosSenado) {
    const fimMandato = m.legislaturas.map((l) => l.fim).sort().at(-1)!;
    for (const e of m.exercicios) mandatos.push({ politicoId, cargo: "senador", inicio: e.inicio, fim: e.fim ?? (fimMandato < hoje ? fimMandato : null), titular: m.titular });
  }
  const porChave = new Map<string, Afastamento>();
  for (const l of licencas) {
    const a: Afastamento = { politicoId, inicio: l.inicio, fim: l.fim, motivo: l.descricao };
    const k = `${l.inicio}|${l.descricao}`, ja = porChave.get(k);
    if (!ja || (ja.fim !== null && (a.fim === null || a.fim > ja.fim))) porChave.set(k, a);
  }
  const afastamentos = [...porChave.values()];
  return { mandatos, afastamentos };
}
