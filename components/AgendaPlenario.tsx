"use client";

import { useState } from "react";
import type { CongressoDados, VotacaoResumo } from "@/lib/congresso";
import { PlacarVotacao } from "./PlacarVotacao";

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const DIA_SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const externo = { target: "_blank", rel: "noreferrer noopener" } as const;
const chip = "inline-flex h-9 items-center rounded-xl border border-borda bg-card px-3.5 text-xs font-bold hover:border-destaque disabled:opacity-30";

const somaMes = (mes: string, m: number) => {
  const d = new Date(`${mes}-01T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + m);
  return d.toISOString().slice(0, 7);
};

/**
 * Agenda do Plenário (tela Congresso do protótipo) com o que existe: quantas votações nominais
 * houve em cada dia, nas duas Casas, e quais foram. A pauta marcada (sessões futuras) não é coletada
 * e não aparece. As votações de outro mês vêm de /dados/votacoes/[mes] (CDN).
 */
export function AgendaPlenario({ porDia, mesInicial, diaInicial, votacoesMes }: Pick<CongressoDados, "porDia" | "mesInicial" | "diaInicial" | "votacoesMes">) {
  const [mes, setMes] = useState(mesInicial);
  const [dia, setDia] = useState(diaInicial);
  const [porMes, setPorMes] = useState<Record<string, VotacaoResumo[]>>({ [mesInicial]: votacoesMes });
  const datas = Object.keys(porDia).sort();
  const primeiro = datas[0]?.slice(0, 7) ?? mesInicial;

  function irPara(novo: string) {
    setMes(novo);
    const dias = datas.filter((d) => d.startsWith(novo));
    setDia(dias.at(-1) ?? `${novo}-01`);
    if (!porMes[novo]) fetch(`/dados/votacoes/${novo}`).then(async (r) => { if (r.ok) { const vs = await r.json() as VotacaoResumo[]; setPorMes((p) => ({ ...p, [novo]: vs })); } }).catch(() => {});
  }

  const [ano, m] = mes.split("-").map(Number) as [number, number];
  const offset = new Date(Date.UTC(ano, m - 1, 1)).getUTCDay();
  const nDias = new Date(Date.UTC(ano, m, 0)).getUTCDate();
  const doDia = (porMes[mes] ?? []).filter((v) => v.data === dia);
  const wd = new Date(`${dia}T12:00:00Z`).getUTCDay();

  return (
    <div className="flex flex-wrap gap-6">
      <div className="grid min-w-0 flex-[1_1_420px] content-start gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-bold">Agenda do Plenário · {MESES[m - 1]}</h2>
          <div className="flex gap-1.5">
            <button type="button" aria-label="Mês anterior" disabled={mes <= primeiro} onClick={() => irPara(somaMes(mes, -1))} className={chip}>‹</button>
            <button type="button" aria-label="Próximo mês" disabled={mes >= mesInicial} onClick={() => irPara(somaMes(mes, 1))} className={chip}>›</button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-suave">{SEMANA.map((s) => <span key={s}>{s}</span>)}</div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: offset }, (_, i) => <span key={`v${i}`} />)}
          {Array.from({ length: nDias }, (_, i) => {
            const d = `${mes}-${String(i + 1).padStart(2, "0")}`;
            const n = (porDia[d]?.camara ?? 0) + (porDia[d]?.senado ?? 0);
            const on = d === dia;
            return (
              <button key={d} type="button" onClick={() => setDia(d)} aria-pressed={on} aria-label={`${i + 1} de ${MESES[m - 1]}: ${n} votações nominais`}
                className={`flex h-[46px] flex-col items-center justify-center gap-px rounded-[10px] border text-[13px] ${on ? "border-destaque bg-fundo font-bold" : "border-transparent hover:bg-fundo"}`}>
                <span>{i + 1}</span>
                <span className="text-[10px] text-link tabular-nums">{n > 0 ? n : ""}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-suave">O número é quantas votações nominais houve no dia, somando Câmara e Senado.</p>
      </div>

      <div className="grid min-w-0 flex-[1_1_320px] content-start gap-2.5">
        <h3 className="text-[17px] font-bold">{DIA_SEMANA[wd]}, {Number(dia.slice(8))} de {MESES[Number(dia.slice(5, 7)) - 1]}</h3>
        {!porMes[mes] && <p className="text-sm text-suave">Carregando…</p>}
        {porMes[mes] && doDia.length === 0 && <p className="text-sm text-suave">Nenhuma votação nominal no Plenário neste dia.</p>}
        {doDia.map((v) => (
          <div key={v.id} className="grid gap-1 rounded-xl border border-borda p-3 text-sm">
            <span className="text-[13px] text-link">{v.casa === "senado" ? "Senado" : "Câmara"}{v.proposicao ? ` · ${v.proposicao}` : ""}{v.resultado ? ` · ${v.resultado}` : ""}</span>
            <span className="leading-relaxed">{v.descricao}</span>
            <span className="flex flex-wrap items-end justify-between gap-2 text-xs"><PlacarVotacao v={v} /><a href={v.urlOficial} {...externo} className="underline underline-offset-2">página oficial</a></span>
          </div>
        ))}
      </div>
    </div>
  );
}
