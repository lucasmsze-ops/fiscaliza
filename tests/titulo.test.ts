import { describe, expect, it } from "vitest";
import { ementaLimpa, manchete } from "../lib/titulo";

// Ementas reais (Câmara e Senado, 2023–2026).
describe("manchete (títulos curtos, 2026-11-20)", () => {
  it("lei conhecida pelo nome, sem data nem aposto, com o objetivo", () => {
    expect(manchete("Altera a Lei nº 7.565, de 19 de dezembro de 1986, que dispõe sobre o Código Brasileiro de Aeronáutica, para permitir a cabotagem aérea a empresas sul-americanas na Amazônia Legal."))
      .toBe("Código Brasileiro de Aeronáutica: permitir a cabotagem aérea a empresas sul-americanas na Amazônia Legal");
    expect(manchete("Altera a Lei nº 8.078, de 11 de setembro de 1990, que “dispõe sobre a proteção do consumidor e dá outras providências”, para regulamentar a cobrança da taxa de conveniência em sites de vendas de ingressos on-line."))
      .toBe("Código de Defesa do Consumidor: regulamentar a cobrança da taxa de conveniência em sites de vendas de ingressos on-line");
  });
  it("artigo e inciso somem do alvo; 'para dispor sobre' vira dois-pontos sem artigo", () => {
    expect(manchete("Inclui o art. 14-B ao texto da Lei Complementar nº 101, de 4 de maio de 2000, para condicionar a concessão de incentivos à geração de empregos."))
      .toBe("Lei de Responsabilidade Fiscal: condicionar a concessão de incentivos à geração de empregos");
    expect(manchete("Altera a Lei Complementar nº 179, de 24 de fevereiro de 2021, para dispor sobre a nomeação e exoneração do presidente do Banco Central."))
      .toBe("Lei Complementar 179/2021: nomeação e exoneração do presidente do Banco Central");
  });
  it("'Dispõe sobre' sai; 'e dá outras providências' sai; o resto do texto oficial não muda", () => {
    expect(manchete("Dispõe sobre a criação das Áreas Especiais para Desenvolvimento Turístico – AEDT, e dá outras providências."))
      .toBe("Criação das Áreas Especiais para Desenvolvimento Turístico – AEDT");
    expect(manchete("Estabelece diretrizes para a priorização de recursos federais em saúde mental nos estados com baixa cobertura."))
      .toBe("Estabelece diretrizes para a priorização de recursos federais em saúde mental nos estados com baixa cobertura");
  });
  it("lei sem nome conhecido fica pelo número e ano; o artigo acompanha o gênero do nome", () => {
    expect(ementaLimpa("Susta os efeitos do Decreto nº 11.995, de 15 de abril de 2024, que dispõe sobre a incorporação de imóveis rurais."))
      .toBe("Susta os efeitos do Decreto 11.995/2024, que dispõe sobre a incorporação de imóveis rurais");
    expect(ementaLimpa("Acrescenta parágrafo ao art. 5º da Lei nº 9.503, de 23 de setembro de 1997, para tratar de faixas."))
      .toBe("Acrescenta parágrafo ao art. 5º do Código de Trânsito, para tratar de faixas");
  });
  it("vazio continua vazio", () => { expect(manchete(null)).toBe(""); });
});

import { materiasCitadas } from "../lib/noticias";
describe("materiasCitadas (notícias das agências)", () => {
  it("lê os dois jeitos de escrever, com ano de 2 ou 4 dígitos e número com ponto", () => {
    expect(materiasCitadas("O Projeto de Lei 928/26 e o Projeto de Lei Complementar 186/26 foram aprovados.")).toEqual(["PL 928/2026", "PLP 186/2026"]);
    expect(materiasCitadas("O PLP 299/2026 segue para sanção; a Medida Provisória 1.300/25 perdeu a validade.")).toEqual(["MPV 1300/2025", "PLP 299/2026"]);
    expect(materiasCitadas("A Proposta de Emenda à Constituição 24/2026 e o PLN 7/2026.")).toEqual(["PEC 24/2026", "PLN 7/2026"]);
  });
  it("sem matéria, vazio", () => { expect(materiasCitadas("O Senado homenageou a Embratur.")).toEqual([]); });
});
