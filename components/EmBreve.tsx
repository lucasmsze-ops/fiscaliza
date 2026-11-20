"use client";

import { useId } from "react";
import { BOTAO_PRINCIPAL, FLUTUANTE } from "@/lib/estilo";

/**
 * Botão de algo que ainda não existe (Entrar, cadastro, Comparar, STF, Impostômetro): abre o aviso "Em breve"
 * do protótipo Liquid Glass. Exceção ao princípio 5 aceita pelo usuário em 2026-11-20 (CLAUDE.md): o botão
 * diz que a função vem aí e não pede nem guarda nada. Popover nativo do HTML: Esc e toque fora fecham.
 */
export function EmBreve({ oQue, className, rotulo, children }: {
  /** Sujeito da frase do aviso: "O login", "A comparação de políticos". */
  oQue: string;
  className?: string;
  /** aria-label, quando o conteúdo é só um ícone. */
  rotulo?: string;
  children: React.ReactNode;
}) {
  const id = `em-breve-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <>
      <button type="button" popoverTarget={id} aria-label={rotulo} className={className}>{children}</button>
      <div id={id} popover="auto" role="dialog" aria-labelledby={`${id}-t`}
        className={`${FLUTUANTE} m-auto w-[min(22rem,calc(100vw-48px))] p-5 pt-6 text-center backdrop:bg-black/50`}>
        <span aria-hidden="true" className="mx-auto mb-2.5 flex size-[52px] items-center justify-center rounded-full border border-link/40 bg-link/18 text-[#8cc4ff]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" /></svg>
        </span>
        <h2 id={`${id}-t`} className="text-lg font-bold">Em breve</h2>
        <p className="mt-2.5 text-[15px] leading-[21px] text-texto/80">{oQue} é uma entrega futura em que estamos trabalhando neste momento.</p>
        <button type="button" popoverTarget={id} popoverTargetAction="hide" className={`${BOTAO_PRINCIPAL} mt-4 w-full`}>Entendi</button>
      </div>
    </>
  );
}

/** Ícone de pessoa do botão Entrar. */
export const IconeConta = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9.5" /><circle cx="12" cy="10" r="3.2" /><path d="M6.2 18.6a6.6 6.6 0 0 1 11.6 0" />
  </svg>
);
