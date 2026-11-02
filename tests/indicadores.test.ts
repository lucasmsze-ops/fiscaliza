import { describe, expect, it } from "vitest";
import { governismo, participacao, type OrientacaoBase, type VotacaoBase, type VotoBase } from "../lib/indicadores";

// Casos de borda com dados mínimos (não são dados de interface; só exercitam a aritmética).
const vot = (id: string, data = "2025-01-01"): VotacaoBase => ({ id, data });
const voto = (votacaoId: string, v: VotoBase["voto"]): VotoBase => ({ votacaoId, voto: v });
const ori = (votacaoId: string, orientacao: string, bancada = "Governo"): OrientacaoBase => ({ votacaoId, bancada, orientacao });

describe("participacao", () => {
  it("conta Sim/Não/Abstenção/Obstrução/Art.17/não informado/secreto como voto registrado; ausente e quem não aparece, não", () => {
    const votacoes = ["a", "b", "c", "d", "e", "f", "g", "h", "i"].map((id) => vot(id));
    const votos = [voto("a", "sim"), voto("b", "nao"), voto("c", "abstencao"), voto("d", "obstrucao"), voto("e", "art17"), voto("f", "nao_informado"), voto("g", "secreto"), voto("h", "ausente")];
    expect(participacao(votacoes, votos)).toEqual({ numerador: 7, denominador: 9, percentual: 77.8 });
  });
  it("sem votações no período → percentual null", () => {
    expect(participacao([vot("a", "2024-05-05")], [], { inicio: "2025-01-01", fim: "2025-12-31" })).toEqual({ numerador: 0, denominador: 0, percentual: null });
  });
  it("ignora votos em votações fora da lista", () => {
    expect(participacao([vot("a")], [voto("zzz", "sim")]).percentual).toBe(0);
  });
  it("com mandatos, só conta votações dentro do exercício; sem mandato no período → null", () => {
    const votacoes = [vot("a", "2023-03-01"), vot("b", "2024-06-01"), vot("c", "2026-05-01")];
    const votos = [voto("b", "sim")];
    // Exercício de 2024-01-01 em diante (fim em curso): só b e c entram.
    expect(participacao(votacoes, votos, undefined, [{ inicio: "2024-01-01", fim: null }])).toEqual({ numerador: 1, denominador: 2, percentual: 50 });
    // Dois períodos com intervalo: a e c.
    expect(participacao(votacoes, votos, undefined, [{ inicio: "2023-01-01", fim: "2023-12-31" }, { inicio: "2026-01-01", fim: null }]).denominador).toBe(2);
    // Nenhum mandato: denominador 0, percentual null ("sem mandato no período").
    expect(participacao(votacoes, votos, undefined, [])).toEqual({ numerador: 0, denominador: 0, percentual: null });
  });
});

describe("governismo", () => {
  it("alinha Sim/Não/Obstrução com a orientação do Governo", () => {
    const votacoes = ["a", "b", "c"].map((id) => vot(id));
    const orientacoes = [ori("a", "Sim"), ori("b", "Não"), ori("c", "Obstrução")];
    const votos = [voto("a", "sim"), voto("b", "sim"), voto("c", "obstrucao")];
    expect(governismo(votacoes, votos, orientacoes)).toEqual({ numerador: 2, denominador: 3, percentual: 66.7 });
  });
  it("exclui do denominador: Liberado, orientação vazia, abstenção, ausência, art. 17, voto secreto e orientação de outra bancada", () => {
    const votacoes = ["lib", "vazia", "abst", "aus", "art", "sec", "outra", "ok"].map((id) => vot(id));
    const orientacoes = [ori("lib", "Liberado"), ori("vazia", ""), ori("abst", "Sim"), ori("aus", "Sim"), ori("art", "Sim"), ori("sec", "Sim"), ori("outra", "Sim", "PT"), ori("ok", "Não")];
    const votos = [voto("lib", "sim"), voto("vazia", "sim"), voto("abst", "abstencao"), voto("art", "art17"), voto("sec", "secreto"), voto("outra", "sim"), voto("ok", "nao")];
    expect(governismo(votacoes, votos, orientacoes)).toEqual({ numerador: 1, denominador: 1, percentual: 100 });
  });
  it("respeita o período de governo", () => {
    const votacoes = [vot("a", "2026-12-31"), vot("b", "2027-01-01")];
    const orientacoes = [ori("a", "Sim"), ori("b", "Sim")];
    const votos = [voto("a", "sim"), voto("b", "nao")];
    expect(governismo(votacoes, votos, orientacoes, { inicio: "2023-01-01", fim: "2026-12-31" }).percentual).toBe(100);
    expect(governismo(votacoes, votos, orientacoes, { inicio: "2027-01-01", fim: "2030-12-31" }).percentual).toBe(0);
  });
});
