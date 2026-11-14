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

export function MenuItens({ abas = false }: {
  /** Celular: abas no topo, em vez da lista do menu lateral. */
  abas?: boolean;
}) {
  const caminho = usePathname();
  const n = useMonitorando().pessoas.length;
  const badge = (href: string) => href === "/monitorando" && n > 0
    ? <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destaque px-1.5 text-[11px] font-semibold text-destaque-texto" aria-label={`${n} ${n === 1 ? "pessoa" : "pessoas"}`}>{n}</span>
    : null;

  if (abas) return (
    // Quatro abas espalhadas na largura, alinhadas às margens da página, com o mesmo espaço entre elas
    // (com o Sobre fora do menu sobra espaço, 2026-11-14). Abaixo de 360 px, com o contador de Monitorando,
    // a faixa pode rolar por dentro em vez de alargar a página.
    <ul className="-mx-4 flex justify-between gap-3 overflow-x-auto [scrollbar-width:none] border-b border-borda px-4 sm:justify-start sm:gap-8">
      {ITENS.map((i) => {
        const on = ativo(i.href, caminho);
        return (
          <li key={i.href} className="shrink-0">
            <Link href={i.href} aria-current={on ? "page" : undefined}
              className={`flex h-12 items-stretch text-[13px] whitespace-nowrap no-underline min-[360px]:text-[14px] min-[430px]:text-[15px] ${on ? "font-semibold text-link" : "text-suave hover:text-texto"}`}>
              <span className={`inline-flex items-center gap-1.5 border-b-2 pt-0.5 ${on ? "border-link" : "border-transparent"}`}>
                {/* Ícone só onde sobra largura (tablet); no celular, o texto. */}
                <Icone d={i.icone} t={16} classe="hidden min-[560px]:block" />
                {i.rotulo}{badge(i.href)}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <ul className="grid gap-0.5">
      {ITENS.map((i) => {
        const on = ativo(i.href, caminho);
        return (
          <li key={i.href}>
            <Link href={i.href} aria-current={on ? "page" : undefined}
              className={`flex items-center gap-3 rounded-[10px] px-3 py-2 text-[15px] whitespace-nowrap text-texto no-underline ${on ? "bg-preench-forte font-semibold" : "hover:bg-preench"}`}>
              <span className="inline-flex size-6 shrink-0 items-center justify-center text-link"><Icone d={i.icone} t={20} /></span>
              {i.rotulo}{badge(i.href)}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
