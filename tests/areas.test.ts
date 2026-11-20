import { describe, expect, it } from "vitest";
import { areasDeAtuacao } from "../lib/pagina";

describe("areasDeAtuacao (E23s)", () => {
  it("conta cada tema uma vez por proposta, com as que viraram norma, do mais frequente ao menos", () => {
    const r = areasDeAtuacao([
      { temas: ["Saúde", "Economia"], virouNorma: true },
      { temas: ["Saúde", "Saúde"], virouNorma: false },
      { temas: ["Economia"], virouNorma: false },
      { temas: ["Esporte e Lazer"], virouNorma: false },
      { temas: null, virouNorma: true },
      { virouNorma: false },
    ]);
    expect(r.comTema).toBe(4);
    expect(r.areas).toEqual([
      { tema: "Economia", total: 2, norma: 1 },
      { tema: "Saúde", total: 2, norma: 1 },
      { tema: "Esporte e Lazer", total: 1, norma: 0 },
    ]);
  });
  it("sem nenhum tema na fonte, não devolve áreas (a seção some)", () => {
    expect(areasDeAtuacao([{ temas: null, virouNorma: false }])).toEqual({});
  });
});
