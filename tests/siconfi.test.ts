import { describe, expect, it } from "vitest";
import { doAnexo14, doRgf01 } from "../lib/siconfi";

const item = (cod_conta: string, coluna: string, valor: number | null) => ({ cod_conta, conta: "", coluna, valor });
const EDU = "MinimoAnualDasReceitasDeImpostosNaManutencaoEDesenvolvimentoDoEnsinoDemonstrativoSimplificado";
const SAU = "AplicacaoTotalDasDespesasComAcoesEServicosPublicosDeSaude";

describe("SICONFI, linhas reais dos relatórios de 2025", () => {
  it("estado: % aplicado e % mínimo; o valor em reais do Anexo 14 não é usado", () => {
    const r = doAnexo14("SP", 2025, [item(SAU, "Valor Apurado Até o Bimestre", 31552592375.9), item(SAU, "% Mínimo a Aplicar no Exercício", 12), item(SAU, "% Aplicado Até o Bimestre", 14.16)], "u");
    expect(r.find((x) => x.indicador === "saude")).toMatchObject({ percentual: 14.16, percentualRef: 12, reais: null, reaisRef: null });
  });
  it("União: o mínimo vem em reais (o piso) e o aplicado em % do piso", () => {
    const r = doAnexo14("BR", 2025, [item(SAU, "Valor Apurado Até o Bimestre", 234547815461.42), item(SAU, "% Mínimo a Aplicar no Exercício", 227660324513.86), item(SAU, "% Aplicado Até o Bimestre", 103.03)], "u");
    expect(r.find((x) => x.indicador === "saude")).toMatchObject({ percentual: 103.03, percentualRef: null, reais: 234547815461.42, reaisRef: 227660324513.86 });
  });
  it("Amapá informou a educação como fração (0,26 com mínimo 0,25): vira %", () => {
    const r = doAnexo14("AP", 2025, [item(EDU, "% Mínimo a Aplicar no Exercício", 0.25), item(EDU, "% Aplicado Até o Bimestre", 0.3)], "u");
    expect(r.find((x) => x.indicador === "educacao")).toMatchObject({ percentual: 30, percentualRef: 25 });
    const r22 = doAnexo14("AP", 2022, [item(EDU, "% Mínimo a Aplicar no Exercício", 0.25), item(EDU, "% Aplicado Até o Bimestre", 26.85)], "u");
    expect(r22.find((x) => x.indicador === "educacao")).toMatchObject({ percentual: 26.85, percentualRef: 25 });
  });
  it("número que o relatório não traz fica nulo, nunca zero (educação da União em 2022)", () => {
    expect(doAnexo14("BR", 2022, [], "u").find((x) => x.indicador === "educacao")).toMatchObject({ percentual: null, reais: null });
  });
  it("folha da União: vale o bloco do Executivo federal (o maior), não o do DF nem o dos ex-territórios", () => {
    const pct = "% SOBRE A RCL";
    const r = doRgf01("BR", 2025, [
      ...[0.067205, 1.237654, 0.045383, 18.71349].map((v) => item("DespesaComPessoalTotal", pct, v)),
      ...[0.169, 2.2, 0.099, 37.9].map((v) => item("LimiteMaximoDespesaComPessoalTotal", pct, v)),
    ], "u");
    expect(r).toMatchObject({ percentual: 18.71349, percentualRef: 37.9 });
  });
});
