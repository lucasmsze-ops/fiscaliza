"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { hrefVotacao } from "@/lib/votacao";
import { inteiro } from "@/lib/card";
import type { PaginaDados, PropostaListada, VotoListado } from "@/lib/pagina";
import { BOTAO, NUMERO, ROTULO as ROTULO_NUMERO } from "@/lib/estilo";
import { hrefSecao } from "@/lib/glossario";
import { SelectChip } from "./SelectChip";
import { normalizar } from "@/lib/texto";
import type { TipoVoto } from "@/lib/types";

const externo = { target: "_blank", rel: "noreferrer noopener" } as const;
const dataBr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const ROTULO: Record<TipoVoto, string> = {
  sim: "Sim", nao: "Não", abstencao: "Abstenção", obstrucao: "Obstrução", art17: "Presidia a sessão",
  nao_informado: "Voto não divulgado", secreto: "Votou (secreta)", ausente: "Não registrou voto",
};
const COR_VOTO: Partial<Record<TipoVoto, string>> = {
  sim: "bg-verde/20 text-verde",
  nao: "bg-vermelho/20 text-vermelho",
};
/** Sigla por extenso: a pessoa entende "Projeto de lei" sem saber o que é PL. */
const TIPO: Record<string, string> = {
  PL: "Projeto de lei", PLP: "Projeto de lei complementar", PEC: "Proposta de emenda à Constituição",
  PDL: "Projeto de decreto legislativo", PRC: "Projeto de resolução", PRS: "Projeto de resolução",
};
const sel = "h-10 rounded-[10px] bg-preench px-3 text-base text-texto placeholder:text-suave sm:text-[15px]";
const th = "border-b border-borda px-2 pb-3 text-left text-xs font-semibold text-suave";
const td = "border-b border-borda px-2 py-3 align-middle text-[13px]";

function Selo({ x }: { x: PropostaListada }) {
  return (
    <span className="inline-flex h-10 min-w-[58px] shrink-0 flex-col items-center justify-center rounded-full bg-destaque/20 text-[11px] font-semibold text-link" title={TIPO[x.tipo]}>
      {x.tipo}<span className="text-[13px] tabular-nums">{x.numero}</span>
    </span>
  );
}

/** Cores da pizza (skill dataviz, forma "ênfase": um destaque e o resto em cinza; validado contra #1C1C1E). */
const COR_NORMA = "var(--serie-1)";
const COR_RESTO = "#8e8e93"; // systemGray

/**
 * Números e pizza da aba Propostas (pedido de 2026-11-14): apresentadas e quantas viraram norma, no período
 * do filtro de ano (todos os anos = o total). Só contagem da fonte, sem nota nem comparação com outros
 * políticos (CLAUDE.md, princípio 4). A explicação fica atrás do botão "i", em popover nativo.
 */
function NumerosPropostas({ leis, primeiro, norma, periodo }: { leis: number; primeiro: number; norma: number; periodo: string }) {
  const pct = leis > 0 ? (norma / leis) * 100 : 0;
  const pctTexto = (v: number) => `${v > 0 && v < 1 ? "<1" : Math.round(v)}%`;
  const r = 52, c = 2 * Math.PI * r;
  return (
    <div className="grid gap-2.5">
      <div className="grid grid-cols-2 gap-2.5">
        <div className="grid content-start gap-1 rounded-xl bg-preench p-3.5">
          <span className={ROTULO_NUMERO}>Apresentadas</span>
          <strong className={NUMERO}>{inteiro(leis)}</strong>
          <span className="text-xs text-suave">{periodo}, {inteiro(primeiro)} como primeiro autor</span>
        </div>
        <div className="grid content-start gap-1 rounded-xl bg-preench p-3.5">
          <span className={ROTULO_NUMERO}>Viraram norma</span>
          <strong className={NUMERO}>{inteiro(norma)}</strong>
          <span className="text-xs text-suave">{pctTexto(pct)} das apresentadas</span>
        </div>
      </div>

      <figure className="grid gap-3 rounded-xl bg-preench p-3.5">
        <figcaption className="flex items-start justify-between gap-3">
          <span className="text-[15px] font-semibold">Quantas viraram norma</span>
          <button type="button" popoverTarget="pr-info" aria-label="Como estes números são contados"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-preench text-sm font-semibold text-link hover:bg-preench-forte">i</button>
          <div id="pr-info" popover="auto" className="m-auto max-w-[min(24rem,calc(100vw-2rem))] rounded-card bg-card p-4 text-left text-sm leading-relaxed text-texto shadow-xl backdrop:bg-black/40">
            <p>
              Conta as propostas que podem virar lei (PL, PLP, PEC, PDL e projeto de resolução) em que a pessoa está entre os autores,
              como primeiro autor ou coautor. &quot;Virou norma&quot; é a situação oficial &quot;transformada em norma jurídica&quot;: a
              proposta foi aprovada e virou lei, emenda constitucional, decreto legislativo ou resolução. Uma proposta pode levar
              anos para isso: as recentes ainda podem estar em tramitação.
            </p>
            <p className="mt-3 flex items-center justify-between gap-3 text-xs">
              <a href={hrefSecao("propostas")} className="font-semibold no-underline">Como calculamos</a>
              <button type="button" popoverTarget="pr-info" popoverTargetAction="hide" className="font-semibold text-link">Fechar</button>
            </p>
          </div>
        </figcaption>
        <div className="flex items-center gap-4 sm:gap-[18px]">
          <svg viewBox="0 0 140 140" className="size-[110px] shrink-0 sm:size-[130px]" role="img"
            aria-label={`${pctTexto(pct)} viraram norma (${norma} de ${leis}), ${pctTexto(100 - pct)} não viraram`}>
            <circle cx="70" cy="70" r={r} fill="none" stroke={COR_RESTO} strokeWidth="22" />
            {norma > 0 && <circle cx="70" cy="70" r={r} fill="none" stroke={COR_NORMA} strokeWidth="22" strokeDasharray={`${(pct / 100) * c} ${c}`} transform="rotate(-90 70 70)" />}
          </svg>
          <div className="grid gap-3">
            {([[COR_NORMA, pct, `viraram norma (${inteiro(norma)})`], [COR_RESTO, 100 - pct, `não viraram ou seguem em tramitação (${inteiro(leis - norma)})`]] as const).map(([cor, v, t]) => (
              <div key={t} className="flex items-start gap-2.5">
                <span className="mt-1.5 size-3 shrink-0 rounded-full" style={{ background: cor }} />
                <span><span className="text-xl font-semibold tabular-nums">{pctTexto(v)}</span><br /><span className="text-xs text-suave">{t}</span></span>
              </div>
            ))}
          </div>
        </div>
      </figure>
    </div>
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
  const doAno = ano === "todos" || !todas ? null : todas.filter((x) => String(x.ano) === ano);
  const numeros = doAno
    ? { leis: doAno.length, primeiro: doAno.filter((x) => x.primeiroAutor).length, norma: doAno.filter((x) => x.virouNorma).length, periodo: `em ${ano}` }
    : { leis: p.leis, primeiro: p.primeiroAutor, norma: p.viraramNorma, periodo: `desde ${p.desde}` };
  const meta = (x: PropostaListada) => `${TIPO[x.tipo] ?? x.tipo} · ${x.casa === "senado" ? "Senado" : "Câmara"} · ${x.primeiroAutor ? "primeiro autor" : "coautor"}${x.virouNorma ? " · virou norma" : ""}`;

  if (p.leis === 0) return <p className="text-sm text-suave">Nenhuma proposta que pode virar lei com autoria desde {p.desde}. {p.outras > 0 && `${inteiro(p.outras)} requerimentos, emendas e outros pedidos.`}</p>;
  return (
    <div className="grid gap-3">
      {/* Filtro de ano acima dos números e da pizza: eles seguem o ano escolhido (todos os anos = o total).
          A busca no resumo fica acima da lista e vale só para ela. Até a lista completa chegar, o ano fica travado. */}
      <div className="flex flex-wrap items-center gap-2">
        <SelectChip valor={ano} padrao="todos" rotulo="Ano" desligado={!todas} onChange={(v) => { setAno(v); setLim(6); }}
          opcoes={[{ valor: "todos", texto: "Todos os anos" }, ...anos.map((a) => ({ valor: String(a), texto: String(a) }))]} />
      </div>
      <NumerosPropostas {...numeros} />
      <input value={q} onChange={(e) => { setQ(e.target.value); setLim(6); }} placeholder="Procurar no resumo" aria-label="Procurar no resumo" className={`${sel} mt-2 w-full outline-none focus:ring-2 focus:ring-destaque/40`} />

      {/* Celular: lista, sem rolagem para o lado. */}
      <ul className="grid sm:hidden">
        {filtradas.slice(0, lim).map((x) => (
          <li key={`${x.casa}-${x.tipo}-${x.numero}-${x.ano}`} className="flex gap-3 border-b border-borda py-3">
            <Selo x={x} />
            <span className="grid min-w-0 gap-1">
              <span className="line-clamp-4 text-[15px] leading-snug" title={x.ementa ?? undefined}>{x.ementa ?? "— (a fonte não traz a ementa)"}</span>
              <span className="text-xs text-suave">{meta(x)} · {x.ano}</span>
              <a href={x.urlOficial} {...externo} className="text-xs font-semibold">Página oficial ›</a>
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
                    <span className="line-clamp-3 text-[15px] leading-snug" title={x.ementa ?? undefined}>{x.ementa ?? "— (a fonte não traz a ementa)"}</span>
                    <span className="text-xs text-suave">{meta(x)}</span>
                  </span>
                </span>
              </td>
              <td className={`${td} font-semibold tabular-nums`}>{x.ano}</td>
              <td className={`${td} text-right`}><a href={x.urlOficial} {...externo} className="text-xs font-semibold whitespace-nowrap text-suave no-underline hover:text-link">Detalhes ›</a></td>
            </tr>
          ))}
        </tbody>
      </table>

      {filtradas.length === 0 && <p className="text-sm text-suave">Nenhuma proposta com esses filtros.</p>}
      {/* Os totais estão nos números do topo da aba; aqui só o que não entra na lista. */}
      {p.outras > 0 && <p className="text-xs text-suave">Além destas, {inteiro(p.outras)} requerimentos, emendas e outros pedidos desde {p.desde}, só contados.</p>}
      {filtradas.length > lim && (
        <button type="button" onClick={() => setLim((l) => l + 10)} className={`${BOTAO} justify-self-center`}>
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
      {u.votacaoId
        ? <Link href={hrefVotacao(u.votacaoId)} className="line-clamp-3 leading-snug font-semibold text-texto underline decoration-borda-forte underline-offset-2 hover:decoration-link">{u.ementa ?? votado}</Link>
        : <strong className="line-clamp-3 leading-snug">{u.ementa ?? votado}</strong>}
      {u.ementa && <span className="line-clamp-2 text-xs text-suave">Votado: {votado}</span>}
      <span className="text-xs text-suave">{[u.proposicao, dataBr(u.data), u.resultado].filter(Boolean).join(" · ")}</span>
    </span>
  );
}

const Voto = ({ u }: { u: VotoListado }) => <span className={`inline-block rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${COR_VOTO[u.voto] ?? "bg-preench"}`}>{ROTULO[u.voto]}</span>;
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
              <a href={u.urlOficial} {...externo} className="text-xs font-semibold">Ver {casa} ↗</a>
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
              <td className={td}><a href={u.urlOficial} {...externo} className="text-xs font-semibold whitespace-nowrap">Ver {casa} ↗</a></td>
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
    <section className="grid gap-3.5 rounded-card bg-card p-4 sm:p-5" aria-labelledby="cr-mandato">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="cr-mandato" className="text-lg font-semibold">O que fez no mandato</h2>
        <div role="tablist" aria-label="O que fez no mandato" className="flex gap-1 rounded-card bg-preench p-1">
          {abas.map((a) => (
            <button key={a.k} type="button" role="tab" aria-selected={ativa === a.k} id={`aba-${a.k}`} aria-controls={`painel-${a.k}`} onClick={() => setAtiva(a.k)}
              className={`h-9 rounded-full px-[18px] text-xs font-semibold ${ativa === a.k ? "bg-card shadow-[0_2px_5.5px_rgba(0,0,0,.06)]" : "hover:bg-card/60"}`}>{a.l}</button>
          ))}
        </div>
      </div>
      {propostas && <div role="tabpanel" id="painel-propostas" aria-labelledby="aba-propostas" hidden={ativa !== "propostas"}><Propostas id={id} p={propostas} /></div>}
      {votacoes && <div role="tabpanel" id="painel-votos" aria-labelledby="aba-votos" hidden={ativa !== "votos"}><Votos v={votacoes} /></div>}
    </section>
  );
}
