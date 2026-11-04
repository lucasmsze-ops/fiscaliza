import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BarraTopo } from "@/components/BarraTopo";
import { BarraPlacar } from "@/components/CartaoVotacao";
import { TextoLongo } from "@/components/TextoLongo";
import { inteiro } from "@/lib/card";
import { hrefSecao } from "@/lib/glossario";
import { corPartido } from "@/lib/partidos";
import { repo } from "@/lib/repo";
import { termosNaEmenta } from "@/lib/termos-ementa";
import {
  CADEIRAS, EXPLICA_OBJETO, hrefVotacao, idDoSlug, objetoVotado, regraDoTipo, rotuloVotado, tipoPorExtenso, turnoDe,
  votosNecessarios, type PartidoNaVotacao, type VotacaoPagina,
} from "@/lib/votacao";

export const revalidate = 86400;
// Nenhuma página no build (são ~1.500): cada uma é gerada na primeira visita e fica em cache (ISR).
export const dynamicParams = true;
export async function generateStaticParams() { return []; }

type Props = { params: Promise<{ id: string }> };

const externo = { target: "_blank", rel: "noreferrer noopener" } as const;
const card = "rounded-card border border-borda bg-card p-[18px] shadow-card sm:p-[22px]";
const nomeCasa = (v: VotacaoPagina) => (v.casa === "senado" ? "Senado" : "Câmara");
const naCasa = (v: VotacaoPagina) => (v.casa === "senado" ? "no Senado" : "na Câmara");
const dataLonga = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).replace(/\./g, "");
const ddmmaaaa = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const titulo = (v: VotacaoPagina) => v.proposicao ?? `Votação de ${ddmmaaaa(v.data)}`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const v = await repo.getVotacaoPagina(idDoSlug((await params).id));
  if (!v) return { title: "Votação · Fiscaliza" };
  return {
    title: `${titulo(v)} · votação ${naCasa(v)} em ${ddmmaaaa(v.data)} · Fiscaliza`,
    description: `${v.resultado === "aprovada" ? "Aprovada" : v.resultado === "rejeitada" ? "Rejeitada" : "Votação nominal"} no Plenário ${v.casa === "senado" ? "do Senado" : "da Câmara"}. Placar e como votou cada partido, com dados oficiais.`,
  };
}

const ORIENTOU: Record<string, string> = { Sim: "orientou Sim", Não: "orientou Não", Liberado: "liberou a bancada", Obstrução: "orientou obstrução" };
const VIA = { federacao: " (pela federação)", bloco: " (pelo bloco)", partido: "" } as const;

function LinhaPartido({ p, v }: { p: PartidoNaVotacao; v: VotacaoPagina }) {
  const sem = v.secreta || v.semDirecao;
  const pessoas = v.casa === "senado" ? (p.total === 1 ? "senador" : "senadores") : p.total === 1 ? "deputado" : "deputados";
  return (
    <li className="grid gap-1.5 border-b border-borda py-3 last:border-b-0">
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="size-2.5 shrink-0 rounded-full" style={{ background: corPartido(p.partido) }} aria-hidden="true" />
        <strong className="text-[15px]">{p.partido}</strong>
        <span className="text-[13px] text-suave">· {p.total} {pessoas}</span>
        {!v.secreta && (
          <span className="ml-auto rounded-full border border-borda px-2.5 py-0.5 text-xs">
            {p.orientacao ? `${ORIENTOU[p.orientacao] ?? `orientou ${p.orientacao}`}${p.via ? VIA[p.via] : ""}` : "sem orientação registrada"}
          </span>
        )}
      </span>
      {!sem && <BarraPlacar sim={p.sim} nao={p.nao} abst={p.abstencao + p.obstrucao} cadeiras={p.total} />}
      <span className="text-[13px] text-suave tabular-nums">
        {sem
          ? <>{p.total - p.naoVotou} {p.total - p.naoVotou === 1 ? "votou" : "votaram"} · {p.naoVotou} não {p.naoVotou === 1 ? "votou" : "votaram"}</>
          : <>{p.sim} Sim · {p.nao} Não · {p.abstencao} Abst.{p.obstrucao > 0 && <> · {p.obstrucao} Obstr.</>}{p.outros > 0 && <> · {p.outros} outro{p.outros > 1 ? "s" : ""}</>} · {p.naoVotou} não {p.naoVotou === 1 ? "votou" : "votaram"}</>}
      </span>
    </li>
  );
}

export default async function PaginaVotacao({ params }: Props) {
  const v = await repo.getVotacaoPagina(idDoSlug((await params).id));
  if (!v) notFound();
  const objeto = objetoVotado(v);
  const turno = objeto === "requerimento" ? null : turnoDe(v.descricao);
  const regra = regraDoTipo(v.proposicao);
  const necessarios = votosNecessarios(v);
  const c = v.contagem;
  const cadeiras = CADEIRAS[v.casa];
  const votaram = cadeiras - c.naoVotou;
  const termos = v.ementa ? termosNaEmenta(v.ementa) : [];
  const PRIMEIROS = 8;
  const pessoas = v.casa === "senado" ? "senadores" : "deputados";

  return (
    <>
    <BarraTopo secao="Congresso" pagina="Votação" />
    <main className="grid gap-6 pb-8">
      <section className={`${card} grid gap-3`}>
        <p className="text-xs text-suave">
          <Link href="/congresso" className="underline underline-offset-2">{nomeCasa(v)}</Link> · Plenário · {dataLonga(v.data)}
        </p>
        <h1 className="text-[28px] leading-tight font-bold sm:text-[34px]">{titulo(v)}</h1>
        {tipoPorExtenso(v.proposicao) && <p className="-mt-2 text-sm text-suave">{tipoPorExtenso(v.proposicao)}</p>}
        <p className="text-[15px] leading-relaxed">
          <strong>Votado nesse dia:</strong> {objeto ? EXPLICA_OBJETO[objeto] : "veja a descrição oficial abaixo"}{turno ? `, ${turno}` : ""}.
        </p>
        <p className="text-[13px] leading-relaxed text-suave">Descrição oficial: {v.descricao}</p>
        {regra && <p className="rounded-xl bg-fundo p-3.5 text-[13px] leading-relaxed">{regra}</p>}
      </section>

      <section className={`${card} grid gap-3`} aria-labelledby="vt-resultado">
        <h2 id="vt-resultado" className="text-xs font-bold tracking-wider text-suave uppercase">Resultado</h2>
        <p className="text-[32px] leading-none font-bold">
          {v.resultado === "aprovada" ? "Aprovada" : v.resultado === "rejeitada" ? "Rejeitada" : "Resultado não informado pela fonte"}
        </p>
        {v.secreta || v.semDirecao ? (
          <p className="text-sm leading-relaxed text-suave">
            {v.secreta ? "Votação secreta: o Senado publica só quem votou, não como." : "Escolha de pessoa: a Câmara registra quem votou, mas não divulga a direção dos votos."}
            {" "}<strong className="text-texto">{inteiro(votaram)}</strong> {pessoas} votaram e {inteiro(c.naoVotou)} não votaram.
          </p>
        ) : (
          <>
            <div className="grid gap-1 pt-3">
              <BarraPlacar sim={c.sim} nao={c.nao} abst={c.abstencao + c.obstrucao} cadeiras={cadeiras} necessarios={necessarios} alto />
              {necessarios != null && (
                <span className="relative block h-4 text-[11px] text-suave">
                  <span className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${(necessarios / cadeiras) * 100}%` }}>{necessarios} necessários</span>
                </span>
              )}
            </div>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm tabular-nums">
              <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-texto" aria-hidden="true" /><strong>{inteiro(c.sim)}</strong> Sim</li>
              <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-suave" aria-hidden="true" /><strong>{inteiro(c.nao)}</strong> Não</li>
              <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-borda-forte" aria-hidden="true" /><strong>{inteiro(c.abstencao)}</strong> Abst.</li>
              {c.obstrucao > 0 && <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-borda-forte" aria-hidden="true" /><strong>{inteiro(c.obstrucao)}</strong> Obstrução</li>}
              {c.outros > 0 && <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm border border-borda" aria-hidden="true" /><strong>{inteiro(c.outros)}</strong> {v.casa === "senado" ? "presidente da sessão" : "sem direção divulgada"}</li>}
              <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm border border-borda bg-fundo" aria-hidden="true" /><strong>{inteiro(c.naoVotou)}</strong> Não votou</li>
            </ul>
          </>
        )}
        <p className="text-xs text-suave">
          De {cadeiras} cadeiras. Fonte: <a href={v.urlOficial} {...externo} className="underline underline-offset-2">votação {v.casa === "senado" ? "no Senado" : "na Câmara"} ›</a>
        </p>
      </section>

      {v.ementa && (
        <section className={`${card} grid gap-3.5`} aria-labelledby="vt-oque">
          <div>
            <h2 id="vt-oque" className="text-xl font-bold">O que era</h2>
            <p className="text-xs text-suave">Ementa oficial, sem resumo nosso</p>
          </div>
          <TextoLongo texto={v.ementa} rotulo="Ler a ementa inteira" />
          {v.proposta && (
            <p className="text-[13px] text-suave">
              {v.proposta.apresentacao && <>Apresentada em {ddmmaaaa(v.proposta.apresentacao)}</>}
              {v.proposta.apresentacao && v.proposta.situacao && " · "}
              {v.proposta.situacao && <>situação: {v.proposta.situacao}</>}
            </p>
          )}
          {termos.length > 0 && (
            <div className="grid gap-2 rounded-xl bg-fundo p-3.5">
              <h3 className="text-[13px] font-bold">Termos jurídicos da ementa</h3>
              <dl className="grid gap-1.5 text-[13px] leading-relaxed">
                {termos.map((t) => <div key={t.termo}><dt className="inline font-bold">{t.termo}:</dt> <dd className="inline text-suave">{t.explica}</dd></div>)}
              </dl>
            </div>
          )}
          <a href={v.urlOficial} {...externo} className="inline-flex h-11 w-fit items-center rounded-xl border border-borda px-4 text-[13px] font-bold text-texto no-underline hover:border-destaque">
            Texto completo {v.casa === "senado" ? "no Senado" : "na Câmara"} ›
          </a>
        </section>
      )}

      {v.caminho.length > 1 && (
        <section className={`${card} grid gap-3`} aria-labelledby="vt-caminho">
          <div>
            <h2 id="vt-caminho" className="text-xl font-bold">O caminho da proposta</h2>
            <p className="text-xs text-suave">As votações nominais desta matéria no Plenário {v.casa === "senado" ? "do Senado" : "da Câmara"}. Votações simbólicas e de comissão não entram.</p>
          </div>
          <ol className="grid">
            {v.caminho.map((x, i) => {
              const rotulo = `${rotuloVotado({ descricao: x.descricao, proposicao: v.proposicao }) || "votação"}${x.resultado ? ` · ${x.resultado}` : ""}`;
              return (
                <li key={x.id} className="relative grid grid-cols-[20px_1fr] gap-x-3 pb-3.5 last:pb-0">
                  {i < v.caminho.length - 1 && <span className="absolute top-4 bottom-0 left-[9px] w-0.5 bg-borda" aria-hidden="true" />}
                  <span className={`relative mt-1 size-5 rounded-full border-2 ${x.atual ? "border-destaque bg-destaque" : "border-borda-forte bg-card"}`} aria-hidden="true" />
                  <span className="grid gap-0.5">
                    <span className="text-xs text-suave">{ddmmaaaa(x.data)}{x.atual && <strong className="text-texto"> · esta votação</strong>}</span>
                    {x.atual
                      ? <strong className="text-sm">{rotulo}</strong>
                      : <Link href={hrefVotacao(x.id)} className="text-sm font-bold underline underline-offset-2">{rotulo}</Link>}
                    <span className="line-clamp-2 text-xs leading-relaxed text-suave">{x.descricao}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <section className={`${card} grid gap-1`} aria-labelledby="vt-partidos">
        <div className="mb-1">
          <h2 id="vt-partidos" className="text-xl font-bold">Como votou cada partido</h2>
          <p className="text-xs text-suave">Pelo partido de cada parlamentar no dia da votação, em ordem de tamanho da bancada. A orientação é a do líder do partido (ou da federação ou do bloco que o inclui).</p>
        </div>
        <ul>{v.partidos.slice(0, PRIMEIROS).map((p) => <LinhaPartido key={p.partido} p={p} v={v} />)}</ul>
        {v.partidos.length > PRIMEIROS && (
          <details className="group">
            <summary className="flex h-11 cursor-pointer list-none items-center text-[13px] font-bold text-link underline underline-offset-2 group-open:hidden">Ver os {v.partidos.length} partidos</summary>
            <ul>{v.partidos.slice(PRIMEIROS).map((p) => <LinhaPartido key={p.partido} p={p} v={v} />)}</ul>
          </details>
        )}
        {v.naoVotouSemPartido > 0 && (
          <p className="pt-2 text-xs text-suave">Mais {v.naoVotouSemPartido} deputados não votaram e não têm o partido identificado aqui: não estão no nosso registro de mandatos (como quem saiu da Câmara e não disputou 2026).</p>
        )}
        <p className="pt-2 text-xs text-suave"><Link href={hrefSecao("congresso")} className="underline underline-offset-2">Como contamos</Link></p>
      </section>
    </main>
    </>
  );
}
