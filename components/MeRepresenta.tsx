"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MunicipioJson } from "@/app/dados/municipios/route";
import { useMonitorando } from "@/lib/monitorando";
import { corPartido } from "@/lib/partidos";
import { NOME_UF, regiaoDe } from "@/lib/regioes";
import { normalizar } from "@/lib/texto";
import type { PessoaNoCargo } from "@/lib/visao";
import { BotaoMonitorar, classeMonitorar } from "./BotaoMonitorar";

type Lugar = { tipo: "cidade"; nome: string; uf: string; ibge: number } | { tipo: "estado"; nome: string; uf: string };

const chip = "inline-flex h-9 items-center rounded-xl border border-borda bg-card px-4 text-xs font-bold whitespace-nowrap hover:border-destaque";
const EXEMPLOS: Lugar[] = [
  { tipo: "cidade", nome: "Rio de Janeiro", uf: "RJ", ibge: 3304557 },
  { tipo: "estado", nome: "São Paulo", uf: "SP" },
  { tipo: "cidade", nome: "Salvador", uf: "BA", ibge: 2927408 },
  { tipo: "estado", nome: "Minas Gerais", uf: "MG" },
];
const PRIMEIROS = 8;

function Rosto({ p }: { p: PessoaNoCargo }) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-xl border border-borda bg-card px-1.5 py-2.5 text-center">
    <Link href={`/p/${p.id}`} className="flex flex-col items-center gap-1 text-texto no-underline">
      {p.fotoUrl
        // <img> de propósito: a foto vem direto da URL oficial, sem passar pela Vercel (CLAUDE.md).
        ? <img src={p.fotoUrl} alt="" width={64} height={64} loading="lazy" className="size-16 rounded-full bg-fundo object-cover object-top" />
        : <span aria-hidden="true" className="size-16 rounded-full bg-fundo" />}
      <strong className="line-clamp-2 text-[13px] leading-tight">{p.nomeUrna}</strong>
      <span className="inline-flex items-center gap-1 text-[11px] text-suave">
        {p.cargo} · <span className="size-2 rounded-full" style={{ background: corPartido(p.partido) }} aria-hidden="true" />{p.partido}
      </span>
    </Link>
    <BotaoMonitorar id={p.id} nome={p.nomeUrna} classe={classeMonitorar} />
    </div>
  );
}

/** Bandeja "Monitorando (n)" do protótipo: quem está na lista deste aparelho, com atalho para o painel. */
function Bandeja() {
  const e = useMonitorando();
  if (!e.pessoas.length) return null;
  return (
    <div className="sticky bottom-4 z-20 mx-auto flex w-full max-w-[760px] flex-wrap items-center gap-3 rounded-2xl bg-destaque px-3.5 py-3 text-destaque-texto shadow-xl">
      <strong className="text-sm">Monitorando ({e.pessoas.length})</strong>
      <span className="min-w-0 flex-1 truncate text-[13px]">{e.pessoas.map((p) => p.nome).join(", ")}</span>
      <Link href="/monitorando" className="inline-flex h-10 items-center rounded-full bg-card px-4 text-sm font-bold text-texto no-underline">Ver no painel →</Link>
    </div>
  );
}

/**
 * Me representa (tela `Representantes` do protótipo, E23d), só com o que tem dado: em Brasília, os
 * 3 senadores e os deputados federais do estado. Governador, deputados estaduais, prefeito,
 * vereadores e presidente entram no Passo 5; "Comparar", na E23f.
 * O lugar fica na URL (?uf=SP ou ?cidade=<IBGE>), para compartilhar.
 */
export function MeRepresenta({ pessoas }: { pessoas: PessoaNoCargo[] }) {
  const [q, setQ] = useState("");
  const [lugar, setLugar] = useState<Lugar | null>(null);
  const [municipios, setMunicipios] = useState<MunicipioJson[] | null>(null);
  const [todos, setTodos] = useState(false);
  const pedido = useRef<Promise<MunicipioJson[]> | null>(null);
  const resultado = useRef<HTMLElement>(null);

  /** Lista das 5.571 cidades (~45 KB comprimida), baixada na primeira vez que a pessoa toca na busca. */
  const carregar = () => (pedido.current ??= fetch("/dados/municipios")
    .then(async (r) => { const ms = r.ok ? await r.json() as MunicipioJson[] : []; setMunicipios(ms); return ms; })
    .catch(() => { pedido.current = null; return []; }));

  function escolher(l: Lugar | null, rolar = true) {
    setLugar(l); setQ(l?.nome ?? ""); setTodos(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("uf"); url.searchParams.delete("cidade");
    if (l?.tipo === "estado") url.searchParams.set("uf", l.uf);
    if (l?.tipo === "cidade") url.searchParams.set("cidade", String(l.ibge));
    window.history.replaceState(null, "", url);
    if (l && rolar) requestAnimationFrame(() => resultado.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  // Link compartilhado: ?uf=SP abre direto; ?cidade= precisa da lista de cidades.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const uf = p.get("uf")?.toUpperCase();
    if (uf && NOME_UF[uf]) { escolher({ tipo: "estado", nome: NOME_UF[uf], uf }, false); return; }
    const ibge = Number(p.get("cidade"));
    if (ibge) carregar().then((ms) => {
      const m = ms.find(([i]) => i === ibge);
      if (m) escolher({ tipo: "cidade", ibge: m[0], nome: m[1], uf: m[2] }, false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const qn = normalizar(q);
  const sugestoes = useMemo((): Lugar[] => {
    if (qn.length < 2 || (lugar && lugar.nome === q)) return [];
    const estados = Object.entries(NOME_UF).filter(([u, n]) => normalizar(n).includes(qn) || u.toLowerCase() === qn)
      .map(([uf, nome]): Lugar => ({ tipo: "estado", nome, uf }));
    const cidades = (municipios ?? []).filter(([, n]) => normalizar(n).includes(qn))
      .sort((a, b) => Number(!normalizar(a[1]).startsWith(qn)) - Number(!normalizar(b[1]).startsWith(qn)) || a[1].localeCompare(b[1], "pt-BR"))
      .slice(0, 6).map(([ibge, nome, uf]): Lugar => ({ tipo: "cidade", ibge, nome, uf }));
    return [...cidades, ...estados].slice(0, 7);
  }, [qn, q, lugar, municipios]);

  const doEstado = lugar ? pessoas.filter((p) => p.uf === lugar.uf) : [];
  const senadores = doEstado.filter((p) => p.casa === "senado");
  const deputados = doEstado.filter((p) => p.casa === "camara");

  return (
    <main className="grid gap-6 pb-8">
      <section className="flex flex-wrap items-start gap-8">
        <div className="grid min-w-0 flex-[1_1_420px] gap-3.5">
          <h1 className="text-[28px] leading-tight font-bold">Quem são os seus representantes?</h1>
          <p className="text-base text-suave">Digite a sua cidade ou o seu estado e veja quem te representa em Brasília: os senadores e os deputados federais.</p>
          <div className="relative">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="absolute top-[19px] left-4 text-suave">
              <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" />
            </svg>
            <label htmlFor="lugar" className="sr-only">Sua cidade ou estado</label>
            <input id="lugar" type="search" autoComplete="off" value={q} placeholder="Digite sua cidade ou estado"
              onFocus={carregar} onChange={(e) => { setQ(e.target.value); carregar(); }}
              className="h-14 w-full rounded-[14px] border border-borda bg-card pr-4 pl-[46px] text-[17px] outline-none focus:border-link" />
            {sugestoes.length > 0 && (
              <div className="absolute inset-x-0 top-[62px] z-10 overflow-hidden rounded-[14px] border border-borda bg-card shadow-xl">
                {sugestoes.map((s) => (
                  <button key={s.tipo === "cidade" ? s.ibge : s.uf} type="button" onClick={() => escolher(s)}
                    className="flex w-full justify-between gap-3 px-3.5 py-3 text-left text-[15px] hover:bg-fundo">
                    <span>{s.nome}</span><span className="text-[13px] text-suave">{s.tipo === "cidade" ? `cidade · ${s.uf}` : "estado inteiro"}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="text-[13px] text-suave">Exemplos:</p>
          <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(180px,1fr))]">
            {EXEMPLOS.map((e) => (
              <button key={e.nome + e.tipo} type="button" onClick={() => escolher(e)} className="flex items-center gap-2.5 rounded-xl border border-borda bg-card px-3 py-2.5 text-left hover:bg-fundo">
                <span aria-hidden="true" className="h-6 w-[34px] shrink-0 rounded-md" style={{ background: regiaoDe(e.uf)?.cor }} />
                <span className="grid"><strong className="text-sm">{e.nome}</strong><span className="text-xs text-suave">{e.tipo === "cidade" ? `cidade · ${e.uf}` : "estado inteiro"}</span></span>
              </button>
            ))}
          </div>
          <p className="text-xs text-suave">Quantidades: Constituição Federal, arts. 45 e 46.</p>
        </div>

        <div className="flex min-w-0 flex-[1_1_420px] flex-wrap gap-5 rounded-[18px] border border-borda bg-card p-5">
          <div role="img" aria-label="Em Brasília: quem representa o seu estado no Congresso" className="relative size-[200px] shrink-0">
            <span className="absolute inset-0 rounded-full border-2 border-link bg-link/10" />
            <span className="absolute inset-[76px] flex items-center justify-center rounded-full bg-destaque text-xs font-bold text-destaque-texto">você</span>
            <span className="absolute inset-x-0 top-5 text-center text-[11px] text-suave">Em Brasília</span>
          </div>
          <div className="grid min-w-[180px] flex-1 content-start gap-3">
            <span className="inline-flex h-[34px] w-fit items-center rounded-xl bg-destaque px-4 text-[13px] font-bold text-destaque-texto">Em Brasília</span>
            <div><strong className="text-sm">3 senadores</strong><p className="text-[13px] text-suave">representam o estado e aprovam leis nacionais (mandato de 8 anos)</p></div>
            <div><strong className="text-sm">Deputados federais (8 a 70)</strong><p className="text-[13px] text-suave">representam a população do estado e fazem as leis do país (mandato de 4 anos)</p></div>
          </div>
        </div>
      </section>

      {lugar && (
        <section ref={resultado} className="grid scroll-mt-4 gap-5 border-t border-borda pt-5" aria-labelledby="mr-lugar">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[13px] text-suave">{lugar.tipo === "cidade" ? `Cidade · ${lugar.uf}` : "Estado inteiro"}</p>
              <h2 id="mr-lugar" className="mt-1 text-[32px] leading-none font-bold">{lugar.nome}</h2>
            </div>
            <button type="button" onClick={() => escolher(null)} className={chip}>Trocar lugar</button>
          </div>
          {lugar.tipo === "cidade" && (
            <p className="-mt-2 text-sm text-suave">Senadores e deputados federais são eleitos pelo estado inteiro: quem mora em {lugar.nome} é representado pelos de {NOME_UF[lugar.uf]}.</p>
          )}
          <div className="grid gap-3">
            <h3 className="flex items-center gap-2 text-lg font-bold"><span aria-hidden="true" className="size-2.5 rounded-full bg-link" />Em Brasília · {NOME_UF[lugar.uf]}</h3>
            <div className="grid gap-2">
              <p className="text-[13px] text-suave">{senadores.length} senadores, em exercício hoje</p>
              <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(140px,1fr))]">{senadores.map((p) => <Rosto key={p.id} p={p} />)}</div>
            </div>
            <div className="grid gap-2">
              <p className="text-[13px] text-suave">Deputados federais ({deputados.length}), em exercício hoje, em ordem alfabética</p>
              <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(140px,1fr))]">
                {(todos ? deputados : deputados.slice(0, PRIMEIROS)).map((p) => <Rosto key={p.id} p={p} />)}
              </div>
              {deputados.length > PRIMEIROS && !todos && (
                <button type="button" onClick={() => setTodos(true)} className="justify-self-start text-[13px] font-bold text-link underline underline-offset-2">Ver todos os {deputados.length} ›</button>
              )}
            </div>
          </div>
        </section>
      )}
      <Bandeja />
    </main>
  );
}
