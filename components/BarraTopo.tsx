import { BuscaTopo, type TipoBusca } from "./BuscaTopo";

/**
 * Topo das telas N1 (as do menu; lib/navegacao.ts): só a busca, onde faz sentido (Visão geral e Congresso
 * buscam políticos; Votações, projetos e votações). O caminho "Páginas / ..." saiu em 2026-11-14; sem busca,
 * fica só o respiro até o primeiro cartão. As telas N2 usam a BarraVoltar.
 */
export function BarraTopo({ busca }: { busca?: TipoBusca }) {
  if (!busca) return <div aria-hidden="true" className="h-3 lg:h-6" />;
  return (
    <div className="flex justify-end pt-3 pb-3 sm:pb-4 lg:pt-6">
      <div className="w-full sm:w-auto"><BuscaTopo tipo={busca} /></div>
    </div>
  );
}
