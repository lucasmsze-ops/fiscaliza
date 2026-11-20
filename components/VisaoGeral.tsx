"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { MunicipioJson } from "@/app/dados/municipios/route";
import { hrefSecao } from "@/lib/glossario";
import { APAGADO } from "@/lib/mapa-brasil";
import { NOME_UF, REGIOES, regiaoDe } from "@/lib/regioes";
import type { Executivo, PessoaNoCargo, VisaoDados } from "@/lib/visao";
import { BuscaTopo } from "./BuscaTopo";
import { ChipPartido } from "./ChipPartido";
import { MapaBrasil } from "./MapaBrasil";
import { Info } from "./Termo";
import { SEGMENTO, SEGMENTO_ON, SEGMENTOS, TITULO_PAGINA } from "@/lib/estilo";

const POR_PAGINA = 24;
const iniciais = (n: string) => n.split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("");
const pct = (v: number) => `${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
const inteiro = (v: number) => v.toLocaleString("pt-BR");
/** "AC, AM, AP, PA, RO, RR e TO". */
const listaUfs = (ufs: readonly string[]) => `${ufs.slice(0, -1).join(", ")} e ${ufs.at(-1)}`;
const SETA = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(235,235,245,0.55)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>;
const LINHA = "flex min-h-16 items-center gap-3 px-4 py-2.5 text-texto no-underline hover:bg-white/5 hover:text-texto";

/** Foto oficial redonda (ou as iniciais no círculo azul do protótipo). */
function Rosto({ nome, foto, tamanho = 48 }: { nome: string; foto: string | null; tamanho?: number }) {
  return foto
    // <img> de propósito: a foto vem direto da URL oficial, sem passar pela Vercel (CLAUDE.md).
    ? <img src={foto} alt="" width={tamanho} height={tamanho} loading="lazy" decoding="async" className="shrink-0 rounded-full border border-[rgba(64,156,255,0.45)] bg-[rgba(64,156,255,0.2)] object-cover object-top" style={{ width: tamanho, height: tamanho }} />
    : <span aria-hidden="true" className="inline-flex shrink-0 items-center justify-center rounded-full border border-[rgba(64,156,255,0.45)] bg-[rgba(64,156,255,0.2)] text-[15px] font-semibold text-[#CFE6FF]" style={{ width: tamanho, height: tamanho }}>{iniciais(nome)}</span>;
}

/** Linha da lista do estado (protótipo Liquid Glass): rosto, nome, partido e afastamento, participação à direita. */
function LinhaPessoa({ p, primeira }: { p: PessoaNoCargo; primeira: boolean }) {
  const fem = /^(Senadora|Deputada)/.test(p.cargo);
  return (
    <Link href={`/p/${p.id}`} className={`${LINHA} ${primeira ? "" : "border-t border-borda"}`}>
      <Rosto nome={p.nomeUrna} foto={p.fotoUrl} />
      <span className="grid min-w-0 flex-1 gap-[3px]">
        <span className="text-base font-semibold tracking-[0.1px]">{p.nomeUrna}</span>
        <span className="flex flex-wrap items-center gap-1.5">
          <ChipPartido sigla={p.partido} />
          {p.diasAfastado > 0 && <span className="text-[13px] text-suave">afastad{fem ? "a" : "o"} {inteiro(p.diasAfastado)} {p.diasAfastado === 1 ? "dia" : "dias"}</span>}
        </span>
      </span>
      {p.participacao && (
        <span className="grid shrink-0 justify-items-end gap-0.5">
          <span className="text-[17px] font-semibold tabular-nums">{pct(p.participacao.pct)}</span>
          <span className="text-[11px] text-suave tabular-nums">{inteiro(p.participacao.num)} de {inteiro(p.participacao.den)}</span>
        </span>
      )}
    </Link>
  );
}

/** Presidente ou governador eleito em 2026 (TSE): a linha abre o crachá do executivo. */
function LinhaExecutivo({ e, primeira }: { e: Executivo; primeira: boolean }) {
  return (
    <Link href={`/executivos/${e.cargoChave === "presidente" ? "presidente" : (e.uf ?? "").toLowerCase()}`} className={`${LINHA} ${primeira ? "" : "border-t border-borda"}`}>
      <Rosto nome={e.nomeUrna} foto={e.fotoUrl} />
      <span className="grid min-w-0 flex-1 gap-[3px]">
        <span className="text-base font-semibold">{e.nomeUrna}</span>
        <span className="flex flex-wrap items-center gap-1.5">
          <ChipPartido sigla={e.partido} />
          <span className="text-[13px] text-suave">{e.cargoChave === "presidente" ? (e.feminino ? "Presidenta" : "Presidente") : (e.feminino ? "Governadora" : "Governador")} · posse em {Number(e.posse.slice(8, 10))}/{Number(e.posse.slice(5, 7))}/{e.posse.slice(0, 4)}</span>
        </span>
      </span>
      {SETA}
    </Link>
  );
}

/**
 * Mapa (/mapa; era a Visão geral) no layout do protótipo Liquid Glass (2026-11-20): título, busca, o mapa num
 * cartão, a lista de regiões e, ao escolher um estado, a tela do estado (senadores e deputados em exercício
 * hoje, com a participação em votações de cada um).
 */
export function VisaoGeral({ d }: { d: VisaoDados }) {
  const [reg, setReg] = useState("");
  const [uf, setUf] = useState("");
  const [casa, setCasa] = useState<"senado" | "camara">("senado");
  const [cidade, setCidade] = useState<{ nome: string; uf: string; ibge: number } | null>(null);
  const pedido = useRef<Promise<MunicipioJson[]> | null>(null);
  const [lim, setLim] = useState(POR_PAGINA);

  /** Lista das 5.571 cidades (~45 KB comprimida): só para links antigos com ?cidade= (a busca saiu em 2026-11-14). */
  const carregarMunicipios = () => (pedido.current ??= fetch("/dados/municipios")
    .then(async (r) => (r.ok ? await r.json() as MunicipioJson[] : []))
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
      if (m) { setUf(m[2]); setReg(regiaoDe(m[2])!.k); setCidade({ ibge: m[0], nome: m[1], uf: m[2] }); }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const regiao = REGIOES.find((r) => r.k === reg);
  const cores = Object.fromEntries(Object.keys(NOME_UF).map((u) => {
    const r = regiaoDe(u)!;
    return [u, regiao && r.k !== regiao.k ? APAGADO : r.cor];
  }));

  const topo = () => window.scrollTo({ top: 0 });
  function escolherUf(u: string) { setUf(u); setReg(regiaoDe(u)!.k); setCidade(null); setLim(POR_PAGINA); setCasa("senado"); marcarUrl(u); topo(); }
  function voltarRegiao() { setUf(""); setCidade(null); marcarUrl(""); topo(); }
  function voltarBrasil() { setUf(""); setReg(""); setCidade(null); marcarUrl(""); }

  if (uf) {
    const doEstado = d.pessoas.filter((p) => p.uf === uf);
    const senadores = doEstado.filter((p) => p.casa === "senado");
    const deputados = doEstado.filter((p) => p.casa === "camara");
    const lista = casa === "senado" ? senadores : deputados.slice(0, lim);
    const presidente = d.executivos?.find((e) => e.cargoChave === "presidente") ?? null;
    const governador = d.executivos?.find((e) => e.cargoChave === "governador" && e.uf === uf) ?? null;
    const executivos = [governador, presidente].filter((e): e is Executivo => !!e);
    return (
      <main className="grid gap-[18px] pb-8 pt-3 lg:pt-6">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={voltarRegiao} className="vidro inline-flex h-9 items-center gap-1 rounded-full pr-3.5 pl-2.5 text-sm font-semibold text-texto">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg>
            {regiao?.nome}
          </button>
          <span className="text-[13px] text-suave">Brasil › {regiao?.nome} › {NOME_UF[uf]}</span>
        </div>

        <div className="grid gap-1.5 px-1">
          <h1 className={TITULO_PAGINA}>{cidade ? cidade.nome : NOME_UF[uf]}</h1>
          <p className="text-[15px] text-suave">Quem está no cargo hoje em Brasília pelo estado</p>
          {cidade && <p className="text-[13px] text-suave">Senadores e deputados federais são eleitos pelo estado inteiro: quem mora em {cidade.nome} é representado pelos de {NOME_UF[uf]}.</p>}
        </div>

        <div role="group" aria-label="Casa legislativa" className={`${SEGMENTOS} grid-cols-2`}>
          <button type="button" aria-pressed={casa === "senado"} onClick={() => setCasa("senado")} className={casa === "senado" ? SEGMENTO_ON : SEGMENTO}>Senadores · {senadores.length}</button>
          <button type="button" aria-pressed={casa === "camara"} onClick={() => setCasa("camara")} className={casa === "camara" ? SEGMENTO_ON : SEGMENTO}>Deputados · {deputados.length}</button>
        </div>

        <div className="vidro overflow-hidden rounded-card">
          {lista.map((p, i) => <LinhaPessoa key={p.id} p={p} primeira={i === 0} />)}
          {lista.length === 0 && <p className="p-4 text-[15px] text-suave">Ninguém em exercício hoje.</p>}
        </div>

        {casa === "camara" && deputados.length > lim && (
          <button type="button" onClick={() => setLim(deputados.length)} className="vidro flex min-h-[52px] items-center justify-center rounded-card text-base font-semibold text-link">
            Ver os {deputados.length} deputados ›
          </button>
        )}

        <div className="vidro grid gap-2.5 rounded-[22px] px-[18px] py-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-semibold">Participação em votações</h2>
            <Info id="uf-part" termo="participacao" rotulo="Como calculamos a participação em votações" />
          </div>
          <p className="text-[13px] leading-[18px] text-texto/75">
            Votações nominais do plenário {casa === "senado" ? "do Senado" : "da Câmara"} em 2023–2026, só as feitas durante o mandato de cada um. Licença não é descontada: o afastamento aparece ao lado do nome.
          </p>
        </div>

        {executivos.length > 0 && (
          <section aria-labelledby="uf-exec" className="grid gap-2">
            <h2 id="uf-exec" className="px-5 text-[13px] font-semibold tracking-[0.4px] text-suave uppercase">Eleitos em 2026 para o Executivo</h2>
            <div className="vidro overflow-hidden rounded-card">{executivos.map((e, i) => <LinhaExecutivo key={e.cargoChave} e={e} primeira={i === 0} />)}</div>
          </section>
        )}

        <p className="px-2 text-[13px] leading-[18px] text-suave">Fontes: TSE, Câmara e Senado. Cada número leva à página oficial.</p>
      </main>
    );
  }

  return (
    <main className="grid gap-5 pb-8 pt-3 lg:pt-6">
      <div className="grid gap-2 px-1 pt-1">
        <h1 className={TITULO_PAGINA}>Quem representa cada estado</h1>
        <p className="text-[17px] leading-[22px] text-suave">Toque no seu estado para ver quem te representa.</p>
      </div>

      <BuscaTopo tipo="politicos" />

      <section aria-labelledby="mapa-titulo" className="vidro grid gap-4 rounded-[32px] px-4 py-5">
        <div className="flex items-baseline justify-between gap-3 px-1">
          {regiao ? (
            <span className="flex items-baseline gap-2">
              <button type="button" onClick={voltarBrasil} className="text-[15px] font-semibold text-link">Brasil ›</button>
              <h2 id="mapa-titulo" className="text-xl font-semibold tracking-[-0.3px]">{regiao.nome}</h2>
            </span>
          ) : <h2 id="mapa-titulo" className="text-xl font-semibold tracking-[-0.3px]">Brasil</h2>}
          <span className="text-[13px] text-suave">toque num estado</span>
        </div>
        <div className="px-0.5 pt-1"><MapaBrasil cores={cores} sel="" nomes={NOME_UF} onPick={escolherUf} /></div>
        {regiao ? (
          <div className="flex flex-wrap justify-center gap-2">
            {regiao.ufs.map((u) => (
              <button key={u} type="button" onClick={() => escolherUf(u)} aria-label={NOME_UF[u]}
                className="flex size-12 items-center justify-center rounded-[14px] border text-sm font-semibold tracking-[0.2px] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] hover:brightness-125"
                style={{ background: `color-mix(in srgb, ${regiao.cor} 24%, transparent)`, borderColor: `color-mix(in srgb, ${regiao.cor} 55%, transparent)` }}>{u}</button>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-x-3.5 gap-y-2 text-xs text-texto/80">
            {REGIOES.map((r) => <span key={r.k} className="flex items-center gap-1.5"><span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: r.cor }} />{r.nome}</span>)}
          </div>
        )}
      </section>

      <section aria-labelledby="mapa-regioes" className="grid gap-2">
        <h2 id="mapa-regioes" className="px-5 text-[13px] font-semibold tracking-[0.4px] text-suave uppercase">Regiões</h2>
        <div className="vidro overflow-hidden rounded-card">
          {REGIOES.map((r, i) => (
            <button key={r.k} type="button" onClick={() => { setReg(r.k); window.scrollTo({ top: 0, behavior: "smooth" }); }} aria-pressed={reg === r.k}
              className={`flex min-h-[60px] w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-white/5 ${i ? "border-t border-borda" : ""}`}>
              <span aria-hidden="true" className="size-8 shrink-0 rounded-[10px] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]" style={{ background: r.cor }} />
              <span className="grid min-w-0 flex-1 gap-0.5"><span className="text-[17px] font-medium">{r.nome}</span><span className="text-[13px] text-suave">{listaUfs(r.ufs)}</span></span>
              {SETA}
            </button>
          ))}
        </div>
      </section>

      {/* No computador o mesmo cartão fica no menu lateral. */}
      <section className="vidro flex gap-3.5 rounded-card p-[18px] lg:hidden">
        <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[rgba(100,181,255,0.22)] text-[#64B5FF]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
        </span>
        <div className="grid gap-1.5">
          <h2 className="text-[17px] font-semibold">De onde vêm os dados?</h2>
          <p className="text-[15px] leading-5 text-texto/75">Só fontes oficiais: TSE, Câmara e Senado, com o link de cada número.</p>
          <Link href={hrefSecao("fontes")} className="inline-flex min-h-11 items-center text-[15px] font-semibold no-underline">Ver metodologia ›</Link>
        </div>
      </section>
    </main>
  );
}
