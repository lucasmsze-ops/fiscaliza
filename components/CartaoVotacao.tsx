import Link from "next/link";
import { inteiro } from "@/lib/card";
import type { VotacaoResumo } from "@/lib/congresso";
import { CADEIRAS, hrefVotacao, rotuloVotado, tipoPorExtenso } from "@/lib/votacao";

const RESULTADO = { aprovada: "Aprovada", rejeitada: "Rejeitada" } as const;

/**
 * Barra do placar sobre as cadeiras da Casa: Sim, Não e Abstenção (com Obstrução junto da
 * abstenção na cor); o resto é quem não votou. Cores neutras: Sim e Não não são "bom" e "ruim".
 * Decorativa: o placar em texto vem sempre ao lado.
 */
export function BarraPlacar({ sim, nao, abst, cadeiras, necessarios, alto = false }: { sim: number; nao: number; abst: number; cadeiras: number; necessarios?: number | null; alto?: boolean }) {
  const pc = (n: number) => `${(n / cadeiras) * 100}%`;
  return (
    <span className="relative block" aria-hidden="true">
      <span className={`flex w-full gap-[2px] overflow-hidden rounded-md bg-fundo ${alto ? "h-4" : "h-2.5"}`}>
        {sim > 0 && <span className="bg-texto" style={{ width: pc(sim) }} />}
        {nao > 0 && <span className="bg-suave" style={{ width: pc(nao) }} />}
        {abst > 0 && <span className="bg-borda-forte" style={{ width: pc(abst) }} />}
      </span>
      {necessarios != null && (
        <span className="absolute -top-1 -bottom-1 w-0.5 bg-destaque" style={{ left: pc(necessarios) }} />
      )}
    </span>
  );
}

/** "PEC 18/2025 · proposta de emenda à Constituição · texto principal, 1º turno" */
export function linhaMateria(v: Pick<VotacaoResumo, "proposicao" | "descricao">) {
  return [tipoPorExtenso(v.proposicao), rotuloVotado(v)].filter(Boolean).join(" · ");
}

/** Cartão de votação (tela Congresso): Casa, matéria, ementa em 2 linhas, barra e placar. Abre /votacoes/[id]. */
export function CartaoVotacao({ v }: { v: VotacaoResumo }) {
  const p = v.placar;
  const total = p ? p.sim + p.nao + p.abstencao + p.obstrucao : 0;
  const resto = linhaMateria(v);
  return (
    <Link href={hrefVotacao(v.id)} className="grid gap-2 rounded-xl border border-borda bg-card p-3.5 text-texto no-underline hover:border-destaque">
      <span className="text-xs text-suave">{v.casa === "senado" ? "Senado" : "Câmara"}</span>
      <span className="text-[15px] leading-snug">
        <strong>{v.proposicao ?? "Sem matéria principal informada"}</strong>
        {resto && <span className="text-suave"> · {resto}</span>}
      </span>
      <span className="line-clamp-2 text-sm leading-snug text-suave">{v.ementa ?? v.descricao}</span>
      {p && !v.secreta && total > 0 && <BarraPlacar sim={p.sim} nao={p.nao} abst={p.abstencao + p.obstrucao} cadeiras={CADEIRAS[v.casa]} />}
      <span className="text-xs tabular-nums">
        {v.resultado && <strong>{RESULTADO[v.resultado]}</strong>}
        {v.resultado && " · "}
        {v.secreta || !p ? "votação secreta: o Senado publica só quem votou"
          : total === 0 ? "a Câmara não divulga a direção dos votos nesta votação"
          : <>Sim {inteiro(p.sim)} · Não {inteiro(p.nao)} · Abst. {inteiro(p.abstencao)}{p.obstrucao > 0 && <> · Obstr. {inteiro(p.obstrucao)}</>}</>}
      </span>
    </Link>
  );
}
