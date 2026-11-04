import type { Metadata } from "next";
import { BarraTopo } from "@/components/BarraTopo";
import { VisaoGeral } from "@/components/VisaoGeral";
import { repo } from "@/lib/repo";
import { montarVisao } from "@/lib/visao";

export const revalidate = 86400;
export const metadata: Metadata = {
  title: "Fiscaliza · quem representa cada estado no Congresso",
  description: "Toque no seu estado ou digite a cidade: senadores e deputados federais em exercício, com o que cada um fez no mandato. Dados oficiais do TSE, da Câmara e do Senado.",
};

export default async function Home() {
  const d = await montarVisao(repo);
  return (
    <>
      <BarraTopo secao="Páginas" pagina="Visão geral" />
      <VisaoGeral d={d} />
    </>
  );
}
