"use client";

import { useState } from "react";
import type { VotacaoResumo } from "@/lib/congresso";
import type { ItemPauta } from "@/lib/types";
import { CartaoVotacao } from "./CartaoVotacao";
import { CartaoPauta } from "./PainelVotacoes";

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const DIA_SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const somaMes = (mes: string, m: number) => { const d = new Date(`${mes}-01T12:00:00Z`); d.setUTCMonth(d.getUTCMonth() + m); return d.toISOString().slice(0, 7); };
const diaLongo = (iso: string) => { const d = new Date(`${iso}T12:00:00Z`); return `${DIA_SEMANA[d.getUTCDay()]}, ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`; };
const inicial = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const SETA = "inline-flex size-9 items-center justify-center rounded-full border border-white/14 bg-white/6 text-texto disabled:opacity-30";

/**
 * Calendário do Plenário de uma Casa, embaixo do plenário na tela Congresso (pedido de 2026-11-20): dias com votação
 * nominal (ponto cheio) e com pauta marcada (ponto vazado). Tocando num dia, as votações e a pauta dele aparecem
 * embaixo, nos mesmos cartões da tela Votações. Os meses anteriores vêm de /dados/votacoes/[mes] (CDN), sob demanda.
 */
export function AgendaPlenario({ casa, porDia, pauta, mesInicial, votacoesMes }: {
  casa: "camara" | "senado";
  porDia: Record<string, { camara: number; senado: number }>;
  pauta: ItemPauta[];
  mesInicial: string;
  votacoesMes: VotacaoResumo[];
}) {
  const daCasa = pauta.filter((x) => x.casa === casa);
  const ultimoDia = Object.keys(porDia).filter((d) => porDia[d]![casa] > 0).sort().at(-1) ?? null;
  const [dia, setDia] = useState<string | null>(null);
  const [mes, setMes] = useState(mesInicial);
  const [porMes, setPorMes] = useState<Record<string, VotacaoResumo[]>>({ [mesInicial]: votacoesMes });
  const diasPauta = new Set(daCasa.map((x) => x.data));
  const primeiro = Object.keys(porDia).sort()[0]?.slice(0, 7) ?? mesInicial;
  const ultimo = [mesInicial, ...daCasa.map((x) => x.data.slice(0, 7))].sort().at(-1)!;

  function carregarMes(m: string) {
    if (porMes[m] || m > mesInicial) return;
    fetch(`/dados/votacoes/${m}`).then(async (r) => { if (r.ok) { const vs = await r.json() as VotacaoResumo[]; setPorMes((p) => ({ ...p, [m]: vs })); } }).catch(() => {});
  }
  const escolher = (d: string) => { setDia(d === dia ? null : d); carregarMes(d.slice(0, 7)); };

  const [ano, m] = mes.split("-").map(Number) as [number, number];
  const offset = new Date(Date.UTC(ano, m - 1, 1)).getUTCDay();
  const nDias = new Date(Date.UTC(ano, m, 0)).getUTCDate();
  const votosDia = dia ? (porMes[dia.slice(0, 7)] ?? []).filter((v) => v.data === dia && v.casa === casa) : [];
  const pautaDia = dia ? daCasa.filter((x) => x.data === dia) : [];
  const carregando = dia && !porMes[dia.slice(0, 7)] && dia.slice(0, 7) <= mesInicial;
  const nome = casa === "senado" ? "Senado" : "Câmara";

  return (
    <section aria-labelledby={`agenda-${casa}`} className="grid gap-3">
      <div className="vidro grid gap-2.5 rounded-card p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="grid">
            <h2 id={`agenda-${casa}`} className="text-[17px] font-semibold">Votações e pauta {casa === "senado" ? "do Senado" : "da Câmara"}</h2>
            <span className="text-[13px] text-suave">{inicial(`${MESES[m - 1]} de ${ano}`)} · toque num dia</span>
          </div>
          <div className="flex gap-1.5">
            <button type="button" aria-label="Mês anterior" disabled={mes <= primeiro} onClick={() => setMes(somaMes(mes, -1))} className={SETA}>‹</button>
            <button type="button" aria-label="Próximo mês" disabled={mes >= ultimo} onClick={() => setMes(somaMes(mes, 1))} className={SETA}>›</button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-suave">{SEMANA.map((x) => <span key={x}>{x}</span>)}</div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: offset }, (_, i) => <span key={`v${i}`} />)}
          {Array.from({ length: nDias }, (_, i) => {
            const d = `${mes}-${String(i + 1).padStart(2, "0")}`;
            const votou = (porDia[d]?.[casa] ?? 0) > 0;
            const marcada = diasPauta.has(d);
            const util = ![0, 6].includes((offset + i) % 7);
            return (
              <button key={d} type="button" disabled={!util} onClick={() => escolher(d)} aria-pressed={d === dia}
                aria-label={`${i + 1} de ${MESES[m - 1]}${votou ? ": com votação" : marcada ? ": com pauta marcada" : ""}`}
                className={`flex h-11 flex-col items-center justify-center gap-1 rounded-[12px] border text-[13px] disabled:cursor-default disabled:opacity-30 ${d === dia ? "border-link bg-white/14 font-semibold" : "border-transparent enabled:hover:bg-white/8"}`}>
                <span>{i + 1}</span>
                <span aria-hidden="true" className={`size-1.5 rounded-full ${votou ? "bg-verde" : marcada ? "border border-verde" : ""}`} />
              </button>
            );
          })}
        </div>
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-suave">
          <span className="flex items-center gap-1.5"><span aria-hidden="true" className="size-1.5 rounded-full bg-verde" /> com votação nominal</span>
          <span className="flex items-center gap-1.5"><span aria-hidden="true" className="size-1.5 rounded-full border border-verde" /> com pauta marcada</span>
          {!dia && ultimoDia && <button type="button" onClick={() => { setMes(ultimoDia.slice(0, 7)); escolher(ultimoDia); }} className="font-semibold text-link">Ver a última sessão</button>}
        </p>
      </div>

      {dia && (
        <div className="grid gap-3" aria-live="polite">
          <h3 className="px-1 text-[17px] font-semibold">{inicial(diaLongo(dia))} · {nome}</h3>
          {carregando && <p className="px-1 text-sm text-suave">Carregando…</p>}
          {!carregando && votosDia.length === 0 && pautaDia.length === 0 && <p className="px-1 text-[15px] text-suave">Nenhuma votação nominal nem pauta marcada no Plenário {casa === "senado" ? "do Senado" : "da Câmara"} neste dia.</p>}
          {pautaDia.map((x) => <CartaoPauta key={x.id} x={x} />)}
          {votosDia.map((v) => <CartaoVotacao key={v.id} v={v} />)}
        </div>
      )}
    </section>
  );
}
