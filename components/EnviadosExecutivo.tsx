"use client";

import { useState } from "react";
import { manchete } from "@/lib/titulo";

/** Proposição do Executivo federal, compacta para a página (lib/types.ts#ProposicaoExecutivo). */
export interface EnviadoExecutivo { id: string; tipo: string; numero: number; ano: number; ementa: string | null; data: string; situacao: string | null; norma: boolean; url: string }

const TIPO: Record<string, [string, string]> = {
  MPV: ["Medida provisória", "Medidas provisórias"],
  PL: ["Projeto de lei", "Projetos de lei"],
  PLP: ["Projeto de lei complementar", "Projetos de lei complementar"],
  PEC: ["Proposta de emenda à Constituição", "Propostas de emenda à Constituição"],
  PLN: ["Projeto de lei do Congresso (orçamento)", "Projetos de lei do Congresso (orçamento)"],
};
const ORDEM = ["MPV", "PL", "PLP", "PEC", "PLN"];
const inteiro = (n: number) => n.toLocaleString("pt-BR");
const dataBr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const COR_NORMA = "#0A84FF", COR_RESTO = "#8E8E93";

/**
 * "O que o governo enviou ao Congresso" (crachá do presidente, E23t): contagem por tipo, quantas viraram norma
 * e a lista com a situação oficial na Câmara. Só contagem da fonte, sem nota nem "cumpriu" (princípio 4).
 */
export function EnviadosExecutivo({ itens, desde }: { itens: EnviadoExecutivo[]; desde: string }) {
  const [tipo, setTipo] = useState("todos");
  const [lim, setLim] = useState(8);
  const tipos = ORDEM.filter((t) => itens.some((x) => x.tipo === t));
  const doTipo = tipo === "todos" ? itens : itens.filter((x) => x.tipo === tipo);
  const norma = doTipo.filter((x) => x.norma).length;
  const pct = doTipo.length ? (norma / doTipo.length) * 100 : 0;
  const r = 52, c = 2 * Math.PI * r;
  const chip = (on: boolean) => `inline-flex h-8 items-center gap-1 rounded-full border px-3 text-[13px] font-semibold whitespace-nowrap ${on ? "border-[rgba(64,156,255,0.6)] bg-[rgba(64,156,255,0.28)] text-texto" : "border-white/14 bg-white/6 text-texto/85 hover:bg-white/10"}`;

  return (
    <div className="grid min-w-0 gap-3.5 [&>*]:min-w-0">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tipo">
        <button type="button" aria-pressed={tipo === "todos"} onClick={() => { setTipo("todos"); setLim(8); }} className={chip(tipo === "todos")}>Tudo <span className="font-normal text-suave">{inteiro(itens.length)}</span></button>
        {tipos.map((t) => (
          <button key={t} type="button" aria-pressed={tipo === t} onClick={() => { setTipo(t); setLim(8); }} className={chip(tipo === t)} title={TIPO[t]?.[1]}>
            {t} <span className="font-normal text-suave">{inteiro(itens.filter((x) => x.tipo === t).length)}</span>
          </button>
        ))}
      </div>

      <figure className="grid gap-3.5 rounded-[18px] border border-white/8 bg-white/6 p-4">
        <figcaption className="text-[15px] font-semibold">{tipo === "todos" ? "Quantas viraram norma" : TIPO[tipo]?.[1] ?? tipo}</figcaption>
        <div className="flex items-center gap-4">
          <svg viewBox="0 0 140 140" className="size-28 shrink-0" role="img" aria-label={`${Math.round(pct)}% viraram norma: ${norma} de ${doTipo.length}`}>
            <circle cx="70" cy="70" r={r} fill="none" stroke={COR_RESTO} strokeWidth="22" />
            {norma > 0 && <circle cx="70" cy="70" r={r} fill="none" stroke={COR_NORMA} strokeWidth="22" strokeDasharray={`${(pct / 100) * c} ${c}`} transform="rotate(-90 70 70)" />}
          </svg>
          <dl className="grid flex-1 gap-3">
            <div className="grid gap-0.5"><dt className="text-xs text-suave">Viraram norma</dt><dd className="flex items-baseline gap-1.5"><span className="text-2xl leading-7 font-semibold tabular-nums">{inteiro(norma)}</span><span className="text-[13px] font-semibold text-texto/60 tabular-nums">{pct > 0 && pct < 1 ? "<1" : Math.round(pct)}%</span></dd></div>
            <div className="grid gap-0.5 border-t border-borda pt-3"><dt className="text-xs text-suave">Enviadas ao Congresso</dt><dd className="text-2xl leading-7 font-semibold tabular-nums">{inteiro(doTipo.length)}</dd></div>
          </dl>
        </div>
        <span className="text-[11px] text-texto/60">Desde {desde} · {tipo === "MPV" ? "medida provisória perde a eficácia se o Congresso não a votar em até 120 dias" : "as recentes ainda podem estar em tramitação"}</span>
      </figure>

      <ul className="grid min-w-0">
        {doTipo.slice(0, lim).map((x) => (
          <li key={x.id} className="flex min-w-0 gap-3 border-b border-borda py-3">
            <span className="inline-flex h-10 min-w-[58px] shrink-0 flex-col items-center justify-center rounded-full border border-[rgba(64,156,255,0.35)] bg-[rgba(0,113,227,0.22)] text-[11px] leading-[13px] font-semibold text-link" title={TIPO[x.tipo]?.[0]}>
              {x.tipo}<span className="text-[13px] tabular-nums">{x.numero}</span>
            </span>
            <span className="grid min-w-0 flex-1 gap-1.5">
              <span className="line-clamp-4 text-[15px] leading-5 [overflow-wrap:anywhere]" title={x.ementa ?? undefined}>{manchete(x.ementa) || "— (a fonte não traz a ementa)"}</span>
              <span className="text-xs text-suave">{TIPO[x.tipo]?.[0] ?? x.tipo} · enviada em {dataBr(x.data)}</span>
              <span className="flex min-w-0 items-center justify-between gap-2">
                <span title={x.situacao ?? undefined} className={`inline-block h-[22px] min-w-0 truncate rounded-full border px-[9px] text-[11px] leading-[20px] font-bold ${x.norma ? "border-[#0A84FF]/50 bg-[#0A84FF]/22 text-[#8CC4FF]" : "border-white/20 bg-white/10 text-texto/85"}`}>
                  {x.norma ? "Virou norma" : x.situacao ?? "Situação não informada"}
                </span>
                <a href={x.url} target="_blank" rel="noreferrer noopener" className="inline-flex min-h-8 shrink-0 items-center text-[13px] font-semibold no-underline">Ver na Câmara ›</a>
              </span>
            </span>
          </li>
        ))}
      </ul>
      {doTipo.length > lim && (
        <button type="button" onClick={() => setLim((l) => l + 20)} className="h-9 justify-self-center rounded-full border border-white/16 bg-white/10 px-4 text-[15px] font-semibold text-link">
          Ver mais ({inteiro(doTipo.length - lim)})
        </button>
      )}
    </div>
  );
}
