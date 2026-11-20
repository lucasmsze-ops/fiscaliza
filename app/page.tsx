import type { Metadata } from "next";
import { Inicio } from "@/components/Inicio";
import { montarVotacoes } from "@/lib/congresso";
import { repo } from "@/lib/repo";

export const revalidate = 86400;
export const metadata: Metadata = {
  title: "Fiscaliza · quem te representa e o que fez no mandato",
  description: "Senadores e deputados federais: o que cada um fez no mandato, como votou e como cobrar. Dados oficiais do TSE, da Câmara e do Senado.",
};

/** Início (protótipo Liquid Glass, 2026-11-20). A votação em destaque é a mais recente das duas Casas. */
export default async function Home() {
  const [d, atualizacoes] = await Promise.all([montarVotacoes(repo), repo.getAtualizacoes()]);
  const coleta = atualizacoes.map((a) => a.coletadoEm).sort().at(-1) ?? null;
  const sessao = [...d.ultimaSessao].sort((a, b) => b.data.localeCompare(a.data))[0];
  return <Inicio ultima={sessao?.votacoes[0] ?? null} coleta={coleta} />;
}
