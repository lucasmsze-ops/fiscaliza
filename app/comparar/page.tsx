import type { Metadata } from "next";
import { BarraTopo } from "@/components/BarraTopo";
import { Comparar, type Atalho } from "@/components/Comparar";
import { NOME_UF } from "@/lib/regioes";
import { repo } from "@/lib/repo";
import { montarVisao } from "@/lib/visao";

export const revalidate = 86400;
export const metadata: Metadata = {
  title: "Comparar · Fiscaliza",
  description: "Compare de 2 a 5 senadores e deputados federais lado a lado, com dados oficiais: participação em votações, votos em 2026, propostas e mais. Sem nota nem ranking.",
};

/** Atalhos do protótipo com gente real: os 3 senadores em exercício de alguns estados. */
const UFS_ATALHO = ["SP", "RJ", "MG", "BA"];

export default async function PaginaComparar() {
  const { pessoas } = await montarVisao(repo);
  const atalhos: Atalho[] = UFS_ATALHO.map((uf) => ({
    titulo: `Senadores de ${NOME_UF[uf]}`,
    pessoas: pessoas.filter((p) => p.casa === "senado" && p.uf === uf).map((p) => ({ id: p.id, nomeUrna: p.nomeUrna, fotoUrl: p.fotoUrl })),
  })).filter((a) => a.pessoas.length >= 2);
  return (
    <>
      <BarraTopo secao="Páginas" pagina="Comparar" />
      <Comparar atalhos={atalhos} pessoas={pessoas} />
    </>
  );
}
