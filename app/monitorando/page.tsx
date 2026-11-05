import type { Metadata } from "next";
import { BarraTopo } from "@/components/BarraTopo";
import { Monitorando } from "@/components/Monitorando";

export const metadata: Metadata = {
  title: "Monitorando · Fiscaliza",
  description: "Quem você monitora neste aparelho e o que apareceu desde a última visita: votos e propostas, com dados oficiais. Sem conta e sem e-mail.",
  robots: { index: false },
};

/** Página estática: a lista vem do navegador (localStorage) e os dados de /dados/acompanhar/[id]. */
export default function PaginaMonitorando() {
  return (
    <>
      <BarraTopo secao="Neste aparelho" pagina="Monitorando" />
      <Monitorando />
    </>
  );
}
