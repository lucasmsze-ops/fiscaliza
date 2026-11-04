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
