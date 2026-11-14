import type { Metadata } from "next";
import { BarraTopo } from "@/components/BarraTopo";
import { PainelVotacoes } from "@/components/PainelVotacoes";
import { montarVotacoes } from "@/lib/congresso";
import { repo } from "@/lib/repo";

export const revalidate = 86400;
export const metadata: Metadata = {
  title: "Votações · Fiscaliza",
  description: "O que está marcado para o Plenário da Câmara e do Senado e o que já foi votado, com o placar e como votou cada partido. Dados oficiais, atualizados uma vez por dia.",
};

/** Próximas votações (pauta), últimas votações e o calendário como filtro (pedido de 2026-11-13). */
export default async function Votacoes() {
  const hoje = new Date().toISOString().slice(0, 10);
  const [d, pauta, atualizacoes] = await Promise.all([montarVotacoes(repo), repo.listarPauta(hoje), repo.getAtualizacoes()]);
  const coleta = atualizacoes.map((a) => a.coletadoEm).sort().at(-1) ?? null;
  return (
    <>
      <BarraTopo secao="Páginas" pagina="Votações" />
      <PainelVotacoes pauta={pauta} porDia={d.porDia} mesInicial={d.mesInicial} votacoesMes={d.votacoesMes} ultimaSessao={d.ultimaSessao} coleta={coleta} />
    </>
  );
}
