/**
 * E23y — O que a página do executivo mostra, montado no servidor a partir das tabelas da E23x (protótipo aprovado,
 * versão 112 do canvas): contas do governo, como o país ou o estado está, placar com o Congresso e atos do presidente.
 * Só número da fonte e a comparação com a lei (mínimo, limite, meta); nenhum adjetivo (princípio 4).
 *
 * Os gráficos são de linha (pedido do usuário de 2026-11-21): o caminho do SVG é calculado aqui e o componente client
 * (`components/GraficoLinha.tsx`) só troca o ponto escolhido.
 */
import { NOME_ROTINA, situacaoVeto, type GrupoRotina } from "./atos";
import { SITUACOES_ENCERRADAS } from "./propostas";
import type { AtoExecutivo, ContaGoverno, IndicadorConta, IndicadorLocal, IndicadorPais, ProposicaoExecutivo, Veto } from "./types";

// ---------------------------------------------------------------- formatos

const num = (v: number, casas: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
/** Número com o sinal de menos tipográfico. */
export const fmt = (v: number, casas = 1) => (v < 0 ? "−" : "") + num(Math.abs(v), casas);
export const pct = (v: number, casas = 1) => `${fmt(v, casas)}%`;
/** Reais em bilhões ("R$ 38,6 bi"); com `sinal`, "+R$ 8,5 bi" e "−R$ 61,7 bi". */
export const bi = (v: number, sinal = false) => `${v < 0 ? "−" : sinal && v > 0 ? "+" : ""}R$ ${num(Math.abs(v) / 1e9, 1)} bi`;
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
/** "2026-T3" → "3º tri de 2026"; "2026-10" → "out/2026"; "2025" → "2025". */
export function periodoLegivel(p: string): string {
  const t = /^(\d{4})-T(\d)$/.exec(p);
  if (t) return `${t[2]}º tri de ${t[1]}`;
  const m = /^(\d{4})-(\d{2})$/.exec(p);
  return m ? `${MESES[Number(m[2]) - 1]}/${m[1]}` : p;
}
const anoDe = (p: string) => Number(p.slice(0, 4));

// ---------------------------------------------------------------- gráfico de linha

/** Área do desenho: 262 × 150 px, com os rótulos do eixo à direita (Swift Charts) e os anos embaixo. */
export const GRAFICO = { largura: 262, altura: 150, topo: 16, base: 10 } as const;

export interface DadosGrafico {
  id: string;
  /** Rótulo em caixa alta acima do número ("SAÚDE · EM % DA RECEITA DE IMPOSTOS"). */
  rotulo: string;
  /** Unidade ao lado do número ("da receita", "do mínimo"). */
  un?: string;
  /** Códigos de período ("2025", "2026-T3", "2026-10"), na ordem. */
  periodos: string[];
  valores: (number | null)[];
  /** Índice do primeiro ponto do mandato; igual ao número de pontos = tudo antes da posse. */
  ini: number;
  fv: (v: number) => string;
  fy: (v: number) => string;
  /** Linha de referência fixa (mínimo, limite, zero) ou uma por ponto (meta de cada ano, mínimo que muda). */
  ref?: number | null;
  refs?: (number | null)[];
  refRotulo?: string;
  refLegenda?: string;
  refDireita?: boolean;
  /** Formato da referência no cabeçalho ("mínimo: 25%"), quando é uma por ponto. */
  fr?: (v: number) => string;
  /** Rótulos do eixo de baixo: índice e texto. Sem isso, um por ponto. */
  ticks?: { i: number; t: string }[];
  nota: string;
}

export interface PontoGrafico { x: number; y: number; valor: string; periodo: string; extra: string | null }
export interface GraficoPronto {
  id: string;
  rotulo: string;
  un: string;
  pontos: (PontoGrafico | null)[];
  sel: number;
  grade: string;
  ylab: { t: string; y: number }[];
  area: string;
  pre: string;
  linha: string;
  marcas: string;
  ref: string;
  refRotulo: { t: string; y: number; direita: boolean } | null;
  refLegenda: string | null;
  ticks: { i: number; t: string; x: number; vazio: boolean }[];
  temPre: boolean;
  temMandato: boolean;
  nota: string;
  aria: string;
}

/** Passo "redondo" do eixo (1, 2 ou 5 × 10ⁿ) para cerca de três faixas. */
export function passoEixo(bruto: number): number {
  const p = Math.pow(10, Math.floor(Math.log10(bruto)));
  const n = bruto / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

const P = (x: number, y: number) => `${x.toFixed(1)} ${y.toFixed(1)}`;

export function montarGrafico(d: DadosGrafico): GraficoPronto {
  const { largura: W, altura: H, topo: T, base: B } = GRAFICO;
  const n = d.valores.length;
  const idx = d.valores.map((_, i) => i);
  const validos = idx.filter((i) => d.valores[i] != null);
  const todos = [...validos.map((i) => d.valores[i]!), ...(d.refs ?? []).filter((v): v is number => v != null), ...(d.ref != null ? [d.ref] : [])];
  const lo = Math.min(...todos), hi = Math.max(...todos);
  const passo = passoEixo((hi - lo || Math.abs(hi) || 1) / 3);
  const y0 = Math.floor(lo / passo) * passo;
  let y1 = Math.ceil(hi / passo) * passo;
  if (y1 - y0 < passo) y1 = y0 + passo;
  const X = (i: number) => (n === 1 ? W / 2 : 8 + (i * (W - 16)) / (n - 1));
  const Y = (v: number) => T + ((y1 - v) / (y1 - y0)) * (H - T - B);
  const caminho = (lista: number[], vals: (number | null)[]) => {
    let s = "", on = false;
    for (const i of lista) { const v = vals[i]; if (v == null) { on = false; continue; } s += (on ? "L" : "M") + P(X(i), Y(v)); on = true; }
    return s;
  };
  const ini = Math.min(d.ini, n);
  const tudoAntes = ini >= n;
  // Tudo antes da posse (governador que ainda não governa): a linha é contínua, e a legenda diz "antes da posse".
  const pre = !tudoAntes && ini > 0 && d.valores[ini] != null && d.valores[ini - 1] != null ? caminho(idx.slice(0, ini + 1), d.valores) : "";
  const doMandato = tudoAntes ? idx : idx.slice(ini);
  const linha = caminho(doMandato, d.valores);
  const comValor = doMandato.filter((i) => d.valores[i] != null);
  const baseY = d.ref === 0 ? Y(0) : H - B;
  const area = comValor.length > 1 ? `${linha}L${P(X(comValor.at(-1)!), baseY)}L${P(X(comValor[0]!), baseY)}Z` : "";
  const grade: string[] = [], ylab: { t: string; y: number }[] = [];
  for (let k = 0; y0 + k * passo <= y1 + passo / 1e6; k++) {
    const v = y0 + k * passo;
    grade.push(`M0 ${Y(v).toFixed(1)}H${W}`);
    ylab.push({ t: d.fy(v), y: Number(Y(v).toFixed(1)) });
  }
  let ref = "", refY = 0;
  if (d.ref != null) { ref = `M0 ${Y(d.ref).toFixed(1)}H${W}`; refY = Y(d.ref); }
  else if (d.refs?.some((v) => v != null)) {
    const r = idx.filter((i) => d.refs![i] != null);
    ref = `M${P(Math.max(0, X(r[0]!) - 10), Y(d.refs![r[0]!]!))}`;
    r.forEach((i, k) => { if (k) ref += `H${((X(r[k - 1]!) + X(i)) / 2).toFixed(1)}V${Y(d.refs![i]!).toFixed(1)}`; });
    ref += `H${Math.min(W, X(r.at(-1)!) + 10).toFixed(1)}`;
    refY = Y(d.refs![r.at(-1)!]!);
  }
  const pontos = idx.map((i): PontoGrafico | null => {
    const v = d.valores[i];
    if (v == null) return null;
    const r = d.refs?.[i];
    return { x: Number(X(i).toFixed(1)), y: Number(Y(v).toFixed(1)), valor: d.fv(v), periodo: periodoLegivel(d.periodos[i]!), extra: r != null && d.refRotulo ? `${d.refRotulo}: ${(d.fr ?? d.fv)(r)}` : null };
  });
  const bola = (x: number, y: number) => `M${P(x - 3, y)}a3 3 0 1 0 6 0a3 3 0 1 0 -6 0`;
  return {
    id: d.id, rotulo: d.rotulo, un: d.un ?? "",
    pontos, sel: validos.at(-1) ?? 0,
    grade: grade.join(""), ylab, area, pre, linha,
    marcas: n <= 12 ? validos.map((i) => bola(X(i), Y(d.valores[i]!))).join("") : "",
    ref,
    // Rótulo na própria linha só para a referência fixa; a que muda de ano para ano fica na legenda e no cabeçalho.
    refRotulo: d.ref != null && d.refRotulo ? { t: d.refRotulo, y: Number(refY.toFixed(1)), direita: !!d.refDireita } : null,
    refLegenda: ref ? (d.refLegenda ?? d.refRotulo ?? null) : null,
    ticks: (d.ticks ?? d.periodos.map((p, i) => ({ i, t: p }))).map(({ i, t }) => ({ i, t, x: Number(X(i).toFixed(1)), vazio: d.valores[i] == null })),
    temPre: !!pre || tudoAntes,
    temMandato: !tudoAntes,
    nota: d.nota,
    aria: `${d.rotulo}: ${validos.map((i) => `${periodoLegivel(d.periodos[i]!)}, ${d.fv(d.valores[i]!)}`).join("; ")}`,
  };
}

/** Minigráfico da lista (estilo do app Ações): 64 × 30, com a linha pontilhada no valor de antes da posse. */
export function minigrafico(valores: (number | null)[], base: number | null): { linha: string; base: string } {
  const ok = valores.map((v, i) => [i, v] as const).filter((a): a is readonly [number, number] => a[1] != null);
  if (ok.length < 2) return { linha: "", base: "" };
  const vs = ok.map((a) => a[1]);
  const lo = Math.min(...vs, ...(base != null ? [base] : [])), hi = Math.max(...vs, ...(base != null ? [base] : []));
  const sx = (i: number) => 2 + (i * 60) / (valores.length - 1);
  const sy = (v: number) => 3 + ((hi - v) / (hi - lo || 1)) * 24;
  return { linha: ok.map(([i, v], k) => (k ? "L" : "M") + P(sx(i), sy(v))).join(""), base: base != null ? `M0 ${sy(base).toFixed(1)}H64` : "" };
}

// ---------------------------------------------------------------- contas do governo

export interface LinhaConta {
  chave: IndicadorConta;
  nome: string;
  oque: string;
  valor: string;
  cor: string;
  icone: string;
  /** Barra com a marca do que a lei exige; larguras em % da barra. */
  regua: { val: number; ref: number; refTxt: string; dif: string } | null;
  /** Sem régua: o valor de 2022 para comparar. */
  antes: string | null;
  grafico: GraficoPronto | null;
}

export const ICONES: Record<IndicadorConta, string> = {
  saude: "M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.4a4.2 4.2 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20Z",
  educacao: "M12 6.6C10.4 5.4 8.3 4.9 4.5 4.9v13.3c3.8 0 5.9.5 7.5 1.7 1.6-1.2 3.7-1.7 7.5-1.7V4.9c-3.8 0-5.9.5-7.5 1.7ZM12 6.6v13.3",
  folha: "M9 11a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 9 11ZM3.5 19.5a5.5 5.5 0 0 1 11 0M16 11a2.8 2.8 0 1 0 0-5.6M17.2 14.3a5 5 0 0 1 3.3 5.2",
  divida: "M3.5 7.5A1.5 1.5 0 0 1 5 6h14a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 18H5a1.5 1.5 0 0 1-1.5-1.5ZM3.5 10.5h17M7 14.5h4",
  investimentos: "M4 20h16M6 20V9.5l5-3V20M11 20v-8.5h7V20M14.2 14.5h.8M14.2 17.2h.8",
  primario: "M12 4.5v7M8.5 8h7M8.5 17h7",
};
const CORES: Record<IndicadorConta, string> = { saude: "#FF375F", educacao: "#0A84FF", folha: "#FF9F0A", divida: "#BF5AF2", investimentos: "#30B0C7", primario: "#5E5CE6" };

/** Larguras da régua: a escala vai até 125% do maior entre o valor e a referência. */
export function regua(val: number, ref: number): { val: number; ref: number } {
  const max = Math.max(val, ref, 0) * 1.25 || 1;
  return { val: Math.max(0, (val / max) * 100), ref: (ref / max) * 100 };
}
/** "2,2 pontos acima", "1 ponto abaixo" (diferença entre dois %). */
export function pontos(dif: number): string {
  const a = Math.abs(dif);
  if (a < 0.05) return "igual ao exigido";
  return `${fmt(a, a >= 50 ? 0 : 1)} ${a < 2 ? "ponto" : "pontos"} ${dif > 0 ? "acima" : "abaixo"}`;
}

/**
 * As linhas de "Contas do governo" de um ente, do último ano com relatório. `mandatoDesde`: ano da posse de quem governa
 * hoje (2023); null para quem ainda não tomou posse (tudo é "antes da posse").
 */
export function linhasContas(contas: ContaGoverno[], ente: string, mandatoDesde: number | null): LinhaConta[] {
  const uniao = ente === "BR";
  const anos = [...new Set(contas.map((c) => c.ano))].sort((a, b) => a - b);
  if (!anos.length) return [];
  const ultimo = anos.at(-1)!, primeiro = anos[0]!;
  const de = (k: IndicadorConta, ano: number) => contas.find((c) => c.indicador === k && c.ano === ano) ?? null;
  const serie = (k: IndicadorConta, campo: "percentual" | "percentualRef" | "reais" | "reaisRef") => anos.map((a) => de(k, a)?.[campo] ?? null);
  const ini = mandatoDesde === null ? anos.length : Math.max(0, anos.findIndex((a) => a >= mandatoDesde));
  const antesDaPosse = mandatoDesde !== null && primeiro < mandatoDesde ? ", antes da posse" : "";
  const graf = (k: IndicadorConta, d: Omit<DadosGrafico, "id" | "periodos" | "ini">) => montarGrafico({ id: `conta-${k}`, periodos: anos.map(String), ini, ...d });
  /** Referência fixa quando é a mesma em todos os anos; senão, uma por ano (o mínimo de educação de SP mudou de 30% para 25%). */
  const refFixa = (rs: (number | null)[]) => { const v = rs.filter((x): x is number => x != null); return v.length && v.every((x) => x === v[0]) ? v[0]! : null; };
  const out: LinhaConta[] = [];
  const base = (k: IndicadorConta, nome: string, oque: string) => ({ chave: k, nome, oque, cor: CORES[k], icone: ICONES[k] });

  for (const [k, nome, area] of [["saude", "Saúde", "saúde"], ["educacao", "Educação", "educação"]] as const) {
    const c = de(k, ultimo);
    if (!c) continue;
    if (uniao) {
      const temPiso = c.reais != null && c.reaisRef != null;
      const r = temPiso ? regua(c.reais!, c.reaisRef!) : null;
      out.push({ ...base(k, nome, "aplicados no ano"), valor: c.reais != null ? bi(c.reais) : "—",
        regua: r && temPiso ? { ...r, refTxt: `mínimo: ${bi(c.reaisRef!)}`, dif: `${fmt(Math.abs((c.reais! / c.reaisRef! - 1) * 100), 0)}% ${c.reais! >= c.reaisRef! ? "acima" : "abaixo"}` } : null,
        antes: temPiso ? null : `o relatório de ${ultimo} não traz o valor`,
        grafico: serie(k, "percentual").some((v) => v != null) ? graf(k, {
          rotulo: `${nome.toUpperCase()} · EM % DO MÍNIMO`, un: "do mínimo", valores: serie(k, "percentual"), ref: 100, refRotulo: "mínimo", refLegenda: "mínimo da Constituição",
          fv: (v) => pct(v, 0), fy: (v) => pct(v, 0),
          nota: `Quanto foi aplicado em ${area} em relação ao mínimo da Constituição, um valor em reais na União. 100% é o mínimo.${serie(k, "percentual").some((v) => v == null) ? " Ano sem ponto: o relatório não traz o número." : ""}`,
        }) : null });
    } else {
      const refs = serie(k, "percentualRef");
      const fixa = refFixa(refs);
      out.push({ ...base(k, nome, `da receita de impostos foi para a ${area}`), valor: c.percentual != null ? pct(c.percentual) : "—",
        regua: c.percentual != null && c.percentualRef != null ? { ...regua(c.percentual, c.percentualRef), refTxt: `mínimo: ${pct(c.percentualRef, c.percentualRef % 1 ? 2 : 0)}`, dif: pontos(c.percentual - c.percentualRef) } : null,
        antes: c.percentual == null ? `o relatório de ${ultimo} não traz o número` : null,
        grafico: graf(k, {
          rotulo: `${nome.toUpperCase()} · EM % DA RECEITA DE IMPOSTOS`, un: "da receita", valores: serie(k, "percentual"),
          ...(fixa != null ? { ref: fixa, refRotulo: `mínimo ${pct(fixa, fixa % 1 ? 2 : 0)}` } : { refs, refRotulo: "mínimo", fr: (v: number) => pct(v, v % 1 ? 2 : 0) }),
          refLegenda: fixa != null ? "mínimo da Constituição" : "mínimo informado em cada relatório",
          fv: (v) => pct(v), fy: (v) => pct(v, 0),
          nota: `Parte da receita de impostos (com as transferências da União) aplicada em ${area}, contra o mínimo que o relatório informa.${serie(k, "percentual").some((v) => v == null) ? " Ano sem ponto: o relatório não traz o número." : ""}`,
        }) });
    }
  }

  const folha = de("folha", ultimo);
  if (folha) {
    const refs = serie("folha", "percentualRef");
    const fixa = refFixa(refs);
    out.push({ ...base("folha", "Folha de pagamento", "da receita vai para salários e aposentadorias dos servidores"),
      valor: folha.percentual != null ? pct(folha.percentual) : "—",
      regua: folha.percentual != null && folha.percentualRef != null ? { ...regua(folha.percentual, folha.percentualRef), refTxt: `limite da lei: ${pct(folha.percentualRef, folha.percentualRef % 1 ? 1 : 0)}`, dif: pontos(folha.percentual - folha.percentualRef) } : null,
      antes: folha.percentual == null ? `o relatório de ${ultimo} não traz o número` : null,
      grafico: graf("folha", {
        rotulo: "FOLHA DE PAGAMENTO · EM % DA RECEITA", un: "da receita", valores: serie("folha", "percentual"),
        ...(fixa != null ? { ref: fixa, refRotulo: `limite ${pct(fixa, fixa % 1 ? 1 : 0)}` } : { refs, refRotulo: "limite", fr: (v: number) => pct(v, v % 1 ? 1 : 0) }),
        refLegenda: "limite da Lei de Responsabilidade Fiscal",
        fv: (v) => pct(v), fy: (v) => pct(v, 0),
        nota: `Gasto com servidores ativos, aposentados e pensionistas do Poder Executivo${uniao ? " federal" : " estadual"}, sobre a receita corrente líquida.${uniao ? "" : " A partir de 90% do limite, o Tribunal de Contas emite alerta."}`,
      }) });
  }

  const div = uniao ? null : de("divida", ultimo);
  if (div) {
    out.push({ ...base("divida", "Dívida", "do que o estado arrecada em um ano"), valor: div.percentual != null ? pct(div.percentual, 0) : "—",
      regua: div.percentual != null && div.percentualRef != null ? { ...regua(div.percentual, div.percentualRef), refTxt: `limite do Senado: ${pct(div.percentualRef, 0)}`, dif: pontos(div.percentual - div.percentualRef) } : null,
      antes: div.percentual == null ? `o relatório de ${ultimo} não traz o número` : null,
      grafico: graf("divida", {
        rotulo: "DÍVIDA · EM % DA RECEITA DE UM ANO", un: "da receita", valores: serie("divida", "percentual"), ref: div.percentualRef ?? 200, refRotulo: `limite ${pct(div.percentualRef ?? 200, 0)}`, refLegenda: "limite do Senado",
        fv: (v) => pct(v, 0), fy: (v) => pct(v, 0),
        nota: "Dívida consolidada líquida no fim de cada ano, sobre a receita corrente líquida. Abaixo de zero: o caixa é maior que a dívida.",
      }) });
  }

  const inv = de("investimentos", ultimo);
  if (inv) {
    const ini22 = de("investimentos", primeiro)?.reais;
    out.push({ ...base("investimentos", "Investimentos", "em obras e equipamentos"), valor: inv.reais != null ? bi(inv.reais) : "—", regua: null,
      antes: ini22 != null && primeiro < ultimo ? `Em ${primeiro}${antesDaPosse}: ${bi(ini22)}` : null,
      grafico: graf("investimentos", {
        rotulo: "INVESTIMENTOS · R$ BILHÕES", un: "no ano", valores: serie("investimentos", "reais").map((v) => (v == null ? null : v / 1e9)),
        fv: (v) => bi(v * 1e9), fy: (v) => fmt(v, 0),
        nota: "Obras, equipamentos e outros investimentos pagos no ano, em reais da época (sem descontar a inflação).",
      }) });
  }

  const pri = de("primario", ultimo);
  if (pri && pri.reais != null) {
    const meta = pri.reaisRef;
    const metas = serie("primario", "reaisRef");
    const temMetas = metas.some((v) => v != null);
    const ini22 = de("primario", primeiro)?.reais;
    const valores = serie("primario", "reais").map((v) => (v == null ? null : v / 1e9));
    const cruzaZero = valores.some((v) => v != null && v < 0) && valores.some((v) => v != null && v > 0);
    out.push({ ...base("primario", "Saldo das contas", "receitas menos despesas, sem os juros da dívida"), valor: bi(pri.reais, true),
      regua: meta != null && meta > 0 && pri.reais >= 0 ? { ...regua(pri.reais, meta), refTxt: `meta do ano: ${bi(meta, true)}`, dif: `${bi(Math.abs(pri.reais - meta))} ${pri.reais >= meta ? "acima" : "abaixo"}` } : null,
      antes: meta != null && !(meta > 0 && pri.reais >= 0) ? `meta do ano: ${bi(meta, true)} · ${bi(Math.abs(pri.reais - meta))} ${pri.reais >= meta ? "acima" : "abaixo"}` : meta == null && ini22 != null && primeiro < ultimo ? `Em ${primeiro}${antesDaPosse}: ${bi(ini22, true)}` : null,
      grafico: graf("primario", {
        rotulo: "SALDO DAS CONTAS · R$ BILHÕES", un: "no ano", valores,
        ...(temMetas ? { refs: metas.map((v) => (v == null ? null : v / 1e9)), refRotulo: "meta", refLegenda: "meta da Lei de Diretrizes Orçamentárias", fr: (v: number) => bi(v * 1e9, true) }
          : cruzaZero || valores.some((v) => v != null && v < 0) ? { ref: 0, refRotulo: "zero", refLegenda: "receitas iguais às despesas", refDireita: true } : {}),
        fv: (v) => bi(v * 1e9, true), fy: (v) => fmt(v, 0),
        nota: `Resultado primário como apurado no relatório${temMetas ? ", contra a meta de cada ano" : ""}.${uniao ? " A meta oficial da União desconta despesas autorizadas por lei; se ela foi cumprida sai no relatório de avaliação do Tesouro." : ""}`,
      }) });
  }
  return out;
}

// ---------------------------------------------------------------- como o país ou o estado está

export interface LinhaIndicador {
  chave: IndicadorPais;
  nome: string;
  per: string;
  valor: string;
  /** Quanto mudou desde o fim de 2022 ("↓ 2,7 pontos"); null sem o ponto de 2022. */
  delta: string | null;
  mini: { linha: string; base: string };
  grafico: GraficoPronto | null;
  /** Sem dado para o lugar (inflação fora das áreas do IPCA): o porquê. */
  lacuna: string | null;
}

type Freq = "ano" | "trimestre" | "mes";
const freqDe = (p: string): Freq => (/-T\d$/.test(p) ? "trimestre" : /-\d{2}$/.test(p) ? "mes" : "ano");
/** Janela dos gráficos: anuais desde 2019; trimestrais e mensais desde 2022 (o ano antes da posse). */
const naJanela = (p: string) => (freqDe(p) === "ano" ? anoDe(p) >= 2019 : anoDe(p) >= 2022);
/** O ponto de comparação: o fim de 2022. */
const BASE: Record<Freq, string> = { ano: "2022", trimestre: "2022-T4", mes: "2022-12" };

/** Rótulos do eixo de baixo: um por ano (no 1º trimestre ou em janeiro), ou um por ponto nas séries anuais. */
function ticksAnuais(periodos: string[]): { i: number; t: string }[] {
  if (freqDe(periodos[0] ?? "") === "ano") return periodos.map((p, i) => ({ i, t: p }));
  return periodos.flatMap((p, i) => (/-(T1|01)$/.test(p) ? [{ i, t: p.slice(0, 4) }] : []));
}

/** "região metropolitana de São Paulo" → "Grande São Paulo"; "município de Rio Branco" → "Rio Branco". */
export const areaCurta = (a: string) => a.replace(/^região metropolitana de /, "Grande ").replace(/^município de /, "");

/** "na região metropolitana de São Paulo", "na região da Grande Vitória", "no município de Rio Branco". */
const noLugar = (area: string) => (area.startsWith("município") ? `no ${area}` : area.startsWith("Grande") ? `na região da ${area}` : `na ${area}`);

export function linhasIndicadores(inds: IndicadorLocal[], local: string, mandatoDesde: number | null, nomeLugar: string): LinhaIndicador[] {
  const uf = local !== "BR";
  const DEF: { k: IndicadorPais; nome: string; rotulo: string; un: string; casas: number; fv: (v: number) => string; fy: (v: number) => string; delta: "abs3" | "pct" | "pontos"; per: (p: string, area: string | null) => string; nota: (area: string | null) => string }[] = [
    { k: "idh", nome: "IDH", rotulo: "ÍNDICE DE DESENVOLVIMENTO HUMANO", un: "", casas: 3, fv: (v) => fmt(v, 3), fy: (v) => fmt(v, 2), delta: "abs3", per: (p) => `${p} · de 0 a 1`,
      nota: () => "Junta expectativa de vida, educação e renda; quanto mais perto de 1, maior o desenvolvimento humano. IDHM do Atlas Brasil (PNUD, Ipea e FJP), pelo Ipeadata; de 2012 em diante, com a PNAD Contínua." },
    { k: "desemprego", nome: "Desemprego", rotulo: "DESEMPREGO · POR TRIMESTRE", un: "procuram trabalho", casas: 1, fv: (v) => pct(v), fy: (v) => pct(v, 0), delta: "pontos", per: (p) => periodoLegivel(p),
      nota: () => "Pessoas que procuram trabalho, em % de quem trabalha ou procura (PNAD Contínua, IBGE). Costuma subir no início de cada ano." },
    { k: "renda", nome: "Renda média", rotulo: "RENDA MÉDIA DO TRABALHO · POR MÊS", un: "por mês", casas: 0, fv: (v) => `R$ ${num(v, 0)}`, fy: (v) => `${num(v / 1000, 1)} mil`, delta: "pct", per: (p) => `${p} · por mês`,
      nota: () => "Média do que recebe quem trabalha, descontada a inflação, em valores do último ano (PNAD Contínua, IBGE)." },
    { k: "informalidade", nome: "Informalidade", rotulo: "INFORMALIDADE · POR ANO", un: "de quem trabalha", casas: 1, fv: (v) => pct(v), fy: (v) => pct(v, 0), delta: "pontos", per: (p) => p,
      nota: () => "Quem trabalha sem carteira assinada ou por conta própria sem CNPJ, em % de quem trabalha (PNAD Contínua, IBGE)." },
    { k: "pobreza", nome: "Pobreza", rotulo: "POBREZA · POR ANO", un: "da população", casas: 1, fv: (v) => pct(v), fy: (v) => pct(v, 0), delta: "pontos", per: (p) => p,
      nota: () => `Pessoas ${uf ? "do estado " : ""}abaixo da linha de pobreza do indicador 1.2.1 dos Objetivos de Desenvolvimento Sustentável, calculado pelo IBGE.` },
    { k: "inflacao", nome: "Inflação", rotulo: "INFLAÇÃO EM 12 MESES · IPCA", un: "em 12 meses", casas: 2, fv: (v) => pct(v, 2), fy: (v) => pct(v, 0), delta: "pontos",
      per: (p, area) => (area ? `${areaCurta(area)} · ${periodoLegivel(p)}` : `${periodoLegivel(p)} · 12 meses`),
      nota: (area) => `Quanto os preços subiram nos 12 meses anteriores a cada mês (IPCA, IBGE)${area ? `, ${noLugar(area)}. O IBGE não calcula o IPCA do estado inteiro` : ""}.` },
    ...(uf ? [] : [{ k: "pib" as const, nome: "PIB", rotulo: "CRESCIMENTO DO PIB · EM 4 TRIMESTRES", un: "em 4 trimestres", casas: 1, fv: (v: number) => pct(v), fy: (v: number) => pct(v, 1), delta: "pontos" as const, per: () => "alta em 4 trimestres",
      nota: () => "Quanto a economia cresceu nos últimos 4 trimestres, comparados aos 4 anteriores (Contas Nacionais, IBGE)." }]),
  ];
  const out: LinhaIndicador[] = [];
  for (const d of DEF) {
    const xs = inds.filter((i) => i.indicador === d.k && naJanela(i.periodo)).sort((a, b) => a.periodo.localeCompare(b.periodo));
    if (!xs.length) {
      if (d.k === "inflacao" && uf) out.push({ chave: d.k, nome: d.nome, per: "sem medição no estado", valor: "—", delta: null, mini: { linha: "", base: "" }, grafico: null,
        lacuna: `O IBGE mede a inflação (IPCA) em 10 regiões metropolitanas e 6 capitais; ${nomeLugar} não está entre elas.` });
      continue;
    }
    const periodos = xs.map((x) => x.periodo);
    const valores = xs.map((x) => x.valor);
    const ultimo = xs.at(-1)!;
    const area = ultimo.area;
    const ini = mandatoDesde === null ? periodos.length : Math.max(0, periodos.findIndex((p) => anoDe(p) >= mandatoDesde));
    const baseItem = xs.find((x) => x.periodo === BASE[freqDe(ultimo.periodo)]);
    let delta: string | null = null;
    if (baseItem) {
      const dif = ultimo.valor - baseItem.valor;
      const seta = dif > 0 ? "↑" : dif < 0 ? "↓" : "=";
      const a = Math.abs(dif);
      delta = d.delta === "abs3" ? `${seta} ${num(a, 3)}`
        : d.delta === "pct" ? `${seta} ${num(Math.abs((ultimo.valor / baseItem.valor - 1) * 100), 0)}%`
        : `${seta} ${num(a, d.casas || 1)} ${a < 2 ? "ponto" : "pontos"}`;
    }
    out.push({
      chave: d.k, nome: d.nome, per: d.per(ultimo.periodo, area), valor: d.fv(ultimo.valor), delta,
      mini: minigrafico(valores, baseItem?.valor ?? null),
      grafico: montarGrafico({ id: `ind-${d.k}`, rotulo: d.rotulo, un: d.un, periodos, valores, ini, fv: d.fv, fy: d.fy, ticks: ticksAnuais(periodos), nota: d.nota(area) }),
      lacuna: null,
    });
  }
  return out;
}

// ---------------------------------------------------------------- placar com o Congresso

export interface LinhaPlacar { tipo: string; nome: string; total: number; enviadas: string; lei: number; encerradas: number; outras: number; texto: string }

const ENCERRADAS = new Set<string>(SITUACOES_ENCERRADAS);
/**
 * O que o governo enviou, por tipo: virou lei; perdeu a validade (MP) ou encerrada sem virar lei; e o resto (MP sem
 * desfecho registrado na Câmara, projeto em tramitação). Projetos do orçamento (PLN) ficam fora das barras.
 */
export function placarCongresso(ps: ProposicaoExecutivo[]): { linhas: LinhaPlacar[]; pln: { total: number; aprovados: number } } {
  // Rótulo, e se o substantivo é feminino (medidas, leis, emendas) para a concordância do texto.
  const TIPOS: [string, string, boolean][] = [["MPV", "Medidas provisórias", true], ["PL", "Projetos de lei", false], ["PLP", "Leis complementares", true], ["PEC", "Emendas à Constituição", true]];
  const linhas = TIPOS.map(([tipo, nome, fem]) => {
    const xs = ps.filter((p) => p.tipo === tipo);
    const lei = xs.filter((p) => p.virouNorma).length;
    const encerradas = xs.filter((p) => !p.virouNorma && (tipo === "MPV" ? p.situacao === "Perdeu a Eficácia" : p.situacao != null && ENCERRADAS.has(p.situacao))).length;
    const outras = xs.length - lei - encerradas;
    const o = (n: number) => (fem ? "a" : "o") + (n === 1 ? "" : "s");
    const primeira = tipo === "PEC" ? (lei ? `${lei} aprovada${lei === 1 ? "" : "s"}` : "Nenhuma aprovada")
      : lei ? `${lei} ${lei === 1 ? "virou lei" : "viraram lei"}` : `Nenhum${fem ? "a" : ""} virou lei`;
    const segunda = tipo === "MPV" ? `${encerradas} ${encerradas === 1 ? "perdeu a validade" : "perderam a validade"}` : `${encerradas} encerrad${o(encerradas)} sem virar lei`;
    const terceira = tipo === "MPV" ? `${outras} sem desfecho registrado` : `${outras} em tramitação`;
    return { tipo, nome, total: xs.length, enviadas: `${xs.length} enviad${o(xs.length)}`, lei, encerradas, outras, texto: [primeira, segunda, terceira].join(" · ") };
  }).filter((l) => l.total > 0);
  const pln = ps.filter((p) => p.tipo === "PLN");
  return { linhas, pln: { total: pln.length, aprovados: pln.filter((p) => p.virouNorma).length } };
}

export function resumoVetos(vs: Veto[]): { total: number; derrubados: number; aguardando: number; mantidos: number } {
  const s = vs.map((v) => situacaoVeto(v));
  return { total: vs.length, derrubados: s.filter((x) => x === "derrubado").length, aguardando: s.filter((x) => x === "aguardando").length, mantidos: s.filter((x) => x === "mantido").length };
}

// ---------------------------------------------------------------- o que o presidente assinou

export interface AtoNaLista { id: string; tipo: "LEI" | "DEC" | "MPV"; nome: string; data: string; ementa: string | null; url: string }
const NOME_TIPO: Record<AtoExecutivo["tipo"], string> = { LEI: "Lei", LCP: "Lei Complementar", DEC: "Decreto", MPV: "MP" };
export const nomeAto = (a: Pick<AtoExecutivo, "tipo" | "numero">) => `${NOME_TIPO[a.tipo]} ${a.numero.toLocaleString("pt-BR")}`;
const naLista = (a: AtoExecutivo): AtoNaLista => ({ id: a.id, tipo: a.tipo === "LCP" ? "LEI" : a.tipo, nome: nomeAto(a), data: `${a.data.slice(8, 10)}/${a.data.slice(5, 7)}`, ementa: a.ementa, url: a.url });

/** Totais do ano por tipo (leis com as complementares), os atos de rotina por grupo e os mais recentes que não são rotina. */
export function resumoAtos(atos: AtoExecutivo[], ano: number) {
  const doAno = atos.filter((a) => a.data.startsWith(`${ano}-`)).sort((a, b) => b.data.localeCompare(a.data) || b.numero - a.numero);
  const substantivos = doAno.filter((a) => !a.rotina);
  const ultimos = (f: (a: AtoExecutivo) => boolean) => substantivos.filter(f).slice(0, 5).map(naLista);
  const grupos = (Object.keys(NOME_ROTINA) as GrupoRotina[]).map((g) => ({ grupo: g, nome: NOME_ROTINA[g], n: doAno.filter((a) => a.rotina === g).length })).filter((g) => g.n > 0);
  return {
    ano,
    total: doAno.length,
    leis: doAno.filter((a) => a.tipo === "LEI" || a.tipo === "LCP").length,
    complementares: doAno.filter((a) => a.tipo === "LCP").length,
    decretos: doAno.filter((a) => a.tipo === "DEC").length,
    mps: doAno.filter((a) => a.tipo === "MPV").length,
    rotina: grupos,
    recentes: { todos: ultimos(() => true), LEI: ultimos((a) => a.tipo === "LEI" || a.tipo === "LCP"), DEC: ultimos((a) => a.tipo === "DEC"), MPV: ultimos((a) => a.tipo === "MPV") },
  };
}
export type ResumoAtos = ReturnType<typeof resumoAtos>;
