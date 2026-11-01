/**
 * Dado real da sonda (tests/fixtures/indicadores-senado-real.json, gerado por scripts/sonda/_fixtures-senado.ts):
 * Astronauta Marcos Pontes, 10 votações do plenário do Senado em 2025 — 6 abertas com orientação
 * Sim/Não do Governo (3 alinhadas, 3 contrárias), 2 secretas ("Votou" → `secreto`) e 2 abertas em
 * que a sigla é de ausência (AP, MIS → `ausente`). As mesmas funções da Câmara, sem adaptação.
 */
import { describe, expect, it } from "vitest";
import fixture from "./fixtures/indicadores-senado-real.json";
import { concordancia, governismo, participacao, type OrientacaoBase, type VotacaoBase, type VotoBase } from "../lib/indicadores";


const votacoes: VotacaoBase[] = fixture.votacoes.map((v) => ({ id: v.idExterno, data: v.data }));
const orientacoes: OrientacaoBase[] = fixture.orientacoesGoverno.map((o) => ({ votacaoId: o.votacaoId, bancada: "Governo", orientacao: o.orientacao ?? "" }));
const votos: VotoBase[] = fixture.votos.map((v) => ({ votacaoId: v.votacaoId, voto: v.voto as VotoBase["voto"] }));

describe("indicadores com dado real do Senado (Marcos Pontes, 2025)", () => {
  it("a fixture tem 10 votações: 6 abertas com orientação do Governo, 2 secretas e 2 ausências", () => {
    expect(votacoes).toHaveLength(10);
    expect(fixture.votacoes.filter((v) => v.secreta)).toHaveLength(2);
    expect(orientacoes.filter((o) => ["Sim", "Não"].includes(o.orientacao))).toHaveLength(8);
    expect(votos.filter((v) => v.voto === "secreto")).toHaveLength(2);
    expect(votos.filter((v) => v.voto === "ausente")).toHaveLength(2);
  });
  it("participação: voto secreto conta como registrado; sigla de ausência, não → 8/10", () => {
    expect(participacao(votacoes, votos)).toEqual({ numerador: 8, denominador: 10, percentual: 80 });
  });
  it("governismo: 3 alinhados em 6 abertas; secretas e ausências ficam fora → 50%", () => {
    expect(governismo(votacoes, votos, orientacoes)).toEqual({ numerador: 3, denominador: 6, percentual: 50 });
  });
  it("governismo: mesmo com orientação do Governo numa secreta, o voto secreto não entra", () => {
    const comOrientacaoNasSecretas = orientacoes.map((o, i) => (fixture.votacoes[i]!.secreta ? { ...o, orientacao: "Sim" } : o));
    expect(governismo(votacoes, votos, comOrientacaoNasSecretas)).toEqual({ numerador: 3, denominador: 6, percentual: 50 });
  });
  it("concordância: respondendo Sim em todas, só os 6 votos Sim/Não contam → 4/6", () => {
    const respostas = Object.fromEntries(votacoes.map((v) => [v.id, "sim" as const]));
    expect(concordancia(respostas, votos)).toEqual({ numerador: 4, denominador: 6, percentual: 66.7 });
  });
});
