import { describe, expect, it } from "vitest";
import { contarDispositivos, grupoRotina, situacaoVeto } from "../lib/atos";

describe("atos de rotina (ementas reais de 2023 a 2026)", () => {
  it("créditos no orçamento: leis, MPs e decretos", () => {
    expect(grupoRotina("Abre ao Orçamento Fiscal da União, em favor dos Ministérios da Justiça e Segurança Pública, e da Integração e do Desenvolvimento Regional, crédito suplementar no valor de R$ 10.000.000,00, para reforço de dotações constantes da Lei Orçamentária vigente.")).toBe("credito");
    expect(grupoRotina("Abre aos Orçamentos Fiscal e da Seguridade Social da União, em favor dos Ministérios da Saúde e do Meio Ambiente, crédito especial")).toBe("credito");
    expect(grupoRotina("Abre crédito extraordinário, em favor do Ministério da Defesa, no valor de R$ 100.000.000,00, para os fins que especifica.")).toBe("credito");
  });
  it("acordos internacionais: todo Promulga", () => {
    expect(grupoRotina("Promulga o Acordo de Segurança Social entre a República Federativa do Brasil e a República de Moçambique, firmado em Brasília")).toBe("acordo");
    expect(grupoRotina("Promulga o texto modificado do Convênio Constitutivo do Fundo Financeiro para o Desenvolvimento da Bacia do Prata")).toBe("acordo");
  });
  it("desapropriações e concessões de rádio e TV", () => {
    expect(grupoRotina("Declara de interesse social, para fins de desapropriação, os imóveis rurais abrangidos pelo território quilombola")).toBe("desapropriacao");
    expect(grupoRotina("Renova a concessão outorgada à Rádio e Televisão OM Ltda., para executar, sem direito de exclusividade, serviço de radiodifusão de sons e imagens")).toBe("radiodifusao");
    expect(grupoRotina("Torna sem efeito a outorga da concessão à Rádio Vera Ltda. para explorar serviço de radiodifusão sonora em onda média")).toBe("radiodifusao");
  });
  it("regra do setor e atos substantivos não são rotina", () => {
    expect(grupoRotina("Dispõe sobre a adaptação facultativa das outorgas de execução do serviço de radiodifusão sonora em ondas curtas e ondas tropicais")).toBeNull();
    expect(grupoRotina("Institui o Sistema de Satélites de Defesa e Comunicações Estratégicas.")).toBeNull();
    expect(grupoRotina("Altera a Lei nº 14.237, de 19 de novembro de 2021, para prorrogar o prazo de vigência do Auxílio Gás do Povo.")).toBeNull();
    expect(grupoRotina(null)).toBeNull();
  });
});

describe("situação dos vetos", () => {
  it("VET 51/2025 (LDO 2026): 4 dispositivos derrubados e 40 por votar é derrubado em parte", () => {
    const c = contarDispositivos([...Array(40).fill("Não Apreciado"), ...Array(4).fill("Rejeitado")]);
    expect(c).toMatchObject({ derrubados: 4, pendentes: 40, desconhecidas: [] });
    expect(situacaoVeto(c)).toBe("derrubado");
  });
  it("sem derrubada: aguardando enquanto falta votar; depois, mantido (prejudicado conta como mantido)", () => {
    expect(situacaoVeto(contarDispositivos(["Mantido", "Não Apreciado"]))).toBe("aguardando");
    expect(situacaoVeto(contarDispositivos(["Mantido", "Mantido"]))).toBe("mantido");
    expect(situacaoVeto(contarDispositivos(["Prejudicado"]))).toBe("mantido");
  });
  it("situação nova da fonte é relatada, não chutada", () => {
    expect(contarDispositivos(["Mantido", "Retirado"]).desconhecidas).toEqual(["Retirado"]);
  });
});
