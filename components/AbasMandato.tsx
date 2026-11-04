"use client";

import { useEffect, useMemo, useState } from "react";
import { inteiro } from "@/lib/card";
import type { PaginaDados, PropostaListada, VotoListado } from "@/lib/pagina";
import { normalizar } from "@/lib/texto";
import type { TipoVoto } from "@/lib/types";

const externo = { target: "_blank", rel: "noreferrer noopener" } as const;
const dataBr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const ROTULO: Record<TipoVoto, string> = {
  sim: "Sim", nao: "Não", abstencao: "Abstenção", obstrucao: "Obstrução", art17: "Presidia a sessão",
  nao_informado: "Voto não divulgado", secreto: "Votou (secreta)", ausente: "Não registrou voto",
};
const COR_VOTO: Partial<Record<TipoVoto, string>> = {
  sim: "bg-[#c6f6d5] text-[#22543d] dark:bg-[#22543d] dark:text-[#c6f6d5]",
  nao: "bg-[#fed7d7] text-[#742a2a] dark:bg-[#742a2a] dark:text-[#fed7d7]",
};
/** Sigla por extenso: a pessoa entende "Projeto de lei" sem saber o que é PL. */
const TIPO: Record<string, string> = {
  PL: "Projeto de lei", PLP: "Projeto de lei complementar", PEC: "Proposta de emenda à Constituição",
  PDL: "Projeto de decreto legislativo", PRC: "Projeto de resolução", PRS: "Projeto de resolução",
};
const sel = "h-10 rounded-card border border-borda bg-card px-3 text-base sm:text-[13px]";
const th = "border-b border-borda px-2 pb-3 text-left text-[10px] font-bold tracking-wider text-suave uppercase";
const td = "border-b border-borda px-2 py-3 align-middle text-[13px]";

function Selo({ x }: { x: PropostaListada }) {
  return (
    <span className="inline-flex h-10 min-w-[58px] shrink-0 flex-col items-center justify-center rounded-xl bg-destaque/20 text-[11px] font-bold text-link" title={TIPO[x.tipo]}>
      {x.tipo}<span className="text-[13px] tabular-nums">{x.numero}</span>
    </span>
  );
}

function Propostas({ id, p }: { id: string; p: NonNullable<PaginaDados["propostas"]> }) {
  const [todas, setTodas] = useState<PropostaListada[] | null>(p.leis <= p.ultimas.length ? p.ultimas : null);
  const [ano, setAno] = useState("todos");
  const [q, setQ] = useState("");
  const [lim, setLim] = useState(6);
  // A lista completa (até centenas de propostas) só vem quando a pessoa abre a página: fica na CDN.
  useEffect(() => {
    if (todas) return;
    fetch(`/dados/propostas/${id}`).then(async (r) => { if (r.ok) setTodas(await r.json() as PropostaListada[]); }).catch(() => {});
  }, [id, todas]);
  const lista = todas ?? p.ultimas;
  const anos = useMemo(() => [...new Set(lista.map((x) => x.ano))].sort((a, b) => b - a), [lista]);
  const qn = normalizar(q);
  const filtradas = lista.filter((x) => (ano === "todos" || String(x.ano) === ano) && (!qn || normalizar(x.ementa ?? "").includes(qn)));
  const meta = (x: PropostaListada) => `${TIPO[x.tipo] ?? x.tipo} · ${x.casa === "senado" ? "Senado" : "Câmara"} · ${x.primeiroAutor ? "primeiro autor" : "coautor"}${x.virouNorma ? " · virou norma" : ""}`;

  if (p.leis === 0) return <p className="text-sm text-suave">Nenhuma proposta que pode virar lei com autoria desde {p.desde}. {p.outras > 0 && `${inteiro(p.outras)} requerimentos, emendas e outros pedidos.`}</p>;
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <select value={ano} onChange={(e) => { setAno(e.target.value); setLim(6); }} aria-label="Ano" className={sel}>
          <option value="todos">Todos os anos</option>
          {anos.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <input value={q} onChange={(e) => { setQ(e.target.value); setLim(6); }} placeholder="Procurar no resumo" aria-label="Procurar no resumo" className={`${sel} min-w-0 flex-[1_1_180px] outline-none focus:border-destaque`} />
      </div>

      {/* Celular: lista, sem rolagem para o lado. */}
      <ul className="grid sm:hidden">
        {filtradas.slice(0, lim).map((x) => (
          <li key={`${x.casa}-${x.tipo}-${x.numero}-${x.ano}`} className="flex gap-3 border-b border-borda py-3">
            <Selo x={x} />
            <span className="grid min-w-0 gap-1">
              <strong className="text-[13px] leading-snug">{x.ementa ?? "— (a fonte não traz a ementa)"}</strong>
              <span className="text-xs text-suave">{meta(x)} · {x.ano}</span>
              <a href={x.urlOficial} {...externo} className="text-xs font-bold">Página oficial ›</a>
            </span>
          </li>
        ))}
      </ul>
      {/* Tablet e computador: tabela, como no protótipo. */}
      <table className="hidden w-full border-collapse sm:table">
        <thead><tr><th className={th}>Proposta</th><th className={th}>Ano</th><th className={th} /></tr></thead>
        <tbody>
          {filtradas.slice(0, lim).map((x) => (
            <tr key={`${x.casa}-${x.tipo}-${x.numero}-${x.ano}`}>
              <td className={td}>
                <span className="flex items-center gap-3">
                  <Selo x={x} />
                  <span className="grid gap-0.5">
                    <span className="font-bold">{x.ementa ?? "— (a fonte não traz a ementa)"}</span>
                    <span className="text-xs text-suave">{meta(x)}</span>
                  </span>
                </span>
              </td>
              <td className={`${td} font-bold tabular-nums`}>{x.ano}</td>
              <td className={`${td} text-right`}><a href={x.urlOficial} {...externo} className="text-xs font-bold whitespace-nowrap text-suave no-underline hover:text-link">Detalhes ›</a></td>
            </tr>
          ))}
        </tbody>
      </table>

      {filtradas.length === 0 && <p className="text-sm text-suave">Nenhuma proposta com esses filtros.</p>}
      <p className="text-xs text-suave">
        {inteiro(p.leis)} propostas que podem virar lei desde {p.desde} ({inteiro(p.primeiroAutor)} como primeiro autor, {inteiro(p.viraramNorma)} viraram norma)
        {p.outras > 0 && <> · {inteiro(p.outras)} requerimentos, emendas e outros pedidos, só contados</>}.
      </p>
      {filtradas.length > lim && (
        <button type="button" onClick={() => setLim((l) => l + 10)} className="inline-flex h-10 items-center justify-self-center rounded-xl border border-borda bg-card px-4 text-xs font-bold hover:border-destaque">
          Ver mais propostas ({filtradas.length - lim})
        </button>
      )}
      {!todas && <p className="text-xs text-suave">Carregando a lista completa…</p>}
    </div>
  );
}

/** Do que trata a votação (ementa da matéria) e, menor, o que exatamente foi votado. */
function TituloVoto({ u }: { u: VotoListado }) {
  const votado = u.descricao.replace(/\s*Sim:\s*\d.*$/s, "");
  return (
    <span className="grid min-w-0 gap-0.5">
      <strong className="line-clamp-3 leading-snug">{u.ementa ?? votado}</strong>
      {u.ementa && <span className="line-clamp-2 text-xs text-suave">Votado: {votado}</span>}
      <span className="text-xs text-suave">{[u.proposicao, dataBr(u.data), u.resultado].filter(Boolean).join(" · ")}</span>
    </span>
  );
}

const Voto = ({ u }: { u: VotoListado }) => <span className={`inline-block rounded-lg px-2.5 py-1 text-xs font-bold whitespace-nowrap ${COR_VOTO[u.voto] ?? "bg-fundo"}`}>{ROTULO[u.voto]}</span>;
const orientacao = (u: VotoListado) => u.partidoNoDia && u.orientacaoPartido ? `${u.partidoNoDia}: ${u.orientacaoPartido === "Liberado" ? "liberou" : u.orientacaoPartido}` : "—";

function Votos({ v }: { v: NonNullable<PaginaDados["votacoes"]> }) {
  const casa = v.casa === "senado" ? "no Senado" : "na Câmara";
  // A coluna só aparece quando o resumo já traz a orientação (gravado a partir da E23i).
  const comOrientacao = v.ultimas.some((u) => u.partidoNoDia !== undefined);
  return (
    <div className="grid gap-3">
      <p className="text-sm text-suave">{inteiro(v.total)} votações nominais do plenário {v.casa === "senado" ? "do Senado" : "da Câmara"} durante o mandato, 2023–2026. As 10 mais recentes:</p>

      <ul className="grid sm:hidden">
        {v.ultimas.map((u, i) => (
          <li key={i} className="grid gap-2 border-b border-borda py-3 text-[13px]">
            <TituloVoto u={u} />
            <span className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex flex-wrap items-center gap-2">
                <Voto u={u} />
                {comOrientacao && <span className="text-xs text-suave">orientação do partido: {orientacao(u)}</span>}
              </span>
              <a href={u.urlOficial} {...externo} className="text-xs font-bold">Ver {casa} ↗</a>
            </span>
          </li>
        ))}
      </ul>
      <table className="hidden w-full border-collapse sm:table">
        <thead><tr><th className={th}>Votação</th>{comOrientacao && <th className={th}>Orientação do partido</th>}<th className={th}>Voto</th><th className={th}>Página oficial</th></tr></thead>
        <tbody>
          {v.ultimas.map((u, i) => (
            <tr key={i}>
              <td className={td}><TituloVoto u={u} /></td>
              {comOrientacao && <td className={`${td} text-suave`}>{orientacao(u)}</td>}
              <td className={td}><Voto u={u} /></td>
              <td className={td}><a href={u.urlOficial} {...externo} className="text-xs font-bold whitespace-nowrap">Ver {casa} ↗</a></td>
            </tr>
          ))}
        </tbody>
      </table>
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
    <section className="grid gap-3.5 rounded-card border border-borda bg-card p-4 shadow-card sm:p-[22px]" aria-labelledby="cr-mandato">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="cr-mandato" className="text-lg font-bold">O que fez no mandato</h2>
        <div role="tablist" aria-label="O que fez no mandato" className="flex gap-1 rounded-card bg-fundo p-1">
          {abas.map((a) => (
            <button key={a.k} type="button" role="tab" aria-selected={ativa === a.k} id={`aba-${a.k}`} aria-controls={`painel-${a.k}`} onClick={() => setAtiva(a.k)}
              className={`h-9 rounded-xl px-[18px] text-xs font-bold ${ativa === a.k ? "bg-card shadow-[0_2px_5.5px_rgba(0,0,0,.06)]" : "hover:bg-card/60"}`}>{a.l}</button>
          ))}
        </div>
      </div>
      {propostas && <div role="tabpanel" id="painel-propostas" aria-labelledby="aba-propostas" hidden={ativa !== "propostas"}><Propostas id={id} p={propostas} /></div>}
      {votacoes && <div role="tabpanel" id="painel-votos" aria-labelledby="aba-votos" hidden={ativa !== "votos"}><Votos v={votacoes} /></div>}
    </section>
  );
}
