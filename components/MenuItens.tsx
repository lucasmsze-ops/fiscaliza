"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Só páginas que existem: item de página futura seria placeholder (CLAUDE.md, princípio 5). */
const ITENS = [
  { href: "/", rotulo: "Visão geral", icone: "M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" },
  { href: "/congresso", rotulo: "Congresso", icone: "M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6M9 11h.01M15 11h.01" },
  { href: "/como-funciona", rotulo: "Sobre", icone: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-5M12 8h.01" },
];

const ativo = (href: string, caminho: string) => href === "/" ? caminho === "/" : caminho.startsWith(href);

export function MenuItens({ abas = false }: {
  /** Celular: abas numa faixa rolável, em vez da lista do menu lateral. */
  abas?: boolean;
}) {
  const caminho = usePathname();
  if (abas) return (
    <ul className="-mx-4 flex gap-1 overflow-x-auto border-b border-borda px-4">
      {ITENS.map((i) => {
        const on = ativo(i.href, caminho);
        return (
          <li key={i.href} className="shrink-0">
            <Link href={i.href} aria-current={on ? "page" : undefined}
              className={`inline-flex h-11 items-center gap-2 border-b-2 px-3 text-[13px] font-bold whitespace-nowrap no-underline ${on ? "border-destaque text-texto" : "border-transparent text-suave"}`}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={i.icone} /></svg>
              {i.rotulo}
            </Link>
          </li>
        );
      })}
    </ul>
  );
  return (
    <ul className="grid gap-1">
      {ITENS.map((i) => {
        const on = ativo(i.href, caminho);
        return (
          <li key={i.href}>
            <Link href={i.href} aria-current={on ? "page" : undefined}
              className={`flex items-center gap-3 rounded-card px-3.5 py-2.5 text-[13px] font-bold whitespace-nowrap no-underline ${on ? "bg-card text-texto shadow-card" : "text-suave hover:bg-card hover:text-texto"}`}>
              <span className={`inline-flex size-[30px] shrink-0 items-center justify-center rounded-xl shadow-card ${on ? "bg-destaque text-destaque-texto" : "bg-card text-link"}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={i.icone} /></svg>
              </span>
              {i.rotulo}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
