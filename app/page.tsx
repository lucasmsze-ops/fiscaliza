import { MontarColinha } from "@/components/MontarColinha";
import { repo } from "@/lib/repo";

export const revalidate = 86400;

export default async function Home() {
  const municipios = (await repo.listarMunicipios()).map((m) => ({ ibge: m.ibge, nome: m.nome }));
  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight">Fiscaliza</h1>
      <p className="mt-2 text-[var(--suave)]">Em quem você votou para o Congresso em 2026? Ache pela cidade e monte sua colinha.</p>
      <div className="mt-6">
        <MontarColinha municipios={municipios} />
      </div>
    </main>
  );
}
