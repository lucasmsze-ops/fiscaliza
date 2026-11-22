import type { ReactNode } from "react";

/**
 * Um assunto como linha que abre, dentro de uma lista de vidro (pedido de 2026-11-20: o índice levava a cartões mais
 * abaixo, o que não fazia sentido numa lista). `<details>` nativo, sem JavaScript; `AbrirPelaAncora` abre o que vier no
 * endereço (/como-funciona#participacao, /cargos#senador). Usado em /como-funciona e /cargos.
 */
export function Assunto({ id, titulo, subtitulo, children }: { id: string; titulo: string; subtitulo?: string; children: ReactNode }) {
  return (
    <details id={id} className="group scroll-mt-16 border-t border-borda first:border-t-0">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 py-2.5 text-base text-texto hover:bg-white/5 [&::-webkit-details-marker]:hidden">
        <span className="grid flex-1 gap-0.5">
          <h2 id={`h-${id}`} className="text-base font-normal group-open:font-semibold">{titulo}</h2>
          {subtitulo && <span className="text-[13px] leading-[18px] text-suave">{subtitulo}</span>}
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(235,235,245,0.55)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 transition-transform group-open:rotate-90"><path d="m9 5 7 7-7 7" /></svg>
      </summary>
      <div className="grid gap-3 px-4 pb-4 text-[15px] leading-relaxed text-texto/85">{children}</div>
    </details>
  );
}
