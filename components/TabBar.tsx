"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMonitorando } from "@/lib/monitorando";
import { N1, ehN1 } from "@/lib/navegacao";

const ativo = (href: string, caminho: string) => href === "/" ? caminho === "/" : caminho.startsWith(href);

/**
 * Tab bar de vidro do protótipo Liquid Glass: só no celular e só nas telas N1 (o usuário escolheu em
 * 2026-11-20; no computador fica o menu lateral). Flutua acima do rodapé; o espaçador embaixo da página
 * impede que ela cubra o fim do conteúdo. Nas N2 some, e a página mostra o botão de voltar.
 */
export function TabBar() {
  const caminho = usePathname();
  const n = useMonitorando().pessoas.length;
  if (!ehN1(caminho)) return null;
  return (
    <>
      {/* Altura da barra (66) + distância do rodapé da tela (16) + 6 de folga. */}
      <div aria-hidden="true" className="h-[88px] lg:hidden" />
      <nav aria-label="Principal"
        className="vidro-forte fixed inset-x-3 bottom-[max(16px,env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-[480px] gap-0.5 rounded-[32px] p-1 lg:hidden">
        {N1.map((i) => {
          const on = ativo(i.href, caminho);
          return (
            <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined}
              className={`relative flex h-14 min-w-0 flex-1 flex-col items-center justify-center gap-[3px] rounded-[28px] text-[10px] font-semibold tracking-[0.1px] whitespace-nowrap no-underline max-[350px]:text-[9px] max-[350px]:tracking-[-0.2px] ${on ? "bg-white/14 text-link hover:text-link" : "text-[rgba(235,235,245,0.72)] hover:text-texto"}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={i.icone} /></svg>
              {i.rotulo}
              {i.href === "/monitorando" && n > 0 && (
                <span className="absolute top-1.5 left-[calc(50%+6px)] inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destaque px-1 text-[10px] font-semibold text-destaque-texto"
                  aria-label={`${n} ${n === 1 ? "pessoa" : "pessoas"}`}>{n}</span>
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
