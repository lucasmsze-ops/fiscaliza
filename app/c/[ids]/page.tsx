import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PoliticoCard } from "@/components/PoliticoCard";
import { montarCard } from "@/lib/card";
import { idsDaUrl } from "@/lib/colinha";
import { repo } from "@/lib/repo";

// E11: versão mínima da colinha (os cards). A E12 acrescenta "seu voto contou para",
// compartilhar e a imagem de preview (OG).
export const revalidate = 86400;
// Nenhuma colinha é gerada no build; cada uma é gerada na primeira visita e fica em cache (ISR).
export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ ids: string }> };

async function cards(segmento: string) {
  return (await Promise.all(idsDaUrl(segmento).map((id) => montarCard(repo, id)))).filter((c) => c !== null);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cs = await cards((await params).ids);
  return { title: cs.length ? `Colinha: ${cs.map((c) => c.nomeUrna).join(", ")} · Fiscaliza` : "Colinha · Fiscaliza", robots: { index: false } };
}

export default async function ColinhaPage({ params }: Props) {
  const cs = await cards((await params).ids);
  if (!cs.length) notFound();
  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-2xl font-bold">Sua colinha</h1>
      <p className="mt-1 text-sm text-[var(--suave)]">Em quem você votou para o Congresso em 2026, com dados oficiais.</p>
      <div className="mt-6 grid justify-items-center gap-4">
        {cs.map((d) => <PoliticoCard key={d.id} d={d} />)}
      </div>
      <p className="mt-8 text-sm"><Link href="/" className="underline underline-offset-2">Alterar a colinha</Link></p>
    </main>
  );
}
