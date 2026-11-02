"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { caminhoColinha, CHAVE_STORAGE, lerColinha } from "@/lib/colinha";
import type { Resposta } from "@/lib/quiz";
import type { QuizItem } from "@/lib/types";
import { useRespostas } from "./useRespostas";

const externo = { target: "_blank", rel: "noreferrer noopener" } as const;
const sn = (r: Resposta) => (r === "sim" ? "Sim" : "Não");

/** As perguntas do quiz com resposta Sim/Não. Respostas só no localStorage deste navegador. */
export function Quiz({ itens }: { itens: QuizItem[] }) {
  const [respostas, atualizar] = useRespostas();
  const [colinha, setColinha] = useState<string | null>(null);
  useEffect(() => {
    try { setColinha(caminhoColinha(lerColinha(localStorage.getItem(CHAVE_STORAGE)))); } catch { /* sem localStorage */ }
  }, []);

  const r = respostas ?? {};
  const respondidas = itens.filter((i) => r[i.id]).length;
  const responder = (id: string, v: Resposta) => atualizar((atual) => {
    const nova = { ...atual };
    if (nova[id] === v) delete nova[id]; else nova[id] = v; // tocar de novo desfaz
    return nova;
  });

  return (
    <div className="pb-28">
      <ol className="grid gap-6">
        {itens.map((q) => (
          <li key={q.id} id={q.id}>
            <article className="rounded-2xl border border-black/10 p-4 dark:border-white/15" aria-labelledby={`t-${q.id}`}>
              <p className="text-xs text-[var(--suave)]">{q.ordem} de {itens.length} · {q.materia}</p>
              <h2 id={`t-${q.id}`} className="mt-1 text-lg font-semibold leading-snug">{q.titulo}</h2>
              <div className="mt-3 grid gap-2 text-sm leading-relaxed">
                {q.explicacao.map((p, i) => <p key={i}>{p}</p>)}
              </div>
              <p className="mt-3 text-xs">
                {q.fontes.map((f, i) => (
                  <span key={f.url}>{i > 0 && " · "}<a href={f.url} {...externo} className="underline underline-offset-2">{f.rotulo}</a></span>
                ))}
              </p>
              <fieldset className="mt-4">
                <legend className="text-sm font-medium">Se você estivesse no plenário, votaria Sim ou Não a este texto?</legend>
                <div className="mt-2 flex gap-2">
                  {(["sim", "nao"] as const).map((v) => (
                    <button key={v} type="button" aria-pressed={r[q.id] === v} onClick={() => responder(q.id, v)}
                      className={`min-w-24 rounded-full border px-5 py-2 text-sm font-semibold ${r[q.id] === v ? "border-[var(--texto)] bg-[var(--texto)] text-[var(--fundo)]" : "border-black/20 dark:border-white/25"}`}>
                      {sn(v)}
                    </button>
                  ))}
                </div>
              </fieldset>
            </article>
          </li>
        ))}
      </ol>

      <div className="barra-fixa fixed inset-x-0 bottom-0 border-t border-black/10 bg-[var(--fundo)] px-4 py-3 dark:border-white/15">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          <p className="text-sm tabular-nums" aria-live="polite">{respondidas} de {itens.length} respondidas</p>
          {colinha && respondidas > 0 ? (
            <Link href={colinha} className="shrink-0 rounded-full bg-[var(--texto)] px-5 py-2 text-sm font-semibold text-[var(--fundo)]">Ver na colinha</Link>
          ) : !colinha ? (
            <Link href="/" className="shrink-0 text-sm underline underline-offset-2">Montar a colinha</Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
