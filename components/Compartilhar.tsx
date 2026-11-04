"use client";

import { useState } from "react";

/** Compartilha a URL atual: menu nativo do celular (Web Share API) ou, sem ele, copia o link. */
export function Compartilhar({ titulo, texto, rotulo = "Compartilhar colinha" }: { titulo: string; texto: string; rotulo?: string }) {
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
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => void compartilhar()}
        className="rounded-xl bg-destaque px-6 py-3 text-sm font-bold text-destaque-texto">
        {rotulo}
      </button>
      {aviso && <span role="status" className="text-sm">{aviso}</span>}
    </div>
  );
}
