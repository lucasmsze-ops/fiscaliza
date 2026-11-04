import { describe, expect, it } from "vitest";
import { contarComPartido, decodificarBloco, decodificarFederacao, orientacaoDoPartido } from "../lib/fidelidade";

describe("blocos da Câmara", () => {
  it("decifra todos os nomes de bloco que aparecem em 2023–2026", () => {
    expect(decodificarBloco("Bl MdbPsdRepPode")).toEqual({ partidos: ["MDB", "PSD", "REPUBLICANOS", "PODE"], truncado: false });
    expect(decodificarBloco("Bl MdbPsdRepPodePsc")).toEqual({ partidos: ["MDB", "PSD", "REPUBLICANOS", "PODE", "PSC"], truncado: false });
    expect(decodificarBloco("Bl UniPpFdrPsdbCid...")).toEqual({ partidos: ["UNIÃO", "PP", "PSDB", "CIDADANIA"], truncado: true });
    expect(decodificarBloco("Bl AvanSolidPrd...")).toEqual({ partidos: ["AVANTE", "SOLIDARIEDADE", "PRD"], truncado: true });
    expect(decodificarBloco("Bl UniPpPsd...")).toEqual({ partidos: ["UNIÃO", "PP", "PSD"], truncado: true });
    expect(decodificarBloco("Bl PlFdrPtUniPp...")).toEqual({ partidos: ["PL", "PT", "PCdoB", "PV", "UNIÃO", "PP"], truncado: true });
    expect(decodificarBloco("Bl PlFdrPTUniPp...")).toEqual({ partidos: ["PL", "PT", "PCdoB", "PV", "UNIÃO", "PP"], truncado: true });
    expect(decodificarBloco("Bl PlUniPpPsd...")).toEqual({ partidos: ["PL", "UNIÃO", "PP", "PSD"], truncado: true });
  });
  it("nome sem a lista de partidos não vale", () => {
    expect(decodificarBloco("Bloco Parlamentar")).toBeNull();
    expect(decodificarBloco("Bl XyzAbc")).toBeNull();
  });
  it("federação lista os partidos por extenso", () => {
    expect(decodificarFederacao("Fdr PT-PCdoB-PV")).toEqual(["PT", "PCdoB", "PV"]);
  });
});

describe("orientação do partido", () => {
  const ori = [
    { bancada: "Governo", orientacao: "Não" }, { bancada: "PL", orientacao: "Sim" }, { bancada: "Fdr PT-PCdoB-PV", orientacao: "Não" },
    { bancada: "Bl UniPpFdrPsdbCid...", orientacao: "Sim" }, { bancada: "Republica", orientacao: "Liberado" },
  ];
  it("própria, federação ou bloco que o lista", () => {
    expect(orientacaoDoPartido("PL", ori)).toEqual({ orientacao: "Sim", via: "partido" });
    expect(orientacaoDoPartido("PCdoB", ori)).toEqual({ orientacao: "Não", via: "federacao" });
    expect(orientacaoDoPartido("PSDB", ori)).toEqual({ orientacao: "Sim", via: "bloco" });
    expect(orientacaoDoPartido("REPUBLICANOS", ori)).toEqual({ orientacao: "Liberado", via: "partido" });
  });
  it("partido que pode estar no \"...\" do bloco cortado fica fora, e Governo nunca vale", () => {
    expect(orientacaoDoPartido("MDB", ori)).toBeNull();
    expect(orientacaoDoPartido("S/Partido", ori)).toBeNull();
  });
  it("conta só voto e orientação de posição", () => {
    expect(contarComPartido([
      { voto: "sim", orientacao: "Sim" }, { voto: "nao", orientacao: "Sim" }, { voto: "obstrucao", orientacao: "Obstrução" },
      { voto: "abstencao", orientacao: "Sim" }, { voto: "sim", orientacao: "Liberado" }, { voto: "ausente", orientacao: "Não" }, { voto: "sim", orientacao: null },
    ])).toEqual({ com: 2, contra: 1 });
  });
});
