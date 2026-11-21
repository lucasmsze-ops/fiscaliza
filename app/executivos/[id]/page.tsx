import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AtosPresidente } from "@/components/AtosPresidente";
import { AtuacaoCongresso } from "@/components/AtuacaoCongresso";
import { BarraVoltar } from "@/components/BarraVoltar";
import { ChipPartido } from "@/components/ChipPartido";
import { EnviadosExecutivo } from "@/components/EnviadosExecutivo";
import { ContasGoverno, IndicadoresLugar, PlacarCongresso, SecaoExecutivo } from "@/components/PainelExecutivo";
import { inteiro } from "@/lib/card";
import { hojeBrasil } from "@/lib/datas";
import { CARD } from "@/lib/estilo";
import { governaDesde2023, parlamentarDoGovernador } from "@/lib/executivo-atuacao";
import { linhasContas, linhasIndicadores, placarCongresso, resumoAtos, resumoVetos } from "@/lib/executivo-painel";
import { nomePartido } from "@/lib/partidos";
import { arquivosDoPlano, tamanho, zipDoTse } from "@/lib/planos";
import { doUf, NOME_UF, pelaUf } from "@/lib/regioes";
import { repo } from "@/lib/repo";
import type { ExecutivoEleito } from "@/lib/types";

export const revalidate = 86400;
export const dynamicParams = true;

type Props = { params: Promise<{ id: string }> };

/** URL do crachá: /executivos/presidente ou /executivos/sp (a UF do governador). */
const slugExecutivo = (e: Pick<ExecutivoEleito, "cargo" | "uf">) => (e.cargo === "presidente" ? "presidente" : (e.uf ?? "").toLowerCase());

async function achar(id: string) {
  const es = (await repo.listarExecutivos()).filter((e) => e.ano === 2026);
  return es.find((e) => slugExecutivo(e) === id) ?? null;
}

export async function generateStaticParams() {
  return (await repo.listarExecutivos()).filter((e) => e.ano === 2026).map((e) => ({ id: slugExecutivo(e) }));
}

const fem = (e: ExecutivoEleito) => e.genero === "feminino";
const cargoEleito = (e: ExecutivoEleito) => e.cargo === "presidente"
  ? (fem(e) ? "Presidenta eleita" : "Presidente eleito")
  : `${fem(e) ? "Governadora eleita" : "Governador eleito"} ${pelaUf(e.uf ?? "")}`;
/** Quem governa desde 2023: o cargo que exerce ("Presidente da República", "Governador de São Paulo"). */
const cargoAtual = (e: ExecutivoEleito) => e.cargo === "presidente"
  ? (fem(e) ? "Presidenta da República" : "Presidente da República")
  : `${fem(e) ? "Governadora" : "Governador"} ${doUf(e.uf ?? "")}`;
const dataBr = (iso: string) => `${Number(iso.slice(8, 10))}/${Number(iso.slice(5, 7))}/${iso.slice(0, 4)}`;
const pct = (n: number) => `${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
const reais = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
/** Caixa de título, com "e", "de", "da", "do" em minúscula ("Ensino Fundamental Completo", "Técnico em Mecânica"). */
const titulo = (s: string) => s.toLocaleLowerCase("pt-BR").replace(/(^|[\s/(-])(\p{L})/gu, (_, a: string, b: string) => a + b.toLocaleUpperCase("pt-BR"))
  .replace(/ (E|De|Da|Do|Das|Dos|Em) /g, (m) => m.toLocaleLowerCase("pt-BR"));
/** O TSE escreve a ocupação nos dois gêneros ("GOVERNADORA/GOVERNADOR"): fica a forma do gênero declarado. */
const noGenero = (s: string, feminino: boolean) => s.replace(/([^\s/]+)\/([^\s/]+)/g, (_, f: string, m: string) => (feminino ? f : m));
const card = CARD;

/**
 * "PSB / PDT / FEDERAÇÃO X (13-PT / 65-PC do B)" → ["PSB", "PDT", "Federação X (PT, PC do B)"]: separa
 * só no nível de fora (a barra também aparece dentro da federação) e tira os números dos partidos.
 */
function partesColigacao(s: string): string[] {
  const partes: string[] = [];
  let atual = "", nivel = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    if (ch === "(") nivel++;
    if (ch === ")") nivel--;
    if (nivel === 0 && s.startsWith(" / ", i)) { partes.push(atual); atual = ""; i += 2; continue; }
    atual += ch;
  }
  partes.push(atual);
  return partes.map((p) => p.trim().replace(/^FEDERAÇÃO /, "Federação ").replace(/\(([^)]*)\)/, (_, d: string) => `(${d.split(" / ").map((x) => x.replace(/^\d+-/, "")).join(", ")})`)).filter(Boolean);
}
const externo = { target: "_blank", rel: "noreferrer noopener" } as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const e = await achar((await params).id);
  if (!e) return { title: "Fiscaliza" };
  const cargo = governaDesde2023(e) ? cargoAtual(e) : cargoEleito(e);
  return {
    title: `${e.nomeUrna} · ${cargo} · Fiscaliza`,
    description: `${cargo}: contas do governo ao lado do que a lei exige, indicadores ${e.cargo === "presidente" ? "do país" : "do estado"}${e.cargo === "presidente" && governaDesde2023(e) ? ", placar com o Congresso e o que assinou" : ""}, com dados oficiais.`,
  };
}

/**
 * Página do presidente ou do governador eleito em 2026 no layout do protótipo aprovado (E23y, canvas versão 112):
 * Contas do governo (SICONFI), Como o país/estado está (IBGE e IDH), Placar com o Congresso e O que o presidente assinou
 * (só para quem governa desde 2023), Plano de governo (o PDF) e Sobre a candidatura (recolhido). Dados da E23x.
 * Quem ainda não governa vê as contas e os índices do estado como ponto de partida, "antes da posse" (decisão do
 * usuário de 2026-11-21).
 */
export default async function PaginaExecutivo({ params }: Props) {
  const e = await achar((await params).id);
  if (!e) notFound();
  const presidente = e.cargo === "presidente";
  const local = presidente ? "BR" : (e.uf ?? "");
  const lugar = presidente ? "Brasil" : (NOME_UF[local] ?? local);
  const governa = governaDesde2023(e);
  const mandatoDesde = governa ? 2023 : null;
  const anoAtual = Number(hojeBrasil().slice(0, 4));
  const nome = nomePartido(e.partido);
  const arquivos = arquivosDoPlano(e.tseSqCandidato);

  const [contas, indicadores, enviadosRaw, vetos, atos, parlamentar] = await Promise.all([
    repo.contasGoverno(local),
    repo.indicadoresDe(local),
    presidente && governa ? repo.listarProposicoesExecutivo() : Promise.resolve([]),
    presidente && governa ? repo.listarVetos() : Promise.resolve([]),
    presidente && governa ? repo.listarAtos(`${anoAtual}-01-01`) : Promise.resolve([]),
    parlamentarDoGovernador(repo, e),
  ]);
  const lContas = linhasContas(contas, local, mandatoDesde);
  const ultimoAno = contas.length ? Math.max(...contas.map((c) => c.ano)) : null;
  const lIndicadores = linhasIndicadores(indicadores, local, mandatoDesde, lugar);
  const placar = placarCongresso(enviadosRaw);
  const enviados = enviadosRaw.map((x) => ({ id: x.id, tipo: x.tipo, numero: x.numero, ano: x.ano, ementa: x.ementa, data: x.apresentacao, situacao: x.situacao, norma: x.virouNorma, url: x.urlOficial }));
  const pagina = parlamentar ? await repo.getPagina(parlamentar.id) : null;
  const v = e.votos;
  const decisivo = v?.t2 ?? v?.t1 ?? null;
  const fonteResultado = presidente ? "https://resultados.tse.jus.br/oficial/app/index.html#/eleicao;e=e6257/resultados" : "https://resultados.tse.jus.br/oficial/app/index.html";
  const doGoverno = presidente ? "do governo federal" : `do governo ${doUf(local)}`;
  const pontoDePartida = !governa
    ? <p className="px-1 text-[13px] leading-[18px] text-suave">Números {doGoverno} antes da posse: o mandato de {e.nomeUrna} começa em {dataBr(e.posse)}.</p>
    : null;

  const sobre: [string, string][] = [
    ...(decisivo ? [["Votos em 2026", `${inteiro(decisivo.votos)} (${pct(decisivo.pct)} dos válidos, ${v?.t2 ? "2º turno" : "1º turno"})`] as [string, string]] : []),
    ...(v?.t2 && v.t1 ? [["1º turno", `${inteiro(v.t1.votos)} (${pct(v.t1.pct)})`] as [string, string]] : []),
    ...(e.viceNomeUrna ? [["Vice", `${e.viceNomeUrna}${e.vicePartido ? ` (${e.vicePartido})` : ""}`] as [string, string]] : []),
    ...(e.coligacao ? [["Coligação", titulo(e.coligacao)] as [string, string]] : []),
    ["Patrimônio declarado", e.bensTotal != null ? `${reais(e.bensTotal)} (${e.bensN} ${e.bensN === 1 ? "bem" : "bens"})` : "nenhum bem declarado"],
    ...(e.idadeNaPosse != null ? [["Idade na posse", `${e.idadeNaPosse} anos`] as [string, string]] : []),
    ...(e.instrucao ? [["Formação", titulo(e.instrucao)] as [string, string]] : []),
    ...(e.ocupacao ? [["Ocupação declarada", titulo(noGenero(e.ocupacao, fem(e)))] as [string, string]] : []),
  ];

  return (
    <>
    <BarraVoltar volta={e.uf ? `/mapa?uf=${e.uf}` : "/mapa"} rotulo="Mapa" />
    <main className="grid gap-4 pb-4 lg:pb-8 [&>*]:min-w-0">
      {/* Cabeçalho centrado, como o crachá do parlamentar (protótipo Liquid Glass). */}
      <section aria-labelledby="nome-executivo" className="flex flex-col items-center gap-2.5 pt-1 pb-2 text-center">
        {e.fotoUrl
          // <img> de propósito: a foto vem direto da URL oficial do TSE, sem passar pela Vercel (CLAUDE.md).
          ? <img src={e.fotoUrl} alt={`Foto oficial de ${e.nomeUrna}`} width={104} height={104} decoding="async" className="vidro size-[104px] shrink-0 rounded-full object-cover object-top" />
          : <span aria-hidden="true" className="vidro size-[104px] shrink-0 rounded-full" />}
        <h1 id="nome-executivo" className="mt-1 text-[28px] leading-[34px] font-bold tracking-[-0.4px] break-words">{e.nomeUrna}</h1>
        <p className="text-[15px] text-suave">{governa ? cargoAtual(e) : cargoEleito(e)}</p>
        <ChipPartido sigla={e.partido} grande>{e.partido}{nome && nome.toLowerCase() !== e.partido.toLowerCase() ? ` · ${nome}` : ""}</ChipPartido>
        <p className="max-w-[36ch] text-[13px] leading-[18px] text-suave">
          {governa
            ? <>No cargo desde 1/1/2023 · reeleit{fem(e) ? "a" : "o"} em 2026<br />Novo mandato a partir de {dataBr(e.posse)}</>
            : <>Eleit{fem(e) ? "a" : "o"} em 2026 · posse em {dataBr(e.posse)}</>}
        </p>
      </section>

      <SecaoExecutivo id="ex-contas" titulo="Contas do governo" info={<>
        {ultimoAno ? <>Valores de {ultimoAno}, o último ano fechado; a marca branca na barra é o que a lei exige. </> : null}
        Relatórios que o governo entrega ao Tesouro Nacional (RREO e RGF, no SICONFI).{" "}
        {presidente
          ? <>Na União, o mínimo de saúde e de educação é um valor em reais fixado pela Constituição. Folha de pagamento: gasto com os servidores do Poder Executivo federal sobre a receita corrente líquida, contra o limite da Lei de Responsabilidade Fiscal.</>
          : <>Saúde e educação: parte da receita de impostos, contra o mínimo da Constituição. Folha de pagamento e dívida: parte da receita corrente líquida, contra os limites da Lei de Responsabilidade Fiscal e do Senado. Saldo: contra a meta da Lei de Diretrizes Orçamentárias.</>}
        {" "}É comparação com a lei, não nota. <Link href="/como-funciona#executivo">Como contamos</Link>
      </>}>
        {pontoDePartida}
        {lContas.length
          ? <ContasGoverno linhas={lContas} />
          : <p className={`${card} text-sm text-suave`}>— As contas {doGoverno} ainda não foram coletadas: entram com a próxima atualização diária.</p>}
      </SecaoExecutivo>

      <SecaoExecutivo id="ex-lugar" titulo={presidente ? "Como o país está" : "Como o estado está"} info={<>
        A etiqueta mostra quanto cada número mudou desde o fim de 2022, antes da posse. IDH: Índice de Desenvolvimento Humano do Atlas
        Brasil (PNUD, Ipea e FJP), pelo Ipeadata. Desemprego, renda, informalidade e pobreza: PNAD Contínua, do IBGE. Inflação: IPCA, do IBGE.
        {presidente ? " PIB: Contas Nacionais, do IBGE." : " Só números do estado."} São indicadores {presidente ? "do país" : "do estado"}, não nota do governo:
        dependem de muita coisa além {presidente ? "do presidente" : `d${fem(e) ? "a governadora" : "o governador"}`}. <Link href="/como-funciona#executivo">Como contamos</Link>
      </>}>
        {lIndicadores.length
          ? <IndicadoresLugar linhas={lIndicadores} />
          : <p className={`${card} text-sm text-suave`}>— Os indicadores ainda não foram coletados: entram com a próxima atualização diária.</p>}
      </SecaoExecutivo>

      {presidente && governa && (
        <SecaoExecutivo id="ex-placar" titulo="Placar com o Congresso" info={<>
          Tudo o que o governo enviou ao Congresso desde 2023, com a situação registrada pela Câmara. Medida provisória vale como lei assim
          que publicada, por até 120 dias; se o Congresso não a vota nesse prazo, perde a validade. Veto derrubado: o Congresso restaurou pelo
          menos um trecho vetado. Prejudicado: não foi votado porque o assunto perdeu o objeto. <Link href="/como-funciona#executivo">Como contamos</Link>
        </>}>
          {placar.linhas.length
            ? <PlacarCongresso linhas={placar.linhas} vetos={resumoVetos(vetos)} pln={placar.pln} lista={<EnviadosExecutivo itens={enviados} desde="2023" />} />
            : <p className={`${card} text-sm text-suave`}>— Ainda não coletado: entra com a próxima atualização diária.</p>}
        </SecaoExecutivo>
      )}

      {presidente && governa && (
        <SecaoExecutivo id="ex-atos" titulo={`O que ${fem(e) ? "a presidenta" : "o presidente"} assinou`} info={<>
          Leis, leis complementares, decretos e medidas provisórias de {anoAtual}, pela legislação federal do Senado, com o título curto da
          ementa oficial. Créditos no orçamento, acordos internacionais, desapropriações e concessões de rádio e TV ficam recolhidos como
          rotina. Ato com data no futuro na fonte fica de fora até ser corrigido. <Link href="/como-funciona#executivo">Como contamos</Link>
        </>}>
          {atos.length
            ? <AtosPresidente r={resumoAtos(atos, anoAtual)} hrefLista={`/executivos/${slugExecutivo(e)}/atos?ano=${anoAtual}`} />
            : <p className={`${card} text-sm text-suave`}>— Ainda não coletado: entra com a próxima atualização diária.</p>}
        </SecaoExecutivo>
      )}

      {!presidente && (
        <SecaoExecutivo id="ex-atos" titulo="O que o governo assinou">
          <div className={`${card} grid gap-2`}>
            <p className="text-[15px] leading-[21px] text-texto/85">
              Leis e decretos d{fem(e) ? "a governadora" : "o governador"} saem no Diário Oficial do Estado, que não tem dado aberto unificado. Por
              isso ainda não aparecem aqui. Os projetos enviados à Assembleia Legislativa ficam para uma próxima etapa.
            </p>
            <Link href="/como-funciona#fora" className="inline-flex min-h-11 items-center text-[15px] font-semibold no-underline">Por que algumas informações faltam ›</Link>
          </div>
        </SecaoExecutivo>
      )}

      {!presidente && parlamentar && pagina && (
        <SecaoExecutivo id="ex-congresso" titulo="Atuação no Congresso">
          <div className={`${card} grid gap-3`}><AtuacaoCongresso pagina={pagina} /></div>
        </SecaoExecutivo>
      )}

      <section aria-label="Plano de governo e candidatura" className="vidro mt-2 overflow-hidden rounded-card">
        {arquivos.length > 0 ? arquivos.map((x, i) => (
          <a key={x.nome} href={x.url} {...externo} className="flex min-h-14 items-center justify-between gap-3 border-b border-white/12 px-4 text-texto no-underline hover:bg-white/4 hover:text-texto">
            <span className="grid gap-0.5"><span className="text-base font-semibold">{arquivos.length > 1 ? `Plano de governo, parte ${i + 1}` : "Plano de governo"}</span><span className="text-[13px] text-suave">PDF entregue ao TSE em 2026 · {tamanho(x.bytes)}</span></span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#409CFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12m0 0-4-4m4 4 4-4M5 21h14" /></svg>
          </a>
        )) : (
          <p className="border-b border-white/12 px-4 py-3 text-sm text-suave">
            O TSE não publicou o PDF do plano de {e.nomeUrna}. <a href={zipDoTse(presidente ? null : e.uf)} {...externo}>Propostas de governo no TSE</a>
          </p>
        )}
        <details className="group">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 hover:bg-white/4 [&::-webkit-details-marker]:hidden">
            <span className="grid gap-0.5"><span className="text-base font-semibold">Sobre a candidatura</span><span className="text-[13px] text-suave">Votos, vice, patrimônio e formação</span></span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(235,235,245,0.45)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 transition-transform group-open:rotate-180"><path d="m6 9 6 6 6-6" /></svg>
          </summary>
          <dl className="grid px-4 pb-2">
            {sobre.map(([k, x]) => (
              <div key={k} className="flex justify-between gap-3 border-t border-white/10 py-2.5">
                <dt className="text-[13px] text-suave">{k}</dt>
                <dd className="text-right text-[13px] font-semibold">{x}</dd>
              </div>
            ))}
            {e.composicao && (
              <div className="grid gap-1.5 border-t border-white/10 py-2.5">
                <dt className="text-[13px] text-suave">Partidos da coligação</dt>
                <dd className="flex flex-wrap gap-1.5">{partesColigacao(e.composicao).map((x) => <span key={x} className="rounded-md bg-preench px-2 py-0.5 text-xs">{x}</span>)}</dd>
              </div>
            )}
            {e.historico && e.historico.length > 0 && (
              <div className="grid gap-1 border-t border-white/10 py-2.5">
                <dt className="text-[13px] text-suave">Candidaturas anteriores</dt>
                <dd>
                  <ol className="grid">
                    {e.historico.map((h) => (
                      <li key={`${h.ano}-${h.cargo}-${h.lugar}`} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-1 text-[13px]">
                        <span><strong className="tabular-nums">{h.ano}</strong> · {h.cargo} · {h.lugar} · {h.partido}</span>
                        <span className="text-xs text-suave">{h.resultado ?? (h.situacao && h.situacao !== "Apto" ? `candidatura ${h.situacao.toLowerCase()}` : "resultado não informado pela fonte")}</span>
                      </li>
                    ))}
                  </ol>
                </dd>
              </div>
            )}
          </dl>
        </details>
      </section>

      <p className="px-2 text-xs leading-4 text-suave">
        Fontes: Tesouro Nacional (SICONFI: RREO do 6º bimestre e RGF do 3º quadrimestre), Atlas Brasil (PNUD, Ipea e FJP) pelo Ipeadata,
        IBGE{presidente && governa ? ", Câmara dos Deputados e Congresso Nacional (proposições e vetos), Senado Federal (legislação federal)" : ""} e TSE
        (<a href={fonteResultado} {...externo}>resultado</a>, registro de candidatura, bens e histórico). As contas de {anoAtual} entram em janeiro de {anoAtual + 1},
        com os relatórios do fim do ano. · <Link href="/como-funciona#executivo">Como contamos</Link>
      </p>
    </main>
    </>
  );
}
