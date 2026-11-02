/** Página do político com dado real: os totais por tipo de voto fecham com a participação do card. */
import { describe, expect, it } from "vitest";
import { contarVotos, montarPagina } from "../lib/pagina";
import { JsonRepo } from "../lib/repo";

const repo = new JsonRepo();

describe("página do político", () => {
  it("contarVotos: quem não aparece é ausente", () => {
    const t = contarVotos(["a", "b", "c"], new Map([["a", "sim" as const], ["b", "secreto" as const]]));
    expect([t.sim, t.secreto, t.ausente]).toEqual([1, 1, 1]);
  });
  for (const id of ["kiko-celeguim-sp", "mara-gabrilli-sp", "guilherme-derrite-sp", "giordano-sp"]) {
    it(`${id}: soma dos tipos = denominador; votos registrados = numerador da participação`, async () => {
      const pg = (await montarPagina(repo, id, "2026-11-01"))!;
      const n = pg.card.numeros;
      if (n.tipo !== "mandato" || !pg.votacoes) throw new Error("esperava mandato");
      const t = pg.votacoes.totais;
      expect(Object.values(t).reduce((a, b) => a + b, 0)).toBe(n.participacao.denominador);
      expect(pg.votacoes.total - t.ausente).toBe(n.participacao.numerador);
      expect(pg.votacoes.ultimas).toHaveLength(10);
    });
  }
  it("CEAP: 12 meses, com o mês de referência fechado e os meses depois dele em aberto", async () => {
    const pg = (await montarPagina(repo, "kiko-celeguim-sp", "2026-11-01"))!;
    expect(pg.ceap!.meses).toHaveLength(12);
    expect(pg.ceap!.mesReferencia).toEqual({ ano: 2026, mes: 7 });
    expect(pg.ceap!.meses.filter((m) => m.aberto).map((m) => m.mes)).toEqual([10, 9, 8]);
    expect(pg.ceap!.categorias.length).toBeGreaterThan(0);
  });
  it("sem mandato no período: sem votações nem cota; contatos só com o que a fonte tem", async () => {
    const pg = (await montarPagina(repo, "lucas-pavanato-sp", "2026-11-01"))!;
    expect(pg.votacoes).toBeNull();
    expect(pg.ceap).toBeNull();
    expect(pg.contatos).toEqual({ email: null, telefone: null, redesSociais: [], urlPerfil: null });
  });
});
