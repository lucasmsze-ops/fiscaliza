"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMonitorando } from "@/lib/monitorando";
import { N1 } from "@/lib/navegacao";

/** Só páginas que existem: item de página futura seria placeholder (CLAUDE.md, princípio 5). Ordem pedida em 2026-11-14. */
const ITENS = N1;

const ativo = (href: string, caminho: string) => href === "/" ? caminho === "/" : caminho.startsWith(href);
const Icone = ({ d, t = 16, classe }: { d: string; t?: number; classe?: string }) => (
  <svg className={classe} width={t} height={t} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);

/** Menu lateral do computador; no celular, a mesma lista vira a TabBar. */
export function MenuItens() {
  const caminho = usePathname();
  const n = useMonitorando().pessoas.length;
  const badge = (href: string) => href === "/monitorando" && n > 0
    ? <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destaque px-1.5 text-[11px] font-semibold text-destaque-texto" aria-label={`${n} ${n === 1 ? "pessoa" : "pessoas"}`}>{n}</span>
    : null;

  return (
    <ul className="grid gap-0.5">
      {ITENS.map((i) => {
        const on = ativo(i.href, caminho);
        return (
          <li key={i.href}>
            <Link href={i.href} aria-current={on ? "page" : undefined}
              className={`flex items-center gap-3 min-h-11 rounded-full px-3 py-2 text-[15px] whitespace-nowrap text-texto no-underline hover:text-texto ${on ? "vidro font-semibold" : "hover:bg-preench"}`}>
              <span className="inline-flex size-6 shrink-0 items-center justify-center text-link"><Icone d={i.icone} t={20} /></span>
              {i.rotulo}{badge(i.href)}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
