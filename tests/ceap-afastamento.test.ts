import { describe, expect, it } from "vitest";
import { fechadosAte, fecharMeses, mediasPorUf, mesesFechados, SEM_TIPO, somarPorMes } from "../lib/ceap";
import { diasAfastado } from "../lib/indicadores";

// Casos de borda com dados mínimos (não são dados de interface; só exercitam a aritmética).
describe("mesesFechados", () => {
  const m = (mes: number, total: number) => ({ ano: 2026, mes, total });
  it("fecha os meses iguais nas duas coletas e para no primeiro que mudou", () => {
    const fechados = mesesFechados([m(1, 10), m(2, 20), m(3, 31), m(4, 40)], [m(1, 10), m(2, 20), m(3, 30), m(4, 40)]);
    expect([...fechados]).toEqual([202601, 202602]); // abril igual, mas depois de março aberto: não fecha
  });
  it("mês que não existia na coleta anterior não fecha; centavos contam", () => {
    expect(mesesFechados([m(1, 10.01)], [m(1, 10)]).size).toBe(0);
    expect(mesesFechados([m(1, 10)], []).size).toBe(0);
  });
});

describe("fecharMeses e fechadosAte", () => {
  const m = (mes: number, total: number, fechado = false) => ({ ano: 2026, mes, total, fechado });
  it("com 20 dias ou mais entre as coletas, fecha o que ficou igual", () => {
    expect([...fecharMeses([m(1, 10), m(2, 20)], [m(1, 10), m(2, 20)], 29)]).toEqual([202601, 202602]);
  });
  it("com coleta anterior recente, nenhum mês novo fecha; o já fechado e igual continua", () => {
    expect([...fecharMeses([m(1, 10), m(2, 20)], [m(1, 10, true), m(2, 20)], 1)]).toEqual([202601]);
    expect([...fecharMeses([m(1, 11), m(2, 20)], [m(1, 10, true), m(2, 20)], 1)]).toEqual([]); // mudou: reabre
  });
  it("fechadosAte corta no limite", () => {
    expect([...fechadosAte([m(6, 1), m(7, 1), m(8, 1)], 202607)]).toEqual([202606, 202607]);
  });
});

describe("somarPorMes e mediasPorUf", () => {
  it("soma líquida por mês e categoria, sem erro de ponto flutuante; tipo nulo vira SEM_TIPO", () => {
    const g = somarPorMes([
      { ano: 2026, mes: 1, tipo: "A", valor: 0.1 }, { ano: 2026, mes: 1, tipo: "A", valor: 0.2 },
      { ano: 2026, mes: 1, tipo: null, valor: 100 }, { ano: 2026, mes: 1, tipo: "A", valor: -0.3 },
      { ano: 2025, mes: 12, tipo: "B", valor: 5 },
    ]);
    expect(g).toEqual([
      { ano: 2025, mes: 12, total: 5, porCategoria: { B: 5 } },
      { ano: 2026, mes: 1, total: 100, porCategoria: { A: 0, [SEM_TIPO]: 100 } },
    ]);
  });
  it("média = soma ÷ quem lançou no mês, por UF", () => {
    const r = mediasPorUf([
      { uf: "AC", ano: 2026, mes: 1, total: 10 }, { uf: "AC", ano: 2026, mes: 1, total: 20.01 },
      { uf: "AC", ano: 2026, mes: 2, total: 7 }, { uf: "AP", ano: 2026, mes: 1, total: 1 },
    ]);
    expect(r).toEqual([
      { uf: "AC", ano: 2026, mes: 1, media: 15.01, parlamentares: 2, total: 30.01 },
      { uf: "AC", ano: 2026, mes: 2, media: 7, parlamentares: 1, total: 7 },
      { uf: "AP", ano: 2026, mes: 1, media: 1, parlamentares: 1, total: 1 },
    ]);
  });
});

describe("diasAfastado", () => {
  const P = { inicio: "2023-01-01", fim: "2026-12-31" };
  it("conta dias inclusivos, une sobreposições e recorta no período e em hoje", () => {
    expect(diasAfastado([{ inicio: "2023-03-01", fim: "2023-03-10" }], P, "2026-11-01")).toBe(10);
    expect(diasAfastado([{ inicio: "2023-03-01", fim: "2023-03-10" }, { inicio: "2023-03-05", fim: "2023-03-12" }], P, "2026-11-01")).toBe(12);
    expect(diasAfastado([{ inicio: "2022-12-30", fim: "2023-01-02" }], P, "2026-11-01")).toBe(2);
    expect(diasAfastado([{ inicio: "2026-10-30", fim: null }], P, "2026-11-01")).toBe(3);
  });
  it("faixas encostadas viram uma; nenhuma → 0", () => {
    expect(diasAfastado([{ inicio: "2024-01-01", fim: "2024-01-05" }, { inicio: "2024-01-06", fim: "2024-01-06" }], P, "2026-11-01")).toBe(6);
    expect(diasAfastado([], P, "2026-11-01")).toBe(0);
  });
});
