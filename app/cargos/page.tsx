import type { Metadata } from "next";
import Link from "next/link";
import { BarraVoltar } from "@/components/BarraVoltar";
import { AbrirPelaAncora } from "@/components/AbrirPelaAncora";
import { Assunto } from "@/components/Assunto";
import { CARGOS, CARGOS_CONFERIDOS_EM, ESFERAS, type Fonte } from "@/lib/cargos";
import { CONSTITUICAO } from "@/lib/glossario";
import { reais } from "@/lib/card";
import { SUBSIDIO_CONGRESSO, subsidioEm } from "@/lib/salario";
import { TITULO_PAGINA } from "@/lib/estilo";
import { hojeBrasil } from "@/lib/datas";

// O que faz cada cargo eleito (E23h): texto fixo de lib/cargos.ts, cada frase com o artigo da lei no Planalto.
export const metadata: Metadata = {
  title: "Cargos · Fiscaliza",
  description: "O que fazem presidente, governador, senador, deputados, prefeito e vereador, segundo a Constituição: quantos são, mandato, eleição e atribuições, com o artigo de cada regra.",
};
export const revalidate = 86400;

const externo = { target: "_blank", rel: "noreferrer noopener" } as const;
const diaBr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

const LinkFonte = ({ f }: { f: Fonte }) => (
  <a href={f.url} {...externo} className="text-[13px] text-suave underline underline-offset-2 hover:text-texto">{f.rotulo}</a>
);

export default function Cargos() {
  const subsidio = subsidioEm(hojeBrasil());
  return (
    <>
    <BarraVoltar volta="/como-funciona" rotulo="Como funciona" />
    <main className="mx-auto grid max-w-xl gap-4 pb-4 lg:pb-8">
      <div className="grid gap-2.5 px-1">
        <h1 className={TITULO_PAGINA}>Cargos</h1>
        <p className="text-[17px] leading-[23px] text-texto/85">O que faz cada cargo eleito, segundo a Constituição Federal e as leis nacionais.</p>
        <p className="text-[15px] leading-[21px] text-suave">
          Cada regra leva ao artigo no texto oficial, no site do Planalto (conferido em {diaBr(CARGOS_CONFERIDOS_EM)}). O detalhe das
          atribuições de governador, prefeito e dos legislativos locais está na Constituição de cada estado e na lei orgânica de cada município.
        </p>
      </div>
      <AbrirPelaAncora />

      {ESFERAS.map((esfera) => (
        <section key={esfera} aria-labelledby={`esfera-${esfera}`} className="grid gap-2">
          <h2 id={`esfera-${esfera}`} className="px-5 text-[13px] font-semibold tracking-[0.4px] text-suave uppercase">{esfera}</h2>
          <div className="vidro overflow-hidden rounded-card">
            {CARGOS.filter((c) => c.esfera === esfera).map((c) => (
              <Assunto key={c.id} id={c.id} titulo={c.titulo} subtitulo={c.resumo}>
                <dl className="grid gap-2.5">
                  {c.fatos.map((f) => (
                    <div key={f.rotulo} className="grid gap-0.5">
                      <dt className="text-[13px] font-semibold text-suave">{f.rotulo}</dt>
                      <dd>{f.valor}. <LinkFonte f={f.fonte} /></dd>
                    </div>
                  ))}
                  {c.salarioCongresso && subsidio && (
                    <div className="grid gap-0.5">
                      <dt className="text-[13px] font-semibold text-suave">Salário</dt>
                      <dd>
                        {reais(subsidio.valor)} por mês, bruto, o mesmo para deputados federais e senadores.{" "}
                        <LinkFonte f={{ rotulo: SUBSIDIO_CONGRESSO.ato, url: SUBSIDIO_CONGRESSO.url }} />
                      </dd>
                    </div>
                  )}
                </dl>
                <h3 className="pt-1 text-[13px] font-semibold text-suave">O que faz</h3>
                <ul className="grid list-disc gap-1.5 pl-5">
                  {c.faz.map((a) => <li key={a.texto}>{a.texto} <LinkFonte f={a.fonte} /></li>)}
                </ul>
                {c.noSite
                  ? <Link href={c.noSite.href} className="font-semibold text-link no-underline">{c.noSite.rotulo} ›</Link>
                  : <p className="text-[13px] text-suave">O Fiscaliza ainda não acompanha este cargo.</p>}
              </Assunto>
            ))}
          </div>
        </section>
      ))}

      <p className="px-5 text-[13px] leading-[18px] text-suave">
        Toque num cargo para abrir. Termos como medida provisória, veto e quociente eleitoral estão no{" "}
        <Link href="/dicionario" className="underline underline-offset-2">Dicionário</Link>. Texto completo:{" "}
        <a href={CONSTITUICAO} {...externo} className="underline underline-offset-2">Constituição Federal</a>.
      </p>
    </main>
    </>
  );
}
