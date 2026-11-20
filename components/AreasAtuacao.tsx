"use client";

import { useState } from "react";
import { inteiro } from "@/lib/card";
import { hrefSecao } from "@/lib/glossario";
import type { PropostasPagina } from "@/lib/pagina";

const COR_NORMA = "#0A84FF", COR_RESTO = "#8E8E93";
const VISIVEIS = 10;

/**
 * Áreas de atuação (protótipo Liquid Glass, E23s): os temas oficiais das propostas de autoria, como a
 * Câmara e o Senado classificam, com a parte que virou norma. Só contagem da fonte, sem nota (princípio 4).
 */
export function AreasAtuacao({ p }: { p: PropostasPagina }) {
  const [todas, setTodas] = useState(false);
  const areas = p.areas ?? [];
  const max = areas[0]?.total ?? 1;
  const lista = todas ? areas : areas.slice(0, VISIVEIS);
  return (
    <section aria-labelledby="cr-areas" className="vidro grid gap-3.5 rounded-card px-4 py-[18px]">
      <div className="grid gap-1">
        <h2 id="cr-areas" className="text-lg font-semibold">Áreas de atuação</h2>
        <span className="text-xs leading-4 text-suave">
          Temas das {inteiro(p.comTema ?? 0)} propostas desde {p.desde}, como a Câmara e o Senado classificam. Uma proposta pode ter mais de um tema.
          {p.comTema != null && p.comTema < p.leis && ` ${inteiro(p.leis - p.comTema)} ainda sem tema na fonte.`}
        </span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-texto/75">
        <span className="flex items-center gap-1.5"><span aria-hidden="true" className="size-2.5 rounded-[3px]" style={{ background: COR_NORMA }} />Viraram norma</span>
        <span className="flex items-center gap-1.5"><span aria-hidden="true" className="size-2.5 rounded-[3px]" style={{ background: COR_RESTO }} />Não viraram norma</span>
      </div>
      <ul className="grid gap-2.5">
        {lista.map((a) => (
          <li key={a.tema} className="grid gap-1" aria-label={`${a.tema}: ${a.total} propostas, ${a.norma} viraram norma`}>
            <span className="flex justify-between gap-2 text-[13px]"><span>{a.tema}</span><span className="font-semibold tabular-nums">{inteiro(a.total)}</span></span>
            <span aria-hidden="true" className="flex h-2 gap-0.5">
              {a.norma > 0 && <span className="rounded" style={{ width: `${(a.norma / max) * 100}%`, background: COR_NORMA }} />}
              {a.total > a.norma && <span className="rounded" style={{ width: `${((a.total - a.norma) / max) * 100}%`, background: COR_RESTO }} />}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {areas.length > VISIVEIS && (
          <button type="button" onClick={() => setTodas(!todas)} className="h-9 rounded-full border border-white/16 bg-white/10 px-4 text-[15px] font-semibold text-link">
            {todas ? "Ver menos" : `Ver todos os temas (${areas.length})`}
          </button>
        )}
        <a href={hrefSecao("propostas")} className="text-[13px] no-underline">Como contamos</a>
      </div>
    </section>
  );
}
