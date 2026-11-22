import type { Metadata } from "next";
import Link from "next/link";
import { BarraVoltar } from "@/components/BarraVoltar";
import { GLOSSARIO, hrefSecao, type TermoGlossario } from "@/lib/glossario";
import { normalizar } from "@/lib/texto";
import { TITULO_PAGINA } from "@/lib/estilo";

// Dicionário (E23h): os termos de lib/glossario.ts, a mesma lista dos "?" do site, em ordem alfabética. Cada verbete tem
// âncora (/dicionario#veto), para onde o popover leva quando o termo não é uma métrica.
export const metadata: Metadata = {
  title: "Dicionário · Fiscaliza",
  description: "Os termos do Congresso, das eleições e do orçamento que aparecem no Fiscaliza, explicados em uma frase, com a lei que os define.",
};

const externo = { target: "_blank", rel: "noreferrer noopener" } as const;

const letra = (titulo: string) => normalizar(titulo).charAt(0).toUpperCase();

export default function Dicionario() {
  const termos = (Object.keys(GLOSSARIO) as TermoGlossario[])
    .map((k) => ({ k, ...GLOSSARIO[k] }))
    .filter((t) => !t.foraDoDicionario)
    .sort((a, b) => a.titulo.localeCompare(b.titulo, "pt-BR", { sensitivity: "base" }));
  const grupos = new Map<string, typeof termos>();
  for (const t of termos) grupos.set(letra(t.titulo), [...(grupos.get(letra(t.titulo)) ?? []), t]);

  return (
    <>
    <BarraVoltar volta="/como-funciona" rotulo="Como funciona" />
    <main className="mx-auto grid max-w-xl gap-4 pb-4 lg:pb-8">
      <div className="grid gap-2.5 px-1">
        <h1 className={TITULO_PAGINA}>Dicionário</h1>
        <p className="text-[17px] leading-[23px] text-texto/85">Os termos do Congresso, das eleições e do orçamento que aparecem no site.</p>
        <p className="text-[15px] leading-[21px] text-suave">
          É a mesma explicação do “?” ao lado de cada termo. Quando um termo é um número do site, o link leva à regra de cálculo; quando uma
          lei o define, ao artigo no texto oficial.
        </p>
      </div>

      <nav aria-label="Letras" className="flex flex-wrap gap-1.5 px-1">
        {[...grupos.keys()].map((l) => (
          <a key={l} href={`#letra-${l}`} className="vidro inline-flex size-9 items-center justify-center rounded-full text-sm font-semibold text-texto no-underline hover:bg-preench-forte hover:text-texto">{l}</a>
        ))}
      </nav>

      {[...grupos].map(([l, ts]) => (
        <section key={l} aria-labelledby={`letra-${l}`} className="grid gap-2">
          <h2 id={`letra-${l}`} className="scroll-mt-16 px-5 text-[13px] font-semibold tracking-[0.4px] text-suave uppercase">{l}</h2>
          <dl className="vidro overflow-hidden rounded-card">
            {ts.map((t) => (
              <div key={t.k} id={t.k} className="grid scroll-mt-16 gap-1 border-t border-borda px-4 py-3 first:border-t-0 target:bg-[rgba(64,156,255,0.14)]">
                <dt className="text-base font-semibold text-texto">{t.titulo}</dt>
                <dd className="text-[15px] leading-relaxed text-texto/85">{t.texto}</dd>
                {(t.secao || t.fonte) && (
                  <dd className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
                    {t.secao && <Link href={hrefSecao(t.secao)} className="font-semibold text-link no-underline">Como calculamos ›</Link>}
                    {t.fonte && <a href={t.fonte.url} {...externo} className="text-suave underline underline-offset-2 hover:text-texto">{t.fonte.rotulo}</a>}
                  </dd>
                )}
              </div>
            ))}
          </dl>
        </section>
      ))}

      <p className="px-5 text-[13px] leading-[18px] text-suave">
        O que faz cada cargo eleito está em <Link href="/cargos" className="underline underline-offset-2">Cargos</Link>.
      </p>
    </main>
    </>
  );
}
