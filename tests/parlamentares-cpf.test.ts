import { describe, expect, it } from "vitest";
import { porCpf, type CandTse } from "../scripts/cron/parlamentares";

const cand = (sq: string, cargo: string, foiUrna: boolean): CandTse =>
  ({ ano: 2026, sq, uf: "RJ", cargo, nome: "FULANO", nomeUrna: "FULANO", genero: null, cpf: "00000000191", foiUrna });

describe("porCpf: mais de uma candidatura com o mesmo CPF", () => {
  it("vale a que foi à urna, em qualquer ordem das linhas", () => {
    const cancelada = cand("190002532808", "DEPUTADO FEDERAL", false), eleita = cand("190002542888", "SENADOR", true);
    expect(porCpf([cancelada, eleita]).get("00000000191")?.sq).toBe("190002542888");
    expect(porCpf([eleita, cancelada]).get("00000000191")?.sq).toBe("190002542888");
  });
  it("no empate, o registro mais recente (sq maior)", () => {
    const a = cand("20002538203", "DEPUTADO FEDERAL", false), b = cand("20002552853", "DEPUTADO FEDERAL", false);
    expect(porCpf([b, a]).get("00000000191")?.sq).toBe("20002552853");
    expect(porCpf([a, b]).get("00000000191")?.sq).toBe("20002552853");
  });
  it("a que foi à urna vence mesmo com sq menor", () => {
    const urna = cand("50002535013", "DEPUTADO FEDERAL", true), depois = cand("50002542414", "DEPUTADO FEDERAL", false);
    expect(porCpf([urna, depois]).get("00000000191")?.sq).toBe("50002535013");
  });
});
