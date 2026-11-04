import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AbasMandato } from "@/components/AbasMandato";
import { BarraTopo } from "@/components/BarraTopo";
import { Cracha } from "@/components/Cracha";
import { resumoNumeros } from "@/lib/card";
import { hrefSecao } from "@/lib/glossario";
import { repo } from "@/lib/repo";
import { NOME_UF } from "@/lib/regioes";
import { subsidioEm } from "@/lib/salario";

export const revalidate = 86400;
// No build, só quem tem mandato (Câmara ou Senado); os demais (~3 mil suplentes e não eleitos) são
// gerados na primeira visita e ficam em cache (ISR). Slug inexistente: notFound().
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await repo.listarPoliticos()).filter((p) => p.camaraId || p.senadoCodigo).map((p) => ({ slug: p.id }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const pg = await repo.getPagina((await params).slug);
  if (!pg) return { title: "Fiscaliza" };
  const c = pg.card;
  return {
    title: `${c.nomeUrna} · ${c.cargo} · ${c.partidoUf} · Fiscaliza`,
    description: `${c.status}. ${resumoNumeros(c).replace(/^./, (x) => x.toUpperCase())}. Dados oficiais do TSE, da Câmara e do Senado.`,
  };
}

/**
 * Página do político no layout do crachá do protótipo (E23i). Cota mês a mês, mandatos, contatos,
 * "Como cobrar" e governismo saíram daqui por decisão do usuário (2026-11-04): o protótipo não os
 * tem. Seguem calculados no resumo (`resumos.pagina`) e documentados em /como-funciona.
 */
export default async function PaginaPolitico({ params }: Props) {
  const pg = await repo.getPagina((await params).slug);
  if (!pg) notFound();
  const c = pg.card;
  const hoje = new Date().toISOString().slice(0, 10);
  const mandato = pg.mandatos.find((m) => m.fim === null) ?? null;
  const salario = c.comoCobrar ? subsidioEm(hoje) : null;
  const coleta = (await repo.getAtualizacoes()).map((a) => a.coletadoEm).sort().at(-1);
  const uf = c.partidoUf.slice(-2);

  return (
    <>
    <BarraTopo secao={`Visão geral / ${NOME_UF[uf] ?? uf}`} pagina="Crachá do político" />
    <main className="grid gap-6 pb-8">
      <Cracha d={c} mandato={mandato} salario={salario} comparacao={pg.comparacao ?? null} cores={pg.coresPartido ?? []} />
      <AbasMandato id={c.id} propostas={pg.propostas ?? null} votacoes={pg.votacoes} />
      <p className="text-xs text-suave">
        Fonte: {c.numeros.tipo === "mandato" ? (c.numeros.casa === "senado" ? "Senado Federal" : "Câmara dos Deputados") + " e " : ""}TSE
        {coleta && <> · dados coletados em {new Date(coleta).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</>}
        {" · "}<Link href={hrefSecao("fontes")} className="underline underline-offset-2">metodologia</Link>
      </p>
    </main>
    </>
  );
}
