import type { ReactNode } from "react";
import { GLOSSARIO, hrefTermo, type TermoGlossario } from "@/lib/glossario";

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
        className="m-auto max-w-[min(22rem,calc(100vw-2rem))] rounded-[22px] vidro-forte bg-[rgba(44,45,52,0.94)] p-4 text-left text-sm leading-relaxed text-texto backdrop:bg-black/40"
      >
        <span className="block font-semibold">{g.titulo}</span>
        {explicacao && <span className="mt-1 block">{explicacao}</span>}
        <span className="mt-1 block text-suave">{g.texto}</span>
        <span className="mt-3 flex items-center justify-between gap-3 text-xs">
          <a href={hrefTermo(termo)} className="font-semibold no-underline">{g.secao ? "Como calculamos" : "No Dicionário"}</a>
          <button type="button" popoverTarget={alvo} popoverTargetAction="hide" className="font-semibold text-link">
            Fechar
          </button>
        </span>
      </span>
    </span>
  );
}

/**
 * Botão "i" de vidro do protótipo Liquid Glass (30 px, no canto do cartão), com a mesma explicação do Termo.
 * Popover nativo: abre com toque ou teclado e fecha ao tocar fora.
 */
export function Info({ id, termo, explicacao, rotulo }: { id: string; termo: TermoGlossario; explicacao?: string; rotulo: string }) {
  const g = GLOSSARIO[termo];
  const alvo = `info-${id}`;
  return (
    <>
      <button type="button" popoverTarget={alvo} aria-label={rotulo}
        className="inline-flex size-[30px] shrink-0 items-center justify-center rounded-full border border-white/18 bg-white/8 text-link shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] hover:bg-white/16">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5" /><path d="M12 11v6M12 7.4h.01" /></svg>
      </button>
      <span id={alvo} popover="auto"
        className="m-auto max-w-[min(22rem,calc(100vw-2rem))] rounded-[22px] vidro-forte bg-[rgba(44,45,52,0.94)] p-4 text-left text-[13px] leading-[18px] text-texto/90 backdrop:bg-black/40">
        <span className="block font-semibold text-texto">{g.titulo}</span>
        {explicacao && <span className="mt-1 block">{explicacao}</span>}
        <span className="mt-1 block text-suave">{g.texto}</span>
        <span className="mt-3 flex items-center justify-between gap-3 text-xs">
          <a href={hrefTermo(termo)} className="font-semibold no-underline">{g.secao ? "Como calculamos" : "No Dicionário"}</a>
          <button type="button" popoverTarget={alvo} popoverTargetAction="hide" className="font-semibold text-link">Fechar</button>
        </span>
      </span>
    </>
  );
}
