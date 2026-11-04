import { describe, expect, it } from "vitest";
import { semelhanca } from "../lib/comparacoes";

describe("quem vota mais parecido", () => {
  it("conta só as votações em que os dois votaram", () => {
    // 1 sim, 2 não, 0 = não votou (ausente, secreta, não divulgado)
    const a = Int8Array.from([1, 1, 2, 0, 1, 2]);
    const b = Int8Array.from([1, 2, 2, 1, 0, 2]);
    expect(semelhanca(a, b)).toEqual({ comuns: 4, iguais: 3 });
  });
  it("sem votação em comum, zero e zero", () => {
    expect(semelhanca(Int8Array.from([1, 0]), Int8Array.from([0, 2]))).toEqual({ comuns: 0, iguais: 0 });
  });
});
