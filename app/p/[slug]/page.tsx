import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AbasMandato } from "@/components/AbasMandato";
import { BarraVoltar } from "@/components/BarraVoltar";
import { Cracha } from "@/components/Cracha";
import { resumoNumeros } from "@/lib/card";
import { hrefSecao } from "@/lib/glossario";
import { telefoneGabinete } from "@/lib/texto";
import { repo } from "@/lib/repo";
import { SUBSIDIO_CONGRESSO, subsidioEm } from "@/lib/salario";
import { AreasAtuacao } from "@/components/AreasAtuacao";

const dataBr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

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
  // Com mandato em curso, o título diz a cadeira (como o cabeçalho do crachá), não a candidatura de 2026.
  const m = pg.mandatos.find((x) => x.fim === null);
  const fem = /^(Senadora|Deputada)/.test(c.cargo);
  const cargo = m ? (m.cargo === "senador" ? (fem ? "Senadora" : "Senador") : (fem ? "Deputada federal" : "Deputado federal")) : c.cargo;
  const partidoUf = m?.uf ? `${c.partidoUf.slice(0, -3)}-${m.uf}` : c.partidoUf;
  return {
    title: `${c.nomeUrna} · ${cargo} · ${partidoUf} · Fiscaliza`,
    description: `${c.status}. ${resumoNumeros(c).replace(/^./, (x) => x.toUpperCase())}. Dados oficiais do TSE, da Câmara e do Senado.`,
  };
}

/**
 * Página do político no layout do protótipo Liquid Glass (E23s, 2026-11-20): cabeçalho, presença, parecidos,
 * o que fez no mandato, áreas de atuação, como cobrar e a nota do salário. Cota mês a mês, mandatos,
 * governismo e "Votou com o partido?" não aparecem (seguem calculados no resumo e em /como-funciona).
 */
export default async function PaginaPolitico({ params }: Props) {
  const pg = await repo.getPagina((await params).slug);
  if (!pg) notFound();
  const c = pg.card;
  const hoje = new Date().toISOString().slice(0, 10);
  const mandato = pg.mandatos.find((m) => m.fim === null) ?? null;
  const salario = c.comoCobrar ? subsidioEm(hoje) : null;
  const coleta = (await repo.getAtualizacoes()).map((a) => a.coletadoEm).sort().at(-1);
  // A UF da cadeira, quando há mandato em curso (a de `partidoUf` é a da candidatura de 2026).
  const uf = mandato?.uf ?? c.partidoUf.slice(-2);
  const fone = telefoneGabinete(c.comoCobrar?.telefone);

  return (
    <>
    <BarraVoltar volta={`/mapa?uf=${uf}`} rotulo="Mapa" />
    <main className="grid gap-4 pb-4 lg:pb-8">
      <Cracha d={c} mandato={mandato} comparacao={pg.comparacao ?? null} />
      <AbasMandato id={c.id} propostas={pg.propostas ?? null} votacoes={pg.votacoes} />
      {pg.propostas?.areas && pg.propostas.areas.length > 0 && <AreasAtuacao p={pg.propostas} />}
      {c.comoCobrar && (
        <section aria-labelledby="cr-cobrar" className="vidro grid gap-2 rounded-card p-[18px]">
          <h2 id="cr-cobrar" className="text-[17px] font-semibold">Como cobrar</h2>
          {c.comoCobrar.email && <a href={`mailto:${c.comoCobrar.email}`} className="flex min-h-11 items-center text-[15px] break-all no-underline">{c.comoCobrar.email}</a>}
          {fone && <a href={`tel:${fone.tel}`} className="flex min-h-11 items-center border-t border-borda text-[15px] no-underline">{fone.texto}</a>}
          {c.urlPerfil && <a href={c.urlPerfil} target="_blank" rel="noreferrer noopener" className="flex min-h-11 items-center border-t border-borda text-[15px] font-semibold no-underline">Perfil oficial {c.comoCobrar.casa === "senado" ? "no Senado" : "na Câmara"} ›</a>}
          <Link href={hrefSecao("cobrar")} className="flex min-h-11 items-center border-t border-borda text-[15px] no-underline">Ouvidoria e outros canais oficiais ›</Link>
        </section>
      )}
      {salario && (
        <p className="px-2 text-xs text-suave">
          Salário: {salario.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} por mês, subsídio bruto desde {dataBr(salario.desde)},{" "}
          <a href={SUBSIDIO_CONGRESSO.url} target="_blank" rel="noreferrer noopener" className="underline underline-offset-2">{SUBSIDIO_CONGRESSO.ato}</a>.
        </p>
      )}
      <p className="px-2 text-xs text-suave">
        Fonte: {c.numeros.tipo === "mandato" ? (c.numeros.casa === "senado" ? "Senado Federal" : "Câmara dos Deputados") + " e " : ""}TSE
        {coleta && <> · dados coletados em {new Date(coleta).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</>}
        {" · "}<Link href={hrefSecao("fontes")} className="underline underline-offset-2">metodologia</Link>
      </p>
    </main>
    </>
  );
}
