import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { deLinha } from "../lib/linhas";
import { linhasContas, linhasIndicadores, montarGrafico, passoEixo, placarCongresso, resumoAtos, resumoVetos } from "../lib/executivo-painel";
import type { AtoExecutivo, ContaGoverno, IndicadorLocal, Linha, ProposicaoExecutivo, Veto } from "../lib/types";

// Dado real publicado em 2026-11-21 (SICONFI, IBGE e Ipeadata), recortado para SP, Brasil e Alagoas.
const fx = JSON.parse(readFileSync("tests/fixtures/executivo-2026-11-21.json", "utf8")) as { contas: Linha<ContaGoverno>[]; indicadores: Linha<IndicadorLocal>[] };
const contas = fx.contas.map((l) => deLinha<ContaGoverno>(l));
const inds = fx.indicadores.map((l) => deLinha<IndicadorLocal>(l));
const de = (ente: string) => contas.filter((c) => c.ente === ente);
const doLocal = (l: string) => inds.filter((i) => i.local === l);

describe("gráfico de linha", () => {
  it("eixo em passos de 1, 2 ou 5", () => {
    expect(passoEixo(0.72)).toBe(1);
    expect(passoEixo(2.2)).toBe(5);
    expect(passoEixo(94)).toBe(100);
  });
  it("ano sem número fica sem ponto, e o escolhido de início é o último com número", () => {
    const g = montarGrafico({ id: "t", rotulo: "T", periodos: ["2022", "2023", "2024", "2025"], valores: [null, 151.85, 102.08, 106.38], ini: 1, ref: 100, refRotulo: "mínimo", fv: String, fy: String, nota: "" });
    expect(g.pontos[0]).toBeNull();
    expect(g.sel).toBe(3);
    expect(g.pre).toBe(""); // sem o ponto de 2022 não há trecho de antes da posse
    expect(g.ticks[0]).toMatchObject({ t: "2022", vazio: true });
  });
  it("quem ainda não tomou posse: tudo antes da posse, sem trecho do mandato", () => {
    const g = montarGrafico({ id: "t", rotulo: "T", periodos: ["2022", "2023"], valores: [1, 2], ini: 2, fv: String, fy: String, nota: "" });
    expect(g.temMandato).toBe(false);
    expect(g.temPre).toBe(true);
  });
});

describe("contas do governo (SICONFI, 2025)", () => {
  it("São Paulo: % e distância até o mínimo ou o limite", () => {
    const ls = linhasContas(de("SP"), "SP", 2023);
    const l = Object.fromEntries(ls.map((x) => [x.chave, x]));
    expect(ls.map((x) => x.chave)).toEqual(["saude", "educacao", "folha", "divida", "investimentos", "primario"]);
    expect(l.saude).toMatchObject({ valor: "14,2%", regua: { refTxt: "mínimo: 12%", dif: "2,2 pontos acima" } });
    expect(l.educacao!.regua!.dif).toBe("1,3 ponto acima");
    expect(l.folha).toMatchObject({ valor: "41,3%", regua: { refTxt: "limite da lei: 49%", dif: "7,7 pontos abaixo" } });
    expect(l.divida).toMatchObject({ valor: "124%", regua: { refTxt: "limite do Senado: 200%", dif: "76 pontos abaixo" } });
    expect(l.investimentos).toMatchObject({ valor: "R$ 11,8 bi", antes: "Em 2022, antes da posse: R$ 18,7 bi" });
    expect(l.primario).toMatchObject({ valor: "+R$ 8,5 bi", regua: { refTxt: "meta do ano: +R$ 5,7 bi", dif: "R$ 2,8 bi acima" } });
  });
  it("o mínimo de educação de SP mudou (30% em 2022, 25% depois): referência ano a ano, sem rótulo fixo", () => {
    const g = linhasContas(de("SP"), "SP", 2023).find((x) => x.chave === "educacao")!.grafico!;
    expect(g.refRotulo).toBeNull();
    expect(g.refLegenda).toBe("mínimo informado em cada relatório");
    expect(g.pontos[0]!.extra).toBe("mínimo: 30%");
  });
  it("União: saúde e educação em reais contra o piso; saldo negativo com a linha do zero", () => {
    const l = Object.fromEntries(linhasContas(de("BR"), "BR", 2023).map((x) => [x.chave, x]));
    expect(l.saude).toMatchObject({ valor: "R$ 234,5 bi", regua: { refTxt: "mínimo: R$ 227,7 bi", dif: "3% acima" } });
    expect(l.divida).toBeUndefined();
    expect(l.primario).toMatchObject({ valor: "−R$ 61,7 bi", regua: null, antes: "Em 2022, antes da posse: +R$ 44,5 bi" });
    expect(l.primario!.grafico!.refRotulo).toMatchObject({ t: "zero", direita: true });
  });
  it("governo que ainda não começou: sem 'antes da posse' no texto e sem trecho do mandato no gráfico", () => {
    const l = linhasContas(de("SP"), "SP", null).find((x) => x.chave === "investimentos")!;
    expect(l.antes).toBe("Em 2022: R$ 18,7 bi");
    expect(l.grafico!.temMandato).toBe(false);
  });
});

describe("como o país ou o estado está", () => {
  it("Brasil: último dado e quanto mudou desde o fim de 2022", () => {
    const l = Object.fromEntries(linhasIndicadores(doLocal("BR"), "BR", 2023, "Brasil").map((x) => [x.chave, x]));
    expect(l.idh).toMatchObject({ valor: "0,805", delta: "↑ 0,017", per: "2024 · de 0 a 1" });
    expect(l.desemprego).toMatchObject({ valor: "5,2%", delta: "↓ 2,7 pontos", per: "3º tri de 2026" });
    expect(l.renda).toMatchObject({ valor: "R$ 3.560", delta: "↑ 17%" });
    expect(l.inflacao).toMatchObject({ valor: "4,63%", delta: "↓ 1,16 ponto" });
    expect(l.pib).toMatchObject({ valor: "1,9%", delta: "↓ 1,1 ponto" });
  });
  it("estado: só números dele; inflação da área do IPCA ou a lacuna explicada", () => {
    const sp = linhasIndicadores(doLocal("SP"), "SP", 2023, "São Paulo");
    expect(sp.find((x) => x.chave === "pib")).toBeUndefined();
    expect(sp.find((x) => x.chave === "inflacao")).toMatchObject({ valor: "4,94%", per: "Grande São Paulo · out/2026" });
    const al = linhasIndicadores(doLocal("AL"), "AL", null, "Alagoas").find((x) => x.chave === "inflacao")!;
    expect(al).toMatchObject({ valor: "—", grafico: null });
    expect(al.lacuna).toContain("Alagoas não está entre elas");
  });
});

describe("placar com o Congresso e atos", () => {
  const p = (tipo: string, virouNorma: boolean, situacao: string | null) => ({ tipo, virouNorma, situacao }) as ProposicaoExecutivo;
  it("MP: virou lei, perdeu a validade ou sem desfecho; PLN fora das barras", () => {
    const r = placarCongresso([p("MPV", true, "Transformada em Norma Jurídica"), p("MPV", false, "Perdeu a Eficácia"), p("MPV", false, null), p("PL", false, "Arquivada"), p("PL", false, "Pronta para Pauta"), p("PLN", true, null)]);
    expect(r.linhas[0]).toMatchObject({ tipo: "MPV", lei: 1, encerradas: 1, outras: 1, texto: "1 virou lei · 1 perdeu a validade · 1 sem desfecho registrado" });
    expect(r.linhas[1]).toMatchObject({ tipo: "PL", lei: 0, encerradas: 1, outras: 1 });
    expect(r.pln).toEqual({ total: 1, aprovados: 1 });
  });
  it("vetos: derrubado no todo ou em parte, aguardando, mantido", () => {
    const v = (derrubados: number, pendentes: number) => ({ mantidos: 1, derrubados, prejudicados: 0, pendentes }) as Veto;
    expect(resumoVetos([v(4, 40), v(0, 2), v(0, 0)])).toEqual({ total: 3, derrubados: 1, aguardando: 1, mantidos: 1 });
  });
  it("atos do ano: leis com as complementares; rotina à parte", () => {
    const a = (id: string, tipo: AtoExecutivo["tipo"], data: string, rotina: AtoExecutivo["rotina"] = null) => ({ id, tipo, numero: Number(id.split("-")[1]), data, ementa: "x", rotina, codigo: "1", url: "u" }) as AtoExecutivo;
    const r = resumoAtos([a("LEI-1", "LEI", "2026-11-10"), a("LCP-2", "LCP", "2026-10-01"), a("DEC-3", "DEC", "2026-11-11", "credito"), a("MPV-4", "MPV", "2025-12-30")], 2026);
    expect(r).toMatchObject({ total: 3, leis: 2, complementares: 1, decretos: 1, mps: 0 });
    expect(r.rotina).toEqual([{ grupo: "credito", nome: "Créditos no orçamento", n: 1 }]);
    expect(r.recentes.todos.map((x) => x.nome)).toEqual(["Lei 1", "Lei Complementar 2"]);
  });
});
