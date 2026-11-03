/**
 * Job `cota` (E21d): cota parlamentar do Brasil inteiro, uma coleta por mês.
 *
 * Câmara: `/deputados/{id}/despesas` de todos os que passaram pela legislatura 57 (a mesma fonte do
 * número do político; o CSV anual omite as passagens SIGEPA). Senado: o arquivo anual da CEAPS
 * (`adm.senado.gov.br`), sem fornecedor nem CPF/CNPJ.
 *
 * Média da bancada no mês = soma de todos os parlamentares da UF com lançamento no mês ÷ quantos,
 * inclusive quem já saiu e não está no site (por isso a média é estável: troca de suplente não
 * muda meses passados). `despesas_mes` guarda só quem está em `politicos`.
 *
 * Mês fechado (lib/ceap.ts): total da bancada igual ao da coleta anterior, que é o publicado. Uma
 * coleta por mês civil; `coletas.json` guarda as datas. Na primeira coleta nacional não há coleta
 * anterior comparável: fecham os meses até o último fechado do publicado (SP, regra da sonda).
 * Uso fora do calendário: FISCALIZA_COTA=forcar.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mapLimite } from "../../lib/async";
import { listarDeputados, listarDespesas } from "../../lib/camara";
import { fechadosAte, fecharMeses, mediasPorUf, somarPorMes, type GastoMes } from "../../lib/ceap";
import { getMandatos, listarDespesasCeaps } from "../../lib/senado";
import { FONTES, lerTabela, PUBLICADO, type LinhaBruta } from "./estado";

const ANO_INICIAL = 2025; // como na sonda; 2023 e 2024 entram na E27 (cota completa)
const LEG = 57; // despesas de 2027 em diante pedem a legislatura 58 (fevereiro de 2027)
const MESES_ABERTOS = 6; // anos com algum mês nos últimos 6 meses são baixados de novo a cada coleta
const EM_VOO = 3;
const DIR = `${FONTES}/cota`;

type Casa = "camara" | "senado";
interface CacheAno { buscadoEm: string; meses: GastoMes[] }
const ler = <T>(f: string): T => JSON.parse(readFileSync(f, "utf8")) as T;
const chaveMes = (m: { ano: number; mes: number }) => m.ano * 100 + m.mes;
const dias = (a: string, b: string) => Math.round((Date.parse(a) - Date.parse(b)) / 86_400_000);

export async function jobCota(hoje: string): Promise<{ tabelas: Record<string, LinhaBruta[]>; relatorio: string[]; falhas: number; atualizadas: string[] }> {
  mkdirSync(`${DIR}/camara`, { recursive: true });
  mkdirSync(`${DIR}/senado`, { recursive: true });
  const arqColetas = `${DIR}/coletas.json`;
  const coletas: string[] = existsSync(arqColetas) ? ler(arqColetas) : [];
  const anterior = coletas.at(-1);
  if (anterior && anterior.slice(0, 7) === hoje.slice(0, 7) && process.env.FISCALIZA_COTA !== "forcar") {
    return { tabelas: {}, relatorio: [`já coletada em ${anterior}; a próxima é no mês que vem`], falhas: 0, atualizadas: [] };
  }

  const relatorio: string[] = [];
  let falhas = 0;
  const anoHoje = Number(hoje.slice(0, 4));
  const seisMeses = new Date(Date.parse(hoje)); seisMeses.setUTCMonth(seisMeses.getUTCMonth() - MESES_ABERTOS);
  const anos = Array.from({ length: anoHoje - ANO_INICIAL + 1 }, (_, i) => ANO_INICIAL + i);
  const aberto = (ano: number) => ano >= seisMeses.getUTCFullYear();
  // Baixado neste mês civil: vale (retomar no dia seguinte só busca o que falhou).
  const fresco = (c: { buscadoEm: string } | null, ano: number) => c !== null && (!aberto(ano) || c.buscadoEm.slice(0, 7) === hoje.slice(0, 7));

  const politicos = lerTabela("politicos");
  const porCamara = new Map(politicos.filter((p) => p.camara_id).map((p) => [Number(p.camara_id), String(p.id)]));
  const porSenado = new Map(politicos.filter((p) => p.senado_codigo).map((p) => [String(p.senado_codigo), p]));

  /** Gasto de cada parlamentar por mês, com a UF da bancada (na Casa, não a da candidatura de 2026). */
  const gastos: { casa: Casa; uf: string; politicoId: string | null; g: GastoMes }[] = [];

  // ---------------------------------------------------------------- Câmara
  let camaraOk = false;
  try {
    const leg57 = [...new Map((await listarDeputados({ legislatura: LEG })).map((d) => [d.camaraId, d])).values()];
    const tarefas = leg57.flatMap((d) => anos.map((ano) => ({ d, ano, arq: `${DIR}/camara/${d.camaraId}-${ano}.json` })));
    const res = await mapLimite(tarefas, EM_VOO, async ({ d, ano, arq }) => {
      const c = existsSync(arq) ? ler<CacheAno>(arq) : null;
      if (fresco(c, ano)) return { d, meses: c!.meses, baixado: false };
      const itens = await listarDespesas(d.camaraId, LEG, ano);
      const meses = somarPorMes(itens.map((x) => ({ ano: x.ano, mes: x.mes, tipo: x.tipo, valor: x.valorLiquido })));
      writeFileSync(arq, JSON.stringify({ buscadoEm: hoje, meses } satisfies CacheAno));
      return { d, meses, baixado: true };
    });
    relatorio.push(`Câmara: ${leg57.length} deputados da legislatura ${LEG}, ${res.ok.filter((r) => r.baixado).length} deputado-anos baixados, ${res.ok.filter((r) => !r.baixado).length} do cache, ${res.falhas.length} falhas`);
    for (const f of res.falhas.slice(0, 5)) relatorio.push(`  falha ${f.item.d.camaraId}-${f.item.ano}: ${String(f.erro).slice(0, 120)}`);
    if (res.falhas.length) falhas += res.falhas.length; // sem todos, a média sairia errada: a Câmara fica para a próxima execução
    else {
      camaraOk = true;
      for (const r of res.ok) for (const g of r.meses) gastos.push({ casa: "camara", uf: r.d.uf, politicoId: porCamara.get(r.d.camaraId) ?? null, g });
    }
  } catch (e) {
    falhas++;
    relatorio.push(`Câmara FALHOU: ${(e as Error).message}`);
  }

  // ---------------------------------------------------------------- Senado
  let senadoOk = false;
  try {
    const porAno = new Map<number, Record<string, GastoMes[]>>();
    for (const ano of anos) {
      const arq = `${DIR}/senado/${ano}.json`;
      const c = existsSync(arq) ? ler<{ buscadoEm: string; porSenador: Record<string, GastoMes[]> }>(arq) : null;
      if (fresco(c, ano)) { porAno.set(ano, c!.porSenador); continue; }
      const itens = await listarDespesasCeaps(ano);
      const agrupado = new Map<string, typeof itens>();
      for (const d of itens) agrupado.set(d.senadoCodigo, [...(agrupado.get(d.senadoCodigo) ?? []), d]);
      const porSenador = Object.fromEntries([...agrupado].sort((a, b) => a[0].localeCompare(b[0])).map(([cod, xs]) => [cod, somarPorMes(xs)]));
      writeFileSync(arq, JSON.stringify({ buscadoEm: hoje, porSenador }));
      porAno.set(ano, porSenador);
      relatorio.push(`Senado: CEAPS ${ano} baixada, ${itens.length} despesas de ${agrupado.size} senadores`);
    }
    // A CEAPS não traz a UF: vem de politicos ou, para quem não está no site (titular licenciado,
    // quem saiu), do mandato da legislatura 57 no Senado (o perfil só tem UF de quem está em
    // exercício), guardado em cache.
    const arqUfs = `${DIR}/senado/ufs.json`;
    const ufs: Record<string, string> = existsSync(arqUfs) ? ler(arqUfs) : {};
    const codigos = new Set([...porAno.values()].flatMap((x) => Object.keys(x)));
    for (const cod of codigos) {
      const p = porSenado.get(cod);
      if (p) ufs[cod] = String(p.uf);
      else if (!ufs[cod]) {
        const doPeriodo = new Set((await getMandatos(cod)).filter((m) => m.legislaturas.some((l) => l.numero === LEG)).map((m) => m.uf));
        if (doPeriodo.size !== 1) throw new Error(`senador ${cod}: ${doPeriodo.size} UFs nos mandatos da legislatura ${LEG}`);
        ufs[cod] = [...doPeriodo][0]!;
      }
    }
    writeFileSync(arqUfs, JSON.stringify(Object.fromEntries(Object.entries(ufs).sort())) + "\n");
    for (const porSenador of porAno.values()) for (const [cod, meses] of Object.entries(porSenador)) {
      for (const g of meses) gastos.push({ casa: "senado", uf: ufs[cod]!, politicoId: porSenado.has(cod) ? String(porSenado.get(cod)!.id) : null, g });
    }
    const fora = [...codigos].filter((c) => !porSenado.has(c)).length;
    relatorio.push(`Senado: ${codigos.size} senadores com despesa desde ${ANO_INICIAL}, ${codigos.size - fora} no site, ${fora} só na média`);
    senadoOk = true;
  } catch (e) {
    falhas++;
    relatorio.push(`Senado FALHOU: ${(e as Error).message}`);
  }

  if (!camaraOk && !senadoOk) return { tabelas: {}, relatorio, falhas, atualizadas: [] };

  // ---------------------------------------------------------------- linhas
  const despesasMes: LinhaBruta[] = gastos.filter((x) => x.politicoId).map((x) => ({
    politico_id: x.politicoId, casa: x.casa, uf: x.uf, ano: x.g.ano, mes: x.g.mes, total: x.g.total, por_categoria: x.g.porCategoria,
  }));

  // Fechamento: primeira coleta nacional → até o último mês fechado do publicado (regra da sonda, SP).
  const publicado = lerTabela("despesas_media_uf", PUBLICADO);
  const limiteInicial = Math.max(0, ...publicado.filter((m) => m.fechado).map((m) => chaveMes(m as { ano: number; mes: number })));
  const medias: LinhaBruta[] = [];
  const resumo: string[] = [];
  for (const casa of ["camara", "senado"] as const) {
    if (!(casa === "camara" ? camaraOk : senadoOk)) continue;
    const daCasa = mediasPorUf(gastos.filter((x) => x.casa === casa).map((x) => ({ uf: x.uf, ...x.g })));
    for (const uf of [...new Set(daCasa.map((m) => m.uf))]) {
      const atual = daCasa.filter((m) => m.uf === uf);
      const antes = publicado.filter((m) => (m.casa ?? "camara") === casa && m.uf === uf) as unknown as { ano: number; mes: number; total: number; fechado: boolean }[];
      const fechados = anterior ? fecharMeses(atual, antes, dias(hoje, anterior)) : fechadosAte(atual, limiteInicial);
      for (const m of atual) medias.push({ casa, ...m, fechado: fechados.has(chaveMes(m)) });
      const ult = Math.max(0, ...fechados);
      resumo.push(`${uf} ${ult ? `${ult % 100}/${Math.floor(ult / 100)}` : "nenhum"}`);
    }
    relatorio.push(`${casa}: último mês fechado por UF (${anterior ? `coleta anterior em ${anterior}` : `primeira coleta nacional, até ${limiteInicial % 100}/${Math.floor(limiteInicial / 100)}`}): ${resumo.splice(0).join(", ")}`);
  }

  // Conferência: a média de cada bancada bate com a soma dos parlamentares (os do site + os só da média);
  // a média é arredondada ao centavo, daí a folga de meio centavo.
  let conferidas = 0;
  for (const m of medias) {
    const xs = gastos.filter((x) => x.casa === m.casa && x.uf === m.uf && x.g.ano === m.ano && x.g.mes === m.mes);
    const soma = xs.reduce((s, x) => s + Math.round(x.g.total * 100), 0) / 100;
    if (Math.round(soma * 100) !== Math.round(Number(m.total) * 100) || xs.length !== m.parlamentares || Math.abs(soma / xs.length - Number(m.media)) > 0.005 + 1e-9) {
      throw new Error(`média não bate com a soma em ${m.casa} ${m.uf} ${m.ano}-${m.mes}`);
    }
    conferidas++;
  }
  const soMedia = gastos.filter((x) => !x.politicoId);
  relatorio.push(`conferidas ${conferidas} médias (casa × UF × mês) contra a soma; ${soMedia.length} parlamentar-meses entram só na média (${new Set(soMedia.map((x) => `${x.casa}:${x.uf}`)).size} bancadas)`);

  if (!falhas) writeFileSync(arqColetas, JSON.stringify([...coletas, hoje]) + "\n");
  return { tabelas: { despesas_mes: despesasMes, despesas_media_uf: medias }, relatorio, falhas, atualizadas: [...(camaraOk ? ["camara_cota"] : []), ...(senadoOk ? ["senado_cota"] : [])] };
}
