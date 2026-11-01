import { describe, expect, it } from "vitest";
import { alternar, caminhoColinha, COLINHA_VAZIA, idsDaUrl, lerColinha } from "../lib/colinha";

describe("colinha", () => {
  it("deputado é escolha única; tocar de novo desmarca", () => {
    let c = alternar(COLINHA_VAZIA, "deputado_federal", "a");
    c = alternar(c, "deputado_federal", "b");
    expect(c.deputado).toBe("b");
    expect(alternar(c, "deputado_federal", "b").deputado).toBeNull();
  });
  it("até 2 senadores; o terceiro substitui o mais antigo", () => {
    let c = alternar(COLINHA_VAZIA, "senador", "s1");
    c = alternar(c, "senador", "s2");
    c = alternar(c, "senador", "s3");
    expect(c.senadores).toEqual(["s2", "s3"]);
    expect(alternar(c, "senador", "s2").senadores).toEqual(["s3"]);
  });
  it("URL: deputado primeiro, separador +, ida e volta", () => {
    const c = { deputado: "kiko-celeguim", senadores: ["andre-do-prado", "guilherme-derrite"] };
    expect(caminhoColinha(c)).toBe("/c/kiko-celeguim+andre-do-prado+guilherme-derrite");
    expect(idsDaUrl("kiko-celeguim%2Bandre-do-prado+guilherme-derrite")).toEqual(["kiko-celeguim", "andre-do-prado", "guilherme-derrite"]);
    expect(caminhoColinha(COLINHA_VAZIA)).toBeNull();
  });
  it("URL hostil: descarta o que não é slug, repete ou passa de 3", () => {
    expect(idsDaUrl("a+a+<script>+b+c+d")).toEqual(["a", "b", "c"]);
  });
  it("localStorage inválido vira colinha vazia", () => {
    expect(lerColinha("{lixo")).toEqual(COLINHA_VAZIA);
    expect(lerColinha(JSON.stringify({ deputado: "X Y", senadores: ["ok", 3, "a", "b"] }))).toEqual({ deputado: null, senadores: ["ok", "a"] });
  });
});
