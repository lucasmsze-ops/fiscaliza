import { describe, expect, it } from "vitest";
import { CARGOS, deputadosEstaduais } from "../lib/cargos";
import { EXPLICA_OBJETO } from "../lib/votacao";
import { GLOSSARIO, hrefTermo } from "../lib/glossario";

describe("deputados estaduais pela bancada federal (art. 27)", () => {
  // Tamanho real das Assembleias: AC 24, PE 49, RJ 70, MG 77, SP 94.
  it.each([[8, 24], [12, 36], [25, 49], [46, 70], [53, 77], [70, 94]])("%i federais → %i estaduais", (f, e) => {
    expect(deputadosEstaduais(f)).toBe(e);
  });
});

describe("cargos", () => {
  it("ids únicos e toda regra com fonte oficial", () => {
    expect(new Set(CARGOS.map((c) => c.id)).size).toBe(CARGOS.length);
    for (const c of CARGOS) for (const x of [...c.fatos, ...c.faz]) expect(x.fonte.url).toMatch(/^https:\/\/www\.planalto\.gov\.br\//);
  });
});

describe("dicionário", () => {
  it("a página da votação usa o texto do verbete", () => {
    expect(EXPLICA_OBJETO.destaque).toBe("um destaque: um trecho separado para ser votado à parte, que fica ou sai do texto");
    expect(EXPLICA_OBJETO.redacao).toBe("a redação final: o texto aprovado, já com as mudanças, para conferência");
  });
  it("métrica leva à regra de cálculo; termo, ao verbete", () => {
    expect(hrefTermo("participacao")).toBe("/como-funciona#participacao");
    expect(hrefTermo("veto")).toBe("/dicionario#veto");
    expect(Object.values(GLOSSARIO).every((g) => !g.texto.includes("  "))).toBe(true);
  });
});
