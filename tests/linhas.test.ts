import { describe, expect, it } from "vitest";
import { deLinha, paraLinha } from "../lib/linhas";
import type { Linha, Politico } from "../lib/types";

describe("linhas snake_case", () => {
  it("ida e volta preservam chaves e valores, inclusive números no nome", () => {
    const p = { nomeUrna: "X", votos2026: 10, tseSqCandidato: "1", porCategoria: { aB: 1 } };
    const l = paraLinha(p);
    expect(Object.keys(l)).toEqual(["nome_urna", "votos_2026", "tse_sq_candidato", "por_categoria"]);
    expect(l.por_categoria).toEqual({ aB: 1 });
    expect(deLinha<typeof p>(l)).toEqual(p);
  });
  it("o tipo Linha<Politico> tem as colunas do modelo", () => {
    const chaves: (keyof Linha<Politico>)[] = ["nome_urna", "foto_url", "camara_id", "senado_codigo", "votos_2026", "updated_at", "lista_id"];
    expect(chaves).toHaveLength(7);
  });
});
