"use client";

import { APAGADO, ESTADOS_MAPA, MAPA_H, MAPA_W, ROTULO_FORA } from "@/lib/mapa-brasil";

/**
 * Mapa do Brasil por estado (contornos de lib/mapa-brasil.ts). Cada estado é um botão; a cor vem de
 * quem usa o mapa (região, seleção). O nome de cada estado está no `aria-label` e a mesma escolha
 * pode ser feita pela lista de regiões ao lado: o mapa nunca é o único caminho.
 */
export function MapaBrasil({ cores, sel, nomes, onPick }: {
  cores: Record<string, string>;
  sel: string;
  nomes: Record<string, string>;
  onPick: (uf: string) => void;
}) {
  const ufs = Object.keys(ESTADOS_MAPA).sort((a, b) => Number(a === sel) - Number(b === sel)); // selecionado por cima
  return (
    <div className="relative mx-auto w-full max-w-[460px]" style={{ aspectRatio: `${MAPA_W} / ${MAPA_H}` }}>
      <svg viewBox={`0 0 ${MAPA_W} ${MAPA_H}`} className="absolute inset-0 size-full overflow-visible">
        {ufs.map((uf) => {
          const on = sel === uf;
          return (
            <path key={uf} d={ESTADOS_MAPA[uf]!.d} fill={cores[uf]} stroke={on ? "var(--texto)" : "var(--card)"} strokeWidth={on ? 2.5 : 1.5}
              strokeLinejoin="round" opacity={sel && !on ? 0.45 : 1} role="button" tabIndex={0} aria-label={nomes[uf]} aria-pressed={on}
              className="cursor-pointer transition-[filter,opacity] outline-none hover:brightness-110 focus-visible:stroke-[var(--texto)] focus-visible:stroke-[2.5]"
              onClick={() => onPick(uf)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(uf); } }} />
          );
        })}
        {Object.entries(ROTULO_FORA).map(([uf, [x, y]]) => {
          const e = ESTADOS_MAPA[uf]!;
          return <line key={uf} x1={e.x} y1={e.y} x2={x - (x > e.x ? 9 : -9)} y2={y} stroke="var(--borda-forte)" strokeWidth={1} />;
        })}
      </svg>
      {Object.entries(ESTADOS_MAPA).map(([uf, e]) => {
        const fora = ROTULO_FORA[uf];
        const [x, y] = fora ?? [e.x, e.y];
        return (
          <span key={uf} aria-hidden="true"
            className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-[11px] font-bold ${fora || cores[uf] === APAGADO ? "text-texto" : "text-white [text-shadow:0_1px_2px_#000a]"}`}
            style={{ left: `${(x / MAPA_W) * 100}%`, top: `${(y / MAPA_H) * 100}%`, opacity: sel && sel !== uf ? 0.55 : 1 }}>
            {uf}
          </span>
        );
      })}
    </div>
  );
}
