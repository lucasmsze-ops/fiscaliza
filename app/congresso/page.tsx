import type { Metadata } from "next";
import Link from "next/link";
import { BarraTopo } from "@/components/BarraTopo";
import { Plenario } from "@/components/Plenario";
import { montarCongresso } from "@/lib/congresso";
import { hrefSecao } from "@/lib/glossario";
import { repo } from "@/lib/repo";

export const revalidate = 86400;
export const metadata: Metadata = {
  title: "Congresso · Fiscaliza",
  description: "Quem ocupa cada cadeira da Câmara e do Senado hoje, por partido e estado, e a Câmara a partir de fevereiro de 2027. Dados oficiais.",
};

const card = "rounded-card border border-borda bg-card p-[22px] shadow-card";

export default async function Congresso() {
  const [d, atualizacoes] = await Promise.all([montarCongresso(repo), repo.getAtualizacoes()]);
  const coleta = atualizacoes.map((a) => a.coletadoEm).sort().at(-1);

  return (
    <>
    <BarraTopo secao="Páginas" pagina="Congresso" />
    <main className="grid gap-6 pb-8">
      <h1 className="sr-only">Congresso</h1>
      <section className={`${card} grid gap-3.5`} aria-labelledby="cg-como">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="cg-como" className="text-xl font-bold">Como está o Congresso</h2>
          <Link href={hrefSecao("congresso")} className="shrink-0 text-xs underline underline-offset-2">como contamos</Link>
        </div>
        <p className="text-sm text-suave">Cada bolinha é uma cadeira, na cor do partido. Passe o mouse para destacar um partido; toque numa cadeira ou num partido para ver a lista de quem está nele.</p>
        <Plenario casas={d.casas} camara2027={d.camara2027} cores={d.cores} />
      </section>

      {coleta && <p className="text-xs text-suave">Dados coletados nas fontes oficiais em {new Date(coleta).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}. As votações do Plenário estão em <Link href="/votacoes" className="underline underline-offset-2">Votações</Link>.</p>}
    </main>
    </>
  );
}
