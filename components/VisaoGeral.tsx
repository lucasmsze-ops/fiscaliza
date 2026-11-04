"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import type { MunicipioJson } from "@/app/dados/municipios/route";
import { corPartido } from "@/lib/congresso";
import { APAGADO } from "@/lib/mapa-brasil";
import { NOME_UF, REGIOES, regiaoDe } from "@/lib/regioes";
import { normalizar } from "@/lib/texto";
import type { PessoaNoCargo, VisaoDados } from "@/lib/visao";
import { MapaBrasil } from "./MapaBrasil";

const POR_PAGINA = 24;
const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const CARGOS = [
  { k: "senado", rotulo: "Senadores", icone: "M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6M9 11h.01M15 11h.01" },
  { k: "camara", rotulo: "Deputados federais", icone: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21c0-3.5 3-5.5 7-5.5s7 2 7 5.5M17 11a3 3 0 1 0 0-6M22 21c0-2.6-1.6-4.3-4-5" },
] as const;
type FiltroCargo = "todos" | "senado" | "camara";

const iniciais = (n: string) => n.split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("");
const fundoPartido = (partido: string, cores: string[]) => `color-mix(in srgb, ${corPartido(partido, cores)} 22%, transparent)`;

function Foto({ p, tamanho }: { p: PessoaNoCargo; tamanho: number }) {
  return p.fotoUrl
    // <img> de propósito: a foto vem direto da URL oficial, sem passar pela Vercel (CLAUDE.md).
    ? <img src={p.fotoUrl} alt="" width={tamanho} height={tamanho} loading="lazy" decoding="async" className="shrink-0 rounded-full bg-fundo object-cover object-top" style={{ width: tamanho, height: tamanho }} />
    : <span aria-hidden="true" className="inline-flex shrink-0 items-center justify-center rounded-full bg-fundo font-bold" style={{ width: tamanho, height: tamanho, fontSize: tamanho / 3 }}>{iniciais(p.nomeUrna)}</span>;
}

function SelecaoPartido({ partido, cores }: { partido: string; cores: string[] }) {
  return <span className="inline-block rounded-lg px-2.5 py-0.5 text-[11px] font-bold" style={{ background: fundoPartido(partido, cores) }}>{partido}</span>;
}

/** Botão do estilo do protótipo (borda, raio 12). */
const btn = "inline-flex h-9 items-center rounded-xl border border-borda bg-card px-3.5 text-xs font-bold hover:border-destaque";
const btnOn = "inline-flex h-9 items-center rounded-xl border border-destaque bg-destaque px-3.5 text-xs font-bold text-destaque-texto";

export function VisaoGeral({ d }: { d: VisaoDados }) {
  const [reg, setReg] = useState("");
  const [uf, setUf] = useState("");
  const [cidade, setCidade] = useState<{ nome: string; uf: string } | null>(null);
  const [cq, setCq] = useState("");
  const [municipios, setMunicipios] = useState<MunicipioJson[] | null>(null);
  const pedido = useRef<Promise<void> | null>(null);
  const [lista, setLista] = useState(false);
  const [cargo, setCargo] = useState<FiltroCargo>("todos");
  const [partido, setPartido] = useState("todos");
  const [nq, setNq] = useState("");
  const [letra, setLetra] = useState("");
  const [lim, setLim] = useState(POR_PAGINA);
  const listaRef = useRef<HTMLDivElement>(null);

  /** Lista das 5.571 cidades (~45 KB comprimida): baixada na primeira vez que a pessoa toca na busca. */
  function carregarMunicipios() {
    pedido.current ??= fetch("/dados/municipios").then(async (r) => { if (r.ok) setMunicipios(await r.json() as MunicipioJson[]); }).catch(() => { pedido.current = null; });
  }

  const regiao = REGIOES.find((r) => r.k === reg);
  const cores = Object.fromEntries(Object.keys(NOME_UF).map((u) => {
    const r = regiaoDe(u)!;
    return [u, regiao && !uf && r.k !== regiao.k ? APAGADO : r.cor];
  }));

  function escolherUf(u: string) { setUf(u); setReg(regiaoDe(u)!.k); setCidade(null); setCq(""); }
  function voltarBrasil() { setUf(""); setReg(""); setCidade(null); setCq(""); }
  function abrirLista(c: FiltroCargo, ufLista?: string) {
    setCargo(c); setLista(true); setLetra(""); setLim(POR_PAGINA);
    if (ufLista !== undefined) setUf(ufLista);
    requestAnimationFrame(() => listaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  const q = normalizar(cq);
  const sugestoes = useMemo(() => (q.length < 2 || !municipios ? [] : municipios
    .filter(([, nome]) => normalizar(nome).includes(q))
    .sort((a, b) => Number(!normalizar(a[1]).startsWith(q)) - Number(!normalizar(b[1]).startsWith(q)) || a[1].localeCompare(b[1], "pt-BR"))
    .slice(0, 6)), [q, municipios]);

  const doEstado = uf ? d.pessoas.filter((p) => p.uf === uf) : [];
  const senadores = doEstado.filter((p) => p.casa === "senado");
  const deputados = doEstado.filter((p) => p.casa === "camara").length;

  const partidos = useMemo(() => [...new Set(d.pessoas.map((p) => p.partido))].sort((a, b) => a.localeCompare(b, "pt-BR")), [d.pessoas]);
  const nqn = normalizar(nq);
  const filtradas = d.pessoas.filter((p) => (cargo === "todos" || p.casa === cargo) && (partido === "todos" || p.partido === partido)
    && (!uf || p.uf === uf) && (!nqn || normalizar(p.nomeUrna).includes(nqn)) && (!letra || normalizar(p.nomeUrna).startsWith(letra.toLowerCase())));
  const letrasComGente = new Set(d.pessoas.filter((p) => (cargo === "todos" || p.casa === cargo) && (!uf || p.uf === uf)).map((p) => normalizar(p.nomeUrna)[0]?.toUpperCase()));
  const tituloLista = cargo === "todos" ? "Todos os políticos no cargo" : CARGOS.find((c) => c.k === cargo)!.rotulo;
  const total = (c: "senado" | "camara") => d.pessoas.filter((p) => p.casa === c).length;

  return (
    <main className="grid gap-6 pb-8">
      <section aria-labelledby="titulo-mapa" className="grid gap-4 rounded-card border border-borda bg-card p-5 shadow-card">
        <div className="flex flex-wrap items-end justify-between gap-3.5">
          <div>
            <h1 id="titulo-mapa" className="text-lg font-bold">Quem representa cada estado</h1>
            <p className="mt-1 text-[13px] text-suave">Toque num estado ou digite a cidade para ver quem está no cargo em Brasília.</p>
          </div>
          <div className="relative min-w-[220px] flex-[0_1_320px]">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="absolute top-[13px] left-[13px]">
              <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" />
            </svg>
            <label htmlFor="cidade" className="sr-only">Sua cidade</label>
            <input id="cidade" type="search" autoComplete="off" value={cq} placeholder="Digite sua cidade"
              onFocus={carregarMunicipios} onChange={(e) => { setCq(e.target.value); carregarMunicipios(); }}
              className="h-[42px] w-full rounded-card border border-borda bg-card pr-3.5 pl-[38px] text-[13px] outline-none focus:border-destaque" />
            {sugestoes.length > 0 && !cidade && (
              <div className="absolute inset-x-0 top-[46px] z-10 overflow-hidden rounded-card border border-borda bg-card shadow-xl">
                {sugestoes.map(([ibge, nome, u]) => (
                  <button key={ibge} type="button" onClick={() => { escolherUf(u); setCidade({ nome, uf: u }); setCq(nome); }}
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
                  <button type="button" onClick={() => { setUf(""); setCidade(null); setCq(""); }} className={btn}>← {regiao?.nome}</button>
                </div>
                <h2 className="mt-1 text-xl font-bold">{NOME_UF[uf]}</h2>
                {cidade && <p className="text-xs text-suave">{cidade.nome} é representada em Brasília pelos parlamentares de {NOME_UF[uf]}.</p>}
                <div>
                  {senadores.map((p) => (
                    <Link key={p.id} href={`/p/${p.id}`} className="flex items-center gap-3 rounded-xl px-1.5 py-2 text-texto no-underline hover:bg-fundo">
                      <Foto p={p} tamanho={40} />
                      <span className="grid flex-1"><strong className="text-[13px]">{p.nomeUrna}</strong><span className="text-xs text-suave">{p.cargo}</span></span>
                      <SelecaoPartido partido={p.partido} cores={d.cores} />
                    </Link>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <button type="button" onClick={() => abrirLista("camara", uf)} className="rounded-xl bg-fundo p-3 text-left hover:ring-1 hover:ring-destaque">
                    <span className="block text-lg font-bold tabular-nums">{deputados}</span><span className="text-xs text-suave">deputados federais ›</span>
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

      <section aria-labelledby="titulo-cargos" className="grid gap-3.5">
        <div>
          <h2 id="titulo-cargos" className="text-lg font-bold">Quem está no cargo hoje</h2>
          <p className="mt-1 text-[13px] text-suave">Toque num cargo para ver a lista em ordem alfabética · <button type="button" onClick={() => { setUf(""); abrirLista("todos", ""); }} className="underline underline-offset-2 text-link">ver todos</button></p>
        </div>
        <div className="grid gap-4.5 [grid-template-columns:repeat(auto-fit,minmax(min(200px,100%),1fr))]">
          {CARGOS.map((c) => {
            const on = lista && cargo === c.k;
            return (
              <button key={c.k} type="button" onClick={() => { setUf(""); abrirLista(c.k, ""); }}
                className={`flex items-center justify-between gap-3 rounded-card border bg-card p-4 text-left shadow-card ${on ? "border-destaque" : "border-borda hover:border-destaque"}`}>
                <span className="grid gap-1">
                  <span className="text-xs font-bold text-suave">{c.rotulo}</span>
                  <span className="text-lg font-bold tabular-nums">{total(c.k)} <span className="text-xs text-link">{on ? "lista aberta" : "ver lista ›"}</span></span>
                </span>
                <span className="inline-flex size-[45px] shrink-0 items-center justify-center rounded-xl bg-destaque text-destaque-texto">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={c.icone} /></svg>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div ref={listaRef} className="scroll-mt-4" />
      {lista && (
        <section aria-labelledby="titulo-lista" className="grid gap-3.5 rounded-card border border-borda bg-card p-5 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="titulo-lista" className="text-lg font-bold">{tituloLista}</h2>
              <p className="mt-1 text-[13px] text-suave"><strong className="text-texto">{filtradas.length}</strong> {filtradas.length === 1 ? "pessoa" : "pessoas"}, em ordem alfabética</p>
            </div>
            <button type="button" onClick={() => setLista(false)} className={btn}>Fechar lista ×</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["todos", "senado", "camara"] as const).map((k) => (
              <button key={k} type="button" onClick={() => { setCargo(k); setLim(POR_PAGINA); }} className={cargo === k ? btnOn : btn}>
                {k === "todos" ? "Todos os cargos" : CARGOS.find((c) => c.k === k)!.rotulo}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative max-w-[360px] flex-[1_1_240px]">
              <label htmlFor="nome-q" className="sr-only">Nome</label>
              <input id="nome-q" type="search" value={nq} onChange={(e) => { setNq(e.target.value); setLim(POR_PAGINA); }} placeholder="Nome do político"
                className="h-[42px] w-full rounded-card border border-borda bg-card px-3.5 text-[13px] outline-none focus:border-destaque" />
            </div>
            <select value={partido} onChange={(e) => { setPartido(e.target.value); setLim(POR_PAGINA); }} aria-label="Partido"
              className="h-[42px] rounded-card border border-borda bg-card px-3 text-[13px]">
              <option value="todos">Partido: todos</option>
              {partidos.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={uf} onChange={(e) => { setUf(e.target.value); setReg(e.target.value ? regiaoDe(e.target.value)!.k : ""); setLim(POR_PAGINA); }} aria-label="Estado"
              className="h-[42px] rounded-card border border-borda bg-card px-3 text-[13px]">
              <option value="">Estado: todos</option>
              {Object.keys(NOME_UF).sort().map((u) => <option key={u} value={u}>{u} · {NOME_UF[u]}</option>)}
            </select>
          </div>
          <nav aria-label="Letras" className="flex flex-wrap gap-0.5">
            <button type="button" onClick={() => setLetra("")} className={`h-8 min-w-8 rounded-lg px-2 text-xs font-bold ${letra === "" ? "bg-destaque text-destaque-texto" : "hover:bg-fundo"}`}>A–Z</button>
            {LETRAS.map((l) => (
              <button key={l} type="button" disabled={!letrasComGente.has(l)} onClick={() => { setLetra(l); setLim(POR_PAGINA); }}
                className={`h-8 min-w-8 rounded-lg px-2 text-xs font-bold disabled:opacity-30 ${letra === l ? "bg-destaque text-destaque-texto" : "hover:bg-fundo"}`}>{l}</button>
            ))}
          </nav>
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(200px,100%),1fr))]">
            {filtradas.slice(0, lim).map((p) => (
              <Link key={p.id} href={`/p/${p.id}`} className="flex flex-col items-center gap-1 rounded-card border border-borda bg-card p-4 text-center text-texto no-underline shadow-card hover:border-destaque">
                <Foto p={p} tamanho={64} />
                <strong className="mt-1 text-sm">{p.nomeUrna}</strong>
                <span className="text-xs text-suave">{p.cargo} · {p.uf}</span>
                <SelecaoPartido partido={p.partido} cores={d.cores} />
                <span className="mt-1.5 text-xs font-bold text-link">Ver crachá ›</span>
              </Link>
            ))}
          </div>
          {filtradas.length === 0 && <p className="text-[13px] text-suave">Ninguém encontrado com esses filtros.</p>}
          {filtradas.length > lim && (
            <button type="button" onClick={() => setLim((l) => l + POR_PAGINA)} className={`${btn} justify-self-center`}>Ver mais ({filtradas.length - lim})</button>
          )}
        </section>
      )}
    </main>
  );
}
