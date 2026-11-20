"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { MunicipioJson } from "@/app/dados/municipios/route";
import { NOME_UF, REGIOES, regiaoDe } from "@/lib/regioes";
import type { Executivo, PessoaNoCargo, VisaoDados } from "@/lib/visao";
import { BuscaTopo } from "./BuscaTopo";
import { ChipPartido } from "./ChipPartido";
import { MapaBrasil } from "./MapaBrasil";
import { CHIP, CHIP_ON, SEGMENTO, SEGMENTO_ON, SEGMENTOS, TITULO_PAGINA } from "@/lib/estilo";

const POR_PAGINA = 24;
const iniciais = (n: string) => n.split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("");
const pct = (v: number) => `${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
const inteiro = (v: number) => v.toLocaleString("pt-BR");
const LINHA = "flex min-h-16 items-center gap-3 px-4 py-2.5 text-texto no-underline hover:bg-white/5 hover:text-texto";
const CTA = "inline-flex min-h-11 items-center text-[15px] font-semibold no-underline";
type Aba = "executivo" | "senado" | "camara";
type Quando = "futuro" | "hoje";

/** Foto oficial redonda (ou as iniciais no círculo azul do protótipo). */
function Rosto({ nome, foto, tamanho = 48 }: { nome: string; foto: string | null; tamanho?: number }) {
  return foto
    // <img> de propósito: a foto vem direto da URL oficial, sem passar pela Vercel (CLAUDE.md).
    ? <img src={foto} alt="" width={tamanho} height={tamanho} loading="lazy" decoding="async" className="shrink-0 rounded-full border border-[rgba(64,156,255,0.45)] bg-[rgba(64,156,255,0.2)] object-cover object-top" style={{ width: tamanho, height: tamanho }} />
    : <span aria-hidden="true" className="inline-flex shrink-0 items-center justify-center rounded-full border border-[rgba(64,156,255,0.45)] bg-[rgba(64,156,255,0.2)] text-[15px] font-semibold text-[#CFE6FF]" style={{ width: tamanho, height: tamanho }}>{iniciais(nome)}</span>;
}

/** Linha da lista de deputados: rosto, nome, partido e o contexto; participação à direita, quando há mandato. */
function LinhaPessoa({ p, primeira }: { p: PessoaNoCargo; primeira: boolean }) {
  return (
    <Link href={`/p/${p.id}`} className={`${LINHA} ${primeira ? "" : "border-t border-borda"}`}>
      <Rosto nome={p.nomeUrna} foto={p.fotoUrl} />
      <span className="grid min-w-0 flex-1 gap-[3px]">
        <span className="text-base font-semibold tracking-[0.1px]">{p.nomeUrna}</span>
        <span className="flex flex-wrap items-center gap-1.5"><ChipPartido sigla={p.partido} />{p.nota && <span className="text-[13px] text-suave">{p.nota}</span>}</span>
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

/** Cartão de quem governa ou vai governar (aba Executivo): foto, cargo, partido, contexto e o crachá. */
function CartaoExecutivo({ e, quando }: { e: Executivo; quando: Quando }) {
  const cargo = e.cargoChave === "presidente"
    ? (quando === "hoje" ? (e.feminino ? "Presidenta" : "Presidente") : (e.feminino ? "Presidenta eleita" : "Presidente eleito"))
    : (quando === "hoje" ? (e.feminino ? "Governadora" : "Governador") : (e.feminino ? "Governadora eleita" : "Governador eleito"));
  const href = `/executivos/${e.cargoChave === "presidente" ? "presidente" : (e.uf ?? "").toLowerCase()}`;
  const posse = `posse em ${Number(e.posse.slice(8, 10))}/${Number(e.posse.slice(5, 7))}/${e.posse.slice(0, 4)}`;
  return (
    <article className="vidro grid gap-3 rounded-card p-4">
      <div className="flex items-center gap-3.5">
        <Rosto nome={e.nomeUrna} foto={e.fotoUrl} tamanho={64} />
        <div className="grid min-w-0 gap-1">
          <span className="text-xs font-semibold tracking-[0.3px] text-suave uppercase">{cargo}</span>
          <h3 className="text-xl leading-6 font-bold">{e.nomeUrna}</h3>
          <span className="flex flex-wrap items-center gap-1.5"><ChipPartido sigla={e.partido} /><span className="text-[13px] text-suave">{quando === "hoje" ? e.nota : posse}</span></span>
        </div>
      </div>
      <Link href={href} className={`${CTA} border-t border-borda`}>Ver crachá, votos e plano de governo ›</Link>
    </article>
  );
}

/** Cartão do senador (aba Senadores): foto, cargo, partido, o contexto do mandato e o crachá. */
function CartaoParlamentar({ p, quando }: { p: PessoaNoCargo; quando: Quando }) {
  return (
    <article className="vidro grid gap-3 rounded-card p-4">
      <div className="flex items-center gap-3.5">
        <Rosto nome={p.nomeUrna} foto={p.fotoUrl} tamanho={64} />
        <div className="grid min-w-0 gap-1">
          <span className="text-xs font-semibold tracking-[0.3px] text-suave uppercase">{quando === "hoje" ? `${p.cargo} em exercício` : p.cargo}</span>
          <h3 className="text-xl leading-6 font-bold">{p.nomeUrna}</h3>
          <span className="flex flex-wrap items-center gap-1.5"><ChipPartido sigla={p.partido} />{p.nota && <span className="text-[13px] text-suave">{p.nota}</span>}</span>
        </div>
      </div>
      <Link href={`/p/${p.id}`} className={`${CTA} border-t border-borda`}>Ver crachá ›</Link>
    </article>
  );
}

/**
 * Mapa (/mapa) no visual do protótipo Liquid Glass, com o estado na mesma tela (pedido de 2026-11-20): busca e mapa;
 * tocando num estado, ele fica marcado no mapa e "Quem representa" abre embaixo, em três abas (Executivo, Senadores,
 * Deputados), cada uma com o filtro "A partir de" (a composição que toma posse em 2027, escolhida de início) e "Hoje".
 */
export function VisaoGeral({ d }: { d: VisaoDados }) {
  const [uf, setUf] = useState("");
  const [aba, setAba] = useState<Aba>("executivo");
  const [quando, setQuando] = useState<Quando>("futuro");
  const [cidade, setCidade] = useState<{ nome: string; uf: string; ibge: number } | null>(null);
  const pedido = useRef<Promise<MunicipioJson[]> | null>(null);
  const secao = useRef<HTMLElement>(null);
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
    if (u && NOME_UF[u]) { setUf(u); return; }
    const ibge = Number(p.get("cidade"));
    if (ibge) carregarMunicipios().then((ms) => {
      const m = ms.find(([i]) => i === ibge);
      if (m) { setUf(m[2]); setCidade({ ibge: m[0], nome: m[1], uf: m[2] }); }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function escolherUf(u: string) {
    setUf(u); setCidade(null); setLim(POR_PAGINA); marcarUrl(u);
    // A seção abre embaixo do mapa: rola até ela, sem sair da tela.
    requestAnimationFrame(() => secao.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
  function limpar() { setUf(""); setCidade(null); marcarUrl(""); }

  const cores = Object.fromEntries(Object.keys(NOME_UF).map((u) => [u, regiaoDe(u)!.cor]));
  const futuro = quando === "futuro";
  const daUf = (ps: PessoaNoCargo[], casa: "senado" | "camara") => ps.filter((p) => p.uf === uf && p.casa === casa);
  const senadores = daUf(futuro ? d.futuro : d.pessoas, "senado");
  const deputados = daUf(futuro ? d.futuro : d.pessoas, "camara");
  const fonteEx = futuro ? d.executivos ?? [] : d.executivosHoje;
  const presidente = fonteEx.find((e) => e.cargoChave === "presidente") ?? null;
  const governador = fonteEx.find((e) => e.cargoChave === "governador" && e.uf === uf) ?? null;
  const executivos = [presidente, governador].filter((e): e is Executivo => !!e);
  const contagem: Record<Aba, number> = { executivo: executivos.length, senado: senadores.length, camara: deputados.length };
  const aPartir = aba === "executivo" ? "A partir de jan/2027" : "A partir de fev/2027";

  return (
    <main className="grid gap-5 pb-8 pt-3 lg:pt-6 [&>*]:min-w-0">
      <div className="grid gap-2 px-1 pt-1">
        <h1 className={TITULO_PAGINA}>Quem representa cada estado</h1>
        <p className="text-[17px] leading-[22px] text-suave">Toque no seu estado para ver quem te representa.</p>
      </div>

      <BuscaTopo tipo="politicos" />

      <section aria-labelledby="mapa-titulo" className="vidro grid gap-4 rounded-[32px] px-4 py-5">
        <div className="flex items-center justify-between gap-3 px-1">
          <h2 id="mapa-titulo" className="text-xl font-semibold tracking-[-0.3px]">{uf ? NOME_UF[uf] : "Brasil"}</h2>
          {uf
            ? <button type="button" onClick={limpar} className="inline-flex h-9 items-center rounded-full border border-white/16 bg-white/8 px-3.5 text-[13px] font-semibold text-texto">Ver o Brasil</button>
            : <span className="text-[13px] text-suave">toque num estado</span>}
        </div>
        <div className="px-0.5 pt-1"><MapaBrasil cores={cores} sel={uf} nomes={NOME_UF} onPick={escolherUf} /></div>
        <div className="flex flex-wrap justify-center gap-x-3.5 gap-y-2 text-xs text-texto/80">
          {REGIOES.map((r) => <span key={r.k} className="flex items-center gap-1.5"><span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: r.cor }} />{r.nome}</span>)}
        </div>
      </section>

      {uf && (
        <section ref={secao} aria-labelledby="uf-titulo" className="grid scroll-mt-4 gap-[18px] [&>*]:min-w-0">
          <div className="grid gap-1 px-1">
            <h2 id="uf-titulo" className="text-[28px] leading-[34px] font-bold tracking-[-0.4px]">Quem representa {cidade ? cidade.nome : NOME_UF[uf]}</h2>
            {cidade && <p className="text-[13px] text-suave">Senadores e deputados federais são eleitos pelo estado inteiro: quem mora em {cidade.nome} é representado pelos de {NOME_UF[uf]}.</p>}
          </div>

          <div role="tablist" aria-label="Quem representa" className={`${SEGMENTOS} grid-cols-3`}>
            {([["executivo", "Executivo"], ["senado", "Senadores"], ["camara", "Deputados"]] as const).map(([k, l]) => (
              <button key={k} type="button" role="tab" aria-selected={aba === k} onClick={() => { setAba(k); setLim(POR_PAGINA); }} className={`${aba === k ? SEGMENTO_ON : SEGMENTO} px-1 text-[13px] whitespace-nowrap`}>
                {l} <span className="font-normal opacity-70">{contagem[k]}</span>
              </button>
            ))}
          </div>

          {/* Filtro de período em cada aba, como no Congresso: a composição que toma posse em 2027 vem escolhida. */}
          <div role="group" aria-label="Período" className="flex flex-wrap gap-2">
            <button type="button" aria-pressed={futuro} onClick={() => { setQuando("futuro"); setLim(POR_PAGINA); }} className={futuro ? CHIP_ON : CHIP}>{aPartir}</button>
            <button type="button" aria-pressed={!futuro} onClick={() => { setQuando("hoje"); setLim(POR_PAGINA); }} className={!futuro ? CHIP_ON : CHIP}>Hoje</button>
          </div>

          {aba === "executivo" && (
            <div role="tabpanel" className="grid gap-3">
              {executivos.map((e) => <CartaoExecutivo key={e.cargoChave} e={e} quando={quando} />)}
              {futuro && executivos.length === 0 && <p className="vidro rounded-card p-4 text-[15px] text-suave">Os eleitos de 2026 ainda não foram publicados.</p>}
              {!futuro && !governador && (
                <p className="vidro rounded-card p-4 text-[15px] leading-relaxed text-texto/80">
                  Quem governa {NOME_UF[uf]} hoje não tem fonte oficial aberta: o TSE registra quem foi eleito, não renúncias e substituições
                  (muitos governadores deixaram o cargo em 2026 para disputar outras eleições). O site mostra o governador de hoje quando foi
                  reeleito, porque quem disputa a reeleição não deixa o cargo.
                </p>
              )}
              <p className="px-2 text-[13px] leading-[18px] text-suave">
                {futuro ? "Eleitos em 2026, segundo o TSE. A posse é em 5 de janeiro (presidente) e 6 de janeiro de 2027 (governadores)." : "Hoje: eleitos em 2022 e reeleitos em 2026, segundo o TSE."}
              </p>
            </div>
          )}

          {aba === "senado" && (
            <div role="tabpanel" className="grid gap-3">
              {senadores.map((p) => <CartaoParlamentar key={p.id} p={p} quando={quando} />)}
              {senadores.length === 0 && <p className="vidro rounded-card p-4 text-[15px] text-suave">Ninguém para mostrar.</p>}
              {futuro && senadores.length < 3 && (
                <p className="px-2 text-[13px] leading-[18px] text-suave">A cadeira eleita em 2022 está hoje com um suplente ou não tem titular empossado em 2023 no registro: veja em “Hoje”.</p>
              )}
              <p className="px-2 text-[13px] leading-[18px] text-suave">
                {futuro ? "A partir de 1º/2/2027: os dois eleitos em 2026 e quem foi eleito em 2022 (mandato até 2031)." : "Em exercício hoje (licenciado dá lugar ao suplente)."}
              </p>
            </div>
          )}

          {aba === "camara" && (
            <div role="tabpanel" className="grid gap-[18px]">
              <div className="vidro overflow-hidden rounded-card">
                {deputados.slice(0, lim).map((p, i) => <LinhaPessoa key={p.id} p={p} primeira={i === 0} />)}
                {deputados.length === 0 && <p className="p-4 text-[15px] text-suave">Ninguém para mostrar.</p>}
              </div>
              {deputados.length > lim && (
                <button type="button" onClick={() => setLim(deputados.length)} className="vidro flex min-h-[52px] items-center justify-center rounded-card text-base font-semibold text-link">
                  Ver os {deputados.length} deputados ›
                </button>
              )}
              <p className="px-2 text-[13px] leading-[18px] text-suave">
                {futuro ? "Eleitos em 2026, que tomam posse em 1º/2/2027; a participação aparece para quem já tem mandato." : "Em exercício hoje, com a participação nas votações do mandato (2023–2026)."}
              </p>
            </div>
          )}

          <p className="px-2 text-[13px] leading-[18px] text-suave">Fontes: TSE, Câmara e Senado. Cada número leva à página oficial.</p>
        </section>
      )}
    </main>
  );
}
