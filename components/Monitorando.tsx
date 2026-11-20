"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { EventoAcompanhar, ResumoAcompanhar } from "@/lib/acompanhar";
import type { ItemBusca } from "@/lib/card";
import { alternar, marcarVistos, podarVistos, useMonitorando } from "@/lib/monitorando";
import { NOME_FONTE, type Noticia } from "@/lib/noticias";
import type { ItemPautaAutores } from "@/lib/pauta";
import { CARGOS, ELEICOES } from "@/lib/quem-votei";
import { useSantinho } from "@/lib/quem-votei-estado";
import { tipoPorExtenso } from "@/lib/votacao";
import { manchete } from "@/lib/titulo";
import { ChipPartido } from "./ChipPartido";
import { normalizar } from "@/lib/texto";
import type { TipoVoto } from "@/lib/types";
import { EmBreve } from "./EmBreve";
import { QuemVotei } from "./QuemVotei";
import { SEGMENTO, SEGMENTO_ON, SEGMENTOS, TITULO_PAGINA } from "@/lib/estilo";

const externo = { target: "_blank", rel: "noreferrer noopener" } as const;
const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
/** Crachá de quem está na lista: executivos ("executivo-sp") têm página própria. */
const hrefDe = (id: string) => id.startsWith("executivo-") ? `/executivos/${id.slice("executivo-".length)}` : `/p/${id}`;

type Carga = Record<string, ResumoAcompanhar | "erro">;

/**
 * Tela Monitorando (protótipo `Entrar`, E23e; visual do protótipo Liquid Glass, E23s): o convite ao cadastro
 * (Em breve), o santinho "Quem votei" e quem a pessoa acompanha neste aparelho, com a linha do tempo de votos,
 * projetos, leis e notícias. Conta e resumo por e-mail ainda não existem (CLAUDE.md, princípio 3).
 */
export function Monitorando() {
  // Aba no endereço (#monitorando), para o link e o "voltar" do navegador abrirem a mesma aba.
  const [aba, setAba] = useState<"quem-votei" | "monitorando">("quem-votei");
  useEffect(() => {
    const ler = () => setAba(window.location.hash === "#monitorando" ? "monitorando" : "quem-votei");
    ler(); window.addEventListener("hashchange", ler);
    return () => window.removeEventListener("hashchange", ler);
  }, []);
  const trocar = (v: "quem-votei" | "monitorando") => { setAba(v); history.replaceState(null, "", v === "monitorando" ? "#monitorando" : window.location.pathname); };
  return (
    <main className="grid gap-[18px] pb-8">
      <h1 className={`${TITULO_PAGINA} px-1`}>Monitorando</h1>
      <Cadastro />
      <div role="tablist" aria-label="Abas" className={`${SEGMENTOS} grid-cols-2`}>
        {([["quem-votei", "Quem votei"], ["monitorando", "Monitorando"]] as const).map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={aba === k} aria-controls={`mo-painel-${k}`} onClick={() => trocar(k)} className={aba === k ? SEGMENTO_ON : SEGMENTO}>{l}</button>
        ))}
      </div>
      <div id={`mo-painel-${aba}`} role="tabpanel">{aba === "quem-votei" ? <QuemVotei /> : <AbaMonitorando />}</div>
    </main>
  );
}

/**
 * Convite ao cadastro do protótipo Liquid Glass (2026-11-20). A conta ainda não existe: os dois botões abrem o
 * aviso "Em breve" e nada é pedido nem guardado (exceção ao princípio 5 aceita pelo usuário; CLAUDE.md).
 */
function Cadastro() {
  return (
    <section aria-labelledby="cad-titulo" className="vidro grid gap-3 rounded-[24px] p-4">
      <div className="flex gap-3">
        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-[13px] border border-[rgba(64,156,255,0.4)] bg-[rgba(64,156,255,0.18)] text-[#8cc4ff]">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9.5" /><circle cx="12" cy="10" r="3.2" /><path d="M6.2 18.6a6.6 6.6 0 0 1 11.6 0" /></svg>
        </span>
        <div className="grid min-w-0 gap-1">
          <h2 id="cad-titulo" className="text-[17px] font-bold">Crie seu cadastro</h2>
          <p className="text-[13px] leading-[18px] text-texto/75">Salve suas escolhas em qualquer aparelho e receba toda semana um resumo, por e-mail, do que os políticos que você monitora fizeram.</p>
        </div>
      </div>
      <div className="flex gap-2">
        <EmBreve oQue="O cadastro" className="flex h-[42px] flex-1 items-center justify-center rounded-full bg-destaque text-[15px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]">Criar cadastro</EmBreve>
        <EmBreve oQue="O login" className="vidro flex h-[42px] flex-1 items-center justify-center rounded-full text-[15px] font-semibold text-link">Já tenho conta</EmBreve>
      </div>
    </section>
  );
}

const iniciais = (n: string) => n.split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("");
/** Rosto pequeno (foto oficial ou iniciais), como os avatares do protótipo. */
function Av({ nome, foto, t, anel = false }: { nome: string; foto: string | null; t: number; anel?: boolean }) {
  const cls = `inline-flex shrink-0 items-center justify-center rounded-full border-[1.5px] border-white/22 bg-[#3A3B42] font-bold text-white ${anel ? "-mr-2 shadow-[0_0_0_2px_#2A2B31]" : ""}`;
  return foto
    // <img> de propósito: a foto vem direto da URL oficial, sem passar pela Vercel (CLAUDE.md).
    ? <img src={foto} alt="" width={t} height={t} loading="lazy" className={`${cls} object-cover object-top`} style={{ width: t, height: t }} />
    : <span aria-hidden="true" className={cls} style={{ width: t, height: t, fontSize: t * 0.32 }}>{iniciais(nome)}</span>;
}

const COR_V: Partial<Record<TipoVoto, string>> = { sim: "bg-verde/20 text-[#5EE37E]", nao: "bg-vermelho/20 text-[#FF7A70]" };
const VOTO_CURTO: Record<TipoVoto, string> = {
  sim: "Sim", nao: "Não", abstencao: "Abstenção", obstrucao: "Obstrução", art17: "Presidia", nao_informado: "Votou", secreto: "Votou (secreta)", ausente: "Não votou",
};
const SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const diaCurto = (iso: string) => `${SEMANA[new Date(`${iso.slice(0, 10)}T12:00:00Z`).getUTCDay()]}, ${ddmm(iso)}`;
const statusCor = (s: string) => s === "Aprovada" || s === "Virou norma" ? "border-verde/45 bg-verde/20 text-[#5EE37E]" : s === "Rejeitada" ? "border-vermelho/45 bg-vermelho/20 text-[#FF7A70]" : "border-white/20 bg-white/10 text-texto/85";

/** Um item da linha do tempo: Casa e data no trilho, o cartão com a matéria e quem votou (ou é autor). */
interface ItemLinha {
  chave: string; data: string; quando: string; casa: string; ref: string; titulo: string; sub?: string; status?: string;
  rotuloQuem: string; quem: { id: string; nome: string; foto: string | null; v: string; cor?: string }[];
  href: string; externo: boolean; cta: string; novo: boolean;
}

function Linha({ x }: { x: ItemLinha }) {
  const cta = <>{x.cta}<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg></>;
  const ctaCls = "flex min-h-11 items-center justify-between border-t border-borda px-4 text-sm font-semibold no-underline";
  return (
    <li className="relative grid gap-2">
      <span aria-hidden="true" className="absolute top-1 -left-[25px] size-3 rounded-full border-2 border-[rgba(235,235,245,0.7)] bg-fundo" />
      <span className="flex items-center gap-2 text-xs font-semibold text-texto/75">
        <span className="inline-flex h-[22px] items-center rounded-full border border-white/18 bg-white/10 px-[9px] text-[11px] font-bold tracking-[0.3px]">{x.casa}</span>{x.quando}
        {x.novo && <span className="text-[11px] font-bold text-link">NOVO</span>}
      </span>
      <article className="vidro overflow-hidden rounded-[22px]">
        <div className="grid gap-2 px-4 py-3.5">
          <span className="text-xs font-bold text-link">{x.ref}</span>
          <h3 className="line-clamp-3 text-[15px] leading-5 font-semibold">{x.titulo}</h3>
          {x.sub && <span className="line-clamp-2 text-xs leading-4 text-suave">{x.sub}</span>}
          {x.status && <span className={`inline-flex h-[22px] items-center justify-self-start rounded-full border px-[9px] text-[11px] font-bold ${statusCor(x.status)}`}>{x.status}</span>}
          <div className="mt-0.5 grid gap-1.5 border-t border-white/10 pt-2.5">
            <span className="text-[11px] font-bold tracking-[0.6px] text-texto/60">{x.rotuloQuem}</span>
            {x.quem.map((w) => (
              <span key={w.id} className="flex items-center gap-2">
                <Av nome={w.nome} foto={w.foto} t={28} />
                <Link href={hrefDe(w.id)} className="min-w-0 flex-1 truncate text-xs font-semibold text-texto no-underline">{w.nome}</Link>
                <span className={`inline-flex h-5 items-center rounded-md px-[7px] text-[11px] font-bold whitespace-nowrap ${w.cor ?? "bg-white/12 text-texto"}`}>{w.v}</span>
              </span>
            ))}
          </div>
        </div>
        {x.externo ? <a href={x.href} {...externo} className={ctaCls}>{cta}</a> : <Link href={x.href} className={ctaCls}>{cta}</Link>}
      </article>
    </li>
  );
}

type AbaFeed = "votos" | "projetos" | "leis" | "noticias";

/** Aba "Monitorando" (protótipo Liquid Glass): quem a pessoa monitora e a linha do tempo de votos, projetos, leis e notícias. */
function AbaMonitorando() {
  const e = useMonitorando();
  const santinho = useSantinho(ELEICOES[0].ano);
  const [carga, setCarga] = useState<Carga>({});
  const [noticias, setNoticias] = useState<Record<string, Noticia[]>>({});
  const [pauta, setPauta] = useState<ItemPautaAutores[] | null>(null);
  const [aba, setAba] = useState<AbaFeed>("votos");
  const [lista, setLista] = useState(false);
  const [adicionar, setAdicionar] = useState(false);
  const [lim, setLim] = useState(12);
  const ids = e.pessoas.map((p) => p.id).join(",");

  useEffect(() => {
    for (const p of e.pessoas) {
      if (!carga[p.id]) fetch(`/dados/acompanhar/${p.id}`).then(async (r) => {
        const v: ResumoAcompanhar | "erro" = r.ok ? await r.json() as ResumoAcompanhar : "erro";
        setCarga((c) => ({ ...c, [p.id]: v }));
      }).catch(() => setCarga((c) => ({ ...c, [p.id]: "erro" })));
      if (!noticias[p.id] && !p.id.startsWith("executivo-")) fetch(`/dados/noticias/${p.id}`).then(async (r) => {
        const v = r.ok ? await r.json() as Noticia[] : [];
        setNoticias((a) => ({ ...a, [p.id]: v }));
      }).catch(() => setNoticias((a) => ({ ...a, [p.id]: [] })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);
  useEffect(() => { fetch("/dados/pauta").then(async (r) => setPauta(r.ok ? await r.json() as ItemPautaAutores[] : [])).catch(() => setPauta([])); }, []);

  // Primeira carga de quem acabou de entrar: o que já existia não é novidade.
  useEffect(() => {
    const novos = e.pessoas.filter((p) => !p.base && carga[p.id] && carga[p.id] !== "erro");
    if (novos.length) marcarVistos(novos.flatMap((p) => (carga[p.id] as ResumoAcompanhar).eventos.map((x) => x.chave)), novos.map((p) => p.id));
    const prontos = e.pessoas.every((p) => carga[p.id] && carga[p.id] !== "erro");
    if (prontos && e.pessoas.length && e.vistos.length) {
      const atuais = new Set(e.pessoas.flatMap((p) => (carga[p.id] as ResumoAcompanhar).eventos.map((x) => x.chave)));
      if (e.vistos.some((v) => !atuais.has(v))) podarVistos(atuais);
    }
  }, [carga, e]);

  const vistos = useMemo(() => new Set(e.vistos), [e.vistos]);
  const votados = new Set(CARGOS.flatMap((c) => santinho.escolhas[c.chave] ?? []).map((x) => x.id));
  const resumos = e.pessoas.flatMap((p) => { const r = carga[p.id]; return r && r !== "erro" ? [r] : []; });
  const porId = new Map(resumos.map((r) => [r.id, r]));
  const carregando = e.pessoas.some((p) => !carga[p.id]);

  // Agrupa por matéria: a mesma votação (ou proposta) de duas pessoas monitoradas vira um cartão com as duas.
  const grupos = new Map<string, { ev: EventoAcompanhar; quem: { r: ResumoAcompanhar; ev: EventoAcompanhar }[] }>();
  for (const r of resumos) for (const ev of r.eventos) {
    const g = grupos.get(ev.chave) ?? { ev, quem: [] };
    g.quem.push({ r, ev }); grupos.set(ev.chave, g);
  }
  const casaDe = (c?: string) => c === "senado" ? "SENADO" : "CÂMARA";
  const itens: Record<AbaFeed, ItemLinha[]> = { votos: [], projetos: [], leis: [], noticias: [] };
  for (const { ev, quem } of grupos.values()) {
    const novo = quem.some((q) => e.pessoas.find((p) => p.id === q.r.id)?.base) && !vistos.has(ev.chave);
    if (ev.tipo === "voto") {
      itens.votos.push({
        chave: ev.chave, data: ev.data, quando: diaCurto(ev.data), casa: casaDe(ev.casa), novo,
        ref: [ev.materia, tipoPorExtenso(ev.materia ?? null)].filter(Boolean).join(" · ") || "Votação nominal",
        titulo: manchete(ev.titulo) || ev.titulo, sub: ev.votado ? `Votado: ${ev.votado}` : undefined,
        status: ev.resultado === "aprovada" ? "Aprovada" : ev.resultado === "rejeitada" ? "Rejeitada" : undefined,
        rotuloQuem: "COMO VOTARAM", quem: quem.map((q) => ({ id: q.r.id, nome: q.r.nomeUrna, foto: q.r.fotoUrl, v: VOTO_CURTO[q.ev.voto!], cor: COR_V[q.ev.voto!] })),
        href: ev.href, externo: ev.externo, cta: "Ver votação",
      });
    } else {
      const norma = !!ev.virouNorma;
      (norma ? itens.leis : itens.projetos).push({
        chave: ev.chave, data: ev.data, quando: ev.data.slice(0, 4), casa: casaDe(ev.casa), novo,
        ref: [ev.materia, tipoPorExtenso(ev.materia ?? null)].filter(Boolean).join(" · "), titulo: manchete(ev.titulo) || ev.titulo,
        sub: norma ? "Transformada em norma jurídica" : `Apresentada em ${ddmm(ev.data)}`,
        status: norma ? "Virou norma" : "Em tramitação",
        rotuloQuem: "AUTORIA", quem: quem.map((q) => ({ id: q.r.id, nome: q.r.nomeUrna, foto: q.r.fotoUrl, v: q.ev.primeiroAutor ? "Primeiro autor" : "Coautor" })),
        href: ev.href, externo: true, cta: norma ? "Ver norma" : "Ver projeto",
      });
    }
  }
  // Projetos de quem a pessoa monitora que estão na pauta do Plenário agora (coleta diária).
  for (const x of pauta ?? []) {
    const deles = x.autores.filter((a) => porId.has(a));
    if (!deles.length) continue;
    itens.projetos.push({
      chave: `pauta:${x.id}`, data: x.data, quando: `na pauta · ${diaCurto(x.data)}`, casa: casaDe(x.casa), novo: false,
      ref: [x.materia, tipoPorExtenso(x.materia)].filter(Boolean).join(" · "), titulo: manchete(x.relacionada ? x.ementaRelacionada ?? x.ementa : x.ementa) || x.materia,
      sub: x.apreciacao ?? undefined, status: "Na pauta",
      rotuloQuem: "AUTORIA", quem: deles.map((a) => ({ id: a, nome: porId.get(a)!.nomeUrna, foto: porId.get(a)!.fotoUrl, v: "Autor" })),
      href: x.urlOficial, externo: true, cta: "Ver na pauta",
    });
  }
  // A mesma matéria pode citar duas pessoas monitoradas: um cartão só.
  for (const n of [...new Map(e.pessoas.flatMap((p) => noticias[p.id] ?? []).map((n) => [n.id, n])).values()]) {
    const deles = n.politicos.filter((p) => porId.has(p));
    if (!deles.length) continue;
    itens.noticias.push({
      chave: `n:${n.id}`, data: n.data, quando: diaCurto(new Date(n.data).toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" })), casa: casaDe(n.fonte), novo: false,
      ref: NOME_FONTE[n.fonte], titulo: n.titulo, rotuloQuem: "CITA",
      quem: deles.map((a) => ({ id: a, nome: porId.get(a)!.nomeUrna, foto: porId.get(a)!.fotoUrl, v: "Citado" })),
      href: n.url, externo: true, cta: "Ler na agência",
    });
  }
  for (const k of Object.keys(itens) as AbaFeed[]) itens[k].sort((a, b) => b.data.localeCompare(a.data) || a.chave.localeCompare(b.chave));
  const novos = [...grupos.values()].filter((g) => !vistos.has(g.ev.chave)).map((g) => g.ev.chave);
  const feed = itens[aba];
  const VAZIO: Record<AbaFeed, string> = {
    votos: "Nenhum voto de quem você monitora nas votações nominais recentes. Quem foi eleito pela primeira vez em 2026 começa a votar em fevereiro de 2027.",
    projetos: "Nenhum projeto recente de quem você monitora.",
    leis: "Nenhum projeto recente de quem você monitora virou norma.",
    noticias: "Nenhuma matéria recente da Agência Câmara ou da Agência Senado cita quem você monitora.",
  };

  return (
    <div className="grid gap-[18px]">
      <section aria-labelledby="mo-titulo" className="vidro-forte overflow-hidden rounded-card">
        <div className="flex items-center gap-3 p-4">
          <div className="grid min-w-0 flex-1 gap-2">
            <h2 id="mo-titulo" className="text-lg font-bold">{e.pessoas.length} {e.pessoas.length === 1 ? "político monitorado" : "políticos monitorados"}</h2>
            {e.pessoas.length > 0 && (
              <span aria-hidden="true" className="flex">
                {e.pessoas.slice(0, 8).map((p) => { const r = porId.get(p.id); return <Av key={p.id} nome={p.nome} foto={r?.fotoUrl ?? null} t={34} anel />; })}
              </span>
            )}
          </div>
          <button type="button" aria-expanded={lista} onClick={() => setLista(!lista)}
            className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full border border-white/16 bg-white/8 px-3 text-[13px] font-semibold text-texto">
            {lista ? "Ocultar" : "Ver lista"}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={lista ? "rotate-180" : ""}><path d="m6 9 6 6 6-6" /></svg>
          </button>
        </div>
        {(lista || e.pessoas.length === 0) && (
          <div className="grid px-4 pb-4">
            {e.pessoas.length === 0 && <p className="pb-2 text-[15px] text-suave">Você ainda não monitora ninguém. Toque em “+ Monitorar” num crachá ou adicione abaixo.</p>}
            {e.pessoas.map((p) => {
              const r = porId.get(p.id);
              return (
                <div key={p.id} className="flex items-center gap-2.5 border-t border-borda py-2.5">
                  <Av nome={p.nome} foto={r?.fotoUrl ?? null} t={40} />
                  <Link href={r?.href ?? hrefDe(p.id)} className="grid min-w-0 flex-1 gap-1 text-texto no-underline">
                    <span className="truncate text-[13px] font-bold">{r?.nomeUrna ?? p.nome}</span>
                    {r && <span className="flex min-w-0 items-center gap-1.5"><ChipPartido sigla={r.partidoUf.replace(/-[A-Z]{2}$/, "")} /><span className="truncate text-xs text-suave">{r.cargo}</span></span>}
                  </Link>
                  {votados.has(p.id)
                    ? <button type="button" disabled className="h-8 shrink-0 cursor-not-allowed rounded-full border border-white/10 bg-white/4 px-2.5 text-[11px] font-semibold text-texto/55">Votou na última eleição</button>
                    : <button type="button" onClick={() => alternar(p.id, p.nome)} className="h-8 shrink-0 rounded-full border border-[rgba(255,105,97,0.4)] bg-[rgba(255,69,58,0.12)] px-2.5 text-[11px] font-semibold text-[#FF8A82]">Parar de monitorar</button>}
                </div>
              );
            })}
            {adicionar
              ? <div className="mt-1.5"><Adicionar ja={new Set(e.pessoas.map((p) => p.id))} /></div>
              : <button type="button" onClick={() => setAdicionar(true)} className="mt-1.5 flex min-h-12 items-center justify-center gap-1.5 rounded-2xl border-[1.5px] border-dashed border-[rgba(64,156,255,0.6)] bg-[rgba(64,156,255,0.08)] text-[15px] font-semibold text-[#8CC4FF] hover:bg-[rgba(64,156,255,0.16)]">+ Adicionar políticos</button>}
          </div>
        )}
      </section>

      {e.pessoas.length > 0 && <>
        <div role="tablist" aria-label="Atividade" className="vidro flex gap-0.5 rounded-[21px] p-1">
          {([["votos", "Votos"], ["projetos", "Projetos"], ["leis", "Leis"], ["noticias", "Notícias"]] as const).map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={aba === k} onClick={() => { setAba(k); setLim(12); }}
              className={`h-[34px] flex-1 rounded-[17px] text-sm font-semibold ${aba === k ? "bg-segmento text-texto" : "text-[rgba(235,235,245,0.75)] hover:text-texto"}`}>{l}</button>
          ))}
        </div>
        {novos.length > 0 && (
          <p className="flex flex-wrap items-center justify-between gap-2 px-1 text-[13px] text-suave">
            {novos.length} {novos.length === 1 ? "novidade" : "novidades"} desde a última visita
            <button type="button" onClick={() => marcarVistos(novos)} className="font-semibold text-link">Marcar tudo como visto</button>
          </p>
        )}
        {carregando && feed.length === 0 ? <p className="px-1 text-sm text-suave">Carregando…</p> : feed.length === 0 ? (
          <p className="px-1 text-[15px] text-suave">{VAZIO[aba]}</p>
        ) : (
          <ol className="relative grid gap-[18px] pl-7">
            <span aria-hidden="true" className="absolute top-2 bottom-2 left-2 w-0.5 rounded-[1px] bg-white/14" />
            {feed.slice(0, lim).map((x) => <Linha key={x.chave} x={x} />)}
          </ol>
        )}
        {feed.length > lim && <button type="button" onClick={() => setLim(lim + 20)} className="h-9 justify-self-center rounded-full border border-white/16 bg-white/10 px-4 text-[15px] font-semibold text-link">Ver mais ({feed.length - lim})</button>}
        <p className="px-1 text-xs text-suave">As votações e propostas mais recentes de cada pessoa, como nos crachás; notícias só das agências oficiais da Câmara e do Senado. A lista fica só neste navegador.</p>
      </>}
    </div>
  );
}

/** "+ Monitorar mais alguém": busca pelo índice de nomes (/dados/politicos, CDN, baixado ao tocar). */
function Adicionar({ ja }: { ja: Set<string> }) {
  const [q, setQ] = useState("");
  const [indice, setIndice] = useState<ItemBusca[] | null>(null);
  const pedido = useRef<Promise<void> | null>(null);
  const carregar = () => { pedido.current ??= fetch("/dados/politicos").then(async (r) => { if (r.ok) setIndice(await r.json() as ItemBusca[]); }).catch(() => { pedido.current = null; }); };
  const t = normalizar(q);
  const sugestoes = useMemo(() => {
    if (t.length < 3 || !indice) return [];
    const termos = t.split(" ");
    return indice.filter((p) => !ja.has(p.id) && termos.every((x) => p.busca.split(" ").some((w) => w.startsWith(x)))).slice(0, 6);
  }, [t, indice, ja]);
  return (
    <div className="relative w-full min-w-[260px] sm:w-auto sm:flex-[0_1_420px]">
      <label htmlFor="mo-add" className="sr-only">Monitorar mais alguém</label>
      <input id="mo-add" type="search" autoComplete="off" value={q} onFocus={carregar} onChange={(x) => { setQ(x.target.value); carregar(); }}
        placeholder="+ Monitorar mais alguém (digite o nome)" className="h-11 w-full rounded-xl bg-preench px-3.5 text-base text-texto outline-none placeholder:text-suave focus:ring-2 focus:ring-destaque/40 sm:text-[15px]" />
      {sugestoes.length > 0 && (
        <div className="absolute inset-x-0 top-12 z-10 overflow-hidden rounded-[22px] vidro-forte bg-[rgba(44,45,52,0.94)]">
          {sugestoes.map((p) => (
            <button key={p.id} type="button" onClick={() => { alternar(p.id, p.nomeUrna); setQ(""); }} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm hover:bg-preench-forte">
              {p.fotoUrl ? <img src={p.fotoUrl} alt="" width={32} height={32} loading="lazy" className="size-8 shrink-0 rounded-full bg-preench object-cover object-top" /> : <span aria-hidden="true" className="size-8 shrink-0 rounded-full bg-preench" />}
              <span><strong>{p.nomeUrna}</strong> <span className="text-xs text-suave">{p.cargo} · {p.partidoUf}</span></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
