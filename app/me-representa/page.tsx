import type { Metadata } from "next";
import { BarraTopo } from "@/components/BarraTopo";
import { MeRepresenta } from "@/components/MeRepresenta";
import { repo } from "@/lib/repo";
import { montarVisao } from "@/lib/visao";

export const revalidate = 86400;
export const metadata: Metadata = {
  title: "Me representa · Fiscaliza",
  description: "Digite a sua cidade ou o seu estado e veja quem te representa em Brasília: os senadores e os deputados federais em exercício. Dados oficiais.",
};

/** Me representa (E23d): só o Congresso até o Passo 5. Usa a mesma lista de quem está no cargo da Visão geral. */
export default async function PaginaMeRepresenta() {
  const { pessoas } = await montarVisao(repo);
  return (
    <>
      <BarraTopo secao="Páginas" pagina="Me representa" />
      <MeRepresenta pessoas={pessoas} />
    </>
  );
}
