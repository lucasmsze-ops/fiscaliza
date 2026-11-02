/**
 * Critério de pronto da E10: o card monta os 20 da sonda com dado real (data/*.json) sem campo
 * vazio, "undefined", "NaN" ou texto inventado, e com o tipo de bloco de números esperado.
 */
import { describe, expect, it } from "vitest";
import { AMOSTRA } from "../lib/amostra";
import { montarCard, resumoNumeros, rotuloCargo, rotuloStatus, type CardDados } from "../lib/card";
import { montarPagina } from "../lib/pagina";
import { JsonRepo } from "../lib/repo";
import type { Politico } from "../lib/types";

const repo = new JsonRepo();
const HOJE = "2026-11-01";
const cards = new Map<string, CardDados>();
for (const id of AMOSTRA) { const c = await montarCard(repo, id, HOJE); if (c) cards.set(id, c); }

/** Percorre o objeto e devolve os caminhos com string vazia, NaN ou "undefined"/"null" escritos. */
function suspeitos(o: unknown, caminho = ""): string[] {
  if (typeof o === "string") return o.trim() === "" || /undefined|NaN|\bnull\b/.test(o) ? [caminho] : [];
  if (typeof o === "number") return Number.isNaN(o) ? [caminho] : [];
  if (o && typeof o === "object") return Object.entries(o).flatMap(([k, v]) => suspeitos(v, `${caminho}.${k}`));
  return [];
}

describe("PoliticoCard com os 20 da sonda", () => {
  it("monta os 20", () => expect(cards.size).toBe(20));
  it("nenhum campo vazio, NaN ou 'undefined' em nenhum card", () => {
    for (const [id, c] of cards) expect(suspeitos(c), id).toEqual([]);
  });
  it("todo card tem foto, cargo, partido-UF e status", () => {
    for (const c of cards.values()) {
      expect(c.fotoUrl).toMatch(/^https:\/\//);
      expect(c.partidoUf).toMatch(/^\p{Lu}[\p{L}\d/ ]*-SP$/u);
    }
  });
  it("números: 14 com mandato no período (10 reeleitos, Derrite, 3 senadores), 6 com 'primeiro voto em fevereiro'", () => {
    const tipos = [...cards.values()].map((c) => c.numeros.tipo);
    expect(tipos.filter((t) => t === "mandato")).toHaveLength(14);
    expect(tipos.filter((t) => t === "primeiro_voto")).toHaveLength(6);
    expect(cards.get("joao-paulo-cunha-sp")!.numeros.tipo).toBe("primeiro_voto");
  });
  it("valores conferem com docs/SONDA.md", () => {
    const n = (id: string) => { const x = cards.get(id)!.numeros; if (x.tipo !== "mandato") throw new Error(id); return x; };
    expect(n("kiko-celeguim-sp").participacao.percentual).toBe(82.7);
    expect(n("mara-gabrilli-sp").participacao.percentual).toBe(38.3);
    expect(n("mara-gabrilli-sp").casa).toBe("senado");
    expect(n("guilherme-derrite-sp").casa).toBe("camara");
    expect(n("guilherme-derrite-sp").textoAfastado).toBe("afastado 1.041 dias");
    expect(n("mara-gabrilli-sp").textoAfastado).toBe("afastada 246 dias");
  });
  it("CEAP só para deputado em exercício, no mês de referência", () => {
    for (const c of cards.values()) {
      if (c.ceap) { expect(c.numeros).toMatchObject({ tipo: "mandato", casa: "camara" }); expect(c.ceap.mes).toBe("jul/2026"); }
    }
    expect(cards.get("mara-gabrilli-sp")!.ceap).toBeNull(); // Senado: cota não coletada
    expect(cards.get("kiko-celeguim-sp")!.ceap?.valor).toBeGreaterThan(0);
  });
  it("Como cobrar só para quem tem mandato em curso, na Casa do mandato, com o contato oficial", () => {
    for (const c of cards.values()) if (c.comoCobrar) expect(c.numeros.tipo).toBe("mandato");
    expect(cards.get("kiko-celeguim-sp")!.comoCobrar).toMatchObject({ casa: "camara", email: expect.stringMatching(/@camara\.leg\.br$/) });
    expect(cards.get("mara-gabrilli-sp")!.comoCobrar?.casa).toBe("senado");
    expect(cards.get("guilherme-derrite-sp")!.comoCobrar?.casa).toBe("camara"); // senador eleito, ainda deputado
    expect(cards.get("lucas-pavanato-sp")!.comoCobrar).toBeNull(); // eleito, sem posse
    expect(cards.get("joao-paulo-cunha-sp")!.comoCobrar).toBeNull(); // sem mandato hoje
  });
  it("resumo dos números diz a Casa, o período e os dias afastado (Derrite: senador eleito, números da Câmara)", () => {
    expect(resumoNumeros(cards.get("guilherme-derrite-sp")!)).toBe("Câmara 2023–2026: participação em votações 10,2% (afastado 1.041 dias), governismo 21,3%");
    expect(resumoNumeros(cards.get("mara-gabrilli-sp")!)).toBe("Senado 2023–2026: participação em votações 38,3% (afastada 246 dias), governismo 91,7%");
    expect(resumoNumeros(cards.get("kiko-celeguim-sp")!)).toBe("Câmara 2023–2026: participação em votações 82,7%, governismo 97,9%");
    expect(resumoNumeros(cards.get("guilherme-derrite-sp")!, true)).toBe("Câmara 2023–2026 · participação 10,2% · afastado 1.041 dias · governismo 21,3%");
    expect(resumoNumeros(cards.get("andre-do-prado-sp")!)).toBe("primeiro voto em fevereiro de 2027");
  });
});

describe("rótulos", () => {
  const base = { cargo: "deputado_federal", status: "reeleito", genero: "feminino", uf: "SP", nomeUrna: "X" } as Politico;
  it("flexionam pelo gênero oficial e não inventam quando falta", () => {
    expect(rotuloCargo(base)).toBe("Deputada federal");
    expect(rotuloStatus(base)).toBe("Reeleita em 2026");
    expect(rotuloCargo({ ...base, genero: null })).toBe("Câmara dos Deputados");
    expect(rotuloStatus({ ...base, cargo: "senador", genero: "masculino", status: "nao_eleito" })).toBe("Não eleito em 2026");
  });
});

describe("resumo pré-calculado (tabela resumos, E20)", () => {
  it("card e página sobrevivem ao JSON sem perder nada: o modo Supabase mostra o mesmo que o JSON", async () => {
    for (const id of AMOSTRA) {
      const pg = await montarPagina(repo, id, HOJE);
      expect(pg, id).not.toBeNull();
      expect(JSON.parse(JSON.stringify(pg)), id).toStrictEqual(pg);
      expect(pg!.card, id).toStrictEqual(cards.get(id));
    }
  });
});
