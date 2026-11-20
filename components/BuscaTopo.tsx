"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ItemBusca } from "@/lib/card";
import { CAMPO_BUSCA, FLUTUANTE } from "@/lib/estilo";
import { normalizar } from "@/lib/texto";
import type { ItemExecutivo } from "@/lib/quem-votei";
import type { ItemBuscaVotacao } from "@/lib/votacao";

/**
 * O que cada busca procura (pedido de 2026-11-14): só políticos, ou só projetos e votações. "tudo" (Início,
 * protótipo Liquid Glass de 2026-11-20) junta os dois: primeiro políticos, depois projetos.
 */
export type TipoBusca = "politicos" | "votacoes" | "tudo";

const INDICE = { politicos: "/dados/politicos", votacoes: "/dados/busca-votacoes", executivos: "/dados/executivos" } as const;
const CONFIG = {
  politicos: { rotulo: "Buscar político", vazio: "Nenhum político com esse nome." },
  votacoes: { rotulo: "Buscar projeto ou votação", vazio: "Nada encontrado. Tente o número (PL 1234) ou uma palavra da ementa." },
  tudo: { rotulo: "Buscar político ou projeto", vazio: "Nada encontrado. Tente o nome de urna ou o número do projeto (PL 1234)." },
} as const;

type Resultado = { href: string; externo: boolean; t: string; d: string; foto: string | null; pessoa: boolean };
const externo = { target: "_blank", rel: "noreferrer noopener" } as const;

/**
 * Busca do topo. Políticos: nome de urna, nome civil ou número de urna (índice /dados/politicos,
 * ~190 KB comprimido). Votações: número da matéria, tipo, palavras da ementa ou tema, nas votações do
 * Plenário e na pauta (/dados/busca-votacoes). Os índices só são baixados quando a pessoa toca no campo.
 * Campo em cápsula de vidro do protótipo Liquid Glass.
 */
export function BuscaTopo({ tipo, grande = false }: { tipo: TipoBusca; grande?: boolean }) {
  const cfg = CONFIG[tipo];
  const quer = (k: keyof typeof INDICE) => tipo === k || tipo === "tudo";
  const [q, setQ] = useState("");
  // A lista fecha ao tocar fora ou com Esc, sem apagar o que foi digitado; volta ao tocar no campo.
  const [aberta, setAberta] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aberta) return;
    const fora = (e: PointerEvent) => { if (!caixa.current?.contains(e.target as Node)) setAberta(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setAberta(false); };
    document.addEventListener("pointerdown", fora); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", fora); document.removeEventListener("keydown", esc); };
  }, [aberta]);
  const [pessoas, setPessoas] = useState<ItemBusca[] | null>(null);
  const [votacoes, setVotacoes] = useState<ItemBuscaVotacao[] | null>(null);
  // Presidente e governadores eleitos (E23t): quem procura "Lula" acha o crachá do executivo.
  const [executivos, setExecutivos] = useState<ItemExecutivo[] | null>(null);
  const pedido = useRef<Promise<unknown> | null>(null);
  function carregar() {
    const baixar = <T,>(url: string, pronto: (x: T) => void) => fetch(url).then(async (r) => { if (r.ok) pronto(await r.json() as T); });
    pedido.current ??= Promise.all([
      quer("politicos") ? baixar<ItemBusca[]>(INDICE.politicos, setPessoas) : null,
      quer("politicos") ? baixar<ItemExecutivo[]>(INDICE.executivos, (xs) => setExecutivos(xs.filter((x) => x.href))) : null,
      quer("votacoes") ? baixar<ItemBuscaVotacao[]>(INDICE.votacoes, setVotacoes) : null,
    ]).catch(() => { pedido.current = null; });
  }

  const t = normalizar(q);
  const resultados = useMemo((): Resultado[] => {
    if (t.length < 2) return [];
    const termos = t.split(" ");
    // Cada palavra digitada começa alguma palavra do texto, em qualquer ordem; o índice já vem na ordem
    // em que os resultados aparecem (políticos: mais votados; votações: pauta e depois as mais recentes).
    const casa = (texto: string) => { const ps = texto.split(" "); return termos.every((x) => ps.some((w) => w.startsWith(x))); };
    const ex: Resultado[] = t.length >= 3 && executivos ? executivos.filter((x) => casa(x.busca)).slice(0, 3)
      .map((x) => ({ href: x.href!, externo: false, t: x.nomeUrna, d: `${x.cargo === "presidente" ? "Presidência" : `Governo ${x.uf}`} · ${x.partido} · ${x.situacao}`, foto: x.fotoUrl, pessoa: true })) : [];
    const ps: Resultado[] = t.length >= 3 && pessoas ? pessoas.filter((p) => casa(p.busca)).slice(0, tipo === "tudo" ? 4 : 7)
      .map((p) => ({ href: `/p/${p.id}`, externo: false, t: p.nomeUrna, d: `${p.cargo} · ${p.partidoUf} · ${p.status}`, foto: p.fotoUrl, pessoa: true })) : [];
    const vs: Resultado[] = votacoes ? votacoes.filter((v) => casa(v.busca)).slice(0, tipo === "tudo" ? 4 : 8).map((v) => ({ ...v, foto: null, pessoa: false })) : [];
    // Nome de urna igual ao digitado primeiro ("lula" → LULA antes de CADU DE LULA); a ordem dos índices desempata.
    const exato = (r: Resultado) => (r.pessoa && normalizar(r.t) === t ? 0 : r.pessoa && normalizar(r.t).startsWith(t) ? 1 : 2);
    const gente = [...ex, ...ps].map((r, i) => ({ r, i })).sort((a, b) => exato(a.r) - exato(b.r) || a.i - b.i).map((x) => x.r);
    return [...gente.slice(0, tipo === "tudo" ? 5 : 8), ...vs];
  }, [t, pessoas, votacoes, executivos, tipo]);

  const carregando = t.length >= 2 && ((quer("politicos") && (!pessoas || !executivos)) || (quer("votacoes") && !votacoes));
  const id = `busca-${tipo}`;
  return (
    <div ref={caixa} className="relative w-full">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className={`absolute left-[18px] text-suave ${grande ? "top-[17px]" : "top-[15px]"}`}>
        <circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" />
      </svg>
      <label htmlFor={id} className="sr-only">{cfg.rotulo}</label>
      <input id={id} type="search" autoComplete="off" value={q} placeholder={cfg.rotulo}
        onFocus={() => { carregar(); setAberta(true); }} onChange={(e) => { setQ(e.target.value); setAberta(true); carregar(); }} className={`${CAMPO_BUSCA} ${grande ? "h-[52px]" : ""}`} />
      {aberta && t.length >= 2 && (
        <div className={`${FLUTUANTE} absolute top-[calc(100%+8px)] right-0 z-40 w-full overflow-hidden`}>
          {resultados.map((r, i) => {
            const conteudo = <>
              {r.pessoa && (r.foto
                ? <img src={r.foto} alt="" width={36} height={36} loading="lazy" className="size-9 shrink-0 rounded-full bg-preench object-cover object-top" />
                : <span aria-hidden="true" className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-preench-forte text-xs font-semibold">{r.t.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>)}
              <span className="grid min-w-0 gap-0.5">
                <strong className={`text-[13px] font-semibold ${r.pessoa ? "truncate" : "line-clamp-2 leading-snug"}`}>{r.t}{r.externo && <span className="text-suave"> ↗</span>}</strong>
                <span className="truncate text-xs text-suave">{r.d}</span>
              </span>
            </>;
            const classe = "flex items-center gap-3 border-b border-borda px-4 py-2.5 text-texto no-underline last:border-b-0 hover:bg-preench hover:text-texto";
            return r.externo
              ? <a key={`${r.href}-${i}`} href={r.href} {...externo} onClick={() => setQ("")} className={classe}>{conteudo}</a>
              : <Link key={`${r.href}-${i}`} href={r.href} onClick={() => setQ("")} className={classe}>{conteudo}</Link>;
          })}
          {resultados.length === 0 && (
            <p className="p-4 text-[13px] text-suave">
              {carregando ? "Carregando…" : tipo === "politicos" && t.length < 3 ? "Digite pelo menos 3 letras." : cfg.vazio}
            </p>
          )}
          <button type="button" onClick={() => setAberta(false)} className="min-h-11 w-full border-t border-borda p-2.5 text-[15px] font-semibold text-link">Fechar</button>
        </div>
      )}
    </div>
  );
}
