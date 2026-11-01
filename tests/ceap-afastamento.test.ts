import { describe, expect, it } from "vitest";
import { mesesFechados } from "../lib/ceap";
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
