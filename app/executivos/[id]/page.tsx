import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BarraVoltar } from "@/components/BarraVoltar";
import { ChecklistPlano } from "@/components/ChecklistPlano";
import { inteiro } from "@/lib/card";
import { corPartido, nomePartido } from "@/lib/partidos";
import { planoDe } from "@/lib/promessas";
import { pelaUf } from "@/lib/regioes";
import { repo } from "@/lib/repo";
import type { ExecutivoEleito } from "@/lib/types";
import { CARD, NUMERO, ROTULO, TITULO_CARTAO, TITULO_PAGINA, TITULO_SECAO } from "@/lib/estilo";

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
  return {
    title: `${e.nomeUrna} · ${cargoEleito(e)} · Fiscaliza`,
    description: `${cargoEleito(e)} em 2026, posse em ${dataBr(e.posse)}. Votos, patrimônio declarado, coligação e candidaturas anteriores, com dados oficiais do TSE.`,
  };
}

/**
 * Crachá do executivo eleito em 2026 (pedido de 2026-11-14), só com o que o TSE publica, e o checklist
 * do plano de governo onde a lista de promessas foi aprovada (lib/promessas.ts): status só por ato oficial.
 */
export default async function PaginaExecutivo({ params }: Props) {
  const e = await achar((await params).id);
  if (!e) notFound();
  const nome = nomePartido(e.partido);
  const plano = planoDe(e.tseSqCandidato);
  const v = e.votos;
  const decisivo = v?.t2 ?? v?.t1 ?? null;
  const fonteResultado = e.cargo === "presidente" ? "https://resultados.tse.jus.br/oficial/app/index.html#/eleicao;e=e6257/resultados" : "https://resultados.tse.jus.br/oficial/app/index.html";

  return (
    <>
    <BarraVoltar volta={e.uf ? `/?uf=${e.uf}` : "/"} rotulo="Visão geral" />
    <main className="grid gap-6 pb-8">
      <section aria-labelledby="nome-executivo">
        <div className="flex items-center gap-3 rounded-card bg-card p-4 sm:gap-5 sm:p-5">
          {e.fotoUrl
            // <img> de propósito: a foto vem direto da URL oficial do TSE, sem passar pela Vercel (CLAUDE.md).
            ? <img src={e.fotoUrl} alt={`Foto oficial de ${e.nomeUrna}`} width={90} height={90} decoding="async" className="size-16 shrink-0 rounded-full bg-preench object-cover object-top sm:size-[90px]" />
            : <span aria-hidden="true" className="size-16 shrink-0 rounded-full bg-preench sm:size-[90px]" />}
          <div className="grid min-w-0 flex-1 gap-1.5">
            <h1 id="nome-executivo" className="text-2xl font-bold break-words sm:text-3xl">{e.nomeUrna}</h1>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-sm font-semibold text-suave sm:text-base">{cargoEleito(e)}</span>
              <span className="inline-flex h-[26px] items-center rounded-lg px-3 text-xs font-semibold" style={{ background: `color-mix(in srgb, ${corPartido(e.partido)} 24%, transparent)` }}>
                {e.partido}{nome && nome.toLowerCase() !== e.partido.toLowerCase() ? ` · ${nome}` : ""}
              </span>
            </div>
            <span className="text-xs text-suave">
              Eleit{fem(e) ? "a" : "o"} em 2026 · posse em {dataBr(e.posse)}
              {e.viceNomeUrna && <> · vice: <strong className="text-texto">{e.viceNomeUrna}</strong>{e.vicePartido ? ` (${e.vicePartido})` : ""}</>}
            </span>
          </div>
        </div>
      </section>

      <section aria-label="Números principais" className="grid grid-cols-2 gap-3 sm:gap-[18px]">
        {decisivo && (
          <div className={`${card} col-span-2 grid content-start gap-1 sm:col-span-1`}>
            <span className={ROTULO}>Votos em 2026</span>
            <span className={NUMERO}>{inteiro(decisivo.votos)}</span>
            <span className="text-xs text-suave">
              {pct(decisivo.pct)} dos votos válidos {v?.t2 ? "no 2º turno" : "no 1º turno"}
              {v?.t2 && v.t1 && <> · 1º turno: {inteiro(v.t1.votos)} ({pct(v.t1.pct)})</>}
            </span>
          </div>
        )}
        <div className={`${card} col-span-2 grid content-start gap-1 sm:col-span-1`}>
          <span className={ROTULO}>Patrimônio declarado ao TSE</span>
          {e.bensTotal != null
            ? <><span className={NUMERO}>{reais(e.bensTotal)}</span><span className="text-xs text-suave">soma de {e.bensN} {e.bensN === 1 ? "bem declarado" : "bens declarados"} no registro da candidatura de 2026</span></>
            : <><span className={NUMERO}>—</span><span className="text-xs text-suave">nenhum bem declarado no registro da candidatura</span></>}
        </div>
        {e.idadeNaPosse != null && (
          <div className={`${card} grid content-start gap-1`}>
            <span className={ROTULO}>Idade na posse</span>
            <span className={NUMERO}>{e.idadeNaPosse} anos</span>
          </div>
        )}
        {(e.instrucao || e.ocupacao) && (
          <div className={`${card} grid content-start gap-1`}>
            <span className={ROTULO}>Declarou ao TSE</span>
            {e.instrucao && <span className="text-[15px] font-semibold">{titulo(e.instrucao)}</span>}
            {e.ocupacao && <span className="text-xs text-suave">Ocupação: {titulo(noGenero(e.ocupacao, fem(e)))}</span>}
          </div>
        )}
      </section>

      {(e.coligacao || e.composicao) && (
        <section className={`${card} grid gap-2`} aria-labelledby="ex-coligacao">
          <h2 id="ex-coligacao" className="text-lg font-semibold">Coligação</h2>
          {e.coligacao && <p className="text-[15px] font-semibold">{titulo(e.coligacao)}</p>}
          {e.composicao && (
            <p className="flex flex-wrap gap-1.5">
              {partesColigacao(e.composicao).map((x) => (
                <span key={x} className="rounded-md bg-preench px-2 py-0.5 text-xs">{x}</span>
              ))}
            </p>
          )}
        </section>
      )}

      <section className={`${card} grid gap-2.5`} aria-labelledby="ex-plano">
        <h2 id="ex-plano" className="text-lg font-semibold">{plano ? "Plano de governo: o que foi prometido" : "Proposta de governo"}</h2>
        {plano
          ? <ChecklistPlano plano={plano} posse={e.posse} nome={e.nomeUrna} antesDaPosse={new Date().toISOString().slice(0, 10) < e.posse} />
          : <p className="text-sm leading-relaxed text-suave">O plano de governo é o documento que {fem(e) ? "a candidata" : "o candidato"} registrou no TSE. O acompanhamento ponto a ponto, só com atos oficiais, ainda não foi preparado para {e.nomeUrna}.</p>}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-borda pt-2.5">
          <a href={`https://cdn.tse.jus.br/estatistica/sead/odsele/proposta_governo/proposta_governo_2026_${e.cargo === "presidente" ? "BR" : e.uf}.zip`} {...externo}
            className="inline-flex h-10 w-fit items-center rounded-full bg-preench px-4 text-[13px] font-semibold text-texto no-underline hover:bg-preench-forte">
            Plano completo no TSE ›
          </a>
          <span className="text-xs break-all text-suave">Arquivo com as propostas de {e.cargo === "presidente" ? "todos os candidatos a presidente" : `todos os candidatos ${pelaUf(e.uf ?? "")}`}; a de {e.nomeUrna} é o PDF 2026{e.cargo === "presidente" ? "BR" : e.uf}{e.tseSqCandidato}_01.</span>
        </div>
      </section>

      {e.historico && e.historico.length > 0 && (
        <section className={`${card} grid gap-2`} aria-labelledby="ex-hist">
          <h2 id="ex-hist" className="text-lg font-semibold">Candidaturas anteriores</h2>
          <ol className="grid">
            {e.historico.map((h) => (
              <li key={`${h.ano}-${h.cargo}-${h.lugar}`} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b border-borda py-2.5 text-sm last:border-b-0">
                <span><strong className="tabular-nums">{h.ano}</strong> · {h.cargo} · {h.lugar} · {h.partido}</span>
                <span className="text-xs text-suave">{h.resultado ?? (h.situacao && h.situacao !== "Apto" ? `candidatura ${h.situacao.toLowerCase()}` : "resultado não informado pela fonte")}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <p className="text-xs text-suave">
        Fonte: TSE (registro de candidatura, bens declarados, histórico de candidaturas e <a href={fonteResultado} {...externo} className="underline underline-offset-2">resultado</a>).
        Posse pela Emenda Constitucional 111/2021. · <Link href="/como-funciona" className="underline underline-offset-2">Como contamos</Link>
      </p>
    </main>
    </>
  );
}
