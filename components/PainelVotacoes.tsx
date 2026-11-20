"use client";

import { useState } from "react";
import type { VotacaoResumo, VotacoesDados } from "@/lib/congresso";
import type { ItemPauta } from "@/lib/types";
import { tipoPorExtenso } from "@/lib/votacao";
import { manchete } from "@/lib/titulo";
import { BuscaTopo } from "./BuscaTopo";
import { CartaoVotacao, Tema } from "./CartaoVotacao";
import { ReceberAvisos } from "./ReceberAvisos";
import { CARD, TITULO_PAGINA, CHIP, SEGMENTO, SEGMENTO_ON, SEGMENTOS } from "@/lib/estilo";

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const DIA_SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const externo = { target: "_blank", rel: "noreferrer noopener" } as const;
const chipOff = CHIP;
const card = CARD;
type Casa = "camara" | "senado";
const NOME: Record<Casa, string> = { camara: "Câmara", senado: "Senado" };

const somaMes = (mes: string, m: number) => { const d = new Date(`${mes}-01T12:00:00Z`); d.setUTCMonth(d.getUTCMonth() + m); return d.toISOString().slice(0, 7); };
const diaLongo = (iso: string) => { const d = new Date(`${iso}T12:00:00Z`); return `${DIA_SEMANA[d.getUTCDay()]}, ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`; };
/** "ter, 17/11": para os cartões, onde a data longa quebrava em duas linhas. */
const diaCurto = (iso: string) => `${SEMANA[new Date(`${iso}T12:00:00Z`).getUTCDay()]}, ${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
/** Só a primeira letra maiúscula ("Novembro de 2026"; a classe `capitalize` fazia "Novembro De 2026"). */
const inicial = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** Item da pauta (protótipo Liquid Glass): Casa e hora em azul, temas, o assunto, a matéria e o "Avisar" (fake door, CLAUDE.md). */
function CartaoPauta({ x }: { x: ItemPauta }) {
  const assunto = manchete(x.relacionada ? (x.ementaRelacionada ?? x.ementa) : x.ementa);
  return (
    <div className="vidro grid content-start gap-2.5 rounded-card p-[18px]">
      <span className="text-[13px] font-semibold text-link">{NOME[x.casa]} · {diaCurto(x.data)}{x.hora ? ` · ${x.hora.replace(":00", "h").replace(":", "h")}` : ""}</span>
      {x.temas && x.temas.length > 0 && <span className="flex flex-wrap gap-1.5">{x.temas.slice(0, 2).map((t) => <Tema key={t} t={t} />)}</span>}
      <a href={x.urlOficial} {...externo} className="text-[15px] leading-5 font-semibold text-texto no-underline hover:text-texto hover:underline">{assunto || x.materia}</a>
      <span className="text-[13px] text-suave">
        {x.relacionada ? <>Pedido ({x.materia}) sobre {x.relacionada}{tipoPorExtenso(x.relacionada) ? ` · ${tipoPorExtenso(x.relacionada)}` : ""}</> : <>{x.materia}{tipoPorExtenso(x.materia) ? ` · ${tipoPorExtenso(x.materia)}` : ""}</>}
        {x.apreciacao ? ` · ${x.apreciacao}` : ""}
      </span>
      <ReceberAvisos id={`pauta-${x.id.replaceAll(":", "-")}`} sobre="desta votação" pequeno />
    </div>
  );
}

/**
 * Tela Votações (pedido de 2026-11-13; ordem trocada em 2026-11-14): primeiro o que já foi votado (última
 * sessão de cada Casa), depois o que está marcado (pauta, coleta diária), cada lista com Câmara ou Senado. O calendário fica atrás de um botão e serve de filtro
 * por dia (passado: votações nominais; futuro: a pauta).
 */
export function PainelVotacoes({ pauta, porDia, mesInicial, votacoesMes, ultimaSessao, coleta }:
  Pick<VotacoesDados, "porDia" | "mesInicial" | "votacoesMes" | "ultimaSessao"> & { pauta: ItemPauta[]; coleta: string | null }) {
  const [casaUlt, setCasaUlt] = useState<Casa>(ultimaSessao[0]?.casa ?? "camara");
  const [dia, setDia] = useState<string | null>(null);
  const [calendario, setCalendario] = useState(false);
  const [mes, setMes] = useState(mesInicial);
  const [porMes, setPorMes] = useState<Record<string, VotacaoResumo[]>>({ [mesInicial]: votacoesMes });

  const diasPauta = new Set(pauta.map((x) => x.data));
  const datas = Object.keys(porDia).sort();
  const primeiro = datas[0]?.slice(0, 7) ?? mesInicial;
  const ultimo = [mesInicial, ...pauta.map((x) => x.data.slice(0, 7))].sort().at(-1)!;

  function carregarMes(m: string) {
    if (porMes[m] || m > mesInicial) return;
    fetch(`/dados/votacoes/${m}`).then(async (r) => { if (r.ok) { const vs = await r.json() as VotacaoResumo[]; setPorMes((p) => ({ ...p, [m]: vs })); } }).catch(() => {});
  }
  function escolherDia(d: string) { setDia(d); setCalendario(false); carregarMes(d.slice(0, 7)); }

  const [ano, m] = mes.split("-").map(Number) as [number, number];
  const offset = new Date(Date.UTC(ano, m - 1, 1)).getUTCDay();
  const nDias = new Date(Date.UTC(ano, m, 0)).getUTCDate();

  const sessao = ultimaSessao.find((s) => s.casa === casaUlt);
  const doDiaPauta = dia ? pauta.filter((x) => x.data === dia) : [];
  const doDiaVotos = dia ? (porMes[dia.slice(0, 7)] ?? []).filter((v) => v.data === dia) : [];
  const carregandoDia = dia && !porMes[dia.slice(0, 7)] && dia.slice(0, 7) <= mesInicial;

  const dataUlt = (c: Casa) => { const d = ultimaSessao.find((x) => x.casa === c)?.data; return d ? ddmm(d) : "—"; };
  const nPauta = (c: Casa) => pauta.filter((x) => x.casa === c).length;

  return (
    <main className="grid gap-[18px] pb-8">
      {/* Título, a data da coleta e o filtro por dia (protótipo Liquid Glass). */}
      <header className="grid gap-1.5 px-1">
        <h1 className={TITULO_PAGINA}>Votações do Plenário</h1>
        <div className="flex items-center justify-between gap-2.5">
          <p className="text-[13px] text-suave">{coleta ? `Atualizado em ${new Date(coleta).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}` : ""}</p>
          <button type="button" aria-expanded={calendario} aria-controls="calendario" onClick={() => setCalendario(!calendario)}
            className={`vidro inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-texto ${calendario ? "!bg-[rgba(64,156,255,0.28)]" : "hover:bg-preench-forte"}`}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" /></svg>
            Filtrar por dia
          </button>
        </div>
        {dia && (
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            Mostrando <strong>{diaLongo(dia)}</strong>
            <button type="button" onClick={() => setDia(null)} className={chipOff}>Tirar o filtro ×</button>
          </p>
        )}
      </header>

      <BuscaTopo tipo="votacoes" />

      {calendario && (
        <section id="calendario" aria-label="Calendário" className={`${card} grid max-w-[460px] gap-2`}>
          <div className="flex items-center justify-between gap-2">
            <strong className="text-sm">{inicial(`${MESES[m - 1]} de ${ano}`)}</strong>
            <div className="flex gap-1.5">
              <button type="button" aria-label="Mês anterior" disabled={mes <= primeiro} onClick={() => setMes(somaMes(mes, -1))} className={`${chipOff} disabled:opacity-30`}>‹</button>
              <button type="button" aria-label="Próximo mês" disabled={mes >= ultimo} onClick={() => setMes(somaMes(mes, 1))} className={`${chipOff} disabled:opacity-30`}>›</button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-suave">{SEMANA.map((s) => <span key={s}>{s}</span>)}</div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: offset }, (_, i) => <span key={`v${i}`} />)}
            {Array.from({ length: nDias }, (_, i) => {
              const d = `${mes}-${String(i + 1).padStart(2, "0")}`;
              const votou = (porDia[d]?.camara ?? 0) + (porDia[d]?.senado ?? 0) > 0;
              const marcada = diasPauta.has(d);
              // Só dias úteis: o Plenário vota de segunda a sexta.
              const util = ![0, 6].includes((offset + i) % 7);
              return (
                <button key={d} type="button" disabled={!util} onClick={() => escolherDia(d)} aria-pressed={d === dia}
                  aria-label={`${i + 1} de ${MESES[m - 1]}${votou ? ": com votação" : marcada ? ": com pauta marcada" : ""}`}
                  className={`flex h-[44px] flex-col items-center justify-center gap-1 rounded-[12px] border text-[13px] disabled:cursor-default disabled:opacity-30 ${d === dia ? "border-link bg-preench-forte font-semibold" : "border-transparent enabled:hover:bg-preench-forte"}`}>
                  <span>{i + 1}</span>
                  <span aria-hidden="true" className={`size-1.5 rounded-full ${votou ? "bg-verde" : marcada ? "border border-verde" : ""}`} />
                </button>
              );
            })}
          </div>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-suave">
            <span className="flex items-center gap-1.5"><span aria-hidden="true" className="size-1.5 rounded-full bg-verde" /> com votação nominal</span>
            <span className="flex items-center gap-1.5"><span aria-hidden="true" className="size-1.5 rounded-full border border-verde" /> com pauta marcada</span>
          </p>
        </section>
      )}

      {dia ? (
        <section className="grid gap-3" aria-labelledby="vt-dia">
          <h2 id="vt-dia" className="px-1 text-[22px] font-bold tracking-[-0.3px]">{inicial(diaLongo(dia))}</h2>
          {carregandoDia && <p className="px-1 text-sm text-suave">Carregando…</p>}
          {!carregandoDia && doDiaPauta.length === 0 && doDiaVotos.length === 0 && (
            <p className="px-1 text-sm text-suave">Nenhuma votação nominal nem pauta marcada no Plenário neste dia.</p>
          )}
          {doDiaPauta.length > 0 && <>
            <h3 className="px-1 text-[15px] font-semibold">Na pauta</h3>
            <div className="grid gap-3 md:grid-cols-2">{doDiaPauta.map((x) => <CartaoPauta key={x.id} x={x} />)}</div>
          </>}
          {doDiaVotos.length > 0 && <>
            <h3 className="px-1 text-[15px] font-semibold">Votado</h3>
            <div className="grid gap-3 md:grid-cols-2">{doDiaVotos.map((v) => <CartaoVotacao key={v.id} v={v} />)}</div>
          </>}
        </section>
      ) : <>
        <section className="grid gap-[18px]" aria-labelledby="vt-ult">
          <h2 id="vt-ult" className="px-1 pt-1 text-[22px] font-bold tracking-[-0.3px]">Últimas votações</h2>
          <div role="group" aria-label="Casa das últimas votações" className={`${SEGMENTOS} grid-cols-2`}>
            {(["camara", "senado"] as const).map((c) => (
              <button key={c} type="button" aria-pressed={casaUlt === c} onClick={() => setCasaUlt(c)} className={casaUlt === c ? SEGMENTO_ON : SEGMENTO}>{NOME[c]} · {dataUlt(c)}</button>
            ))}
          </div>
          {sessao ? (
            <div className="grid gap-[18px] md:grid-cols-2">{sessao.votacoes.map((v) => <CartaoVotacao key={v.id} v={v} />)}</div>
          ) : <p className="px-1 text-sm text-suave">Nenhuma votação nominal registrada.</p>}
        </section>

        <section className="grid gap-[18px]" aria-labelledby="vt-prox">
          <div className="flex items-baseline justify-between gap-3 px-1 pt-3">
            <h2 id="vt-prox" className="text-[22px] font-bold tracking-[-0.3px]">Próximas votações</h2>
            <span className="text-[13px] text-suave">Câmara · {nPauta("camara")} · Senado · {nPauta("senado")}</span>
          </div>
          {pauta.length === 0 ? (
            <p className="px-1 text-sm text-suave">Nenhuma sessão deliberativa com pauta marcada por enquanto. A pauta costuma sair poucos dias antes da sessão.</p>
          ) : (
            <div className="grid gap-[18px] md:grid-cols-2">{[...pauta].sort((a, b) => a.data.localeCompare(b.data) || a.casa.localeCompare(b.casa) || a.ordem - b.ordem).map((x) => <CartaoPauta key={x.id} x={x} />)}</div>
          )}
        </section>
      </>}
    </main>
  );
}
