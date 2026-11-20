"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { hrefVotacao } from "@/lib/votacao";
import { manchete } from "@/lib/titulo";
import { inteiro } from "@/lib/card";
import type { PaginaDados, PropostaListada, VotoListado } from "@/lib/pagina";
import { Info } from "./Termo";
import type { TipoVoto } from "@/lib/types";

const externo = { target: "_blank", rel: "noreferrer noopener" } as const;
const dataBr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const ROTULO: Record<TipoVoto, string> = {
  sim: "Sim", nao: "Não", abstencao: "Abstenção", obstrucao: "Obstrução", art17: "Presidia a sessão",
  nao_informado: "Voto não divulgado", secreto: "Votou (secreta)", ausente: "Não registrou voto",
};
/** Sigla por extenso: a pessoa entende "Projeto de lei" sem saber o que é PL. */
const TIPO: Record<string, string> = {
  PL: "Projeto de lei", PLP: "Projeto de lei complementar", PEC: "Proposta de emenda à Constituição",
  PDL: "Projeto de decreto legislativo", PRC: "Projeto de resolução", PRS: "Projeto de resolução",
};

function Selo({ x }: { x: PropostaListada }) {
  return (
    <span className="inline-flex h-10 min-w-[58px] shrink-0 flex-col items-center justify-center rounded-full bg-destaque/20 text-[11px] font-semibold text-link" title={TIPO[x.tipo]}>
      {x.tipo}<span className="text-[13px] tabular-nums">{x.numero}</span>
    </span>
  );
}

/** Cores da pizza (skill dataviz, forma "ênfase": um destaque e o resto em cinza; validado contra #1C1C1E). */
const COR_NORMA = "#0A84FF"; // systemBlue escuro, como no protótipo
const COR_RESTO = "#8e8e93"; // systemGray

/**
 * "Efetividade das propostas" do protótipo Liquid Glass: a pizza e, ao lado, quantas viraram norma e quantas
 * foram apresentadas, no período do filtro de ano. Só contagem da fonte, sem nota (CLAUDE.md, princípio 4).
 */
function Efetividade({ leis, norma, periodo }: { leis: number; norma: number; periodo: string }) {
  const pct = leis > 0 ? (norma / leis) * 100 : 0;
  const pctTexto = (v: number) => `${v > 0 && v < 1 ? "<1" : Math.round(v)}%`;
  const r = 52, c = 2 * Math.PI * r;
  return (
    <figure className="grid gap-3.5 rounded-[18px] border border-white/8 bg-white/6 p-4">
      <figcaption className="flex items-center justify-between gap-3">
        <span className="text-[15px] font-semibold">Efetividade das propostas</span>
        <Info id="pr-efetividade" termo="propostasLei" rotulo="Como estes números são contados"
          explicacao="Conta as propostas que podem virar lei em que a pessoa está entre os autores, como primeiro autor ou coautor. Virou norma: aprovada e transformada em lei, emenda constitucional, decreto legislativo ou resolução. As recentes ainda podem estar em tramitação." />
      </figcaption>
      <div className="flex items-center gap-4">
        <svg viewBox="0 0 140 140" className="size-28 shrink-0" role="img" aria-label={`${pctTexto(pct)} das propostas viraram norma: ${norma} de ${leis}`}>
          <circle cx="70" cy="70" r={r} fill="none" stroke={COR_RESTO} strokeWidth="22" />
          {norma > 0 && <circle cx="70" cy="70" r={r} fill="none" stroke={COR_NORMA} strokeWidth="22" strokeDasharray={`${(pct / 100) * c} ${c}`} transform="rotate(-90 70 70)" />}
        </svg>
        <dl className="grid flex-1 gap-3">
          <div className="grid gap-0.5"><dt className="text-xs text-suave">Viraram norma</dt><dd className="flex items-baseline gap-1.5"><span className="text-2xl leading-7 font-semibold tabular-nums">{inteiro(norma)}</span><span className="text-[13px] font-semibold text-texto/60 tabular-nums">{pctTexto(pct)}</span></dd></div>
          <div className="grid gap-0.5 border-t border-borda pt-3"><dt className="text-xs text-suave">Apresentadas</dt><dd className="flex items-baseline gap-1.5"><span className="text-2xl leading-7 font-semibold tabular-nums">{inteiro(leis)}</span><span className="text-[13px] font-semibold text-texto/60 tabular-nums">100%</span></dd></div>
        </dl>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-texto/75">
        <span className="flex items-center gap-1.5"><span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: COR_NORMA }} />Viraram norma ({inteiro(norma)})</span>
        <span className="flex items-center gap-1.5"><span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: COR_RESTO }} />Não viraram ou seguem em tramitação ({inteiro(leis - norma)})</span>
      </div>
      <span className="text-[11px] text-texto/60">Propostas {periodo} · PL, PLP, PEC, PDL e projeto de resolução</span>
    </figure>
  );
}

function Propostas({ id, p }: { id: string; p: NonNullable<PaginaDados["propostas"]> }) {
  const [todas, setTodas] = useState<PropostaListada[] | null>(p.leis <= p.ultimas.length ? p.ultimas : null);
  const [ano, setAno] = useState("todos");
  const [lim, setLim] = useState(6);
  // A lista completa (até centenas de propostas) só vem quando a pessoa abre a página: fica na CDN.
  useEffect(() => {
    if (todas) return;
    fetch(`/dados/propostas/${id}`).then(async (r) => { if (r.ok) setTodas(await r.json() as PropostaListada[]); }).catch(() => {});
  }, [id, todas]);
  const lista = todas ?? p.ultimas;
  const anos = useMemo(() => [...new Set(lista.map((x) => x.ano))].sort((a, b) => b - a), [lista]);
  const filtradas = lista.filter((x) => ano === "todos" || String(x.ano) === ano);
  const doAno = ano === "todos" || !todas ? null : todas.filter((x) => String(x.ano) === ano);
  const numeros = doAno
    ? { leis: doAno.length, norma: doAno.filter((x) => x.virouNorma).length, periodo: `de ${ano}` }
    : { leis: p.leis, norma: p.viraramNorma, periodo: `desde ${p.desde}` };
  const meta = (x: PropostaListada) => `${TIPO[x.tipo] ?? x.tipo} · ${x.casa === "senado" ? "Senado" : "Câmara"} · ${x.primeiroAutor ? "primeiro autor" : "coautor"}`;

  if (p.leis === 0) return <p className="rounded-[18px] bg-white/6 p-4 text-sm leading-5 text-texto/80">Nenhuma proposta que pode virar lei com autoria desde {p.desde}. {p.outras > 0 && `${inteiro(p.outras)} requerimentos, emendas e outros pedidos.`}</p>;
  return (
    <div className="grid gap-3">
      {/* Filtro de ano acima da pizza: ela segue o ano escolhido (todos os anos = o total). Até a lista completa chegar, fica travado. */}
      <label className="relative inline-flex justify-self-start">
        <span className="sr-only">Ano</span>
        <select value={ano} disabled={!todas} onChange={(e) => { setAno(e.target.value); setLim(6); }}
          className="h-[34px] appearance-none rounded-full border border-white/16 bg-white/8 pr-8 pl-3.5 text-base font-semibold text-texto disabled:opacity-60">
          <option value="todos">Todos os anos</option>
          {anos.map((a) => <option key={a} value={String(a)}>{a}</option>)}
        </select>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="pointer-events-none absolute top-[11px] right-3"><path d="m6 9 6 6 6-6" /></svg>
      </label>
      <Efetividade leis={numeros.leis} norma={numeros.norma} periodo={numeros.periodo} />

      <ul className="grid">
        {filtradas.slice(0, lim).map((x) => (
          <li key={`${x.casa}-${x.tipo}-${x.numero}-${x.ano}`} className="flex gap-3 border-b border-borda py-3">
            <Selo x={x} />
            <span className="grid min-w-0 flex-1 gap-1.5">
              <span className="line-clamp-4 text-[15px] leading-5" title={x.ementa ?? undefined}>{manchete(x.ementa) || "— (a fonte não traz a ementa)"}</span>
              <span className="text-xs text-suave">{meta(x)} · {x.ano}</span>
              <span className="flex items-center justify-between gap-2">
                <span className={`inline-flex h-[22px] items-center rounded-full border px-[9px] text-[11px] font-bold ${x.virouNorma ? "border-[#0A84FF]/50 bg-[#0A84FF]/22 text-[#8CC4FF]" : "border-white/20 bg-white/10 text-texto/85"}`}>
                  {x.virouNorma ? "Virou norma" : "Não virou norma"}
                </span>
                <a href={x.urlOficial} {...externo} className="inline-flex min-h-8 items-center text-[13px] font-semibold no-underline">Ver projeto ›</a>
              </span>
            </span>
          </li>
        ))}
      </ul>

      {filtradas.length === 0 && <p className="text-sm text-suave">Nenhuma proposta neste ano.</p>}
      {p.outras > 0 && <p className="text-xs text-suave">Além destas, {inteiro(p.outras)} requerimentos, emendas e outros pedidos desde {p.desde}, só contados.</p>}
      {filtradas.length > lim && (
        <button type="button" onClick={() => setLim((l) => l + 10)} className="h-9 justify-self-center rounded-full border border-white/16 bg-white/10 px-4 text-[15px] font-semibold text-link">
          Ver mais propostas ({filtradas.length - lim})
        </button>
      )}
      {!todas && <p className="text-xs text-suave">Carregando a lista completa…</p>}
    </div>
  );
}

const COR_VOTO: Partial<Record<TipoVoto, string>> = { sim: "bg-verde/20 text-[#5EE37E]", nao: "bg-vermelho/20 text-[#FF7A70]" };
const orientacao = (u: VotoListado) => u.partidoNoDia && u.orientacaoPartido ? `${u.partidoNoDia}: ${u.orientacaoPartido === "Liberado" ? "liberou" : u.orientacaoPartido}` : "—";

/** Aba Votos no formato do protótipo: do que trata, o que foi votado, como votou e a orientação do partido. */
function Votos({ v }: { v: NonNullable<PaginaDados["votacoes"]> }) {
  const casa = v.casa === "senado" ? "no Senado" : "na Câmara";
  const comOrientacao = v.ultimas.some((u) => u.partidoNoDia !== undefined);
  return (
    <div className="grid gap-1">
      <p className="mb-1 text-sm leading-[19px] text-suave">{inteiro(v.total)} votações nominais do plenário {v.casa === "senado" ? "do Senado" : "da Câmara"} durante o mandato, 2023–2026. As mais recentes:</p>
      <ul className="grid">
        {v.ultimas.map((u, i) => {
          const votado = u.descricao.replace(/\s*Sim:\s*\d.*$/s, "");
          return (
            <li key={i} className="grid gap-2 border-b border-borda py-3">
              <span className="line-clamp-3 text-sm leading-[19px] font-semibold" title={u.ementa ?? undefined}>{manchete(u.ementa) || votado}</span>
              {u.ementa && <span className="line-clamp-2 text-xs leading-4 text-suave">Votado: {votado}</span>}
              <span className="text-xs text-suave">{[u.proposicao, dataBr(u.data), u.resultado].filter(Boolean).join(" · ")}</span>
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-texto/75">Como votou:</span>
                <span className={`inline-flex h-6 items-center rounded-lg px-2.5 text-xs font-bold whitespace-nowrap ${COR_VOTO[u.voto] ?? "bg-white/10 text-texto"}`}>{ROTULO[u.voto]}</span>
                {comOrientacao && <span className="text-xs text-suave">partido: {orientacao(u)}</span>}
              </span>
              {u.votacaoId
                ? <Link href={hrefVotacao(u.votacaoId)} className="inline-flex min-h-8 items-center justify-self-start text-[13px] font-semibold no-underline">Ver votação ›</Link>
                : <a href={u.urlOficial} {...externo} className="inline-flex min-h-8 items-center justify-self-start text-[13px] font-semibold no-underline">Ver {casa} ↗</a>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** "O que fez no mandato" do crachá: abas Propostas e Votos (Emendas fica oculta: não há coleta). */
export function AbasMandato({ id, propostas, votacoes }: { id: string; propostas: PaginaDados["propostas"]; votacoes: PaginaDados["votacoes"] }) {
  const abas = [
    ...(propostas ? [{ k: "propostas", l: "Propostas" }] : []),
    ...(votacoes ? [{ k: "votos", l: "Votos" }] : []),
  ];
  const [ativa, setAtiva] = useState(abas[0]?.k);
  if (!abas.length) return null;
  return (
    <section className="vidro grid gap-3.5 rounded-card px-4 py-[18px]" aria-labelledby="cr-mandato">
      <div className="grid gap-3">
        <h2 id="cr-mandato" className="text-lg font-semibold">O que fez no mandato</h2>
        <div role="tablist" aria-label="O que fez no mandato" className="flex w-full gap-1 rounded-[21px] border border-white/10 bg-white/8 p-1">
          {abas.map((a) => (
            <button key={a.k} type="button" role="tab" aria-selected={ativa === a.k} id={`aba-${a.k}`} aria-controls={`painel-${a.k}`} onClick={() => setAtiva(a.k)}
              className={`h-[34px] flex-1 rounded-[17px] px-[18px] text-xs font-semibold ${ativa === a.k ? "bg-white/20" : "hover:bg-white/8"}`}>{a.l}</button>
          ))}
        </div>
      </div>
      {propostas && <div role="tabpanel" id="painel-propostas" aria-labelledby="aba-propostas" hidden={ativa !== "propostas"}><Propostas id={id} p={propostas} /></div>}
      {votacoes && <div role="tabpanel" id="painel-votos" aria-labelledby="aba-votos" hidden={ativa !== "votos"}><Votos v={votacoes} /></div>}
    </section>
  );
}
