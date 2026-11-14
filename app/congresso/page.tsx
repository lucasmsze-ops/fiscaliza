import type { Metadata } from "next";
import Link from "next/link";
import { BarraTopo } from "@/components/BarraTopo";
import { Plenario } from "@/components/Plenario";
import { montarCongresso } from "@/lib/congresso";
import { hrefSecao } from "@/lib/glossario";
import { repo } from "@/lib/repo";
import { CARD, TITULO_CARTAO, TITULO_PAGINA, TITULO_SECAO } from "@/lib/estilo";

export const revalidate = 86400;
export const metadata: Metadata = {
  title: "Congresso · Fiscaliza",
  description: "Quem ocupa cada cadeira da Câmara e do Senado hoje, por partido e estado, e a Câmara a partir de fevereiro de 2027. Dados oficiais.",
};

const card = CARD;

export default async function Congresso() {
  const [d, atualizacoes] = await Promise.all([montarCongresso(repo), repo.getAtualizacoes()]);
  const coleta = atualizacoes.map((a) => a.coletadoEm).sort().at(-1);

  return (
    <>
    <BarraTopo busca="politicos" />
    <main className="grid gap-6 pb-8">
      {/* Título fora do cartão, como em Votações: "Como contamos" à direita e a data da coleta embaixo (2026-11-14). */}
      <header className="grid gap-1">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className={TITULO_PAGINA}>Congresso Federal</h1>
          <Link href={hrefSecao("congresso")} className="shrink-0 text-[13px] no-underline hover:underline">Como contamos</Link>
        </div>
        {coleta && <p className="text-[13px] text-suave">Atualizado em {new Date(coleta).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p>}
      </header>
      <section className={`${card} grid gap-3.5`} aria-label="Cadeiras por partido">
        <Plenario casas={d.casas} camara2027={d.camara2027} cores={d.cores} />
      </section>
    </main>
    </>
  );
}
