"use client";

import { useState } from "react";
import type { VotacoesDados, VotacaoResumo } from "@/lib/congresso";
import { CartaoVotacao } from "./CartaoVotacao";

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const DIA_SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const chip = "inline-flex h-9 items-center rounded-xl border border-borda bg-card px-3.5 text-xs font-bold hover:border-destaque disabled:opacity-30";

const somaMes = (mes: string, m: number) => {
  const d = new Date(`${mes}-01T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + m);
  return d.toISOString().slice(0, 7);
};

/**
 * Agenda do Plenário (página Votações; era a tela Congresso do protótipo) com o que existe: quantas votações nominais
 * houve em cada dia, nas duas Casas, e quais foram. A pauta marcada (sessões futuras) não é coletada
 * e não aparece. As votações de outro mês vêm de /dados/votacoes/[mes] (CDN).
 */
export function AgendaPlenario({ porDia, mesInicial, diaInicial, votacoesMes }: Pick<VotacoesDados, "porDia" | "mesInicial" | "diaInicial" | "votacoesMes">) {
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
            // Sábado e domingo ficam desabilitados: o Plenário vota em dias úteis.
            const util = ![0, 6].includes((offset + i) % 7);
            return (
              <button key={d} type="button" disabled={!util} onClick={() => setDia(d)} aria-pressed={on}
                aria-label={`${i + 1} de ${MESES[m - 1]}${n > 0 ? ": com votação no Plenário" : ""}`}
                className={`flex h-[46px] flex-col items-center justify-center gap-1 rounded-[10px] border text-[13px] disabled:cursor-default disabled:opacity-30 ${on ? "border-destaque bg-fundo font-bold" : "border-transparent enabled:hover:bg-fundo"}`}>
                <span>{i + 1}</span>
                <span aria-hidden="true" className={`size-1.5 rounded-full ${n > 0 && util ? "bg-[#2f855a] dark:bg-[#68d391]" : "bg-transparent"}`} />
              </button>
            );
          })}
        </div>
        <p className="flex items-center gap-1.5 text-xs text-suave"><span aria-hidden="true" className="size-1.5 rounded-full bg-[#2f855a] dark:bg-[#68d391]" /> dia com votação nominal no Plenário (Câmara ou Senado).</p>
      </div>

      <div className="grid min-w-0 flex-[1_1_320px] content-start gap-2.5">
        <h3 className="text-[17px] font-bold">{DIA_SEMANA[wd]}, {Number(dia.slice(8))} de {MESES[Number(dia.slice(5, 7)) - 1]}</h3>
        {!porMes[mes] && <p className="text-sm text-suave">Carregando…</p>}
        {porMes[mes] && doDia.length === 0 && <p className="text-sm text-suave">Nenhuma votação nominal no Plenário neste dia.</p>}
        {doDia.map((v) => <CartaoVotacao key={v.id} v={v} />)}
      </div>
    </div>
  );
}
