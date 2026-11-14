"use client";

import { useState } from "react";

/** Compartilha a URL atual: menu nativo do celular (Web Share API) ou, sem ele, copia o link. */
export function Compartilhar({ titulo, texto, rotulo = "Compartilhar", classe }: { titulo: string; texto: string; rotulo?: string; classe?: string }) {
  const [aviso, setAviso] = useState<string | null>(null);

  async function compartilhar() {
    const url = location.href;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: titulo, text: texto, url });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return; // a pessoa fechou o menu
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setAviso("Link copiado.");
    } catch {
      setAviso("Não deu para copiar. Copie o endereço desta página.");
    }
  }

  return (
    <div className="relative flex items-center">
      <button type="button" onClick={() => void compartilhar()}
        className={classe ?? "rounded-xl bg-destaque px-6 py-3 text-sm font-bold text-destaque-texto"}>
        {rotulo}
      </button>
      {/* Balão abaixo do botão: não empurra nem aperta os botões vizinhos. */}
      {aviso && <span role="status" className="absolute top-full right-0 z-10 mt-1.5 rounded-lg border border-borda bg-card px-2.5 py-1.5 text-xs whitespace-nowrap shadow-card">{aviso}</span>}
    </div>
  );
}
