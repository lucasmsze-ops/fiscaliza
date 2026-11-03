import { BarraTopo } from "@/components/BarraTopo";
import { MontarColinha } from "@/components/MontarColinha";

export const revalidate = 86400;

export default async function Home() {
  return (
    <>
    <BarraTopo secao="Fiscaliza" pagina="Monte sua colinha" busca={false} />
    <main className="mx-auto max-w-xl pb-8">
      <h1 className="text-3xl font-bold tracking-tight">Fiscaliza</h1>
      <p className="mt-2 text-suave">Em quem você votou para o Congresso em 2026? Ache pela cidade e monte sua colinha.</p>
      <div className="mt-6">
        <MontarColinha />
      </div>
    </main>
    </>
  );
}
