/**
 * Dado real (tests/fixtures/quociente-sp-2026.json, gerado por scripts/sonda/quociente.ts):
 * votos de legenda das 20 listas e votos nominais dos 1.045 candidatos a deputado federal por SP
 * em 2026. Gabarito: Relatório de Resultado da Totalização SP 2026 (Anexos VI e VIII) e
 * DS_SIT_TOT_TURNO do consulta_cand.
 */
import { describe, expect, it } from "vitest";
import fixture from "./fixtures/quociente-sp-2026.json";
import { distribuirVagas, type Lista } from "../lib/quociente";

const listas: Lista[] = fixture.listas.map((l) => ({
  id: l.id, votosLegenda: l.votosLegenda,
  candidatos: (l.candidatos as [string, number][]).map(([id, votos]) => ({ id, votos })),
}));
const nome = new Map(fixture.listas.map((l) => [l.id, l.nome!]));
const of = fixture.oficial;
const d = distribuirVagas(fixture.vagas, listas);

describe("deputado federal SP 2026 contra o resultado oficial", () => {
  it("QE e votos válidos", () => {
    expect(d.votosValidos).toBe(of.votosValidos);
    expect(d.qe).toBe(of.qe);
  });
  it("vagas por QP e por média de cada uma das 20 listas (federação como lista única)", () => {
    const calc = Object.fromEntries(d.listas.map((l) => [nome.get(l.id), [l.preenchidasQP, l.vagasMedia]]));
    expect(calc).toEqual(of.listas);
  });
  it("Federação PSOL REDE obteve 9 por QP mas só preencheu 6 (faltou candidato com 10% do QE)", () => {
    const psol = d.listas.find((l) => nome.get(l.id) === "FEDERAÇÃO PSOL REDE")!;
    expect([psol.vagasQP, psol.preenchidasQP, psol.vagasMedia]).toEqual([9, 6, 0]);
  });
  it("os 60 eleitos por QP e os 10 por média são os mesmos candidatos do TSE", () => {
    expect(d.eleitos.filter((e) => e.por === "qp").map((e) => e.candidatoId).sort()).toEqual(of.eleitosQP);
    expect(d.eleitos.filter((e) => e.por !== "qp").map((e) => e.candidatoId).sort()).toEqual(of.eleitosMedia);
    expect(d.eleitos.every((e) => e.por !== "media_sem_exigencia")).toBe(true);
    expect(d.vagasNaoPreenchidas).toBe(0);
  });
  it("as duas primeiras sobras seguem o Anexo VII: PODE, depois FE Brasil", () => {
    expect(d.eleitos.filter((e) => e.rodada !== null).slice(0, 2).map((e) => nome.get(e.listaId)))
      .toEqual(["PODE", "FEDERAÇÃO BRASIL DA ESPERANÇA - FE BRASIL"]);
  });
});
