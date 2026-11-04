import { describe, expect, it } from "vitest";
import type { Votacao } from "../lib/types";
import { idDoSlug, montarPaginaVotacao, objetoVotado, rotuloVotado, slugVotacao, votosNecessarios } from "../lib/votacao";

const base: Votacao = {
  id: "camara:347421-221", idExterno: "347421-221", casa: "camara", data: "2024-12-19", proposicao: "PEC 31/2007", ementa: "Altera o Sistema Tributário Nacional.",
  objeto: null, descricao: "Aprovada, em segundo turno, a Proposta de Emenda à Constituição n° 31, de 2007, ressalvado o destaque. Sim: 348; Não: 146; Total: 494.",
  resultado: "aprovada", placar: { sim: 348, nao: 146, abstencao: 0, obstrucao: 0 }, secreta: false, urlOficial: "https://www.camara.leg.br/propostas-legislativas/347421",
};

describe("o que foi votado (descrições reais)", () => {
  it.each([
    ["Aprovada, em segundo turno, a Proposta de Emenda à Constituição n° 31, de 2007, ressalvado o destaque.", "PEC 31/2007", "texto principal, 2º turno"],
    ["Aprovado o Requerimento nº 4.990/2024, dos Senhores Líderes, que solicita a quebra de interstício para o 2º turno.", "PEC 31/2007", "requerimento"],
    ["Mantido o texto. Sim: 349; Não: 143; Abstenção: 1; Total: 493.", "PEC 31/2007", "destaque"],
    ["Rejeitada a Emenda de Plenário nº 1. Sim: 149; Não: 204; Total: 353.", "PL 5010/2013", "emenda"],
    ["Aprovado o Substitutivo ao Projeto de Lei nº 3.899, de 2012, adotado pelo relator da Comissão Especial, ressalvados os destaques.", "PL 3899/2012", "texto principal"],
    ["Votação nominal dos Requerimentos nºs 741 e 742, de 2026, do Relator, para que as Emendas nºs 84 e 87 passem a constituir proposições em separado.", "PEC 18/2025", "requerimento"],
    ["Votação nominal da Emenda nº 85 à Proposta de Emenda à Constituição nº 18, de 2025, nos termos do acordo de Plenário.", "PEC 18/2025", "emenda"],
    ["Votação nominal da Proposta de Emenda à Constituição nº 18, de 2025, nos termos dos pareceres, ressalvado o destaque (1º Turno).", "PEC 18/2025", "texto principal, 1º turno"],
    ["Votação nominal da Mensagem nº 7, de 2026 - Jorge Rodrigo Araújo Messias (STF).", "MSF 7/2026", "escolha de autoridade"],
    ["Rejeitado o Recurso nº 7/2024 (art. 58, § 1º c/c art. 132, § 2º, RICD).", "PL 10273/2018", "recurso"],
    ["Aprovada a Redação Final assinada pelo relator.", "PL 7906/2014", "redação final"],
  ])("%s", (descricao, proposicao, esperado) => {
    expect(rotuloVotado({ descricao, proposicao })).toBe(esperado);
  });

  it("votos necessários só no texto principal de PEC e PLP", () => {
    expect(votosNecessarios(base)).toBe(308);
    expect(votosNecessarios({ ...base, casa: "senado" })).toBe(49);
    expect(votosNecessarios({ ...base, proposicao: "PLP 1/2024" })).toBe(257);
    expect(votosNecessarios({ ...base, descricao: "Mantido o texto." })).toBeNull();
    expect(votosNecessarios({ ...base, proposicao: "PL 1/2024" })).toBeNull();
    expect(objetoVotado({ descricao: "Resultado. Sim: 182; Não: 182.", proposicao: "PL 1625/2026" })).toBeNull();
  });

  it("slug da URL ida e volta", () => {
    expect(slugVotacao(base.id)).toBe("camara-347421-221");
    expect(idDoSlug("camara-347421-221")).toBe(base.id);
    expect(idDoSlug("senado-7110")).toBe("senado:7110");
  });
});

describe("montarPaginaVotacao", () => {
  const ori = [{ bancada: "PL", orientacao: "Não" }, { bancada: "Fdr PT-PCdoB-PV", orientacao: "Sim" }, { bancada: "Governo", orientacao: "Sim" }];
  const votos = [
    ...Array.from({ length: 3 }, () => ({ voto: "sim" as const, partido: "PT" })),
    { voto: "nao" as const, partido: "PCDOB" },
    { voto: "nao" as const, partido: "PL" }, { voto: "abstencao" as const, partido: "PL" }, { voto: "ausente" as const, partido: "PL" },
  ];
  const p = montarPaginaVotacao(base, votos, ori, [base], null);

  it("Câmara: não votou = 513 − quem votou; o que não tem partido fica à parte", () => {
    expect(p.contagem).toEqual({ sim: 3, nao: 2, abstencao: 1, obstrucao: 0, outros: 0, naoVotou: 507 });
    expect(p.naoVotouSemPartido).toBe(506);
  });

  it("por partido do dia, com a orientação da bancada (federação vale para o partido)", () => {
    expect(p.partidos.map((x) => [x.partido, x.total, x.orientacao, x.via])).toEqual([
      ["PL", 3, "Não", "partido"], ["PT", 3, "Sim", "federacao"], ["PCdoB", 1, "Sim", "federacao"],
    ]);
    expect(p.partidos[0]).toMatchObject({ sim: 0, nao: 1, abstencao: 1, naoVotou: 1 });
  });

  it("descrição sem o placar no fim", () => {
    expect(p.descricao).toBe("Aprovada, em segundo turno, a Proposta de Emenda à Constituição n° 31, de 2007, ressalvado o destaque.");
  });
});
