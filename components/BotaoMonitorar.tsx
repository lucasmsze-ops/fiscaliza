"use client";

import { useState } from "react";
import { alternar, monitora, useMonitorando } from "@/lib/monitorando";

/** Versão pequena (listas e rostos): pílula que muda com o estado. */
export const classeMonitorar = (on: boolean) =>
  `inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold whitespace-nowrap ${on ? "bg-destaque text-destaque-texto" : "bg-preench text-link hover:bg-preench-forte"}`;

/** "+ Monitorar" / "✓ Monitorando": guarda a pessoa só neste navegador (lib/monitorando.ts). */
export function BotaoMonitorar({ id, nome, classe }: { id: string; nome: string; classe?: (on: boolean) => string }) {
  const e = useMonitorando();
  const on = monitora(e, id);
  const [aviso, setAviso] = useState("");
  return (
    <>
      <button type="button" aria-pressed={on}
        onClick={() => { alternar(id, nome); setAviso(on ? `Você deixou de monitorar ${nome}` : `Você está monitorando ${nome} neste aparelho`); }}
        className={classe?.(on) ?? `inline-flex h-10 items-center justify-center rounded-full px-3 text-[13px] font-semibold whitespace-nowrap sm:px-4 ${on ? "bg-destaque text-destaque-texto" : "bg-preench text-link hover:bg-preench-forte"}`}>
        {on ? "✓ Monitorando" : "+ Monitorar"}
      </button>
      <span role="status" className="sr-only">{aviso}</span>
    </>
  );
}
