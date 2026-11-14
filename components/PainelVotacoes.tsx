"use client";

import { useState } from "react";
import type { VotacaoResumo, VotacoesDados } from "@/lib/congresso";
import type { ItemPauta } from "@/lib/types";
import { tipoPorExtenso } from "@/lib/votacao";
import { CartaoVotacao } from "./CartaoVotacao";
import { ReceberAvisos } from "./ReceberAvisos";
import { CARD, TITULO_CARTAO, TITULO_PAGINA, TITULO_SECAO } from "@/lib/estilo";

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const DIA_SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const externo = { target: "_blank", rel: "noreferrer noopener" } as const;
const chip = "inline-flex h-9 items-center gap-1.5 rounded-xl border px-3.5 text-xs font-bold whitespace-nowrap";
const chipOff = `${chip} border-borda bg-card hover:border-destaque`;
const chipOn = `${chip} border-destaque bg-destaque text-destaque-texto`;
const card = CARD;
type Casa = "camara" | "senado";
const NOME: Record<Casa, string> = { camara: "Câmara", senado: "Senado" };

const somaMes = (mes: string, m: number) => { const d = new Date(`${mes}-01T12:00:00Z`); d.setUTCMonth(d.getUTCMonth() + m); return d.toISOString().slice(0, 7); };
const diaLongo = (iso: string) => { const d = new Date(`${iso}T12:00:00Z`); return `${DIA_SEMANA[d.getUTCDay()]}, ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`; };
/** "ter, 17/11": para os cartões, onde a data longa quebrava em duas linhas. */
const diaCurto = (iso: string) => `${SEMANA[new Date(`${iso}T12:00:00Z`).getUTCDay()]}, ${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** Item da pauta: o assunto em destaque, a matéria pequena, e o "Receber aviso" (fake door, CLAUDE.md). */
function CartaoPauta({ x }: { x: ItemPauta }) {
  const assunto = x.relacionada ? (x.ementaRelacionada ?? x.ementa) : x.ementa;
  return (
    <div className="grid content-start gap-2 rounded-xl border border-borda bg-card p-3.5">
      <span className="flex items-center justify-between gap-2">
        <span className="text-xs text-suave">{NOME[x.casa]} · {diaCurto(x.data)}{x.hora ? ` · ${x.hora.replace(":00", "h").replace(":", "h")}` : ""}</span>
        <ReceberAvisos id={`pauta-${x.id.replaceAll(":", "-")}`} sobre="desta votação" pequeno />
      </span>
      {x.temas && x.temas.length > 0 && (
        <span className="flex flex-wrap gap-1.5 text-xs">
          {x.temas.slice(0, 2).map((t) => <span key={t} className="rounded-md bg-destaque/20 px-1.5 py-0.5 font-bold">{t}</span>)}
        </span>
      )}
      <a href={x.urlOficial} {...externo} className="line-clamp-2 text-[15px] leading-snug font-bold text-texto no-underline hover:underline">{assunto ?? x.materia}</a>
      <span className="text-xs text-suave">
        {x.relacionada ? <>Pedido ({x.materia}) sobre {x.relacionada}{tipoPorExtenso(x.relacionada) ? ` · ${tipoPorExtenso(x.relacionada)}` : ""}</> : <>{x.materia}{tipoPorExtenso(x.materia) ? ` · ${tipoPorExtenso(x.materia)}` : ""}</>}
        {x.apreciacao ? ` · ${x.apreciacao}` : ""}
      </span>
    </div>
  );
}

function ChipsCasa({ casa, setCasa, contagem, rotulo }: { casa: Casa; setCasa: (c: Casa) => void; contagem: Record<Casa, string>; rotulo: string }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={rotulo}>
      {(["camara", "senado"] as const).map((c) => (
        <button key={c} type="button" aria-pressed={casa === c} onClick={() => setCasa(c)} className={casa === c ? chipOn : chipOff}>{NOME[c]} · {contagem[c]}</button>
      ))}
    </div>
  );
}

/**
 * Tela Votações (pedido de 2026-11-13): primeiro o que está marcado (pauta, coleta diária), depois o que
 * já foi votado, cada lista com Câmara ou Senado. O calendário fica atrás de um botão e serve de filtro
 * por dia (passado: votações nominais; futuro: a pauta).
 */
export function PainelVotacoes({ pauta, porDia, mesInicial, votacoesMes, ultimaSessao, coleta }:
  Pick<VotacoesDados, "porDia" | "mesInicial" | "votacoesMes" | "ultimaSessao"> & { pauta: ItemPauta[]; coleta: string | null }) {
  const [casaProx, setCasaProx] = useState<Casa>(pauta.some((x) => x.casa === "camara") || !pauta.length ? "camara" : "senado");
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

  const proximas = pauta.filter((x) => x.casa === casaProx);
  const sessao = ultimaSessao.find((s) => s.casa === casaUlt);
  const doDiaPauta = dia ? pauta.filter((x) => x.data === dia) : [];
  const doDiaVotos = dia ? (porMes[dia.slice(0, 7)] ?? []).filter((v) => v.data === dia) : [];
  const carregandoDia = dia && !porMes[dia.slice(0, 7)] && dia.slice(0, 7) <= mesInicial;

  return (
    <main className="grid gap-6 pb-8">
      <section className={`${card} grid gap-3`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className={TITULO_CARTAO}>Votações do Plenário</h1>
            <p className="mt-1 text-[13px] text-suave">
              Atualização diária: o que está marcado e o que já foi votado na Câmara e no Senado.
              {coleta && <> Última coleta em {new Date(coleta).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}.</>}
            </p>
          </div>
          <button type="button" aria-expanded={calendario} aria-controls="calendario" onClick={() => setCalendario(!calendario)} className={calendario ? chipOn : chipOff}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" /></svg>
            Filtrar por dia
          </button>
        </div>
        {dia && (
          <p className="flex flex-wrap items-center gap-2 text-sm">
            Mostrando <strong>{diaLongo(dia)}</strong>
            <button type="button" onClick={() => setDia(null)} className={`${chipOff} h-8`}>Tirar o filtro ×</button>
          </p>
        )}
        {calendario && (
          <div id="calendario" className="grid max-w-[420px] gap-2 border-t border-borda pt-3">
            <div className="flex items-center justify-between gap-2">
              <strong className="text-sm capitalize">{MESES[m - 1]} de {ano}</strong>
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
                    className={`flex h-[44px] flex-col items-center justify-center gap-1 rounded-[10px] border text-[13px] disabled:cursor-default disabled:opacity-30 ${d === dia ? "border-destaque bg-fundo font-bold" : "border-transparent enabled:hover:bg-fundo"}`}>
                    <span>{i + 1}</span>
                    <span aria-hidden="true" className={`size-1.5 rounded-full ${votou ? "bg-[#2f855a] dark:bg-[#68d391]" : marcada ? "border border-[#2f855a] dark:border-[#68d391]" : ""}`} />
                  </button>
                );
              })}
            </div>
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-suave">
              <span className="flex items-center gap-1.5"><span aria-hidden="true" className="size-1.5 rounded-full bg-[#2f855a] dark:bg-[#68d391]" /> com votação nominal</span>
              <span className="flex items-center gap-1.5"><span aria-hidden="true" className="size-1.5 rounded-full border border-[#2f855a] dark:border-[#68d391]" /> com pauta marcada</span>
            </p>
          </div>
        )}
      </section>

      {dia ? (
        <section className={`${card} grid gap-3`} aria-labelledby="vt-dia">
          <h2 id="vt-dia" className={`${TITULO_SECAO} capitalize`}>{diaLongo(dia)}</h2>
          {carregandoDia && <p className="text-sm text-suave">Carregando…</p>}
          {!carregandoDia && doDiaPauta.length === 0 && doDiaVotos.length === 0 && (
            <p className="text-sm text-suave">Nenhuma votação nominal nem pauta marcada no Plenário neste dia.</p>
          )}
          {doDiaPauta.length > 0 && <>
            <h3 className="text-sm font-bold">Na pauta</h3>
            <div className="grid gap-2.5 md:grid-cols-2">{doDiaPauta.map((x) => <CartaoPauta key={x.id} x={x} />)}</div>
          </>}
          {doDiaVotos.length > 0 && <>
            <h3 className="text-sm font-bold">Votado</h3>
            <div className="grid gap-2.5 md:grid-cols-2">{doDiaVotos.map((v) => <CartaoVotacao key={v.id} v={v} />)}</div>
          </>}
        </section>
      ) : <>
        <section className={`${card} grid gap-3`} aria-labelledby="vt-prox">
          <div>
            <h2 id="vt-prox" className={TITULO_SECAO}>Próximas votações</h2>
            <p className="mt-1 text-[13px] text-suave">A pauta marcada para o Plenário, como as Casas publicam (pode mudar até a sessão). Nem tudo vai a votação nominal.</p>
          </div>
          <ChipsCasa casa={casaProx} setCasa={setCasaProx} rotulo="Casa das próximas votações"
            contagem={{ camara: String(pauta.filter((x) => x.casa === "camara").length), senado: String(pauta.filter((x) => x.casa === "senado").length) }} />
          {proximas.length === 0 ? (
            <p className="text-sm text-suave">Nenhuma sessão deliberativa com pauta marcada {casaProx === "camara" ? "na Câmara" : "no Senado"} por enquanto. A pauta costuma sair poucos dias antes da sessão.</p>
          ) : (
            <div className="grid gap-2.5 md:grid-cols-2">{proximas.map((x) => <CartaoPauta key={x.id} x={x} />)}</div>
          )}
        </section>

        <section className={`${card} grid gap-3`} aria-labelledby="vt-ult">
          <div>
            <h2 id="vt-ult" className={TITULO_SECAO}>Últimas votações</h2>
            <p className="mt-1 text-[13px] text-suave">As votações nominais da última sessão de cada Casa. Toque numa para ver o placar e como votou cada partido.</p>
          </div>
          <ChipsCasa casa={casaUlt} setCasa={setCasaUlt} rotulo="Casa das últimas votações"
            contagem={Object.fromEntries((["camara", "senado"] as const).map((c) => [c, ultimaSessao.find((s) => s.casa === c)?.data ? ddmm(ultimaSessao.find((s) => s.casa === c)!.data) : "—"])) as Record<Casa, string>} />
          {sessao ? (
            <>
              <p className="text-sm text-suave">Sessão de {diaLongo(sessao.data)}: {sessao.votacoes.length} {sessao.votacoes.length === 1 ? "votação nominal" : "votações nominais"}, {sessao.votacoes.filter((v) => v.resultado === "aprovada").length} aprovadas e {sessao.votacoes.filter((v) => v.resultado === "rejeitada").length} rejeitadas.</p>
              <div className="grid gap-2.5 md:grid-cols-2">{sessao.votacoes.map((v) => <CartaoVotacao key={v.id} v={v} />)}</div>
            </>
          ) : <p className="text-sm text-suave">Nenhuma votação nominal registrada.</p>}
        </section>
      </>}
    </main>
  );
}
