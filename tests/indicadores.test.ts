import { describe, expect, it } from "vitest";
import { concordancia, governismo, participacao } from "../lib/indicadores";
import type { Orientacao, Votacao, Voto } from "../lib/types";

// Casos de borda com dados mínimos (não são dados de interface; só exercitam a aritmética).
const vot = (id: string, data = "2025-01-01"): Votacao =>
  ({ idExterno: id, casa: "camara", data, objeto: "", resultado: null, urlOficial: "", quiz: false });
const voto = (votacaoId: string, v: Voto["voto"]): Voto => ({ votacaoId, politicoId: "p", voto: v });
const ori = (votacaoId: string, orientacao: string, bancada = "Governo"): Orientacao => ({ votacaoId, bancada, orientacao });

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

describe("concordancia", () => {
  it("compara a resposta do usuário com o voto Sim/Não do político", () => {
    const votos = [voto("a", "sim"), voto("b", "nao"), voto("c", "abstencao")];
    expect(concordancia({ a: "sim", b: "sim", c: "sim" }, votos)).toEqual({ numerador: 1, denominador: 2, percentual: 50 });
  });
  it("sem resposta → null; político sem voto posicional → null", () => {
    expect(concordancia({}, [voto("a", "sim")]).percentual).toBeNull();
    expect(concordancia({ a: "sim" }, [voto("a", "ausente")]).percentual).toBeNull();
  });
});
