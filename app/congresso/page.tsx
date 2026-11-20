import type { Metadata } from "next";
import { Plenario } from "@/components/Plenario";
import { montarCongresso } from "@/lib/congresso";
import { repo } from "@/lib/repo";
import { TITULO_PAGINA } from "@/lib/estilo";

export const revalidate = 86400;
export const metadata: Metadata = {
  title: "Congresso · Fiscaliza",
  description: "Quem ocupa cada cadeira da Câmara e do Senado hoje, por partido e estado, e a Câmara a partir de fevereiro de 2027. Dados oficiais.",
};

export default async function Congresso() {
  const [d, atualizacoes] = await Promise.all([montarCongresso(repo), repo.getAtualizacoes()]);
  const coleta = atualizacoes.map((a) => a.coletadoEm).sort().at(-1);

  return (
    <main className="grid gap-[18px] pt-3 pb-8 lg:pt-6">
      <header className="grid gap-1.5 px-1">
        <h1 className={TITULO_PAGINA}>Congresso Federal</h1>
        {coleta && <p className="text-[13px] text-suave">Atualizado em {new Date(coleta).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p>}
      </header>
      <Plenario casas={d.casas} camara2027={d.camara2027} />
    </main>
  );
}
