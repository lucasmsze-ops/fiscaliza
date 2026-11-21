"use client";

import { useState } from "react";
import { GRAFICO, type GraficoPronto } from "@/lib/executivo-painel";

const LARG = 296, ALT = 180; // área total: o desenho (262 × 150) + rótulos do eixo à direita e anos embaixo
const AZUL = "#0A84FF", AMARELO = "#FFD60A";
const pctX = (x: number) => `${(x / LARG) * 100}%`;
const pctY = (y: number) => `${(y / ALT) * 100}%`;

/**
 * Gráfico de linha no estilo dos gráficos do iOS (protótipo de 2026-11-21): área em degradê no mandato, trecho
 * pontilhado antes da posse, linha amarela tracejada do mínimo, limite ou meta, e o ano tocável (ou o ponto mais perto
 * do toque) mostrando o valor no topo. O desenho vem pronto do servidor (`lib/executivo-painel.ts#montarGrafico`); aqui
 * só muda o ponto escolhido. Escala junto com a largura, até 420 px.
 */
export function GraficoLinha({ g }: { g: GraficoPronto }) {
  const [sel, setSel] = useState(g.sel);
  const p = g.pontos[sel] ?? g.pontos[g.sel];
  const gid = `deg-${g.id}`;
  const validos = g.pontos.flatMap((q, i) => (q ? [i] : []));
  const tocar = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const fx = ((e.clientX - r.left) / r.width) * GRAFICO.largura;
    let melhor = sel, dist = Infinity;
    for (const i of validos) { const d = Math.abs(g.pontos[i]!.x - fx); if (d < dist) { dist = d; melhor = i; } }
    setSel(melhor);
  };

  return (
    <figure className="m-0 grid gap-2.5 rounded-[20px] border border-white/8 bg-white/6 p-3.5">
      <div className="grid gap-px" aria-live="polite">
        <span className="text-xs font-semibold tracking-[0.2px] text-suave">{g.rotulo}</span>
        {p && (
          <>
            <span className="flex flex-wrap items-baseline gap-1.5">
              <span className="text-[28px] leading-[34px] font-bold tracking-[-0.3px] tabular-nums">{p.valor}</span>
              {g.un && <span className="text-sm text-suave">{g.un}</span>}
            </span>
            <span className="text-[13px] text-suave">{p.periodo}{p.extra ? ` · ${p.extra}` : ""}</span>
          </>
        )}
      </div>

      <div className="relative w-full max-w-[420px]" style={{ aspectRatio: `${LARG} / ${ALT}` }}>
        <svg viewBox={`0 0 ${LARG} ${GRAFICO.altura}`} className="absolute top-0 left-0 w-full overflow-visible" style={{ height: pctY(GRAFICO.altura) }} role="img" aria-label={g.aria}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={AZUL} stopOpacity="0.34" />
              <stop offset="1" stopColor={AZUL} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={g.grade} fill="none" stroke="rgba(255,255,255,0.11)" strokeWidth="1" />
          {g.area && <path d={g.area} fill={`url(#${gid})`} />}
          {g.ref && <path d={g.ref} fill="none" stroke={AMARELO} strokeWidth="1.5" strokeDasharray="5 4" />}
          {g.pre && <path d={g.pre} fill="none" stroke={AZUL} strokeWidth="2.75" strokeDasharray="0.5 5.5" strokeLinecap="round" />}
          <path d={g.linha} fill="none" stroke={AZUL} strokeWidth="2.75" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={g.temMandato ? undefined : "0.5 5.5"} />
          {g.marcas && <path d={g.marcas} fill={AZUL} />}
          {p && <path d={`M${p.x} ${GRAFICO.topo - 10}V${GRAFICO.altura - GRAFICO.base}`} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />}
          {p && <circle cx={p.x} cy={p.y} r="5.5" fill="#fff" stroke={AZUL} strokeWidth="3" />}
        </svg>
        {g.ylab.map((l) => (
          <span key={l.t + l.y} aria-hidden="true" className="absolute -translate-y-1/2 text-[11px] whitespace-nowrap text-suave/80 tabular-nums" style={{ left: pctX(270), top: pctY(l.y) }}>{l.t}</span>
        ))}
        {g.refRotulo && (
          <span aria-hidden="true" className="absolute -translate-y-[120%] rounded-md bg-[rgba(255,214,10,0.16)] px-1.5 py-px text-[11px] font-bold whitespace-nowrap text-[#FFD60A]"
            style={g.refRotulo.direita ? { right: pctX(LARG - GRAFICO.largura + 4), top: pctY(g.refRotulo.y) } : { left: 0, top: pctY(g.refRotulo.y) }}>{g.refRotulo.t}</span>
        )}
        <div aria-hidden="true" onClick={tocar} className="absolute top-0 left-0 cursor-pointer" style={{ width: pctX(GRAFICO.largura), height: pctY(GRAFICO.altura) }} />
        {g.ticks.map((t) => (
          <button key={t.i} type="button" disabled={t.vazio} aria-pressed={t.i === sel} onClick={() => setSel(t.i)}
            className={`absolute h-[26px] -translate-x-1/2 rounded-full px-1.5 text-xs font-semibold whitespace-nowrap tabular-nums ${t.i === sel ? "bg-white/16 text-texto" : t.vazio ? "text-suave/50" : "text-suave hover:text-texto"}`}
            style={{ left: pctX(t.x), top: pctY(GRAFICO.altura + 2) }}>{t.t}</button>
        ))}
      </div>

      <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 text-[11px] text-suave">
        {g.temPre && (
          <span className="flex items-center gap-1.5"><svg width="18" height="6" aria-hidden="true"><path d="M2 3H16" stroke={AZUL} strokeWidth="2.75" strokeDasharray="0.5 5.5" strokeLinecap="round" /></svg>antes da posse</span>
        )}
        {g.temMandato && (
          <span className="flex items-center gap-1.5"><svg width="18" height="6" aria-hidden="true"><path d="M2 3H16" stroke={AZUL} strokeWidth="2.75" strokeLinecap="round" /></svg>no mandato</span>
        )}
        {g.refLegenda && (
          <span className="flex items-center gap-1.5"><svg width="18" height="6" aria-hidden="true"><path d="M1 3H17" stroke={AMARELO} strokeWidth="1.5" strokeDasharray="5 4" /></svg>{g.refLegenda}</span>
        )}
      </div>
      {g.nota && <p className="text-xs leading-4 text-suave">{g.nota}</p>}
    </figure>
  );
}
