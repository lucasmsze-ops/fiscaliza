"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import type { ItemBusca } from "@/lib/card";
import { normalizar } from "@/lib/texto";

/** Páginas que a busca acha pelo nome (só as que existem). */
const PAGINAS = [
  { href: "/", t: "Visão geral", d: "Página · mapa e quem está no cargo" },
  { href: "/congresso", t: "Congresso", d: "Página · quem ocupa cada cadeira hoje" },
  { href: "/me-representa", t: "Me representa", d: "Página · senadores e deputados da sua cidade ou estado" },
  { href: "/votacoes", t: "Votações", d: "Página · agenda do Plenário e última sessão" },
  { href: "/monitorando", t: "Monitorando", d: "Página · quem você monitora neste aparelho" },
  { href: "/como-funciona", t: "Sobre e metodologia", d: "Página · como cada número é calculado" },
];

/**
 * Busca da barra do topo: político (nome de urna, nome civil ou número de urna) ou página. O índice
 * (/dados/politicos, ~190 KB comprimido, servido pela CDN) só é baixado quando a pessoa toca no campo.
 */
export function BuscaTopo() {
  const [q, setQ] = useState("");
  const [indice, setIndice] = useState<ItemBusca[] | null>(null);
  const pedido = useRef<Promise<void> | null>(null);
  function carregar() {
    pedido.current ??= fetch("/dados/politicos").then(async (r) => { if (r.ok) setIndice(await r.json() as ItemBusca[]); }).catch(() => { pedido.current = null; });
  }

  const t = normalizar(q);
  const resultados = useMemo(() => {
    if (t.length < 2) return [];
    const termos = t.split(" ");
    // Cada palavra digitada começa alguma palavra do nome, em qualquer ordem; o índice vem dos mais votados.
    const casa = (texto: string) => { const ps = texto.split(" "); return termos.every((x) => ps.some((w) => w.startsWith(x))); };
    const paginas = PAGINAS.filter((p) => casa(normalizar(`${p.t} ${p.d}`))).map((p) => ({ ...p, foto: null as string | null }));
    const pessoas = t.length < 3 || !indice ? [] : indice.filter((p) => casa(p.busca)).slice(0, 6)
      .map((p) => ({ href: `/p/${p.id}`, t: p.nomeUrna, d: `${p.cargo} · ${p.partidoUf} · ${p.status}`, foto: p.fotoUrl }));
    return [...pessoas, ...paginas].slice(0, 7);
  }, [t, indice]);

  return (
    <div className="relative w-full sm:w-60">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="absolute top-[13px] left-[13px]">
        <circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" />
      </svg>
      <label htmlFor="busca-topo" className="sr-only">Buscar político ou página</label>
      <input id="busca-topo" type="search" autoComplete="off" value={q} placeholder="Buscar político ou página…"
        onFocus={carregar} onChange={(e) => { setQ(e.target.value); carregar(); }}
        className="h-[42px] w-full rounded-card border border-borda bg-card pr-3.5 pl-[38px] text-base outline-none sm:text-[13px] focus:border-destaque" />
      {t.length >= 2 && (
        <div className="absolute top-12 right-0 z-40 w-80 max-w-[90vw] overflow-hidden rounded-card border border-borda bg-card shadow-xl">
          {resultados.map((r) => (
            <Link key={r.href} href={r.href} onClick={() => setQ("")} className="flex items-center gap-3 px-3.5 py-2.5 text-texto no-underline hover:bg-fundo">
              {r.foto
                ? <img src={r.foto} alt="" width={36} height={36} loading="lazy" className="size-9 shrink-0 rounded-full bg-fundo object-cover object-top" />
                : <span aria-hidden="true" className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-destaque/30 text-xs font-bold">{r.t.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>}
              <span className="grid min-w-0"><strong className="truncate text-[13px]">{r.t}</strong><span className="truncate text-xs text-suave">{r.d}</span></span>
            </Link>
          ))}
          {resultados.length === 0 && <p className="p-3.5 text-[13px] text-suave">{t.length >= 3 && !indice ? "Carregando…" : "Nada encontrado. Tente outro nome."}</p>}
          <button type="button" onClick={() => setQ("")} className="w-full border-t border-borda bg-fundo p-2.5 text-xs font-bold text-suave">Fechar</button>
        </div>
      )}
    </div>
  );
}
