import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BarraVoltar } from "@/components/BarraVoltar";
import { inteiro } from "@/lib/card";
import { NOME_ROTINA } from "@/lib/atos";
import { hojeBrasil } from "@/lib/datas";
import { CARD, CHIP, CHIP_ON, TITULO_PAGINA } from "@/lib/estilo";
import { governaDesde2023 } from "@/lib/executivo-atuacao";
import { nomeAto } from "@/lib/executivo-painel";
import { repo, type FiltroAtos } from "@/lib/repo";
import { manchete } from "@/lib/titulo";
import type { AtoExecutivo } from "@/lib/types";

export const metadata: Metadata = {
  title: "Atos do presidente · Fiscaliza",
  description: "Leis, leis complementares, decretos e medidas provisórias assinados pelo presidente, ano a ano, com o link oficial de cada um.",
};

const POR_PAGINA = 30;
const externo = { target: "_blank", rel: "noreferrer noopener" } as const;
const TAG: Record<AtoExecutivo["tipo"], [string, string]> = {
  LEI: ["Lei", "bg-[rgba(10,132,255,0.24)] text-[#8CC4FF]"],
  LCP: ["Lei complementar", "bg-[rgba(10,132,255,0.24)] text-[#8CC4FF]"],
  DEC: ["Decreto", "bg-white/12 text-texto/90"],
  MPV: ["MP", "bg-[rgba(255,159,10,0.2)] text-[#FFC266]"],
};
const dataBr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/**
 * Lista completa do que o presidente assinou (E23y): "Ver os N atos" da página do executivo. Filtros no endereço
 * (`?ano=&tipo=&rotina=&pagina=`), 30 por página, consulta ao banco a cada filtro, como /propostas.
 */
export default async function AtosDoPresidente({ params, searchParams }: Props) {
  const { id } = await params;
  if (id !== "presidente") notFound();
  const e = (await repo.listarExecutivos()).find((x) => x.ano === 2026 && x.cargo === "presidente");
  if (!e || !governaDesde2023(e)) notFound();
  const sp = await searchParams;
  const anoAtual = Number(hojeBrasil().slice(0, 4));
  const anos = Array.from({ length: anoAtual - 2023 + 1 }, (_, i) => anoAtual - i);
  const ano = anos.includes(Number(um(sp.ano))) ? Number(um(sp.ano)) : anoAtual;
  const tipo = (["LEI", "DEC", "MPV"] as const).find((t) => t === um(sp.tipo)) ?? null;
  const rotina = um(sp.rotina) === "sim" ? true : um(sp.rotina) === "nao" ? false : null;
  const filtro: FiltroAtos = { ano, tipo, rotina };
  const pagina = Math.max(1, Math.floor(Number(um(sp.pagina)) || 1));
  const r = await repo.buscarAtos(filtro, pagina, POR_PAGINA);
  const paginas = Math.ceil(r.total / POR_PAGINA);
  const href = (f: Partial<FiltroAtos>, p = 1) => {
    const g = { ...filtro, ...f };
    const q = new URLSearchParams({ ano: String(g.ano) });
    if (g.tipo) q.set("tipo", g.tipo);
    if (g.rotina !== null) q.set("rotina", g.rotina ? "sim" : "nao");
    if (p > 1) q.set("pagina", String(p));
    return `/executivos/presidente/atos?${q}`;
  };
  const chip = (on: boolean, rotulo: string, h: string) => <Link key={rotulo} href={h} aria-current={on ? "true" : undefined} className={`${on ? CHIP_ON : CHIP} no-underline`}>{rotulo}</Link>;

  return (
    <>
      <BarraVoltar volta="/executivos/presidente" rotulo={e.nomeUrna} />
      <main className="grid gap-4 pb-4 lg:pb-8 [&>*]:min-w-0">
        <header className="grid gap-1.5 px-1">
          <h1 className={TITULO_PAGINA}>O que {e.genero === "feminino" ? "a presidenta" : "o presidente"} assinou</h1>
          <p className="text-[15px] leading-5 text-texto/80">Leis, leis complementares, decretos e medidas provisórias de {e.nomeUrna}, pela legislação federal do Senado.</p>
        </header>

        <nav aria-label="Filtros" className="grid gap-2">
          <div className="flex flex-wrap gap-1.5">{anos.map((a) => chip(a === ano, String(a), href({ ano: a })))}</div>
          <div className="flex flex-wrap gap-1.5">
            {chip(tipo === null, "Todos", href({ tipo: null }))}{chip(tipo === "LEI", "Leis", href({ tipo: "LEI" }))}
            {chip(tipo === "DEC", "Decretos", href({ tipo: "DEC" }))}{chip(tipo === "MPV", "MPs", href({ tipo: "MPV" }))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {chip(rotina === null, "Com a rotina", href({ rotina: null }))}{chip(rotina === false, "Sem a rotina", href({ rotina: false }))}{chip(rotina === true, "Só a rotina", href({ rotina: true }))}
          </div>
        </nav>

        <p className="px-1 text-[13px] text-suave">{inteiro(r.total)} {r.total === 1 ? "ato" : "atos"} em {ano}</p>

        {r.itens.length > 0 ? (
          <ul className={`${CARD} grid py-1 sm:py-1`}>
            {r.itens.map((a) => (
              <li key={a.id} className="grid gap-1.5 border-b border-white/12 py-3 last:border-b-0">
                <span className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex h-5 items-center rounded-md px-[7px] text-[11px] font-bold ${TAG[a.tipo][1]}`}>{TAG[a.tipo][0]}</span>
                  <span className="text-xs text-suave">{dataBr(a.data)} · {nomeAto(a)}{a.rotina ? ` · ${NOME_ROTINA[a.rotina].charAt(0).toLowerCase()}${NOME_ROTINA[a.rotina].slice(1)}` : ""}</span>
                </span>
                <span className="line-clamp-4 text-[15px] leading-5 font-semibold" title={a.ementa ?? undefined}>{a.ementa ? manchete(a.ementa) : "Sem ementa na fonte"}</span>
                <a href={a.url} {...externo} className="justify-self-start text-[13px] font-semibold no-underline">Texto no Senado ›</a>
              </li>
            ))}
          </ul>
        ) : (
          <p className={`${CARD} text-[15px] text-texto/80`}>
            {r.total > 0 ? "Esta página não existe mais. " : "Nenhum ato com estes filtros. "}
            <Link href={href({}, 1)}>{r.total > 0 ? "Voltar à primeira página" : "Ver todos"}</Link>
          </p>
        )}

        {paginas > 1 && r.itens.length > 0 && (
          <nav aria-label="Páginas" className="flex items-center justify-between gap-3 px-1">
            {pagina > 1 ? <Link href={href({}, pagina - 1)} className="inline-flex h-11 items-center rounded-full vidro px-4 text-[15px] font-semibold no-underline">‹ Anteriores</Link> : <span />}
            <span className="text-[13px] text-suave tabular-nums">Página {inteiro(pagina)} de {inteiro(paginas)}</span>
            {pagina < paginas ? <Link href={href({}, pagina + 1)} className="inline-flex h-11 items-center rounded-full vidro px-4 text-[15px] font-semibold no-underline">Próximas ›</Link> : <span />}
          </nav>
        )}

        <p className="px-1 text-xs leading-5 text-suave">
          Fonte: legislação federal do Senado, coletada uma vez por dia; o título é o curto da ementa oficial, que abre no link.
          Rotina: créditos no orçamento, acordos internacionais, desapropriações e concessões de rádio e TV. Ato com data no futuro na
          fonte fica de fora até ser corrigido. <Link href="/como-funciona#executivo">Como contamos</Link>
        </p>
      </main>
    </>
  );
}
