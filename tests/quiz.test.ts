import { describe, expect, it } from "vitest";
import { concordanciaQuiz, exibivel, lerRespostas, votacaoDiscordante, type VotoQuiz } from "../lib/quiz";

// Casos de borda com dados mínimos (não são dados de interface; só exercitam a aritmética).
const v = (itemId: string, voto: VotoQuiz["voto"]): VotoQuiz => ({ itemId, titulo: itemId, materia: itemId, data: "2025-01-01", voto });

describe("quiz", () => {
  const votos = [v("a", "sim"), v("b", "nao"), v("c", "ausente"), v("d", "sim"), v("e", null), v("f", "abstencao")];
  it("concordância só conta perguntas respondidas em que o político votou Sim ou Não", () => {
    expect(concordanciaQuiz({ a: "sim", b: "sim", c: "sim", d: "sim", e: "nao", f: "sim" }, votos)).toEqual({ numerador: 2, denominador: 3, percentual: 66.7 });
  });
  it("mínimo de 3 votos comparáveis para mostrar o percentual", () => {
    expect(exibivel(concordanciaQuiz({ a: "sim", b: "nao" }, votos))).toBe(false); // 2 de 2: poucos
    expect(exibivel(concordanciaQuiz({ a: "sim", b: "nao", d: "nao" }, votos))).toBe(true); // 2 de 3
    expect(exibivel(concordanciaQuiz({}, votos))).toBe(false);
  });
  it("votação discordante: a primeira, na ordem do quiz, com Sim/Não diferente da resposta", () => {
    expect(votacaoDiscordante({ a: "sim", b: "sim", d: "nao" }, votos)?.itemId).toBe("b");
    expect(votacaoDiscordante({ a: "sim", c: "nao" }, votos)).toBeNull(); // ausência não é discordância
  });
  it("respostas do localStorage são validadas", () => {
    expect(lerRespostas('{"pec-45-2019":"sim","x":"talvez","<b>":"nao"}')).toEqual({ "pec-45-2019": "sim" });
    expect(lerRespostas("[1]")).toEqual({});
    expect(lerRespostas("lixo")).toEqual({});
  });
});
