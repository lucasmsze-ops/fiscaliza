import type { ReactNode } from "react";
import { GLOSSARIO, hrefSecao, type TermoGlossario } from "@/lib/glossario";

/**
 * Termo com explicação. Usa o popover nativo do HTML (sem JavaScript nem dependência): abre com
 * toque, clique ou teclado e fecha ao tocar fora ou no botão "Fechar". `id` precisa ser único na página.
 * O "?" acompanha o tamanho do texto (em) e fica centrado na altura das letras (2026-11-14).
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
        className="relative -top-[0.22em] ml-1.5 inline-flex size-[1.8em] items-center justify-center rounded-full border border-current/30 align-middle text-[0.75em] leading-none text-suave hover:border-current"
      >
        ?
      </button>
      <span
        id={alvo}
        popover="auto"
        className="m-auto max-w-[min(22rem,calc(100vw-2rem))] rounded-card bg-card p-4 text-left text-sm leading-relaxed text-texto shadow-xl backdrop:bg-black/40"
      >
        <span className="block font-semibold">{g.titulo}</span>
        {explicacao && <span className="mt-1 block">{explicacao}</span>}
        <span className="mt-1 block text-suave">{g.texto}</span>
        <span className="mt-3 flex items-center justify-between gap-3 text-xs">
          <a href={hrefSecao(g.secao)} className="font-semibold no-underline">{g.secao === "glossario" ? "Outros termos" : "Como calculamos"}</a>
          <button type="button" popoverTarget={alvo} popoverTargetAction="hide" className="font-semibold text-link">
            Fechar
          </button>
        </span>
      </span>
    </span>
  );
}
