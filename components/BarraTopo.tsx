import { BuscaTopo, type TipoBusca } from "./BuscaTopo";

/**
 * Topo das telas N1 (as do menu; lib/navegacao.ts): a busca em cápsula de vidro, onde faz sentido (
 * Congresso buscam políticos; Votações, projetos e votações; Início, os dois). Sem busca, fica só o respiro
 * até o primeiro cartão. As telas N2 usam a BarraVoltar.
 */
export function BarraTopo({ busca }: { busca?: TipoBusca }) {
  if (!busca) return <div aria-hidden="true" className="h-3 lg:h-6" />;
  return (
    <div className="pt-3 pb-4 lg:pt-6">
      <BuscaTopo tipo={busca} />
    </div>
  );
}
