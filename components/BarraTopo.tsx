/**
 * Barra do topo de cada página: onde a pessoa está e, fora da página inicial, a busca. A busca leva
 * para a entrada (`/?q=`), que já tem a busca de cidade e nome (components/MontarColinha.tsx).
 */
export function BarraTopo({ secao, pagina, busca = true }: { secao: string; pagina: string; busca?: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3.5 pt-2 pb-4 lg:pt-6">
      <p className="text-xs text-suave">{secao} <span className="text-texto">/ {pagina}</span></p>
      {busca && (
        <form action="/" role="search" className="relative w-60 max-w-full">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="absolute top-[13px] left-[13px]">
            <circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" />
          </svg>
          <label htmlFor="busca-topo" className="sr-only">Buscar cidade ou político</label>
          <input id="busca-topo" name="q" type="search" autoComplete="off" placeholder="Cidade ou nome…"
            className="h-[42px] w-full rounded-card border border-borda bg-card pr-3.5 pl-[38px] text-[13px] outline-none focus:border-destaque" />
        </form>
      )}
    </div>
  );
}
