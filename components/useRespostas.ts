"use client";

import { useCallback, useEffect, useState } from "react";
import { CHAVE_RESPOSTAS, lerRespostas, type Respostas } from "@/lib/quiz";

/**
 * Respostas do quiz deste navegador. Lidas depois de montar (sem divergência com o HTML do
 * servidor). `atualizar` recebe uma função do estado mais recente: toques em sequência rápida
 * não se sobrescrevem.
 */
export function useRespostas(): [Respostas | null, (f: (atual: Respostas) => Respostas) => void] {
  const [respostas, setRespostas] = useState<Respostas | null>(null);
  useEffect(() => {
    const ler = () => {
      try { setRespostas(lerRespostas(localStorage.getItem(CHAVE_RESPOSTAS))); } catch { setRespostas({}); }
    };
    ler();
    window.addEventListener("storage", ler); // respostas dadas em outra aba
    return () => window.removeEventListener("storage", ler);
  }, []);
  const atualizar = useCallback((f: (atual: Respostas) => Respostas) => {
    setRespostas((atual) => {
      const nova = f(atual ?? {});
      try { localStorage.setItem(CHAVE_RESPOSTAS, JSON.stringify(nova)); } catch { /* modo privado: vale só nesta página */ }
      return nova;
    });
  }, []);
  return [respostas, atualizar];
}
