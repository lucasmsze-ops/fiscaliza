"use client";

import { cobrarComDiscordancia, hrefMailto, pct, type CobrarCard } from "@/lib/card";
import { concordanciaQuiz, exibivel, MIN_COMPARAVEIS, votacaoDiscordante, type VotoQuiz } from "@/lib/quiz";
import { Termo } from "./Termo";
import { useRespostas } from "./useRespostas";

/** Terceiro número do card. Oculto sem respostas do quiz (CLAUDE.md). */
export function ConcordanciaNoCard({ id, votos }: { id: string; votos: VotoQuiz[] }) {
  const [respostas] = useRespostas();
  if (!respostas || Object.keys(respostas).length === 0) return null;
  const c = concordanciaQuiz(respostas, votos);
  return (
    <div className="mt-3 rounded-xl bg-black/[0.04] px-3 py-2 dark:bg-white/[0.06]">
      <p className="text-xs text-[var(--suave)]"><Termo id={`${id}-conc`} termo="concordancia">concordância com você</Termo></p>
      {exibivel(c) ? (
        <p className="mt-1">
          <span className="text-2xl font-semibold tabular-nums">{pct(c)}</span>
          <span className="ml-2 text-xs text-[var(--suave)] tabular-nums">{c.numerador} de {c.denominador} votações do quiz</span>
        </p>
      ) : (
        <p className="mt-1 text-sm">
          Poucos votos para comparar: {c.denominador} {c.denominador === 1 ? "votação" : "votações"} com voto Sim ou Não entre as que você respondeu (mínimo {MIN_COMPARAVEIS}).
        </p>
      )}
    </div>
  );
}

/** Botão Cobrar: com respostas do quiz, o e-mail cita a primeira votação em que o voto diferiu. */
export function BotaoCobrar({ cobrar, votos }: { cobrar: CobrarCard; votos: VotoQuiz[] | null }) {
  const [respostas] = useRespostas();
  const d = respostas && votos ? votacaoDiscordante(respostas, votos) : null;
  const href = hrefMailto(d ? cobrarComDiscordancia(cobrar, d) : cobrar);
  return (
    <a href={href} data-discordante={d?.itemId ?? ""} className="rounded-full bg-[var(--texto)] px-5 py-2 text-sm font-semibold text-[var(--fundo)]">
      Cobrar
    </a>
  );
}
