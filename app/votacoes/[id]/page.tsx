import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BarraVoltar } from "@/components/BarraVoltar";
import { ChipPartido } from "@/components/ChipPartido";
import { SeloResultado, Tema } from "@/components/CartaoVotacao";
import { TextoLongo } from "@/components/TextoLongo";
import { manchete } from "@/lib/titulo";
import { NOME_FONTE, tituloDaAgencia } from "@/lib/noticias";
import { inteiro } from "@/lib/card";
import { hrefSecao } from "@/lib/glossario";
import { repo } from "@/lib/repo";
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

const VOTO_PESSOA: Record<string, string> = {
  sim: "Sim", nao: "Não", abstencao: "Abstenção", obstrucao: "Obstrução", art17: "Presidia a sessão",
  nao_informado: "Votou (não divulgado)", secreto: "Votou (secreta)", ausente: "Não votou",
};

const COR_VOTO_PESSOA: Record<string, string> = { sim: "text-[#5EE37E]", nao: "text-[#FF7A70]" };

/** Um partido (protótipo Liquid Glass): etiqueta, bancada, barra e contagem; tocando, abre quem votou como. */
function LinhaPartido({ p, v, primeiro }: { p: PartidoNaVotacao; v: VotacaoPagina; primeiro: boolean }) {
  const sem = v.secreta || v.semDirecao;
  const pessoas = v.casa === "senado" ? (p.total === 1 ? "senador" : "senadores") : p.total === 1 ? "deputado" : "deputados";
  const ori = v.secreta ? null : p.orientacao ? `${(ORIENTOU[p.orientacao] ?? `orientou ${p.orientacao}`).replace(/^./, (c) => c.toUpperCase())}${p.via ? VIA[p.via] : ""}` : "Sem orientação registrada";
  const linha = sem
    ? `${p.total - p.naoVotou} ${p.total - p.naoVotou === 1 ? "votou" : "votaram"} · ${p.naoVotou} não ${p.naoVotou === 1 ? "votou" : "votaram"}`
    : `${p.sim} Sim · ${p.nao} Não${p.abstencao ? ` · ${p.abstencao} Abst.` : ""}${p.obstrucao ? ` · ${p.obstrucao} Obstr.` : ""}${p.outros ? ` · ${p.outros} outro${p.outros > 1 ? "s" : ""}` : ""} · ${p.naoVotou} não ${p.naoVotou === 1 ? "votou" : "votaram"}`;
  const resumo = (
    <span className="grid w-full gap-2 px-4 py-3.5 text-left">
      <span className="flex w-full items-center gap-2">
        <ChipPartido sigla={p.partido} grande />
        <span className="truncate text-[13px] text-suave">· {p.total} {pessoas}</span>
        {p.membros && <span aria-hidden="true" className="ml-auto shrink-0 text-[13px] font-semibold text-link"><span className="group-open:hidden">ver quem ▾</span><span className="hidden group-open:inline">fechar ▴</span></span>}
      </span>
      {!sem && (
        <span aria-hidden="true" className="flex h-2 w-full overflow-hidden rounded bg-white/8">
          <span className="bg-verde" style={{ flex: `${p.sim} 1 0` }} />
          <span className="bg-vermelho" style={{ flex: `${p.nao} 1 0` }} />
          <span className="bg-[rgba(235,235,245,0.5)]" style={{ flex: `${p.abstencao + p.obstrucao} 1 0` }} />
          <span style={{ flex: `${p.naoVotou + p.outros} 1 0` }} />
        </span>
      )}
      <span className="text-[13px] text-suave tabular-nums">{ori ? `${ori} · ` : ""}{linha}</span>
    </span>
  );
  const borda = primeiro ? "" : "border-t border-borda";
  if (!p.membros) return <li className={borda}>{resumo}</li>;
  return (
    <li className={borda}>
      <details className="group">
        <summary className="cursor-pointer list-none hover:bg-white/5 [&::-webkit-details-marker]:hidden">{resumo}</summary>
        <ul className="grid gap-x-4 px-4 pb-3 sm:grid-cols-2">
          {p.membros.map((m) => (
            <li key={`${m.n}|${m.u}`} className="flex min-h-10 items-center justify-between gap-2 border-t border-white/8 text-sm">
              <span className="min-w-0 truncate">
                {m.i ? <Link href={`/p/${m.i}`} className="text-texto no-underline hover:underline">{m.n}</Link> : m.n}
                <span className="text-suave"> · {m.u}</span>
              </span>
              <span className={`shrink-0 font-semibold ${COR_VOTO_PESSOA[m.v] ?? "text-suave"}`}>{VOTO_PESSOA[m.v] ?? m.v}</span>
            </li>
          ))}
        </ul>
      </details>
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
  const PRIMEIROS = 8;
  const pessoas = v.casa === "senado" ? "senadores" : "deputados";
  const sem = v.secreta || v.semDirecao;
  // Título da notícia da agência da Casa sobre esta votação (E23u), quando há.
  const agencia = v.proposicao ? tituloDaAgencia(v, await repo.noticiasDeMaterias([v.proposicao], v.data)) : null;
  const extras = [
    c.obstrucao > 0 && `${inteiro(c.obstrucao)} obstrução`,
    c.outros > 0 && `${inteiro(c.outros)} ${v.casa === "senado" ? "presidente da sessão" : "sem direção divulgada"}`,
    `${inteiro(c.naoVotou)} não votaram`,
    `de ${cadeiras} cadeiras`,
  ].filter(Boolean).join(" · ");

  return (
    <>
    <BarraVoltar volta="/votacoes" rotulo="Votações" titulo={`${nomeCasa(v)} · Plenário`} />
    <main className="grid gap-4 pb-4 lg:pb-8">
      <header className="grid gap-1.5 px-1">
        <span className="text-[13px] text-suave">{dataLonga(v.data)}</span>
        <h1 className="text-[34px] leading-10 font-bold tracking-[-0.6px]">{titulo(v)}</h1>
        {/* O título que se lê de relance vem antes do tipo da matéria (pedido de 2026-11-20). */}
        {agencia
          ? <p className="grid gap-0.5"><span className="text-xl leading-[25px] font-semibold">{agencia.titulo}</span>
              <a href={agencia.url} {...externo} className="text-[13px] no-underline">Notícia da {NOME_FONTE[agencia.fonte]} ↗</a></p>
          : v.ementa && <p className="text-xl leading-[25px] font-semibold">{manchete(v.ementa)}</p>}
        {tipoPorExtenso(v.proposicao) && <span className="text-[15px] text-suave">{tipoPorExtenso(v.proposicao)}</span>}
        {v.temas && v.temas.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1.5" aria-label="Temas oficiais">{v.temas.map((t) => <Tema key={t} t={t} />)}</div>
        )}
      </header>

      <section className="vidro grid gap-2 rounded-card p-[18px]" aria-labelledby="vt-oque">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <h2 id="vt-oque" className="text-[17px] font-semibold">O que é</h2>
          <span className="text-[13px] text-suave">Ementa oficial, sem resumo nosso</span>
        </div>
        {v.ementa ? <TextoLongo texto={v.ementa} rotulo="Ler a ementa inteira" /> : <p className="text-[15px] text-suave">— A fonte não traz a ementa desta matéria.</p>}
        {v.proposta && (v.proposta.apresentacao || v.proposta.situacao) && (
          <p className="text-[13px] text-suave">
            {v.proposta.apresentacao && <>Apresentada em {ddmmaaaa(v.proposta.apresentacao)}</>}
            {v.proposta.apresentacao && v.proposta.situacao && " · "}
            {v.proposta.situacao && <>situação: {v.proposta.situacao}</>}
          </p>
        )}
        <a href={v.urlOficial} {...externo} className="inline-flex min-h-11 items-center text-[15px] font-semibold no-underline">Texto completo {naCasa(v)} ›</a>
      </section>

      <section className="vidro grid gap-3.5 rounded-[30px] px-[18px] py-5" aria-label="Resultado">
        <div className="flex items-center justify-between gap-3">
          {v.resultado ? <SeloResultado r={v.resultado} grande /> : <span className="text-[15px] font-semibold">Resultado não informado pela fonte</span>}
          {necessarios != null && !sem && <span className="text-[13px] text-suave">{inteiro(necessarios)} necessários</span>}
        </div>
        {sem ? (
          <p className="text-sm leading-relaxed text-texto/75">
            {v.secreta ? "Votação secreta: o Senado publica só quem votou, não como." : "Escolha de pessoa: a Câmara registra quem votou, mas não divulga a direção dos votos."}
            {" "}<strong className="text-texto">{inteiro(votaram)}</strong> {pessoas} votaram e {inteiro(c.naoVotou)} não votaram.
          </p>
        ) : (
          <>
            <div className="relative pt-1">
              <div role="img" aria-label={`Placar: ${c.sim} Sim, ${c.nao} Não, ${c.abstencao} abstenções, ${c.naoVotou} não votaram, de ${cadeiras} cadeiras`}
                className="flex h-[22px] overflow-hidden rounded-[11px] bg-white/8">
                <span className="bg-verde" style={{ flex: `${c.sim} 1 0` }} />
                <span className="bg-vermelho" style={{ flex: `${c.nao} 1 0` }} />
                <span className="bg-[rgba(235,235,245,0.5)]" style={{ flex: `${c.abstencao + c.obstrucao + c.outros} 1 0` }} />
                <span style={{ flex: `${c.naoVotou} 1 0` }} />
              </div>
              {necessarios != null && <span aria-hidden="true" className="absolute top-0 h-[30px] w-0.5 rounded-[1px] bg-white" style={{ left: `${(necessarios / cadeiras) * 100}%` }} />}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="grid"><span className="text-[28px] font-bold text-[#5EE37E] tabular-nums">{inteiro(c.sim)}</span><span className="text-[13px] text-suave">Sim</span></div>
              <div className="grid"><span className="text-[28px] font-bold text-[#FF7A70] tabular-nums">{inteiro(c.nao)}</span><span className="text-[13px] text-suave">Não</span></div>
              <div className="grid"><span className="text-[28px] font-bold tabular-nums">{inteiro(c.abstencao)}</span><span className="text-[13px] text-suave">Abst.</span></div>
            </div>
          </>
        )}
        <p className="text-[13px] leading-[18px] text-texto/75">
          {sem ? `De ${cadeiras} cadeiras.` : `${extras}.`} <a href={v.urlOficial} {...externo} className="no-underline">Votação {naCasa(v)} ›</a>
        </p>
        <p className="border-t border-borda pt-3 text-[13px] leading-[18px] text-texto/75">
          Votado nesse dia: {objeto ? EXPLICA_OBJETO[objeto] : "a descrição está na página oficial"}{turno ? `, ${turno}` : ""}.{regra ? ` ${regra}` : ""}
        </p>
      </section>

      <section className="grid gap-2" aria-labelledby="vt-partidos">
        <h2 id="vt-partidos" className="px-1 text-[22px] font-bold tracking-[-0.3px]">Como votou cada partido</h2>
        <p className="px-1 pb-1 text-[13px] leading-[18px] text-suave">Pelo partido de cada parlamentar no dia, em ordem de tamanho da bancada. A orientação é a do líder do partido, da federação ou do bloco.</p>
        <div className="vidro overflow-hidden rounded-card">
          <ul>{v.partidos.slice(0, PRIMEIROS).map((p, i) => <LinhaPartido key={p.partido} p={p} v={v} primeiro={i === 0} />)}</ul>
          {v.partidos.length > PRIMEIROS && (
            <details className="group/mais border-t border-borda">
              <summary className="flex min-h-12 cursor-pointer list-none items-center px-4 text-[15px] font-semibold text-link group-open/mais:hidden [&::-webkit-details-marker]:hidden">Ver os {v.partidos.length} partidos</summary>
              <ul>{v.partidos.slice(PRIMEIROS).map((p, i) => <LinhaPartido key={p.partido} p={p} v={v} primeiro={i === 0} />)}</ul>
            </details>
          )}
        </div>
        {v.naoVotouSemPartido > 0 && (
          <p className="px-1 text-xs text-suave">Mais {v.naoVotouSemPartido} deputados não votaram e não têm o partido identificado aqui: não estão no nosso registro de mandatos (como quem saiu da Câmara e não disputou 2026).</p>
        )}
        <p className="px-1"><Link href={hrefSecao("congresso")} className="text-[13px] no-underline">Como contamos</Link></p>
      </section>

      {v.caminho.length > 1 && (
        <section className="vidro grid gap-3.5 rounded-card p-[18px]" aria-labelledby="vt-caminho">
          <div className="grid gap-1">
            <h2 id="vt-caminho" className="text-[17px] font-semibold">O caminho da proposta</h2>
            <p className="text-[13px] leading-[18px] text-suave">
              As {v.caminho.length} votações nominais de {titulo(v)} no Plenário {v.casa === "senado" ? "do Senado" : "da Câmara"}, da primeira à mais recente. Votações simbólicas e de comissão não entram.
            </p>
          </div>
          <ol className="grid">
            {v.caminho.map((x, i) => {
              const rotulo = `${rotuloVotado({ descricao: x.descricao, proposicao: v.proposicao }) || "votação"}`;
              return (
                <li key={x.id} className="relative grid grid-cols-[32px_1fr] gap-x-3 pb-4">
                  <span className="absolute top-8 bottom-0 left-[15px] w-0.5 bg-white/14" aria-hidden="true" />
                  <span aria-hidden="true" className={`relative z-[1] flex size-8 items-center justify-center rounded-full text-[13px] font-bold tabular-nums ${x.atual ? "bg-destaque text-white" : "border border-white/20 bg-[#2a2b31] text-texto"}`}>{i + 1}</span>
                  <div className={`grid gap-1 rounded-2xl p-3 ${x.atual ? "border border-[rgba(64,156,255,0.5)] bg-[rgba(64,156,255,0.12)]" : "bg-white/5"}`}>
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-suave">
                      <span className="font-semibold text-texto">{i === 0 ? "1ª votação" : `${i + 1}ª votação`}</span>· {ddmmaaaa(x.data)}
                      {x.atual && <span className="rounded-full bg-destaque px-2 py-0.5 text-[11px] font-bold text-white">esta votação</span>}
                    </span>
                    <span className="text-[15px] font-semibold">{rotulo.charAt(0).toUpperCase() + rotulo.slice(1)}</span>
                    {x.resultado && <span className={`justify-self-start rounded-full border px-2 py-0.5 text-[11px] font-bold ${x.resultado === "aprovada" ? "border-verde/45 bg-verde/20 text-[#5EE37E]" : "border-vermelho/45 bg-vermelho/20 text-[#FF7A70]"}`}>{x.resultado === "aprovada" ? "Aprovada" : "Rejeitada"}</span>}
                    <span className="line-clamp-2 text-xs leading-relaxed text-suave">{x.descricao}</span>
                    {!x.atual && <Link href={hrefVotacao(x.id)} className="inline-flex min-h-9 items-center text-[13px] font-semibold no-underline">Ver esta votação ›</Link>}
                  </div>
                </li>
              );
            })}
            <li className="grid grid-cols-[32px_1fr] gap-x-3">
              <span aria-hidden="true" className="relative z-[1] flex size-8 items-center justify-center rounded-full border border-dashed border-white/30 text-texto/70">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </span>
              <div className="grid gap-1 p-3 pt-1.5">
                <span className="text-xs font-semibold text-texto">Onde está agora</span>
                <span className="text-[15px]">{v.proposta?.situacao ?? "A situação atual está na página oficial."}</span>
                <a href={v.urlOficial} {...externo} className="inline-flex min-h-9 items-center text-[13px] font-semibold no-underline">Tramitação completa {naCasa(v)} ↗</a>
              </div>
            </li>
          </ol>
        </section>
      )}
    </main>
    </>
  );
}
