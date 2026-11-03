"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Só páginas que existem: item de página futura seria placeholder (CLAUDE.md, princípio 5). */
const ITENS = [
  { href: "/", rotulo: "Monte sua colinha", icone: "M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" },
  { href: "/como-funciona", rotulo: "Como funciona", icone: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-5M12 8h.01" },
];

/** A colinha (`/c/...`) é parte do caminho de quem monta: marca "Monte sua colinha". */
const ativo = (href: string, caminho: string) => href === "/" ? caminho === "/" || caminho.startsWith("/c/") : caminho.startsWith(href);

export function MenuItens({ fecharGaveta }: {
  /** id do popover da gaveta do celular: fecha ao navegar (a troca de página não recarrega). */
  fecharGaveta?: string;
}) {
  const caminho = usePathname();
  return (
    <ul className="grid gap-1">
      {ITENS.map((i) => {
        const on = ativo(i.href, caminho);
        return (
          <li key={i.href}>
            <Link href={i.href} aria-current={on ? "page" : undefined}
              onClick={() => { if (fecharGaveta) document.getElementById(fecharGaveta)?.hidePopover(); }}
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
