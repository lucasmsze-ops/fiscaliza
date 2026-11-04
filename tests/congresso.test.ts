import { describe, expect, it } from "vitest";
import { bancadas, cadeirasHemiciclo, emExercicio, ordemDasCores } from "../lib/congresso";
import type { Afastamento, Mandato, Politico } from "../lib/types";

const mand = (politicoId: string, cargo: Mandato["cargo"] = "deputado_federal", fim: string | null = null): Mandato =>
  ({ politicoId, cargo, inicio: "2023-02-01", fim, titular: true });
const pol = (id: string, partido: string) => ({ id, nomeUrna: id.toUpperCase(), uf: "SP", partido }) as Politico;

describe("Plenário hoje", () => {
  it("titular licenciado não ocupa a cadeira; mandato encerrado também não", () => {
    const af: Afastamento[] = [{ politicoId: "a", inicio: "2026-10-01", fim: null, motivo: "Licença" }, { politicoId: "b", inicio: "2026-01-01", fim: "2026-02-01", motivo: "Licença" }];
    const r = emExercicio([mand("a"), mand("b"), mand("c", "deputado_federal", "2025-01-31")], af, "2026-11-04");
    expect(r.map((m) => m.politicoId)).toEqual(["b"]);
  });
  it("bancadas pelo tamanho, empate pelo nome do partido", () => {
    const ps = new Map(["x1", "x2", "y1", "z1"].map((id) => [id, pol(id, id[0] === "x" ? "XX" : id[0] === "y" ? "BB" : "AA")]));
    expect(bancadas(["x1", "x2", "y1", "z1"].map((id) => mand(id)), ps).map((b) => [b.partido, b.membros.length])).toEqual([["XX", 2], ["AA", 1], ["BB", 1]]);
  });
  it("cor pelo total das duas Casas: o mesmo partido tem a mesma cor nas duas", () => {
    const casa = (casa: "camara" | "senado", bs: [string, number][]) => ({ casa, total: 0, bancadas: bs.map(([partido, n]) => ({ partido, membros: Array.from({ length: n }, () => ({ id: "", nomeUrna: "", uf: "", fotoUrl: null })) })) });
    expect(ordemDasCores([casa("camara", [["A", 10], ["B", 9]]), casa("senado", [["B", 3], ["C", 2]])])).toEqual(["B", "A", "C"]);
  });
  it("hemiciclo: uma posição por cadeira, da esquerda para a direita", () => {
    for (const [n, f] of [[513, 12], [81, 5]] as const) {
      const pts = cadeirasHemiciclo(n, f);
      expect(pts).toHaveLength(n);
      expect(pts[0]!.x).toBeLessThan(0);
      expect(pts.at(-1)!.x).toBeGreaterThan(0);
      expect(pts.every((p) => p.y >= -1e-9 && Math.hypot(p.x, p.y) <= 1 + 1e-9)).toBe(true);
    }
  });
});

describe("Câmara a partir de fev/2027", () => {
  it("só eleitos e reeleitos a deputado federal", async () => {
    const { camaraEleita } = await import("../lib/congresso");
    const ps = [
      { id: "a", nomeUrna: "A", uf: "SP", partido: "X", cargo: "deputado_federal", status: "eleito", fotoUrl: null },
      { id: "b", nomeUrna: "B", uf: "SP", partido: "X", cargo: "deputado_federal", status: "reeleito", fotoUrl: null },
      { id: "c", nomeUrna: "C", uf: "SP", partido: "Y", cargo: "deputado_federal", status: "suplente", fotoUrl: null },
      { id: "d", nomeUrna: "D", uf: "SP", partido: "Y", cargo: "senador", status: "eleito", fotoUrl: null },
    ] as Politico[];
    const c = camaraEleita(ps);
    expect(c.total).toBe(2);
    expect(c.bancadas.map((b) => [b.partido, b.membros.length])).toEqual([["X", 2]]);
  });
});

describe("limitesDoMes", () => {
  it("último dia real do mês, inclusive fevereiro bissexto", async () => {
    const { limitesDoMes } = await import("../lib/congresso");
    expect(limitesDoMes("2026-11")).toEqual(["2026-11-01", "2026-11-30"]);
    expect(limitesDoMes("2026-02")).toEqual(["2026-02-01", "2026-02-28"]);
    expect(limitesDoMes("2028-02")).toEqual(["2028-02-01", "2028-02-29"]);
    expect(limitesDoMes("2026-12")).toEqual(["2026-12-01", "2026-12-31"]);
  });
});
