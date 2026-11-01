/**
 * Critério de pronto da E10: o card monta os 20 da sonda com dado real (data/*.json) sem campo
 * vazio, "undefined", "NaN" ou texto inventado, e com o tipo de bloco de números esperado.
 */
import { describe, expect, it } from "vitest";
import { AMOSTRA } from "../lib/amostra";
import { hrefCobrar, montarCard, resumoNumeros, rotuloCargo, rotuloStatus, type CardDados } from "../lib/card";
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
    expect(cards.get("joao-paulo-cunha")!.numeros.tipo).toBe("primeiro_voto");
  });
  it("valores conferem com docs/SONDA.md", () => {
    const n = (id: string) => { const x = cards.get(id)!.numeros; if (x.tipo !== "mandato") throw new Error(id); return x; };
    expect(n("kiko-celeguim").participacao.percentual).toBe(82.7);
    expect(n("mara-gabrilli").participacao.percentual).toBe(38.3);
    expect(n("mara-gabrilli").casa).toBe("senado");
    expect(n("guilherme-derrite").casa).toBe("camara");
    expect(n("guilherme-derrite").textoAfastado).toBe("afastado 1.041 dias");
    expect(n("mara-gabrilli").textoAfastado).toBe("afastada 246 dias");
  });
  it("CEAP só para deputado em exercício, no mês de referência; Cobrar só com e-mail oficial", () => {
    for (const c of cards.values()) {
      if (c.ceap) { expect(c.numeros).toMatchObject({ tipo: "mandato", casa: "camara" }); expect(c.ceap.mes).toBe("jul/2026"); }
      if (c.cobrar) expect(c.cobrar.href.startsWith(`mailto:${c.cobrar.email}?`)).toBe(true);
    }
    expect(cards.get("mara-gabrilli")!.ceap).toBeNull(); // Senado: cota não coletada
    expect(cards.get("lucas-pavanato")!.cobrar).toBeNull(); // sem e-mail oficial até a posse
    expect(cards.get("kiko-celeguim")!.ceap?.valor).toBeGreaterThan(0);
  });
  it("'seu voto contou para' só nos deputados, com a lista e o total de eleitos do quociente", () => {
    expect(cards.get("kiko-celeguim")!.lista?.frase).toBe("seu voto contou para a Federação PT/PC do B/PV, que elegeu 11 em SP");
    expect(cards.get("lucas-pavanato")!.lista?.frase).toBe("seu voto contou para PL, que elegeu 19 em SP");
    expect(cards.get("erika-hilton")!.lista?.nomeOficial).toBe("FEDERAÇÃO PSOL REDE");
    for (const id of ["andre-do-prado", "guilherme-derrite", "mara-gabrilli", "giordano", "astronauta-marcos-pontes"]) expect(cards.get(id)!.lista, id).toBeNull();
    expect([...cards.values()].filter((c) => c.lista)).toHaveLength(15);
  });
  it("resumo dos números diz a Casa, o período e os dias afastado (Derrite: senador eleito, números da Câmara)", () => {
    expect(resumoNumeros(cards.get("guilherme-derrite")!)).toBe("Câmara 2023–2026: participação em votações 10,2% (afastado 1.041 dias), governismo 21,3%");
    expect(resumoNumeros(cards.get("mara-gabrilli")!)).toBe("Senado 2023–2026: participação em votações 38,3% (afastada 246 dias), governismo 91,7%");
    expect(resumoNumeros(cards.get("kiko-celeguim")!)).toBe("Câmara 2023–2026: participação em votações 82,7%, governismo 97,9%");
    expect(resumoNumeros(cards.get("guilherme-derrite")!, true)).toBe("Câmara 2023–2026 · participação 10,2% · afastado 1.041 dias · governismo 21,3%");
    expect(resumoNumeros(cards.get("andre-do-prado")!)).toBe("primeiro voto em fevereiro de 2027");
  });
  it("concordância fica oculta sem respostas do quiz", () => {
    for (const c of cards.values()) expect(c.concordancia).toBeNull();
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
  it("Cobrar: mailto com assunto e corpo codificados", () => {
    const h = hrefCobrar({ ...base, cargo: "senador" }, "a@b.leg.br");
    expect(decodeURIComponent(h)).toContain("Olá, Senadora X.");
  });
});
