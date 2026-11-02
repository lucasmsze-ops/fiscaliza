import type { Metadata } from "next";
import { Quiz } from "@/components/Quiz";
import { Termo } from "@/components/Termo";
import { repo } from "@/lib/repo";

export const metadata: Metadata = {
  title: "Votações do quiz · Fiscaliza",
  description: "Votações do Congresso entre 2023 e 2026, explicadas a partir dos textos oficiais. Responda e veja a concordância de quem recebeu seu voto.",
};
export const revalidate = 86400;

export default async function Votacoes() {
  const itens = (await repo.getVotacoesQuiz()).map((x) => x.item);
  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-2xl font-bold">Votações do quiz</h1>
      <p className="mt-2 text-sm text-[var(--suave)]">
        {itens.length} votações nominais do plenário entre 2023 e 2026, explicadas a partir dos textos oficiais da Câmara e do Senado.
        Responda Sim ou Não; a <Termo id="quiz-conc" termo="concordancia">concordância</Termo> aparece no card de cada político da sua colinha.
        As respostas ficam só neste navegador.
      </p>
      <p className="mt-2 text-xs text-[var(--suave)]">
        Siglas: <Termo id="quiz-pec" termo="pec">PEC</Termo> · <Termo id="quiz-pl" termo="pl">PL</Termo> · <Termo id="quiz-plp" termo="plp">PLP</Termo>
      </p>
      <div className="mt-6">
        <Quiz itens={itens} />
      </div>
    </main>
  );
}
