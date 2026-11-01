/**
 * Dado real da sonda (tests/fixtures/indicadores-real.json, gerado por scripts/sonda/_fixtures.ts):
 * Kim Kataguiri, 10 votações nominais de 2025 — 8 com orientação Sim/Não do Governo
 * (4 alinhadas, 4 contrárias) e 2 com orientação vazia. Valores conferidos à mão na fixture.
 */
import { describe, expect, it } from "vitest";
import fixture from "./fixtures/indicadores-real.json";
import { governismo, participacao, type OrientacaoBase, type VotacaoBase, type VotoBase } from "../lib/indicadores";


const votacoes: VotacaoBase[] = fixture.votacoes.map((v) => ({ id: v.idExterno, data: v.data }));
const orientacoes: OrientacaoBase[] = fixture.orientacoesGoverno.map((o) => ({ votacaoId: o.votacaoId, bancada: "Governo", orientacao: o.orientacao ?? "" }));
const votos: VotoBase[] = fixture.votos.map((v) => ({ votacaoId: v.votacaoId, voto: v.voto as VotoBase["voto"] }));

describe("indicadores com dado real (Kim Kataguiri, 2025)", () => {
  it("a fixture tem 10 votações, 8 com orientação posicional do Governo e 10 votos", () => {
    expect(votacoes).toHaveLength(10);
    expect(orientacoes.filter((o) => ["Sim", "Não", "Obstrução"].includes(o.orientacao))).toHaveLength(8);
    expect(votos).toHaveLength(10);
  });
  it("participação: votou nas 10", () => {
    expect(participacao(votacoes, votos)).toEqual({ numerador: 10, denominador: 10, percentual: 100 });
  });
  it("participação: removendo um voto, vira ausente", () => {
    expect(participacao(votacoes, votos.slice(1))).toEqual({ numerador: 9, denominador: 10, percentual: 90 });
  });
  it("governismo: 4 alinhados em 8 com orientação; as 2 sem orientação ficam fora", () => {
    expect(governismo(votacoes, votos, orientacoes)).toEqual({ numerador: 4, denominador: 8, percentual: 50 });
  });
  it("governismo: fora do período → null", () => {
    expect(governismo(votacoes, votos, orientacoes, { inicio: "2027-01-01", fim: "2030-12-31" }).percentual).toBeNull();
  });
});
