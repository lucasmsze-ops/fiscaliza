import Link from "next/link";
import { inteiro } from "@/lib/card";
import { NOME_FONTE } from "@/lib/noticias";
import { manchete } from "@/lib/titulo";
import type { VotacaoResumo } from "@/lib/congresso";
import { hrefVotacao, rotuloVotado, tipoPorExtenso } from "@/lib/votacao";

const RESULTADO = { aprovada: "Aprovada", rejeitada: "Rejeitada" } as const;

/** "PEC 18/2025 · proposta de emenda à Constituição · texto principal, 1º turno" */
export function linhaMateria(v: Pick<VotacaoResumo, "proposicao" | "descricao">) {
  return [tipoPorExtenso(v.proposicao), rotuloVotado(v)].filter(Boolean).join(" · ");
}

/** Etiqueta do resultado (verde aprovada, vermelha rejeitada), a do protótipo Liquid Glass. */
export function SeloResultado({ r, grande = false }: { r: "aprovada" | "rejeitada"; grande?: boolean }) {
  return (
    <span className={`inline-flex items-center rounded-full border font-bold ${grande ? "h-8 px-3.5 text-[15px]" : "h-7 px-3 text-[13px]"} ${r === "aprovada" ? "border-verde/45 bg-verde/20 text-[#5EE37E]" : "border-vermelho/45 bg-vermelho/20 text-[#FF7A70]"}`}>
      {RESULTADO[r]}
    </span>
  );
}

/** Etiqueta de tema oficial (cinza translúcido). */
export const Tema = ({ t }: { t: string }) => <span className="inline-flex h-6 items-center rounded-full bg-white/10 px-2.5 text-xs font-semibold text-texto/85">{t}</span>;

/**
 * Cartão de votação do protótipo Liquid Glass: temas, a manchete da ementa (lib/titulo.ts), matéria e o que foi votado, o
 * resultado e o placar em texto. Abre /votacoes/[id].
 */
export function CartaoVotacao({ v }: { v: VotacaoResumo }) {
  const p = v.placar;
  const total = p ? p.sim + p.nao + p.abstencao + p.obstrucao : 0;
  const resto = linhaMateria(v);
  return (
    <Link href={hrefVotacao(v.id)} className="vidro grid content-start gap-2.5 rounded-card p-[18px] text-texto no-underline hover:bg-white/10 hover:text-texto">
      {v.temas && v.temas.length > 0 && <span className="flex flex-wrap gap-1.5">{v.temas.slice(0, 2).map((t) => <Tema key={t} t={t} />)}</span>}
      <span className="line-clamp-4 text-[15px] leading-5 font-semibold" title={v.ementa ?? undefined}>{v.agencia?.titulo ?? (manchete(v.ementa) || v.descricao)}</span>
      {v.agencia && <span className="-mt-1.5 text-xs text-suave">Título da {NOME_FONTE[v.agencia.fonte]}</span>}
      <span className="text-[13px] text-suave">{v.proposicao ?? "Sem matéria principal informada"}{resto && ` · ${resto}`}</span>
      <span className="flex flex-wrap items-center gap-2.5">
        {v.resultado && <SeloResultado r={v.resultado} />}
        <span className="text-[13px] text-texto/85 tabular-nums">
          {v.secreta || !p ? "votação secreta: o Senado publica só quem votou"
            : total === 0 ? "a Câmara não divulga a direção dos votos"
            : <>Sim {inteiro(p.sim)} · Não {inteiro(p.nao)} · Abst. {inteiro(p.abstencao)}{p.obstrucao > 0 && <> · Obstr. {inteiro(p.obstrucao)}</>}</>}
        </span>
      </span>
    </Link>
  );
}
