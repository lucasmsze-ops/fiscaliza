import { describe, expect, it } from "vitest";
import { subsidioEm } from "../lib/salario";

describe("subsídio do Congresso (DL 172/2022)", () => {
  it("usa o valor em vigor na data", () => {
    expect(subsidioEm("2026-11-03")).toEqual({ valor: 46366.19, desde: "2025-02-01" });
    expect(subsidioEm("2025-01-31")).toEqual({ valor: 44008.52, desde: "2024-02-01" });
    expect(subsidioEm("2023-04-01")).toEqual({ valor: 41650.92, desde: "2023-04-01" });
  });
  it("antes do decreto não há valor", () => {
    expect(subsidioEm("2022-12-31")).toBeNull();
  });
});
