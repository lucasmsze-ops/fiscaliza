import type { Metadata } from "next";
import { BarraTopo } from "@/components/BarraTopo";
import { PoliticoCard } from "@/components/PoliticoCard";
import { AMOSTRA } from "@/lib/amostra";
import { repo } from "@/lib/repo";

// Vitrine do protótipo (E10): o card com os 20 políticos da sonda. Não é página do produto.
export const metadata: Metadata = { title: "Amostra · Fiscaliza", robots: { index: false } };
export const revalidate = 86400;

export default async function Amostra() {
  const cards = (await Promise.all(AMOSTRA.map((id) => repo.getCard(id)))).filter((c) => c !== null);
  return (
    <>
    <BarraTopo secao="Fiscaliza" pagina="Amostra" />
    <main className="mx-auto max-w-5xl pb-8">
      <h1 className="text-2xl font-bold">Amostra da sonda</h1>
      <p className="mt-1 text-sm text-suave">{cards.length} políticos de SP, dados oficiais (TSE, Câmara, Senado).</p>
      <div className="mt-6 grid justify-items-center gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((d) => <PoliticoCard key={d.id} d={d} linkPagina />)}
      </div>
    </main>
    </>
  );
}
