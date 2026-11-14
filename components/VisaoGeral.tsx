"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MunicipioJson } from "@/app/dados/municipios/route";
import { corPartido } from "@/lib/congresso";
import { APAGADO } from "@/lib/mapa-brasil";
import { NOME_UF, REGIOES, regiaoDe, ufComArtigo } from "@/lib/regioes";
import { normalizar } from "@/lib/texto";
import type { Executivo, PessoaNoCargo, VisaoDados } from "@/lib/visao";
import { BotaoMonitorar, classeMonitorar } from "./BotaoMonitorar";
import { MapaBrasil } from "./MapaBrasil";

const POR_PAGINA = 24;

const iniciais = (n: string) => n.split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("");
const fundoPartido = (partido: string, cores: string[]) => `color-mix(in srgb, ${corPartido(partido)} 22%, transparent)`;

function Foto({ p, tamanho, classe }: { p: PessoaNoCargo; tamanho: number; classe?: string }) {
  const dim = classe ? undefined : { width: tamanho, height: tamanho };
  return p.fotoUrl
    // <img> de propósito: a foto vem direto da URL oficial, sem passar pela Vercel (CLAUDE.md).
    ? <img src={p.fotoUrl} alt="" width={tamanho} height={tamanho} loading="lazy" decoding="async" className={`shrink-0 rounded-full bg-fundo object-cover object-top ${classe ?? ""}`} style={dim} />
    : <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center rounded-full bg-fundo text-sm font-bold ${classe ?? ""}`} style={dim}>{iniciais(p.nomeUrna)}</span>;
}

function SelecaoPartido({ partido, cores }: { partido: string; cores: string[] }) {
  return <span className="inline-block rounded-lg px-2.5 py-0.5 text-[11px] font-bold" style={{ background: fundoPartido(partido, cores) }}>{partido}</span>;
}

/** Botão do estilo do protótipo (borda, raio 12). */
const btn = "inline-flex h-9 items-center rounded-xl border border-borda bg-card px-3.5 text-xs font-bold hover:border-destaque";
const btnOn = "inline-flex h-9 items-center rounded-xl border border-destaque bg-destaque px-3.5 text-xs font-bold text-destaque-texto";

/** Presidente ou governador eleito em 2026 (TSE): sem crachá ainda, o cartão não abre nada. */
function CartaoExecutivo({ e }: { e: Executivo }) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-1.5 py-2">
      {e.fotoUrl
        // <img> de propósito: a foto vem direto da URL oficial do TSE, sem passar pela Vercel (CLAUDE.md).
        ? <img src={e.fotoUrl} alt="" width={40} height={40} loading="lazy" className="size-10 shrink-0 rounded-full bg-fundo object-cover object-top" />
        : <span aria-hidden="true" className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-fundo text-sm font-bold">{iniciais(e.nomeUrna)}</span>}
      <span className="grid flex-1">
        <strong className="text-[13px]">{e.nomeUrna}</strong>
        <span className="text-xs text-suave">{e.cargo} eleit{e.feminino ? "a" : "o"} em 2026 · posse em 1º/1/2027</span>
      </span>
      <SelecaoPartido partido={e.partido} cores={[]} />
    </div>
  );
}

export function VisaoGeral({ d }: { d: VisaoDados }) {
  const [reg, setReg] = useState("");
  const [uf, setUf] = useState("");
  const [cidade, setCidade] = useState<{ nome: string; uf: string; ibge: number } | null>(null);
  const [cq, setCq] = useState("");
  const [municipios, setMunicipios] = useState<MunicipioJson[] | null>(null);
  const pedido = useRef<Promise<MunicipioJson[]> | null>(null);
  const [lim, setLim] = useState(POR_PAGINA);
  const listaRef = useRef<HTMLDivElement>(null);

  /** Lista das 5.571 cidades (~45 KB comprimida): baixada na primeira vez que a pessoa toca na busca. */
  const carregarMunicipios = () => (pedido.current ??= fetch("/dados/municipios")
    .then(async (r) => { const ms = r.ok ? await r.json() as MunicipioJson[] : []; setMunicipios(ms); return ms; })
    .catch(() => { pedido.current = null; return []; }));

  /** O lugar fica na URL (?uf=SP ou ?cidade=<IBGE>), para compartilhar; os links antigos da Me representa caem aqui. */
  function marcarUrl(u: string, ibge?: number) {
    const url = new URL(window.location.href);
    url.searchParams.delete("uf"); url.searchParams.delete("cidade");
    if (ibge) url.searchParams.set("cidade", String(ibge)); else if (u) url.searchParams.set("uf", u);
    window.history.replaceState(null, "", url);
  }
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const u = p.get("uf")?.toUpperCase();
    if (u && NOME_UF[u]) { setUf(u); setReg(regiaoDe(u)!.k); return; }
    const ibge = Number(p.get("cidade"));
    if (ibge) carregarMunicipios().then((ms) => {
      const m = ms.find(([i]) => i === ibge);
      if (m) { setUf(m[2]); setReg(regiaoDe(m[2])!.k); setCidade({ ibge: m[0], nome: m[1], uf: m[2] }); setCq(m[1]); }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const regiao = REGIOES.find((r) => r.k === reg);
  const cores = Object.fromEntries(Object.keys(NOME_UF).map((u) => {
    const r = regiaoDe(u)!;
    return [u, regiao && !uf && r.k !== regiao.k ? APAGADO : r.cor];
  }));

  function escolherUf(u: string) { setUf(u); setReg(regiaoDe(u)!.k); setCidade(null); setCq(""); setLim(POR_PAGINA); marcarUrl(u); }
  function voltarBrasil() { setUf(""); setReg(""); setCidade(null); setCq(""); marcarUrl(""); }
  const irParaLista = () => requestAnimationFrame(() => listaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));

  const q = normalizar(cq);
  const sugestoes = useMemo(() => (q.length < 2 || !municipios ? [] : municipios
    .filter(([, nome]) => normalizar(nome).includes(q))
    .sort((a, b) => Number(!normalizar(a[1]).startsWith(q)) - Number(!normalizar(b[1]).startsWith(q)) || a[1].localeCompare(b[1], "pt-BR"))
    .slice(0, 6)), [q, municipios]);

  const doEstado = uf ? d.pessoas.filter((p) => p.uf === uf) : [];
  const senadores = doEstado.filter((p) => p.casa === "senado");
  const deputados = doEstado.filter((p) => p.casa === "camara");
  const presidente = d.executivos?.find((e) => e.cargoChave === "presidente") ?? null;
  const governador = uf ? d.executivos?.find((e) => e.cargoChave === "governador" && e.uf === uf) ?? null : null;

  return (
    <main className="grid gap-6 pb-8">
      <section aria-labelledby="titulo-mapa" className="grid gap-4 rounded-card border border-borda bg-card p-5 shadow-card">
        <div className="flex flex-wrap items-end justify-between gap-3.5">
          <div>
            <h1 id="titulo-mapa" className="text-lg font-bold">Quem representa cada estado</h1>
            <p className="mt-1 text-[13px] text-suave">Toque num estado ou digite a sua cidade para ver quem te representa.</p>
          </div>
          <div className="relative min-w-[220px] flex-[0_1_320px]">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="absolute top-[13px] left-[13px]">
              <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" />
            </svg>
            <label htmlFor="cidade" className="sr-only">Sua cidade</label>
            <input id="cidade" type="search" autoComplete="off" value={cq} placeholder="Digite sua cidade"
              onFocus={carregarMunicipios} onChange={(e) => { setCq(e.target.value); setCidade(null); carregarMunicipios(); }}
              className="h-[42px] w-full rounded-card border border-borda bg-card pr-3.5 pl-[38px] text-base outline-none sm:text-[13px] focus:border-destaque" />
            {sugestoes.length > 0 && !cidade && (
              <div className="absolute inset-x-0 top-[46px] z-10 overflow-hidden rounded-card border border-borda bg-card shadow-xl">
                {sugestoes.map(([ibge, nome, u]) => (
                  <button key={ibge} type="button" onClick={() => { escolherUf(u); setCidade({ ibge, nome, uf: u }); setCq(nome); marcarUrl(u, ibge); }}
                    className="flex w-full justify-between gap-3 px-3.5 py-2.5 text-left text-sm hover:bg-fundo">
                    <span>{nome}</span><span className="text-suave">{u}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-start gap-7">
          <div className="grid min-w-0 flex-[1_1_420px] gap-2.5">
            <p className="text-xs text-suave">{uf ? `Brasil › ${regiao?.nome} › ${NOME_UF[uf]}` : regiao ? `Brasil › ${regiao.nome}` : "Brasil · toque numa região ou num estado"}</p>
            <MapaBrasil cores={cores} sel={uf} nomes={NOME_UF} onPick={escolherUf} />
          </div>

          <div className="grid min-w-0 flex-[1_1_300px] content-start gap-2.5">
            {!uf && !regiao && (
              <div>
                <p className="mb-1 text-[10px] font-bold tracking-wider text-suave uppercase">Regiões</p>
                {REGIOES.map((r) => (
                  <button key={r.k} type="button" onClick={() => setReg(r.k)} className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-fundo">
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white" style={{ background: r.cor }}>{r.k}</span>
                    <span className="grid flex-1"><strong className="text-sm">{r.nome}</strong><span className="text-xs text-suave">{r.ufs.join(" · ")}</span></span>
                    <span aria-hidden="true" className="text-suave">›</span>
                  </button>
                ))}
              </div>
            )}

            {!uf && regiao && (
              <div className="grid gap-2.5">
                <button type="button" onClick={voltarBrasil} className={`${btn} justify-self-start`}>← Brasil</button>
                <h2 className="text-base font-bold">{regiao.nome}</h2>
                <div className="grid grid-cols-2 gap-2">
                  {regiao.ufs.map((u) => <button key={u} type="button" onClick={() => escolherUf(u)} className={`${btn} h-10 text-left`}>{u} · {NOME_UF[u]}</button>)}
                </div>
              </div>
            )}

            {uf && (
              <div className="grid gap-2.5">
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={voltarBrasil} className={btn}>← Brasil</button>
                  <button type="button" onClick={() => { setUf(""); setCidade(null); setCq(""); marcarUrl(""); }} className={btn}>← {regiao?.nome}</button>
                </div>
                <div className="mt-1">
                  <p className="text-xs text-suave">{cidade ? `${cidade.nome} · ${uf}` : "Estado inteiro"}</p>
                  <h2 className="text-xl font-bold">Quem representa {cidade ? cidade.nome : ufComArtigo(uf)}</h2>
                </div>
                {cidade && <p className="text-xs text-suave">Senadores e deputados federais são eleitos pelo estado inteiro: quem mora em {cidade.nome} é representado pelos de {NOME_UF[uf]}. Prefeito e vereadores entram depois.</p>}
                <div>
                  {presidente && <CartaoExecutivo e={presidente} />}
                  {governador && <CartaoExecutivo e={governador} />}
                  {senadores.map((p) => (
                    <div key={p.id} className="relative flex items-center gap-3 rounded-xl px-1.5 py-2 hover:bg-fundo">
                      <Foto p={p} tamanho={40} />
                      <span className="grid flex-1">
                        <Link href={`/p/${p.id}`} className="text-[13px] font-bold text-texto no-underline after:absolute after:inset-0">{p.nomeUrna}</Link>
                        <span className="text-xs text-suave">{p.cargo} em exercício</span>
                      </span>
                      <SelecaoPartido partido={p.partido} cores={d.cores} />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <button type="button" onClick={irParaLista} className="rounded-xl bg-fundo p-3 text-left hover:ring-1 hover:ring-destaque">
                    <span className="block text-lg font-bold tabular-nums">{deputados.length}</span><span className="text-xs text-suave">deputados federais ↓</span>
                  </button>
                  <div className="rounded-xl bg-fundo p-3">
                    <span className="block text-lg font-bold tabular-nums">{(d.municipiosPorUf[uf] ?? 0).toLocaleString("pt-BR")}</span><span className="text-xs text-suave">municípios</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <div ref={listaRef} className="scroll-mt-4" />
      {uf && (
        <section aria-labelledby="titulo-lista" className="grid gap-3.5 rounded-card border border-borda bg-card p-4 shadow-card sm:p-5">
          <div>
            <h2 id="titulo-lista" className="text-lg font-bold">Deputados federais</h2>
            <p className="mt-1 text-[13px] text-suave">{NOME_UF[uf]} · <strong className="text-texto">{deputados.length}</strong> em exercício hoje, em ordem alfabética</p>
          </div>
          {/* Celular: linhas compactas; a partir do tablet, os cartões do protótipo. */}
          <div className="grid gap-2 sm:gap-4 sm:[grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]">
            {deputados.slice(0, lim).map((p) => (
              <div key={p.id} className="relative flex items-center gap-3 rounded-card border border-borda bg-card p-3 text-texto shadow-card hover:border-destaque sm:flex-col sm:gap-1 sm:p-4 sm:text-center">
                <Foto p={p} tamanho={64} classe="size-12 sm:size-16" />
                <span className="grid min-w-0 flex-1 gap-0.5 sm:justify-items-center">
                  {/* Link esticado: o cartão inteiro abre o crachá, e o "Monitorar" fica por cima. */}
                  <Link href={`/p/${p.id}`} className="truncate text-sm font-bold text-texto no-underline after:absolute after:inset-0 after:rounded-card sm:mt-1 sm:whitespace-normal">{p.nomeUrna}</Link>
                  <span className="text-xs text-suave">{p.cargo}</span>
                  <span className="sm:mt-0.5"><SelecaoPartido partido={p.partido} cores={d.cores} /></span>
                </span>
                <span className="relative z-10 sm:mt-1.5"><BotaoMonitorar id={p.id} nome={p.nomeUrna} classe={classeMonitorar} /></span>
              </div>
            ))}
          </div>
          {deputados.length > lim && (
            <button type="button" onClick={() => setLim((l) => l + POR_PAGINA)} className={`${btn} justify-self-center`}>Ver mais ({deputados.length - lim})</button>
          )}
        </section>
      )}
    </main>
  );
}
