import { describe, expect, it } from "vitest";
import { siglaPartido } from "../lib/partidos";

describe("siglaPartido", () => {
  it("junta as grafias do TSE e das Casas", () => {
    expect(siglaPartido("PCDOB")).toBe("PCdoB");
    expect(siglaPartido("PCdoB")).toBe("PCdoB");
    expect(siglaPartido("PC do B")).toBe("PCdoB");
  });
  it("não mexe nas demais", () => {
    expect(siglaPartido("UNIÃO")).toBe("UNIÃO");
    expect(siglaPartido("PT")).toBe("PT");
  });
});

describe("nomePartido", () => {
  it("todas as siglas dos políticos do site têm nome", async () => {
    const { readFileSync } = await import("node:fs");
    const { nomePartido } = await import("../lib/partidos");
    const ps = JSON.parse(readFileSync("data/politicos.json", "utf8")) as { partido: string }[];
    expect([...new Set(ps.map((p) => p.partido))].filter((s) => !nomePartido(s))).toEqual([]);
    expect(nomePartido("PCDOB")).toBe("Partido Comunista do Brasil");
  });
});
