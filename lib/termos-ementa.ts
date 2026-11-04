/**
 * Termos jurídicos que aparecem nas ementas, com uma explicação curta (página da votação, seção
 * "O que era"). A ementa continua a oficial, sem resumo: aqui só se explica a palavra. Um termo
 * aparece só quando está no texto.
 */
export interface TermoEmenta { termo: string; explica: string; padrao: RegExp }

export const TERMOS_EMENTA: TermoEmenta[] = [
  { termo: "Ato das Disposições Constitucionais Transitórias (ADCT)", padrao: /Disposições Constitucionais Transitórias|\bADCT\b/i,
    explica: "parte final da Constituição com regras de transição e prazos; muda-se por emenda constitucional, como o resto da Constituição." },
  { termo: "Emenda Constitucional", padrao: /Emenda Constitucional/i,
    explica: "mudança já aprovada no texto da Constituição; cada uma tem um número." },
  { termo: "Lei Complementar", padrao: /Lei Complementar/i,
    explica: "lei sobre assuntos que a Constituição manda tratar desse jeito; precisa de maioria absoluta das duas Casas." },
  { termo: "Decreto-Lei", padrao: /Decreto-Lei/i,
    explica: "norma com força de lei editada pelo Presidente antes da Constituição de 1988; muitas seguem valendo, como o Código Penal." },
  { termo: "Medida Provisória", padrao: /Medida Provisória/i,
    explica: "norma do Presidente que vale como lei desde a publicação e precisa ser aprovada pelo Congresso em até 120 dias." },
  { termo: "Altera / acrescenta / revoga", padrao: /\b(altera|acrescenta|revoga)/i,
    explica: "muda a redação de um trecho, inclui um trecho novo ou tira um trecho de uma lei que já existe." },
  { termo: "Art., inciso, alínea, parágrafo (§) e caput", padrao: /\barts?\.|\binciso|\balínea|§|\bcaput\b|parágrafo/i,
    explica: "partes de uma lei: o artigo é a unidade; o caput é a frase principal dele; parágrafos, incisos e alíneas são os desdobramentos." },
  { termo: "Dá outras providências", padrao: /outras providências/i,
    explica: "fórmula padrão: o texto trata também de assuntos que a ementa não lista." },
  { termo: "Remissão", padrao: /remiss[ãa]o/i, explica: "perdão de uma dívida (por exemplo, de tributo)." },
  { termo: "Anistia", padrao: /anistia/i, explica: "perdão de punições ou multas por fatos passados." },
  { termo: "Tributo", padrao: /tribut/i, explica: "imposto, taxa ou contribuição que se paga ao governo." },
  { termo: "Crédito extraordinário / suplementar / especial", padrao: /crédito (extraordinário|suplementar|especial)/i,
    explica: "dinheiro a mais no Orçamento do ano para uma despesa não prevista ou prevista a menos." },
  { termo: "Tratado, acordo ou convenção internacional", padrao: /(?<!de )\b(tratado|acordo|convenção)\b[^.;]{0,80}\b(governo d|república d|internacional)/i,
    explica: "compromisso do Brasil com outro país ou organismo; só vale aqui depois de aprovado pelo Congresso." },
  { termo: "Susta", padrao: /\bsusta\b/i, explica: "suspende um ato do governo que, para o Congresso, foi além do que a lei permite." },
  { termo: "Institui", padrao: /\binstitui\b/i, explica: "cria (um programa, uma data, uma política, um órgão)." },
];

export const termosNaEmenta = (ementa: string) => TERMOS_EMENTA.filter((t) => t.padrao.test(ementa));
