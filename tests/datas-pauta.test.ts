import { describe, expect, it } from "vitest";
import { diaBrasil, somaDias } from "../lib/datas";
import { ultimaColeta } from "../lib/repo";
import { consertarCaracteres } from "../lib/texto";
import type { ItemPauta } from "../lib/types";

describe("datas no fuso de Brasília (2026-11-21)", () => {
  it("22h de Brasília ainda é o mesmo dia (em UTC já seria o seguinte)", () => {
    expect(diaBrasil(new Date("2026-11-22T01:30:00Z"))).toBe("2026-11-21");
    expect(diaBrasil(new Date("2026-11-22T03:00:00Z"))).toBe("2026-11-22");
  });
  it("soma dias atravessando mês e ano", () => {
    expect(somaDias("2026-12-25", 10)).toBe("2027-01-04");
    expect(somaDias("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("pauta: a coleta mais recente de cada Casa", () => {
  const item = (casa: "camara" | "senado", coletadoEm: string, ordem: number): ItemPauta => ({
    id: `${casa}:${ordem}`, casa, data: "2026-11-24", hora: null, sessao: "Sessão Deliberativa", ordem, materia: `PL ${ordem}/2026`, tipo: "PL",
    ementa: null, relacionada: null, ementaRelacionada: null, apreciacao: null, urlOficial: "https://exemplo", coletadoEm, temas: null,
  });
  it("a coleta da Câmara de ontem continua quando hoje só o Senado foi coletado", () => {
    const r = ultimaColeta([item("camara", "2026-11-20", 1), item("senado", "2026-11-20", 2), item("senado", "2026-11-21", 3)]);
    expect(r.map((x) => x.id)).toEqual(["camara:1", "senado:3"]);
  });
});

describe("caracteres que a Câmara grava como '?'", () => {
  it("espaço depois de nº, hífen e a ligadura fi; pergunta de verdade fica", () => {
    expect(consertarCaracteres("Lei nº?200 e Decreto?Lei nº?2.848; boa?fé; Grati?cações; Con?ança")).toBe("Lei nº 200 e Decreto-Lei nº 2.848; boa-fé; Gratificações; Confiança");
    expect(consertarCaracteres("Quem paga? O contribuinte.")).toBe("Quem paga? O contribuinte.");
  });
});
