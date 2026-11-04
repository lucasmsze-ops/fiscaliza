import { BuscaTopo } from "./BuscaTopo";

/** Barra do topo de cada página (protótipo): onde a pessoa está, o título e a busca de político ou página. */
export function BarraTopo({ secao, pagina }: { secao: string; pagina: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 pb-3 sm:gap-3.5 sm:pt-2 sm:pb-4 lg:pt-6">
      <div>
        <p className="text-xs text-suave">{secao} <span className="text-texto">/ {pagina}</span></p>
        <p className="mt-1 hidden text-sm font-bold sm:block">{pagina}</p>
      </div>
      <BuscaTopo />
    </div>
  );
}
