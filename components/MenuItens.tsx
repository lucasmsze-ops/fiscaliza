"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useMonitorando } from "@/lib/monitorando";

/** Só páginas que existem: item de página futura seria placeholder (CLAUDE.md, princípio 5). */
const ITENS = [
  { href: "/", rotulo: "Visão geral", icone: "M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" },
  { href: "/congresso", rotulo: "Congresso", icone: "M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6M9 11h.01M15 11h.01" },
  // Neste aparelho (no protótipo, a seção "Conta"; aqui sem Entrar nem conta).
  { href: "/monitorando", rotulo: "Monitorando", icone: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" },
];
/** "Outros" (pedido de 2026-11-13): as demais páginas e o Sobre, num menu que abre. */
const OUTROS = [
  { href: "/votacoes", rotulo: "Votações", icone: "M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" },
  { href: "/comparar", rotulo: "Comparar", icone: "M4 4h6v16H4zM14 4h6v16h-6z" },
  { href: "/como-funciona", rotulo: "Sobre", icone: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-5M12 8h.01" },
];
const ICONE_OUTROS = "M5 12h.01M12 12h.01M19 12h.01";

const ativo = (href: string, caminho: string) => href === "/" ? caminho === "/" : caminho.startsWith(href);
const Icone = ({ d, t = 16, classe }: { d: string; t?: number; classe?: string }) => (
  <svg className={classe} width={t} height={t} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);

export function MenuItens({ abas = false }: {
  /** Celular: abas no topo, em vez da lista do menu lateral. */
  abas?: boolean;
}) {
  const caminho = usePathname();
  const n = useMonitorando().pessoas.length;
  const outrosAtivo = OUTROS.some((o) => ativo(o.href, caminho));
  const [aberto, setAberto] = useState(false);
  useEffect(() => { setAberto(false); }, [caminho]);
  const badge = (href: string) => href === "/monitorando" && n > 0
    ? <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destaque px-1.5 text-[11px] font-bold text-destaque-texto" aria-label={`${n} ${n === 1 ? "pessoa" : "pessoas"}`}>{n}</span>
    : null;

  if (abas) return (
    <div className="-mx-4 border-b border-borda">
      <ul className="flex gap-0.5 overflow-x-auto [scrollbar-width:none] px-4">
        {ITENS.map((i) => {
          const on = ativo(i.href, caminho);
          return (
            <li key={i.href} className="shrink-0">
              <Link href={i.href} aria-current={on ? "page" : undefined}
                className={`inline-flex h-11 items-center gap-2 border-b-2 px-2.5 text-[13px] font-bold whitespace-nowrap no-underline min-[440px]:px-3 ${on ? "border-destaque text-texto" : "border-transparent text-suave"}`}>
                {/* Até 440 px só o texto: as quatro abas cabem num celular de 375 px. */}
                <Icone d={i.icone} t={15} classe="hidden min-[440px]:block" />
                {i.rotulo}{badge(i.href)}
              </Link>
            </li>
          );
        })}
        <li className="shrink-0">
          <button type="button" aria-expanded={aberto} aria-controls="menu-outros" onClick={() => setAberto(!aberto)}
            className={`inline-flex h-11 items-center gap-1.5 border-b-2 px-2.5 text-[13px] font-bold whitespace-nowrap min-[440px]:px-3 ${outrosAtivo ? "border-destaque text-texto" : "border-transparent text-suave"}`}>
            Outros <span aria-hidden="true" className={`text-[10px] transition-transform ${aberto ? "rotate-180" : ""}`}>▼</span>
          </button>
        </li>
      </ul>
      {aberto && (
        <ul id="menu-outros" className="flex flex-wrap gap-2 border-t border-borda bg-card px-4 py-2.5">
          {OUTROS.map((o) => (
            <li key={o.href}>
              <Link href={o.href} aria-current={ativo(o.href, caminho) ? "page" : undefined}
                className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3.5 text-[13px] font-bold no-underline ${ativo(o.href, caminho) ? "border-destaque bg-destaque text-destaque-texto" : "border-borda text-texto"}`}>
                <Icone d={o.icone} t={15} />{o.rotulo}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const item = (i: { href: string; rotulo: string; icone: string }, sub = false) => {
    const on = ativo(i.href, caminho);
    return (
      <li key={i.href}>
        <Link href={i.href} aria-current={on ? "page" : undefined}
          className={`flex items-center gap-3 rounded-card px-3.5 py-2.5 text-[13px] font-bold whitespace-nowrap no-underline ${sub ? "ml-4" : ""} ${on ? "bg-card text-texto shadow-card" : "text-suave hover:bg-card hover:text-texto"}`}>
          <span className={`inline-flex size-[30px] shrink-0 items-center justify-center rounded-xl shadow-card ${on ? "bg-destaque text-destaque-texto" : "bg-card text-link"}`}><Icone d={i.icone} /></span>
          {i.rotulo}{badge(i.href)}
        </Link>
      </li>
    );
  };
  return (
    <ul className="grid gap-1">
      {ITENS.map((i) => item(i))}
      <li>
        <button type="button" aria-expanded={aberto || outrosAtivo} aria-controls="menu-outros-lateral" onClick={() => setAberto(!aberto)}
          className="flex w-full items-center gap-3 rounded-card px-3.5 py-2.5 text-left text-[13px] font-bold whitespace-nowrap text-suave hover:bg-card hover:text-texto">
          <span className="inline-flex size-[30px] shrink-0 items-center justify-center rounded-xl bg-card text-link shadow-card"><Icone d={ICONE_OUTROS} /></span>
          Outros <span aria-hidden="true" className={`ml-auto text-[10px] transition-transform ${aberto || outrosAtivo ? "rotate-180" : ""}`}>▼</span>
        </button>
        {(aberto || outrosAtivo) && <ul id="menu-outros-lateral" className="mt-1 grid gap-1">{OUTROS.map((o) => item(o, true))}</ul>}
      </li>
    </ul>
  );
}
