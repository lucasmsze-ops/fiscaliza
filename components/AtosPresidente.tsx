"use client";

import Link from "next/link";
import { useState } from "react";
import type { ResumoAtos } from "@/lib/executivo-painel";
import { SEGMENTO, SEGMENTO_ON, SEGMENTOS } from "@/lib/estilo";
import { manchete } from "@/lib/titulo";

const TAG: Record<"LEI" | "DEC" | "MPV", [string, string]> = {
  LEI: ["Lei", "bg-[rgba(10,132,255,0.24)] text-[#8CC4FF]"],
  DEC: ["Decreto", "bg-white/12 text-texto/90"],
  MPV: ["MP", "bg-[rgba(255,159,10,0.2)] text-[#FFC266]"],
};
const FILTROS = [["todos", "Todos"], ["LEI", "Leis"], ["DEC", "Decretos"], ["MPV", "MPs"]] as const;
const inteiro = (n: number) => n.toLocaleString("pt-BR");
const externo = { target: "_blank", rel: "noreferrer noopener" } as const;

/**
 * "O que o presidente assinou" (E23y): totais do ano, os 5 atos mais recentes que não são rotina (filtro por tipo) e a
 * rotina recolhida, por grupo. A lista completa fica em /executivos/presidente/atos. Títulos pela regra de manchete
 * sobre a ementa oficial (nada escrito por nós).
 */
export function AtosPresidente({ r, hrefLista }: { r: ResumoAtos; hrefLista: string }) {
  const [f, setF] = useState<(typeof FILTROS)[number][0]>("todos");
  const lista = f === "todos" ? r.recentes.todos : r.recentes[f];
  return (
    <div className="vidro grid gap-3.5 rounded-card p-4">
      <div className="grid grid-cols-3 gap-2">
        {([[r.leis, r.complementares ? `leis (${inteiro(r.complementares)} complementares)` : "leis"], [r.decretos, "decretos"], [r.mps, "medidas provisórias"]] as const).map(([n, t]) => (
          <div key={t} className="grid content-start gap-0.5 rounded-[18px] border border-white/8 bg-white/6 p-3">
            <span className="text-[22px] font-bold tabular-nums">{inteiro(n)}</span>
            <span className="text-[13px] leading-4 text-suave">{t}</span>
          </div>
        ))}
      </div>

      <div className={SEGMENTOS} style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }} role="group" aria-label="Filtrar por tipo">
        {FILTROS.map(([k, t]) => (
          <button key={k} type="button" aria-pressed={f === k} onClick={() => setF(k)} className={f === k ? SEGMENTO_ON : SEGMENTO}>{t}</button>
        ))}
      </div>

      {lista.length ? (
        <ul className="grid">
          {lista.map((a) => (
            <li key={a.id} className="grid gap-1.5 border-b border-white/12 py-3 last:border-b-0">
              <span className="flex items-center gap-2">
                <span className={`inline-flex h-5 items-center rounded-md px-[7px] text-[11px] font-bold ${TAG[a.tipo][1]}`}>{TAG[a.tipo][0]}</span>
                <span className="text-xs text-suave">{a.data} · {a.nome}</span>
              </span>
              <span className="line-clamp-3 text-[15px] leading-5 font-semibold" title={a.ementa ?? undefined}>{a.ementa ? manchete(a.ementa) : "Sem ementa na fonte"}</span>
              <a href={a.url} {...externo} className="justify-self-start text-[13px] font-semibold no-underline">Texto no Senado ›</a>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-suave">Nenhum ato deste tipo em {r.ano}, fora os de rotina.</p>}

      <Link href={hrefLista} className="vidro flex min-h-11 items-center justify-center rounded-full text-[15px] font-semibold no-underline hover:bg-preench-forte">
        Ver os {inteiro(r.total)} atos de {r.ano}
      </Link>

      {r.rotina.length > 0 && (
        <details className="group rounded-[18px] border border-white/10 bg-white/6">
          <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-3 px-3.5 [&::-webkit-details-marker]:hidden">
            <span className="grid gap-0.5"><span className="text-[15px] font-semibold">Atos de rotina em {r.ano}</span><span className="text-xs text-suave">{r.rotina.map((g) => g.nome.charAt(0).toLowerCase() + g.nome.slice(1)).join(", ")}</span></span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(235,235,245,0.45)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 transition-transform group-open:rotate-180"><path d="m6 9 6 6 6-6" /></svg>
          </summary>
          <dl className="grid px-3.5 pb-2">
            {r.rotina.map((g) => (
              <div key={g.grupo} className="flex justify-between gap-3 border-t border-white/10 py-2.5">
                <dt className="text-[13px] text-texto/80">{g.nome}</dt>
                <dd className="text-[13px] font-semibold tabular-nums"><Link href={`${hrefLista}&rotina=sim`} className="no-underline">{inteiro(g.n)}</Link></dd>
              </div>
            ))}
          </dl>
        </details>
      )}
    </div>
  );
}
