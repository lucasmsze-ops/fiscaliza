import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Compartilhar } from "@/components/Compartilhar";
import { PoliticoCard } from "@/components/PoliticoCard";
import { montarCard, resumoNumeros, type CardDados } from "@/lib/card";
import { idsDaUrl } from "@/lib/colinha";
import { repo } from "@/lib/repo";

// A colinha: cards completos (com "seu voto contou para" nos deputados), compartilhar e a
// imagem de preview (opengraph-image.tsx, ao lado).
export const revalidate = 86400;
// Nenhuma colinha é gerada no build; cada uma é gerada na primeira visita e fica em cache (ISR).
export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ ids: string }> };

async function cards(segmento: string) {
  return (await Promise.all(idsDaUrl(segmento).map((id) => montarCard(repo, id)))).filter((c) => c !== null);
}

const nomes = (cs: CardDados[]) => cs.length > 1 ? `${cs.slice(0, -1).map((c) => c.nomeUrna).join(", ")} e ${cs.at(-1)!.nomeUrna}` : cs[0]?.nomeUrna ?? "";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cs = await cards((await params).ids);
  if (!cs.length) return { title: "Colinha · Fiscaliza", robots: { index: false } };
  const title = `Colinha 2026: ${nomes(cs)}`;
  const description = `${cs.map((c) => `${c.nomeUrna}: ${resumoNumeros(c)}`).join(" · ")}. Dados oficiais do TSE, da Câmara e do Senado.`;
  return {
    title: `${title} · Fiscaliza`, description, robots: { index: false },
    openGraph: { title, description, type: "website", locale: "pt_BR", siteName: "Fiscaliza" },
    twitter: { card: "summary_large_image", title, description },
  };
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
      <div className="mt-8">
        <Compartilhar titulo={`Minha colinha 2026: ${nomes(cs)}`} texto="Em quem votei para o Congresso em 2026, com os números oficiais de cada um." />
      </div>
      <p className="mt-6 text-sm"><Link href="/" className="underline underline-offset-2">Alterar a colinha</Link></p>
    </main>
  );
}
