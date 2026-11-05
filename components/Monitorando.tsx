"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { EventoAcompanhar, ResumoAcompanhar } from "@/lib/acompanhar";
import type { ItemBusca } from "@/lib/card";
import { alternar, limpar, marcarVistos, podarVistos, useMonitorando } from "@/lib/monitorando";
import { corPartido } from "@/lib/partidos";
import { normalizar } from "@/lib/texto";
import type { TipoVoto } from "@/lib/types";

const card = "rounded-card border border-borda bg-card p-[18px] shadow-card sm:p-[22px]";
const chip = "inline-flex h-9 items-center rounded-xl border border-borda bg-card px-4 text-xs font-bold whitespace-nowrap hover:border-destaque";
const chipOn = "inline-flex h-9 items-center rounded-xl border border-destaque bg-destaque px-4 text-xs font-bold whitespace-nowrap text-destaque-texto";
const externo = { target: "_blank", rel: "noreferrer noopener" } as const;
const VOTO: Record<TipoVoto, string> = {
  sim: "Votou Sim", nao: "Votou Não", abstencao: "Absteve-se", obstrucao: "Votou obstrução", art17: "Presidia a sessão",
  nao_informado: "Votou (direção não divulgada)", secreto: "Votou (votação secreta)", ausente: "Não registrou voto",
};
const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const pct = (v: number) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

type Carga = Record<string, ResumoAcompanhar | "erro">;

/**
 * Tela Monitorando (protótipo `Entrar`, E23e), só com o que cabe: quem a pessoa acompanha neste
 * aparelho, os números do crachá e o que apareceu desde a última visita (votos e propostas). Sem
 * Entrar, conta, e-mail, alertas ou resumo por e-mail (CLAUDE.md, princípio 3).
 */
export function Monitorando() {
  const e = useMonitorando();
  const [carga, setCarga] = useState<Carga>({});
  const [tipo, setTipo] = useState<"todos" | "voto" | "proposta">("todos");
  const [quem, setQuem] = useState("todos");
  const [lim, setLim] = useState(12);
  const ids = e.pessoas.map((p) => p.id).join(",");

  useEffect(() => {
    for (const p of e.pessoas) {
      if (carga[p.id]) continue;
      fetch(`/dados/acompanhar/${p.id}`).then(async (r) => {
        const v: ResumoAcompanhar | "erro" = r.ok ? await r.json() as ResumoAcompanhar : "erro";
        setCarga((c) => ({ ...c, [p.id]: v }));
      }).catch(() => setCarga((c) => ({ ...c, [p.id]: "erro" })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

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
  const resumos = e.pessoas.flatMap((p) => { const r = carga[p.id]; return r && r !== "erro" && p.base ? [r] : []; });
  const eventos = resumos.flatMap((r) => r.eventos.map((x) => ({ ...x, quem: r, novo: !vistos.has(x.chave) })))
    .sort((a, b) => b.data.localeCompare(a.data) || a.quem.nomeUrna.localeCompare(b.quem.nomeUrna, "pt-BR"));
  const novos = eventos.filter((x) => x.novo);
  const contagem = (t: EventoAcompanhar["tipo"]) => {
    const l = novos.filter((x) => x.tipo === t);
    return { n: l.length, de: [...new Set(l.map((x) => x.quem.nomeUrna))] };
  };
  const feed = eventos.filter((x) => (tipo === "todos" || x.tipo === tipo) && (quem === "todos" || x.quem.id === quem));
  const carregando = e.pessoas.some((p) => !carga[p.id]);

  return (
    <main className="grid gap-6 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[13px] text-suave">Neste aparelho</p>
          <h1 className="mt-1 text-[32px] leading-none font-bold">Monitorando</h1>
        </div>
        {e.pessoas.length > 0 && <button type="button" onClick={() => { if (window.confirm("Parar de monitorar todo mundo neste aparelho?")) limpar(); }} className={chip}>Limpar a lista</button>}
      </div>
      <p className="rounded-xl bg-fundo p-3.5 text-sm leading-relaxed text-suave">
        A lista fica só neste navegador: sem conta, sem e-mail e sem nada guardado no nosso servidor. Se você limpar os dados do
        navegador ou usar uma aba anônima, ela some. O Fiscaliza não manda avisos.
      </p>

      {e.pessoas.length > 0 && (
        <section className={`${card} grid gap-3.5 border-link`} aria-labelledby="mo-novo">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="mo-novo" className="text-[22px] font-bold">O que aconteceu desde a última visita</h2>
            {novos.length > 0 && <button type="button" onClick={() => marcarVistos(novos.map((x) => x.chave))} className={chip}>Marcar tudo como visto</button>}
          </div>
          {carregando ? <p className="text-sm text-suave">Carregando…</p> : novos.length === 0 ? (
            <p className="text-[15px] text-suave">Você está em dia. Votos e propostas novos de quem você monitora aparecem aqui primeiro, depois da coleta diária nas fontes oficiais.</p>
          ) : (
            <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
              {([["voto", "voto novo", "votos novos"], ["proposta", "proposta nova", "propostas novas"]] as const).map(([t, um, varios]) => {
                const c = contagem(t);
                return (
                  <button key={t} type="button" aria-pressed={tipo === t} onClick={() => setTipo(tipo === t ? "todos" : t)}
                    className={`grid gap-1 rounded-xl border bg-card p-3 text-left ${tipo === t ? "border-link" : "border-borda"}`}>
                    <span className="text-[28px] leading-none font-bold tabular-nums">{c.n}</span>
                    <strong className="text-sm">{c.n === 1 ? um : varios}</strong>
                    <span className="text-xs text-suave">{c.de.length ? `de ${c.de.join(", ")}` : "nada novo"}</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      <section className="grid gap-3" aria-labelledby="mo-quem">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="mo-quem" className="text-xl font-bold">Quem você monitora ({e.pessoas.length})</h2>
          <Adicionar ja={new Set(e.pessoas.map((p) => p.id))} />
        </div>
        {e.pessoas.length === 0 && (
          <p className="text-[15px] text-suave">Você ainda não monitora ninguém. Digite um nome acima ou toque em “+ Monitorar” num crachá ou na <Link href="/me-representa" className="underline underline-offset-2">Me representa</Link>.</p>
        )}
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(360px,100%),1fr))]">
          {e.pessoas.map((p) => {
            const r = carga[p.id];
            const n = r && r !== "erro" && p.base ? r.eventos.filter((x) => !vistos.has(x.chave)).length : 0;
            return (
              <article key={p.id} className={`${card} grid content-start gap-3`}>
                {r === "erro" ? (
                  <p className="text-sm text-suave">Não deu para carregar {p.nome} agora. <Link href={`/p/${p.id}`} className="underline underline-offset-2">Abrir o crachá ›</Link></p>
                ) : !r ? (
                  <p className="text-sm text-suave">Carregando {p.nome}…</p>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      {r.fotoUrl
                        // <img> de propósito: a foto vem direto da URL oficial, sem passar pela Vercel (CLAUDE.md).
                        ? <img src={r.fotoUrl} alt="" width={48} height={48} loading="lazy" className="size-12 shrink-0 rounded-full bg-fundo object-cover object-top" />
                        : <span aria-hidden="true" className="size-12 shrink-0 rounded-full bg-fundo" />}
                      <Link href={`/p/${r.id}`} className="grid min-w-0 flex-1 text-texto no-underline">
                        <strong className="truncate text-base">{r.nomeUrna}</strong>
                        <span className="inline-flex items-center gap-1 text-xs text-suave">
                          {r.cargo} · <span aria-hidden="true" className="size-2 rounded-full" style={{ background: corPartido(r.partidoUf.slice(0, -3)) }} />{r.partidoUf}
                        </span>
                      </Link>
                      {n > 0 && <span className="shrink-0 rounded-full bg-destaque px-2.5 py-1 text-xs font-bold whitespace-nowrap text-destaque-texto">{plural(n, "novidade", "novidades")}</span>}
                    </div>
                    <dl className="grid text-[13px]">
                      <div className="flex justify-between gap-2.5 border-t border-borda py-2">
                        <dt className="text-suave">Participou das votações</dt>
                        <dd className="text-right">{r.participacao?.percentual != null
                          ? <><strong>{pct(r.participacao.percentual)}</strong>{r.participacao.mediaCasa != null && <span className="text-suave"> · média da Casa {pct(r.participacao.mediaCasa)}</span>}</>
                          : <span className="text-suave">— sem mandato no período</span>}</dd>
                      </div>
                      <div className="flex justify-between gap-2.5 border-t border-borda py-2">
                        <dt className="text-suave">Votou com o partido</dt>
                        <dd className="text-right">{r.comPartido ? <><strong>{pct(r.comPartido.percentual)}</strong><span className="text-suave"> · em {r.comPartido.total} votações</span></> : <span className="text-suave">— poucas votações para um percentual</span>}</dd>
                      </div>
                    </dl>
                    <div className="flex flex-wrap justify-between gap-2.5 border-t border-borda pt-2.5">
                      <Link href={`/p/${r.id}`} className="text-sm font-bold">Abrir crachá ›</Link>
                      <button type="button" onClick={() => alternar(p.id, p.nome)} className="text-[13px] text-suave underline underline-offset-2">Parar de monitorar</button>
                    </div>
                  </>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {resumos.length > 0 && (
        <section className="grid gap-3" aria-labelledby="mo-feed">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="mo-feed" className="text-xl font-bold">O que aconteceu</h2>
            <div className="flex flex-wrap items-center gap-1.5">
              <select value={quem} onChange={(x) => { setQuem(x.target.value); setLim(12); }} aria-label="Pessoa" className="h-9 rounded-xl border border-borda bg-card px-2.5 text-base sm:text-xs">
                <option value="todos">Todas as pessoas</option>
                {resumos.map((r) => <option key={r.id} value={r.id}>{r.nomeUrna}</option>)}
              </select>
              {([["todos", "Tudo"], ["voto", "Votos"], ["proposta", "Propostas"]] as const).map(([k, l]) => (
                <button key={k} type="button" aria-pressed={tipo === k} onClick={() => { setTipo(k); setLim(12); }} className={tipo === k ? chipOn : chip}>{l}</button>
              ))}
            </div>
          </div>
          <p className="text-xs text-suave">As 10 votações mais recentes e as propostas mais recentes de cada pessoa, como nos crachás.</p>
          <ul className={`${card} grid py-1`}>
            {feed.slice(0, lim).map((x) => (
              <li key={`${x.quem.id}|${x.chave}`} className="flex gap-3 border-b border-borda py-3 last:border-b-0">
                <span className="grid w-[86px] shrink-0 content-start gap-1">
                  <span className="text-xs text-suave tabular-nums">{ddmm(x.data)}</span>
                  <span className={`w-fit rounded-md px-1.5 py-0.5 text-[11px] font-bold ${x.tipo === "voto" ? "bg-link/15 text-link" : "bg-destaque/25 text-texto"}`}>{x.tipo === "voto" ? "voto" : "proposta"}</span>
                </span>
                <span className="grid min-w-0 flex-1 gap-0.5 text-sm">
                  <Link href={`/p/${x.quem.id}`} className="font-bold text-texto no-underline">{x.quem.nomeUrna}</Link>
                  <span className="font-bold">{x.tipo === "voto" ? `${VOTO[x.voto!]}${x.orientacao ? ` (${x.orientacao})` : ""}` : `Apresentou ${x.materia}`}</span>
                  {x.externo
                    ? <a href={x.href} {...externo} className="line-clamp-2 text-[13px] text-suave">{x.titulo} ↗</a>
                    : <Link href={x.href} className="line-clamp-2 text-[13px] text-suave">{x.tipo === "voto" && x.materia ? `${x.materia} · ` : ""}{x.titulo}</Link>}
                </span>
                {x.novo && <span className="shrink-0 self-start text-[11px] font-bold tracking-wider text-link">NOVO</span>}
              </li>
            ))}
            {feed.length === 0 && <li className="py-3 text-sm text-suave">Nada com esses filtros.</li>}
          </ul>
          {feed.length > lim && <button type="button" onClick={() => setLim(lim + 20)} className={`${chip} justify-self-start`}>Ver mais ({feed.length - lim})</button>}
        </section>
      )}
    </main>
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
        placeholder="+ Monitorar mais alguém (digite o nome)" className="h-11 w-full rounded-xl border border-borda bg-card px-3.5 text-base outline-none focus:border-link sm:text-sm" />
      {sugestoes.length > 0 && (
        <div className="absolute inset-x-0 top-12 z-10 overflow-hidden rounded-xl border border-borda bg-card shadow-xl">
          {sugestoes.map((p) => (
            <button key={p.id} type="button" onClick={() => { alternar(p.id, p.nomeUrna); setQ(""); }} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm hover:bg-fundo">
              {p.fotoUrl ? <img src={p.fotoUrl} alt="" width={32} height={32} loading="lazy" className="size-8 shrink-0 rounded-full bg-fundo object-cover object-top" /> : <span aria-hidden="true" className="size-8 shrink-0 rounded-full bg-fundo" />}
              <span><strong>{p.nomeUrna}</strong> <span className="text-xs text-suave">{p.cargo} · {p.partidoUf}</span></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
