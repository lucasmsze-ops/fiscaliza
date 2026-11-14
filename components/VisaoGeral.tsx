"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { MunicipioJson } from "@/app/dados/municipios/route";
import { corPartido } from "@/lib/congresso";
import { APAGADO } from "@/lib/mapa-brasil";
import { NOME_UF, REGIOES, rotuloRegiao, regiaoDe, ufComArtigo } from "@/lib/regioes";
import type { Executivo, PessoaNoCargo, VisaoDados } from "@/lib/visao";
import { BotaoMonitorar, classeMonitorar } from "./BotaoMonitorar";
import { MapaBrasil } from "./MapaBrasil";
import { BOTAO, CARD, ROTULO, TITULO_CARTAO, TITULO_PAGINA, TITULO_SECAO, CHIP, CHIP_ON } from "@/lib/estilo";

const POR_PAGINA = 24;

const iniciais = (n: string) => n.split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("");
const fundoPartido = (partido: string, cores: string[]) => `color-mix(in srgb, ${corPartido(partido)} 22%, transparent)`;

function Foto({ p, tamanho, classe }: { p: PessoaNoCargo; tamanho: number; classe?: string }) {
  const dim = classe ? undefined : { width: tamanho, height: tamanho };
  return p.fotoUrl
    // <img> de propósito: a foto vem direto da URL oficial, sem passar pela Vercel (CLAUDE.md).
    ? <img src={p.fotoUrl} alt="" width={tamanho} height={tamanho} loading="lazy" decoding="async" className={`shrink-0 rounded-full bg-preench object-cover object-top ${classe ?? ""}`} style={dim} />
    : <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center rounded-full bg-preench text-sm font-semibold ${classe ?? ""}`} style={dim}>{iniciais(p.nomeUrna)}</span>;
}

function SelecaoPartido({ partido, cores }: { partido: string; cores: string[] }) {
  return <span className="inline-block rounded-lg px-2.5 py-0.5 text-[11px] font-semibold" style={{ background: fundoPartido(partido, cores) }}>{partido}</span>;
}

/** Botão do estilo do protótipo (borda, raio 12). */
const btn = CHIP;
const btnOn = CHIP_ON;

/** Um nível de representação (Presidente, Governador, Senadores): subtítulo e os cartões. */
function Nivel({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <h3 className={ROTULO}>{titulo}</h3>
      {children}
    </div>
  );
}

/** Presidente ou governador eleito em 2026 (TSE): o cartão abre o crachá do executivo. */
function CartaoExecutivo({ e }: { e: Executivo }) {
  return (
    <Link href={`/executivos/${e.cargoChave === "presidente" ? "presidente" : (e.uf ?? "").toLowerCase()}`} className="flex items-center gap-3 rounded-xl bg-preench p-2.5 text-texto no-underline hover:bg-preench-forte">
      {e.fotoUrl
        // <img> de propósito: a foto vem direto da URL oficial do TSE, sem passar pela Vercel (CLAUDE.md).
        ? <img src={e.fotoUrl} alt="" width={40} height={40} loading="lazy" className="size-10 shrink-0 rounded-full bg-preench object-cover object-top" />
        : <span aria-hidden="true" className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-preench text-sm font-semibold">{iniciais(e.nomeUrna)}</span>}
      <span className="grid flex-1">
        <strong className="text-[13px]">{e.nomeUrna}</strong>
        <span className="text-xs text-suave">Eleit{e.feminino ? "a" : "o"} em 2026 · posse em {Number(e.posse.slice(8, 10))}/{Number(e.posse.slice(5, 7))}/{e.posse.slice(0, 4)}</span>
      </span>
      <SelecaoPartido partido={e.partido} cores={[]} />
    </Link>
  );
}

export function VisaoGeral({ d }: { d: VisaoDados }) {
  const [reg, setReg] = useState("");
  const [uf, setUf] = useState("");
  const [cidade, setCidade] = useState<{ nome: string; uf: string; ibge: number } | null>(null);
  const pedido = useRef<Promise<MunicipioJson[]> | null>(null);
  const [lim, setLim] = useState(POR_PAGINA);
  const listaRef = useRef<HTMLElement>(null);

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
    return [u, regiao && !uf && r.k !== regiao.k ? APAGADO : r.cor];
  }));

  function escolherUf(u: string) { setUf(u); setReg(regiaoDe(u)!.k); setCidade(null); setLim(POR_PAGINA); marcarUrl(u); }
  function voltarBrasil() { setUf(""); setReg(""); setCidade(null); marcarUrl(""); }
  const irParaLista = () => requestAnimationFrame(() => listaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));

  const doEstado = uf ? d.pessoas.filter((p) => p.uf === uf) : [];
  const senadores = doEstado.filter((p) => p.casa === "senado");
  const deputados = doEstado.filter((p) => p.casa === "camara");
  const presidente = d.executivos?.find((e) => e.cargoChave === "presidente") ?? null;
  const governador = uf ? d.executivos?.find((e) => e.cargoChave === "governador" && e.uf === uf) ?? null : null;

  return (
    <main className="grid gap-6 pb-8">
      <section aria-labelledby="titulo-mapa" className={`grid gap-4 ${CARD}`}>
        <div className="flex flex-wrap items-end justify-between gap-3.5">
          <div>
            <h1 id="titulo-mapa" className={TITULO_CARTAO}>Quem representa cada estado</h1>
            <p className="mt-1 text-[13px] text-suave">Toque no seu estado para ver quem te representa.</p>
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
                <p className={`${ROTULO} mb-1`}>Regiões</p>
                {REGIOES.map((r) => (
                  <button key={r.k} type="button" onClick={() => setReg(r.k)} className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-preench-forte">
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-xs font-semibold" style={{ background: r.cor, color: rotuloRegiao(r.cor) }}>{r.k}</span>
                    <span className="grid flex-1"><strong className="text-sm">{r.nome}</strong><span className="text-xs text-suave">{r.ufs.join(" · ")}</span></span>
                    <span aria-hidden="true" className="text-suave">›</span>
                  </button>
                ))}
              </div>
            )}

            {!uf && regiao && (
              <div className="grid gap-2.5">
                <button type="button" onClick={voltarBrasil} className={`${btn} justify-self-start`}>← Brasil</button>
                <h2 className="text-base font-semibold">{regiao.nome}</h2>
                <div className="grid grid-cols-2 gap-2">
                  {regiao.ufs.map((u) => <button key={u} type="button" onClick={() => escolherUf(u)} className={`${btn} h-10 text-left`}>{u} · {NOME_UF[u]}</button>)}
                </div>
              </div>
            )}

            {uf && (
              <div className="grid gap-2.5">
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={voltarBrasil} className={btn}>← Brasil</button>
                  <button type="button" onClick={() => { setUf(""); setCidade(null); marcarUrl(""); }} className={btn}>← {regiao?.nome}</button>
                </div>
                <div className="mt-1">
                  <p className="text-xs text-suave">{cidade ? `${cidade.nome} · ${uf}` : "Estado inteiro"}</p>
                  <h2 className={TITULO_SECAO}>Quem representa {cidade ? cidade.nome : ufComArtigo(uf)}</h2>
                </div>
                {cidade && <p className="text-xs text-suave">Senadores e deputados federais são eleitos pelo estado inteiro: quem mora em {cidade.nome} é representado pelos de {NOME_UF[uf]}. Prefeito e vereadores entram depois.</p>}
                {presidente && <Nivel titulo="Presidente"><CartaoExecutivo e={presidente} /></Nivel>}
                {governador && <Nivel titulo="Governador"><CartaoExecutivo e={governador} /></Nivel>}
                {senadores.length > 0 && (
                  <Nivel titulo="Senadores">
                    {senadores.map((p) => (
                      <div key={p.id} className="relative flex items-center gap-3 rounded-xl bg-preench p-2.5 hover:bg-preench-forte">
                        <Foto p={p} tamanho={40} />
                        <span className="grid min-w-0 flex-1">
                          <Link href={`/p/${p.id}`} className="line-clamp-2 text-[13px] leading-snug font-semibold text-texto no-underline after:absolute after:inset-0">{p.nomeUrna}</Link>
                          <span className="text-xs text-suave">Em exercício</span>
                        </span>
                        <SelecaoPartido partido={p.partido} cores={d.cores} />
                      </div>
                    ))}
                  </Nivel>
                )}
                <div className="grid grid-cols-2 gap-2.5">
                  <button type="button" onClick={irParaLista} className="rounded-xl bg-preench p-3 text-left hover:bg-preench-forte">
                    <span className="block text-lg font-semibold tabular-nums">{deputados.length}</span><span className="text-xs text-suave">deputados federais ↓</span>
                  </button>
                  <div className="rounded-xl bg-preench p-3">
                    <span className="block text-lg font-semibold tabular-nums">{(d.municipiosPorUf[uf] ?? 0).toLocaleString("pt-BR")}</span><span className="text-xs text-suave">municípios</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {uf && (
        <section ref={listaRef} aria-labelledby="titulo-lista" className={`grid scroll-mt-4 gap-3.5 ${CARD}`}>
          <div>
            <h2 id="titulo-lista" className={TITULO_SECAO}>Deputados federais</h2>
            <p className="mt-1 text-[13px] text-suave">{NOME_UF[uf]} · <strong className="text-texto">{deputados.length}</strong> em exercício hoje, em ordem alfabética</p>
          </div>
          {/* Cartões em grade também no celular: 2 por fileira, 3 a partir de 480 px (pedido de 2026-11-14). */}
          <div className="grid grid-cols-2 gap-2 min-[480px]:grid-cols-3 sm:gap-4 sm:[grid-template-columns:repeat(auto-fill,minmax(180px,1fr))]">
            {deputados.slice(0, lim).map((p) => (
              <div key={p.id} className="relative flex flex-col items-center gap-1 rounded-card bg-preench p-2.5 text-center text-texto hover:bg-preench-forte sm:p-4">
                <Foto p={p} tamanho={64} classe="size-14 sm:size-16" />
                <span className="grid w-full min-w-0 justify-items-center gap-0.5">
                  {/* Link esticado: o cartão inteiro abre o crachá, e o "Monitorar" fica por cima. */}
                  <Link href={`/p/${p.id}`} className="mt-1 line-clamp-2 text-[13px] leading-tight font-semibold text-texto no-underline after:absolute after:inset-0 after:rounded-card">{p.nomeUrna}</Link>
                  <span className="mt-0.5"><SelecaoPartido partido={p.partido} cores={d.cores} /></span>
                </span>
                {/* mt-auto: o botão fica no pé do cartão, alinhado entre vizinhos mesmo quando o nome quebra em duas linhas. */}
                <span className="relative z-10 mt-auto pt-1"><BotaoMonitorar id={p.id} nome={p.nomeUrna} classe={classeMonitorar} /></span>
              </div>
            ))}
          </div>
          {deputados.length > lim && (
            <button type="button" onClick={() => setLim((l) => l + POR_PAGINA)} className={`${BOTAO} justify-self-center`}>Ver mais ({deputados.length - lim})</button>
          )}
        </section>
      )}
    </main>
  );
}
