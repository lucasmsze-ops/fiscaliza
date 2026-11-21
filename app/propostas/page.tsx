import type { Metadata } from "next";
import Link from "next/link";
import { BarraVoltar } from "@/components/BarraVoltar";
import { FiltrosPropostas } from "@/components/FiltrosPropostas";
import { Info } from "@/components/Termo";
import { inteiro } from "@/lib/card";
import { CARD, NUMERO, ROTULO, TITULO_PAGINA } from "@/lib/estilo";
import { grupoSituacao, GRUPOS_SITUACAO, hrefPropostas, lerFiltro, NOME_TIPO, POR_PAGINA, type AutorNoSite } from "@/lib/propostas";
import { repo } from "@/lib/repo";
import { textoOficial } from "@/lib/texto";
import { ementaLimpa, manchete } from "@/lib/titulo";
import type { Proposicao } from "@/lib/types";

export const metadata: Metadata = {
  title: "Propostas · Fiscaliza",
  description: "Projetos de lei, PECs e outras propostas apresentadas por deputados e senadores desde 2023, com a situação de cada uma e o link oficial. Busca por palavra ou número.",
};

const externo = { target: "_blank", rel: "noreferrer noopener" } as const;
const dataBr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const COR_GRUPO = {
  norma: "border-[#0A84FF]/50 bg-[#0A84FF]/22 text-[#8CC4FF]",
  tramitando: "border-white/20 bg-white/10 text-texto/85",
  encerrada: "border-white/12 bg-transparent text-texto/65",
} as const;

/** A situação como a fonte escreve; a do Senado vem em maiúsculas e passa para caixa de frase. */
const situacaoLegivel = (p: Proposicao) => p.casa !== "senado" || !p.situacao ? p.situacao
  : (p.situacao.charAt(0) + p.situacao.slice(1).toLowerCase()).replace(/câmara dos deputados/g, "Câmara dos Deputados").replace(/\bplenário\b/g, "Plenário");

/** "LEANY LEMOS (PSB-DF)" com link para o crachá; até 2 nomes e "mais N". */
function Autores({ autores }: { autores: AutorNoSite[] }) {
  if (!autores.length) return null;
  const mostra = autores.slice(0, 2), resto = autores.length - mostra.length;
  return (
    <span className="text-[13px] leading-5 text-texto/80">
      {autores[0]!.ordem === 1 ? "De " : "Com "}
      {mostra.map((a, i) => (
        <span key={a.id}>
          {i > 0 && (resto ? ", " : " e ")}
          <Link href={`/p/${a.slug}`} className="text-texto underline-offset-2 hover:underline">{a.nomeUrna}</Link>
          <span className="text-suave"> ({a.partido}-{a.uf})</span>
        </span>
      ))}
      {resto > 0 && ` e mais ${inteiro(resto)}`}
    </span>
  );
}

function Item({ p, autores }: { p: Proposicao; autores: AutorNoSite[] }) {
  const g = grupoSituacao(p);
  const titulo = manchete(p.ementa);
  return (
    <li className="flex gap-3 border-b border-borda py-3.5 last:border-b-0">
      <span className="inline-flex h-10 min-w-[58px] shrink-0 flex-col items-center justify-center rounded-full bg-destaque/20 text-[11px] font-semibold text-link" title={NOME_TIPO[p.tipo]}>
        {p.tipo}<span className="text-[13px] tabular-nums">{p.numero}</span>
      </span>
      <span className="grid min-w-0 flex-1 gap-1.5">
        <span className="line-clamp-4 text-[15px] leading-5 font-semibold">{titulo || "— (a fonte não traz a ementa)"}</span>
        {p.ementa && titulo !== ementaLimpa(p.ementa) && (
          <details className="group text-[13px] leading-5 text-texto/75">
            <summary className="cursor-pointer list-none text-link [&::-webkit-details-marker]:hidden"><span className="group-open:hidden">Ementa oficial</span><span className="hidden group-open:inline">Fechar ementa</span></summary>
            <p className="mt-1">{textoOficial(p.ementa)}</p>
          </details>
        )}
        <span className="text-xs text-suave">{NOME_TIPO[p.tipo] ?? p.tipo} {p.numero}/{p.ano} · {p.casa === "senado" ? "Senado" : "Câmara"} · apresentada em {dataBr(p.apresentacao)}</span>
        <Autores autores={autores} />
        <span className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            {g && <span className={`inline-flex h-[22px] shrink-0 items-center rounded-full border px-[9px] text-[11px] font-bold ${COR_GRUPO[g]}`}>{GRUPOS_SITUACAO.find((x) => x.valor === g)!.texto}</span>}
            <span className="text-xs text-suave">{p.situacao ? situacaoLegivel(p) : "Situação: — (a fonte não traz)"}</span>
          </span>
          <a href={p.urlOficial} {...externo} className="inline-flex min-h-8 items-center text-[13px] font-semibold no-underline">Ver na fonte ›</a>
        </span>
      </span>
    </li>
  );
}

/**
 * Lista geral de propostas (E23g): o que deputados e senadores apresentaram desde 2023, com busca na ementa e
 * filtros. São ~26 mil: a página consulta o banco a cada filtro (20 por vez), em vez de baixar a lista inteira.
 */
export default async function Propostas({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { filtro, pagina } = lerFiltro(await searchParams);
  const r = await repo.buscarProposicoes(filtro, pagina, POR_PAGINA);
  const paginas = Math.max(1, Math.ceil(r.total / POR_PAGINA));
  const filtrado = !!(filtro.busca || filtro.casa || filtro.tipo || filtro.situacao || filtro.ano);

  return (
    <>
      <BarraVoltar volta="/votacoes" rotulo="Votações" />
      <main className="grid gap-4 pb-4 lg:pb-8">
        <header className="grid gap-1.5 px-1">
          <h1 className={TITULO_PAGINA}>Propostas</h1>
          <p className="text-[15px] leading-5 text-texto/80">
            Projetos apresentados por deputados e senadores desde 2023: leis, leis complementares, emendas à Constituição,
            decretos legislativos e resoluções. Requerimentos e outros pedidos ficam de fora.
          </p>
        </header>

        <FiltrosPropostas filtro={filtro}>
          <section aria-label="Resumo" className={`${CARD} grid grid-cols-2 gap-4`}>
            <div className="grid gap-0.5">
              <span className={`${ROTULO} flex min-h-7 items-center`}>{filtrado ? "Encontradas" : "Apresentadas"}</span>
              <span className={NUMERO}>{inteiro(r.total)}</span>
            </div>
            <div className="grid gap-0.5">
              <span className={`${ROTULO} flex min-h-7 items-center gap-1`}>
                Viraram norma
                <Info id="pr-lista-norma" termo="propostasLei" rotulo="Como as propostas são contadas"
                  explicacao="Viraram norma: aprovadas e transformadas em lei, emenda constitucional, decreto legislativo ou resolução, como a Câmara ou o Senado registra. As recentes ainda podem estar em tramitação. A lista tem as propostas com algum deputado ou senador do site entre os autores." />
              </span>
              <span className={NUMERO}>{inteiro(r.viraramNorma)}</span>
            </div>
          </section>

          {r.itens.length > 0 ? (
            <ul className={`${CARD} grid py-1 sm:py-1`}>
              {r.itens.map((x) => <Item key={x.proposicao.id} p={x.proposicao} autores={x.autores} />)}
            </ul>
          ) : (
            <p className={`${CARD} text-[15px] leading-5 text-texto/80`}>
              {r.total > 0 ? "Esta página não existe mais. " : "Nenhuma proposta com estes filtros. "}
              <Link href={r.total > 0 ? hrefPropostas(filtro) : "/propostas"}>{r.total > 0 ? "Voltar à primeira página" : "Ver todas"}</Link>
            </p>
          )}

          {paginas > 1 && r.itens.length > 0 && (
            <nav aria-label="Páginas" className="flex items-center justify-between gap-3 px-1">
              {pagina > 1
                ? <Link href={hrefPropostas(filtro, pagina - 1)} className="inline-flex h-11 items-center rounded-full vidro px-4 text-[15px] font-semibold no-underline">‹ Anteriores</Link>
                : <span />}
              <span className="text-[13px] text-suave tabular-nums">Página {inteiro(pagina)} de {inteiro(paginas)}</span>
              {pagina < paginas
                ? <Link href={hrefPropostas(filtro, pagina + 1)} className="inline-flex h-11 items-center rounded-full vidro px-4 text-[15px] font-semibold no-underline">Próximas ›</Link>
                : <span />}
            </nav>
          )}
        </FiltrosPropostas>

        <p className="px-1 text-xs leading-5 text-suave">
          Fonte: dados abertos da Câmara (arquivos anuais de proposições) e do Senado (processos), coletados uma vez por dia.
          Só aparecem propostas com algum deputado ou senador do site entre os autores, e só esses autores são listados; a página
          oficial tem a autoria completa. <Link href="/como-funciona#propostas">Como funciona</Link>
        </p>
      </main>
    </>
  );
}
