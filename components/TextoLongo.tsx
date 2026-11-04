"use client";

import { useState } from "react";

/** Texto oficial longo: 4 linhas e "Ler … inteira" (sem cortar nem resumir o texto). */
export function TextoLongo({ texto, rotulo }: { texto: string; rotulo: string }) {
  const [aberto, setAberto] = useState(false);
  const longo = texto.length > 280;
  return (
    <div className="grid justify-items-start gap-1.5">
      <p className={`text-[15px] leading-relaxed whitespace-pre-line ${longo && !aberto ? "line-clamp-4" : ""}`}>{texto}</p>
      {longo && (
        <button type="button" onClick={() => setAberto(!aberto)} aria-expanded={aberto} className="text-[13px] font-bold text-link underline underline-offset-2">
          {aberto ? "Mostrar menos" : rotulo}
        </button>
      )}
    </div>
  );
}
