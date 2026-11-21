import type { ReactNode } from "react";
import { GraficoLinha } from "@/components/GraficoLinha";
import type { LinhaConta, LinhaIndicador, LinhaPlacar } from "@/lib/executivo-painel";

/**
 * Blocos da página do executivo (E23y, protótipo aprovado em 2026-11-21, versão 112 do canvas): título de seção com o
 * "i" (o contexto que antes era subtítulo), contas do governo em lista estilo Ajustes, indicadores em lista estilo
 * Ações e o placar com o Congresso. Cada item da lista abre o gráfico de linha; um aberto por vez (`<details name>`),
 * com o chevron para baixo fechado e para cima aberto (pedido do usuário).
 */

/** Título de seção fora do cartão (22 px) com o botão "i" que abre o contexto (popover nativo, sem JavaScript). */
export function SecaoExecutivo({ id, titulo, info, children }: { id: string; titulo: string; info?: ReactNode; children: ReactNode }) {
  const pop = `info-${id}`;
  return (
    <section aria-labelledby={id} className="grid min-w-0 gap-3">
      <div className="flex items-center gap-3 px-1 pt-2">
        <h2 id={id} className="flex-1 text-[22px] leading-7 font-bold tracking-[-0.3px]">{titulo}</h2>
        {info && (
          <>
            <button type="button" popoverTarget={pop} aria-label={`Sobre ${titulo.toLowerCase()}`}
              className="inline-flex size-[30px] shrink-0 items-center justify-center rounded-full border border-white/18 bg-white/8 text-link shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] hover:bg-white/16">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5" /><path d="M12 11v6" /><path d="M12 7.4h.01" /></svg>
            </button>
            <span id={pop} popover="auto" className="m-auto max-w-[min(22rem,calc(100vw-2rem))] rounded-[22px] vidro-forte bg-[rgba(44,45,52,0.94)] p-4 text-left text-sm leading-relaxed text-texto backdrop:bg-black/40">
              <span className="block font-semibold">{titulo}</span>
              <span className="mt-1 block text-[13px] leading-[18px] text-texto/90">{info}</span>
              <span className="mt-3 flex justify-end text-xs">
                <button type="button" popoverTarget={pop} popoverTargetAction="hide" className="font-semibold text-link">Fechar</button>
              </span>
            </span>
          </>
        )}
      </div>
      {children}
    </section>
  );
}

const Chevron = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(235,235,245,0.45)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 transition-transform group-open:rotate-180">
    <path d="m6 9 6 6 6-6" />
  </svg>
);
const LINHA = "group border-t border-white/12 first:border-t-0";
const RESUMO = "flex w-full cursor-pointer list-none flex-col gap-2.5 px-4 py-3.5 hover:bg-white/4 [&::-webkit-details-marker]:hidden";

/** Contas do governo: ícone colorido, valor, o que o número é e a barra com a marca branca do mínimo, limite ou meta. */
export function ContasGoverno({ linhas }: { linhas: LinhaConta[] }) {
  return (
    <div className="vidro overflow-hidden rounded-card">
      {linhas.map((l, i) => (
        <details key={l.chave} name="contas-governo" open={i === 0} className={LINHA}>
          <summary className={RESUMO}>
            <span className="flex items-center gap-3">
              <span aria-hidden="true" className="inline-flex size-[30px] shrink-0 items-center justify-center rounded-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]" style={{ background: l.cor }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d={l.icone} /></svg>
              </span>
              <span className="min-w-0 flex-1 text-base font-semibold">{l.nome}</span>
              <span className="text-xl font-semibold tracking-[-0.2px] whitespace-nowrap tabular-nums">{l.valor}</span>
              <Chevron />
            </span>
            <span className="-mt-2 pr-6 pl-[42px] text-[13px] leading-[17px] text-suave">{l.oque}</span>
            {l.regua ? (
              <span className="grid gap-[7px] pr-6 pl-[42px]">
                <span className="relative block h-2 rounded bg-white/12" aria-hidden="true">
                  <span className="absolute inset-y-0 left-0 rounded bg-[#0A84FF]" style={{ width: `${l.regua.val.toFixed(1)}%` }} />
                  <span className="absolute -top-1 h-4 w-[3px] -translate-x-1/2 rounded-sm bg-white shadow-[0_0_0_2px_rgba(30,31,37,0.95)]" style={{ left: `${l.regua.ref.toFixed(1)}%` }} />
                </span>
                <span className="flex items-center justify-between gap-2 text-xs text-suave">
                  <span className="flex items-center gap-1.5"><span aria-hidden="true" className="h-[11px] w-[3px] rounded-sm bg-white" />{l.regua.refTxt}</span>
                  <span className="font-semibold whitespace-nowrap text-texto/90">{l.regua.dif}</span>
                </span>
              </span>
            ) : l.antes ? <span className="pl-[42px] text-xs text-suave">{l.antes}</span> : null}
          </summary>
          {l.grafico && <div className="px-4 pb-4"><GraficoLinha g={l.grafico} /></div>}
        </details>
      ))}
    </div>
  );
}

/** Como o país ou o estado está: minigráfico, último valor e quanto mudou desde 2022; cada item abre o gráfico. */
export function IndicadoresLugar({ linhas }: { linhas: LinhaIndicador[] }) {
  return (
    <div className="vidro overflow-hidden rounded-card">
      {linhas.map((l, i) => (
        <details key={l.chave} name="indicadores-lugar" open={i === 0} className={LINHA}>
          <summary className={`${RESUMO} py-3`}>
            <span className="flex items-center gap-3">
              <span className="grid min-w-0 flex-1 gap-0.5">
                <span className="text-base font-semibold">{l.nome}</span>
                <span className="text-xs text-suave">{l.per}</span>
              </span>
              {l.mini.linha && (
                <svg width="56" height="30" viewBox="0 0 64 30" aria-hidden="true" className="shrink-0 overflow-visible">
                  {l.mini.base && <path d={l.mini.base} fill="none" stroke="rgba(235,235,245,0.35)" strokeWidth="1" strokeDasharray="1.5 2.5" />}
                  <path d={l.mini.linha} fill="none" stroke="#0A84FF" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                </svg>
              )}
              <span className="grid min-w-[78px] justify-items-end gap-1">
                <span className="text-[17px] font-semibold whitespace-nowrap tabular-nums">{l.valor}</span>
                {l.delta && <span className="inline-flex h-[22px] items-center rounded-[7px] bg-white/12 px-2 text-xs font-semibold whitespace-nowrap tabular-nums shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">{l.delta}</span>}
              </span>
              <Chevron />
            </span>
          </summary>
          <div className="px-4 pb-4">
            {l.grafico ? <GraficoLinha g={l.grafico} /> : <p className="rounded-[20px] bg-white/6 p-3.5 text-sm leading-relaxed text-texto/85">{l.lacuna}</p>}
          </div>
        </details>
      ))}
    </div>
  );
}

const LEGENDA = (cor: string, texto: string, vazio = false) => (
  <span className="flex items-center gap-1.5">
    <span aria-hidden="true" className={`size-2.5 rounded-full ${vazio ? "border border-white/35 bg-white/22" : ""}`} style={vazio ? undefined : { background: cor }} />{texto}
  </span>
);
const barra = (partes: [number, string][], total: number) => (
  <span aria-hidden="true" className="flex h-2.5 gap-0.5 overflow-hidden rounded-[5px]">
    {partes.filter(([n]) => n > 0).map(([n, cor], i) => <span key={i} style={{ width: `${((n / total) * 100).toFixed(2)}%`, background: cor }} />)}
  </span>
);

/** Placar com o Congresso: o que o governo enviou desde 2023 e o que aconteceu, e os vetos. */
export function PlacarCongresso({ linhas, vetos, pln, lista }: {
  linhas: LinhaPlacar[];
  vetos: { total: number; derrubados: number; aguardando: number; mantidos: number };
  pln: { total: number; aprovados: number };
  lista: ReactNode;
}) {
  const AZUL = "#0A84FF", CINZA = "#8E8E93", LARANJA = "#FF9F0A", PEND = "rgba(255,255,255,0.22)";
  return (
    <div className="vidro grid gap-4 rounded-card p-4">
      <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 text-xs text-texto/80">
        {LEGENDA(AZUL, "Virou lei")}{LEGENDA(CINZA, "Perdeu a validade ou encerrado")}{LEGENDA(PEND, "Sem desfecho ou em andamento", true)}
      </div>
      <ul className="grid gap-3.5">
        {linhas.map((l) => (
          <li key={l.tipo} className="grid gap-1.5" aria-label={`${l.nome}: ${l.enviadas}; ${l.texto.replace(/ · /g, ", ")}`}>
            <span className="flex items-baseline justify-between gap-2"><span className="text-[15px] font-semibold">{l.nome}</span><span className="text-[13px] text-texto/75 tabular-nums">{l.enviadas}</span></span>
            {barra([[l.lei, AZUL], [l.encerradas, CINZA], [l.outras, PEND]], l.total)}
            <span className="text-xs leading-4 text-texto/75">{l.texto}</span>
          </li>
        ))}
      </ul>
      {vetos.total > 0 && (
        <div className="grid gap-1.5 rounded-[18px] border border-white/8 bg-white/6 p-3.5" aria-label={`${vetos.total} vetos: ${vetos.derrubados} derrubados no todo ou em parte, ${vetos.aguardando} aguardando votação, ${vetos.mantidos} mantidos ou prejudicados`}>
          <span className="flex items-baseline justify-between gap-2"><span className="text-[15px] font-semibold">Vetos</span><span className="text-[13px] text-texto/75 tabular-nums">{vetos.total} vetos</span></span>
          {barra([[vetos.mantidos, AZUL], [vetos.derrubados, LARANJA], [vetos.aguardando, PEND]], vetos.total)}
          <span className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-texto/80">{LEGENDA(AZUL, "Mantido")}{LEGENDA(LARANJA, "Derrubado")}{LEGENDA(PEND, "Aguardando", true)}</span>
          <span className="text-xs leading-4 text-texto/75">{vetos.mantidos} mantidos ou prejudicados · {vetos.derrubados} derrubados, no todo ou em parte · {vetos.aguardando} aguardando votação</span>
        </div>
      )}
      {pln.total > 0 && <p className="text-xs leading-4 text-suave">Fora do placar: {pln.total} projetos de lei do orçamento (PLN), dos quais {pln.aprovados} aprovados.</p>}
      <details className="group border-t border-white/12 pt-3">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
          <span className="text-[15px] font-semibold">Ver a lista do que foi enviado</span>
          <Chevron />
        </summary>
        <div className="pt-3">{lista}</div>
      </details>
    </div>
  );
}
