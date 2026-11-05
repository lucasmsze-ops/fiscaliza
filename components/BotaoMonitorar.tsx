"use client";

import { useState } from "react";
import { alternar, monitora, useMonitorando } from "@/lib/monitorando";

/** Versão pequena (listas e rostos): pílula que muda com o estado. */
export const classeMonitorar = (on: boolean) =>
  `inline-flex h-8 items-center rounded-full border px-3 text-xs font-bold whitespace-nowrap ${on ? "border-destaque bg-destaque text-destaque-texto" : "border-borda bg-transparent text-link hover:bg-fundo"}`;

/** "+ Monitorar" / "✓ Monitorando": guarda a pessoa só neste navegador (lib/monitorando.ts). */
export function BotaoMonitorar({ id, nome, classe }: { id: string; nome: string; classe?: (on: boolean) => string }) {
  const e = useMonitorando();
  const on = monitora(e, id);
  const [aviso, setAviso] = useState("");
  return (
    <>
      <button type="button" aria-pressed={on}
        onClick={() => { alternar(id, nome); setAviso(on ? `Você deixou de monitorar ${nome}` : `Você está monitorando ${nome} neste aparelho`); }}
        className={classe?.(on) ?? `inline-flex h-10 items-center rounded-xl border px-4 text-xs font-bold ${on ? "border-destaque bg-destaque text-destaque-texto" : "border-borda bg-card text-link hover:border-destaque"}`}>
        {on ? "✓ Monitorando" : "+ Monitorar"}
      </button>
      <span role="status" className="sr-only">{aviso}</span>
    </>
  );
}
