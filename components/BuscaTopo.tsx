"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import type { ItemBusca } from "@/lib/card";
import { normalizar } from "@/lib/texto";
import type { ItemBuscaVotacao } from "@/lib/votacao";

/** O que cada busca procura (pedido de 2026-11-14): só políticos, ou só projetos e votações. */
export type TipoBusca = "politicos" | "votacoes";

const CONFIG = {
  politicos: { indice: "/dados/politicos", rotulo: "Buscar político", dica: "Buscar político", vazio: "Nenhum político com esse nome." },
  votacoes: { indice: "/dados/busca-votacoes", rotulo: "Buscar projeto ou votação", dica: "Buscar projeto ou votação", vazio: "Nada encontrado. Tente o número (PL 1234) ou uma palavra da ementa." },
} as const;

type Resultado = { href: string; externo: boolean; t: string; d: string; foto: string | null };
const externo = { target: "_blank", rel: "noreferrer noopener" } as const;

/**
 * Busca da barra do topo. Políticos: nome de urna, nome civil ou número de urna (índice /dados/politicos,
 * ~190 KB comprimido). Votações: número da matéria, tipo, palavras da ementa ou tema, nas votações do
 * Plenário e na pauta (/dados/busca-votacoes). O índice só é baixado quando a pessoa toca no campo.
 */
export function BuscaTopo({ tipo }: { tipo: TipoBusca }) {
  const cfg = CONFIG[tipo];
  const [q, setQ] = useState("");
  const [indice, setIndice] = useState<(ItemBusca | ItemBuscaVotacao)[] | null>(null);
  const pedido = useRef<Promise<void> | null>(null);
  function carregar() {
    pedido.current ??= fetch(cfg.indice).then(async (r) => { if (r.ok) setIndice(await r.json() as (ItemBusca | ItemBuscaVotacao)[]); }).catch(() => { pedido.current = null; });
  }

  const t = normalizar(q);
  const resultados = useMemo((): Resultado[] => {
    if (t.length < 2 || !indice) return [];
    const termos = t.split(" ");
    // Cada palavra digitada começa alguma palavra do texto, em qualquer ordem; o índice já vem na ordem
    // em que os resultados aparecem (políticos: mais votados; votações: pauta e depois as mais recentes).
    const casa = (texto: string) => { const ps = texto.split(" "); return termos.every((x) => ps.some((w) => w.startsWith(x))); };
    if (tipo === "politicos") {
      if (t.length < 3) return [];
      return (indice as ItemBusca[]).filter((p) => casa(p.busca)).slice(0, 7)
        .map((p) => ({ href: `/p/${p.id}`, externo: false, t: p.nomeUrna, d: `${p.cargo} · ${p.partidoUf} · ${p.status}`, foto: p.fotoUrl }));
    }
    return (indice as ItemBuscaVotacao[]).filter((v) => casa(v.busca)).slice(0, 8).map((v) => ({ ...v, foto: null }));
  }, [t, indice, tipo]);

  const carregando = !indice && t.length >= 2;
  return (
    <div className="relative w-full sm:w-72">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="absolute top-[11px] left-[11px] text-suave">
        <circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" />
      </svg>
      <label htmlFor="busca-topo" className="sr-only">{cfg.rotulo}</label>
      <input id="busca-topo" type="search" autoComplete="off" value={q} placeholder={cfg.dica}
        onFocus={carregar} onChange={(e) => { setQ(e.target.value); carregar(); }}
        className="h-9 w-full rounded-[10px] bg-preench pr-3.5 pl-[34px] text-base text-texto outline-none placeholder:text-suave sm:text-[15px] focus:ring-2 focus:ring-destaque/40" />
      {t.length >= 2 && (
        <div className="absolute top-11 right-0 z-40 w-full overflow-hidden rounded-card bg-card shadow-xl sm:w-96">
          {resultados.map((r, i) => {
            const conteudo = <>
              {tipo === "politicos" && (r.foto
                ? <img src={r.foto} alt="" width={36} height={36} loading="lazy" className="size-9 shrink-0 rounded-full bg-preench object-cover object-top" />
                : <span aria-hidden="true" className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-preench-forte text-xs font-semibold">{r.t.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>)}
              <span className="grid min-w-0 gap-0.5">
                <strong className={`text-[13px] font-semibold ${tipo === "politicos" ? "truncate" : "line-clamp-2 leading-snug"}`}>{r.t}{r.externo && <span className="text-suave"> ↗</span>}</strong>
                <span className="truncate text-xs text-suave">{r.d}</span>
              </span>
            </>;
            const classe = "flex items-center gap-3 border-b border-borda/60 px-3.5 py-2.5 text-texto no-underline last:border-b-0 hover:bg-preench";
            return r.externo
              ? <a key={`${r.href}-${i}`} href={r.href} {...externo} onClick={() => setQ("")} className={classe}>{conteudo}</a>
              : <Link key={`${r.href}-${i}`} href={r.href} onClick={() => setQ("")} className={classe}>{conteudo}</Link>;
          })}
          {resultados.length === 0 && (
            <p className="p-3.5 text-[13px] text-suave">
              {carregando ? "Carregando…" : tipo === "politicos" && t.length < 3 ? "Digite pelo menos 3 letras." : cfg.vazio}
            </p>
          )}
          <button type="button" onClick={() => setQ("")} className="w-full border-t border-borda bg-preench p-2.5 text-[13px] font-semibold text-link">Fechar</button>
        </div>
      )}
    </div>
  );
}
