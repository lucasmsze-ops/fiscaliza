import { describe, expect, it } from "vitest";
import { distribuirVagas, nomeCurtoLista, quocienteEleitoral, type Lista } from "../lib/quociente";

// Casos de borda com dados mínimos (não são dados de interface; só exercitam a aritmética).
const lista = (id: string, legenda: number, ...votos: number[]): Lista =>
  ({ id, votosLegenda: legenda, candidatos: votos.map((v, i) => ({ id: `${id}${i + 1}`, votos: v })) });

describe("quocienteEleitoral", () => {
  it("despreza fração ≤ 0,5 e arredonda para cima acima disso", () => {
    expect(quocienteEleitoral(1000, 3)).toBe(333); // 333,33
    expect(quocienteEleitoral(1001, 2)).toBe(500); // 500,5 → 500
    expect(quocienteEleitoral(1003, 2)).toBe(501); // 501,5 → 501
    expect(quocienteEleitoral(1005, 4)).toBe(251); // 251,25 → 251
    expect(quocienteEleitoral(1007, 4)).toBe(252); // 251,75 → 252
  });
});

describe("distribuirVagas", () => {
  it("QP desprezando a fração e sobras pela maior média", () => {
    // 10 vagas, 1000 válidos → QE 100. A: 450 → QP 4; B: 350 → QP 3; C: 200 → QP 2. Sobra 1.
    // Médias: A 450/5 = 90, B 350/4 = 87,5, C 200/3 = 66,7 → A.
    const d = distribuirVagas(10, [lista("A", 0, 100, 100, 100, 100, 50), lista("B", 50, 100, 100, 50, 50), lista("C", 0, 100, 50, 50)]);
    expect(d.qe).toBe(100);
    expect(d.listas.map((l) => [l.id, l.vagasQP, l.preenchidasQP, l.vagasMedia, l.total])).toEqual([["A", 4, 4, 1, 5], ["B", 3, 3, 0, 3], ["C", 2, 2, 0, 2]]);
    expect(d.eleitos.filter((e) => e.por === "media")).toEqual([{ candidatoId: "A5", listaId: "A", por: "media", rodada: 1 }]);
  });

  it("vaga de QP sem candidato com 10% do QE vai para as sobras, e o divisor usa as vagas obtidas", () => {
    // 4 vagas, QE 100. A: 300 válidos (legenda 270) → QP 3, mas só 1 candidato com ≥ 10 votos.
    // B: 100 → QP 1. Sobram 2. Fase 1: A não tem candidato com 20% restante; B também não → fase 2.
    const d = distribuirVagas(4, [lista("A", 270, 25, 3, 2), lista("B", 0, 95, 5)]);
    expect(d.qe).toBe(100);
    const a = d.listas.find((l) => l.id === "A")!;
    expect([a.vagasQP, a.preenchidasQP]).toEqual([3, 1]);
    // Fase 2: médias A 300/(3+0+1) = 75, B 100/(1+0+1) = 50 → A, depois A 300/5 = 60 vs B 50 → A.
    expect(d.eleitos.filter((e) => e.por !== "qp").map((e) => [e.candidatoId, e.por])).toEqual([["A2", "media_sem_exigencia"], ["A3", "media_sem_exigencia"]]);
    expect(d.vagasNaoPreenchidas).toBe(0);
  });

  it("fase 1 exige 80% do QE na lista e 20% do QE no candidato", () => {
    // 5 vagas, 500 válidos → QE 100. A: 190 → QP 1, média 95. B: 79 (< 80%) com candidato de 79.
    // C: 231 → QP 2, média 77, candidato restante com 21. Sobram 2.
    const d = distribuirVagas(5, [lista("A", 0, 100, 90), lista("B", 0, 79), lista("C", 0, 110, 100, 21)]);
    // Rodada 1 (fase 1): A 190/2 = 95 > C 231/3 = 77 → A2 (90 ≥ 20).
    // Rodada 2 (fase 1): A sem candidato; B fora (79 < 80); C 231/3 = 77 → C3 (21 ≥ 20).
    expect(d.eleitos.filter((e) => e.por !== "qp").map((e) => [e.candidatoId, e.por, e.rodada])).toEqual([["A2", "media", 1], ["C3", "media", 2]]);
  });

  it("fase 2 abre a todas as listas, inclusive abaixo de 80% do QE", () => {
    // 3 vagas, 300 válidos → QE 100. A: 200 → QP 2. B: 70, sem 80%. Sobra 1; ninguém na fase 1.
    // Fase 2: A 200/3 = 66,7 < B 70/1 = 70 → B.
    const d = distribuirVagas(3, [lista("A", 0, 150, 50), lista("B", 0, 40, 30)]);
    expect(d.eleitos.at(-1)).toEqual({ candidatoId: "B1", listaId: "B", por: "media_sem_exigencia", rodada: 1 });
  });

  it("empate de votos entre candidatos: o mais idoso", () => {
    const d = distribuirVagas(1, [{ id: "A", votosLegenda: 0, candidatos: [{ id: "novo", votos: 50, nascimento: "1990-01-01" }, { id: "velho", votos: 50, nascimento: "1960-01-01" }] }]);
    expect(d.eleitos[0]!.candidatoId).toBe("velho");
  });
});

describe("nomeCurtoLista", () => {
  it("partido isolado pela sigla; federação pela composição do TSE", () => {
    expect(nomeCurtoLista({ nome: "PL", composicao: null })).toBe("PL");
    expect(nomeCurtoLista({ nome: "FEDERAÇÃO BRASIL DA ESPERANÇA - FE BRASIL", composicao: "PT/PC do B/PV" })).toBe("Federação PT/PC do B/PV");
  });
});
