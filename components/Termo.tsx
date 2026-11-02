import type { ReactNode } from "react";
import { GLOSSARIO, hrefSecao, type TermoGlossario } from "@/lib/glossario";

/**
 * Termo com explicação. Usa o popover nativo do HTML (sem JavaScript nem dependência): abre com
 * toque, clique ou teclado e fecha ao tocar fora ou no botão "Fechar". `id` precisa ser único na página.
 * Toda métrica linka daqui para a seção correspondente de /como-funciona (CLAUDE.md, princípio 4).
 */
export function Termo({ id, termo, explicacao, children }: {
  id: string;
  termo: TermoGlossario;
  /** Texto específico do caso, mostrado antes da definição geral do termo. */
  explicacao?: string;
  children?: ReactNode;
}) {
  const g = GLOSSARIO[termo];
  const alvo = `termo-${id}`;
  return (
    <span>
      {children ?? g.titulo}
      <button
        type="button"
        popoverTarget={alvo}
        aria-label={`O que é ${g.titulo}?`}
        className="ml-1 inline-flex size-5 items-center justify-center rounded-full border border-current/30 align-[-0.2em] text-[11px] leading-none text-[var(--suave)] hover:border-current"
      >
        ?
      </button>
      <span
        id={alvo}
        popover="auto"
        className="m-auto max-w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-black/10 bg-[var(--fundo)] p-4 text-left text-sm leading-relaxed text-[var(--texto)] shadow-xl backdrop:bg-black/40 dark:border-white/15"
      >
        <span className="block font-semibold">{g.titulo}</span>
        {explicacao && <span className="mt-1 block">{explicacao}</span>}
        <span className="mt-1 block text-[var(--suave)]">{g.texto}</span>
        <span className="mt-3 flex items-center justify-between gap-3 text-xs">
          <a href={hrefSecao(g.secao)} className="underline underline-offset-2">{g.secao === "glossario" ? "Outros termos" : "Como calculamos"}</a>
          <button type="button" popoverTarget={alvo} popoverTargetAction="hide" className="underline underline-offset-2">
            Fechar
          </button>
        </span>
      </span>
    </span>
  );
}
