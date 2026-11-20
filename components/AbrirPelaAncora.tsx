"use client";

import { useEffect } from "react";

/**
 * Abre o `<details>` do endereço (/como-funciona#participacao) e rola até ele: os links "Como calculamos" de todo o site
 * caem no assunto certo, já aberto. Vale também para quem troca o # na mesma página.
 */
export function AbrirPelaAncora() {
  useEffect(() => {
    const abrir = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const el = id ? document.getElementById(id) : null;
      if (el instanceof HTMLDetailsElement) { el.open = true; requestAnimationFrame(() => el.scrollIntoView({ block: "start" })); }
    };
    abrir();
    window.addEventListener("hashchange", abrir);
    return () => window.removeEventListener("hashchange", abrir);
  }, []);
  return null;
}
