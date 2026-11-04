"use client";

import { useState, type ReactNode } from "react";

/** Abas do crachá ("O que fez no mandato"). O conteúdo de cada aba vem pronto do servidor. */
export function Abas({ id, abas }: { id: string; abas: { chave: string; rotulo: string; conteudo: ReactNode }[] }) {
  const [ativa, setAtiva] = useState(abas[0]?.chave);
  return (
    <div>
      <div role="tablist" aria-label="Seções" className="flex flex-wrap gap-2">
        {abas.map((a) => {
          const on = a.chave === ativa;
          return (
            <button key={a.chave} type="button" role="tab" id={`${id}-aba-${a.chave}`} aria-selected={on} aria-controls={`${id}-painel-${a.chave}`}
              onClick={() => setAtiva(a.chave)}
              className={`h-9 rounded-xl border px-4 text-xs font-bold ${on ? "border-destaque bg-destaque text-destaque-texto" : "border-borda bg-card hover:border-destaque"}`}>
              {a.rotulo}
            </button>
          );
        })}
      </div>
      {abas.map((a) => (
        <div key={a.chave} role="tabpanel" id={`${id}-painel-${a.chave}`} aria-labelledby={`${id}-aba-${a.chave}`} hidden={a.chave !== ativa} className="mt-4">
          {a.conteudo}
        </div>
      ))}
    </div>
  );
}
