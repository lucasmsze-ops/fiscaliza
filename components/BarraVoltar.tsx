"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { nomeN1 } from "@/lib/navegacao";

/** Chaves do sessionStorage: a tela atual e a anterior dentro do site (RastroNavegacao, na Moldura). */
export const RASTRO_ATUAL = "fiscaliza:atual";
export const RASTRO_ANTERIOR = "fiscaliza:anterior";

const ler = (k: string) => { try { return sessionStorage.getItem(k); } catch { return null; } };

/**
 * Guarda a tela anterior a cada troca de página, só nesta aba (sessionStorage; nada sai do navegador).
 * Fica na Moldura, antes das páginas, para o BarraVoltar saber de onde a pessoa veio.
 */
export function RastroNavegacao() {
  const caminho = usePathname();
  useEffect(() => {
    try {
      const atual = sessionStorage.getItem(RASTRO_ATUAL);
      if (atual === caminho) return;
      if (atual) sessionStorage.setItem(RASTRO_ANTERIOR, atual);
      sessionStorage.setItem(RASTRO_ATUAL, caminho);
    } catch { /* navegação privada sem storage: o botão de voltar usa o destino padrão */ }
  }, [caminho]);
  return null;
}

/**
 * Topo das telas N2 (lib/navegacao.ts): no lugar do menu, o botão de voltar, como no iOS. Se a pessoa
 * veio de outra tela do site, volta no histórico e o botão leva o nome dela ("‹ Congresso"; "‹ Voltar"
 * quando era outra N2); se abriu o link direto, vai para `volta` com o nome `rotulo`. No celular o botão
 * fica fixo no topo.
 */
export function BarraVoltar({ volta, rotulo, titulo }: { volta: string; rotulo: string; /** Texto centrado na barra ("Câmara · Plenário"). */ titulo?: string }) {
  const caminho = usePathname();
  const router = useRouter();
  const [anterior, setAnterior] = useState<{ rotulo: string } | null>(null);
  useEffect(() => {
    const atual = ler(RASTRO_ATUAL);
    const veioDe = atual === caminho ? ler(RASTRO_ANTERIOR) : atual;
    // history.length > 1: numa aba nova o sessionStorage pode vir copiado, mas não há para onde voltar.
    setAnterior(veioDe && veioDe !== caminho && window.history.length > 1 ? { rotulo: nomeN1(veioDe) ?? "Voltar" } : null);
  }, [caminho]);

  return (
    // Barra de vidro do iOS presa ao topo no celular (pedido de 2026-11-20: sem ela o botão sumia sobre o conteúdo),
    // com o botão de voltar em círculo e, quando há, o título no meio: no celular fica preso ao topo e o
    // conteúdo passa por baixo dele, desfocado. `mb-4`: o título da página não encosta na barra (pedido de 2026-11-21).
    <div className="sticky top-0 z-30 -mx-4 mb-4 flex items-center justify-between gap-3 border-b border-white/10 bg-[rgba(23,24,29,0.72)] px-4 pt-[max(8px,env(safe-area-inset-top))] pb-2 backdrop-blur-xl backdrop-saturate-150 lg:static lg:mx-0 lg:mb-0 lg:border-0 lg:bg-transparent lg:px-0 lg:pt-6 lg:pb-3 lg:backdrop-blur-none">
      <Link href={volta} onClick={(e) => { if (anterior) { e.preventDefault(); router.back(); } }} aria-label={`Voltar para ${anterior?.rotulo ?? rotulo}`} title={anterior?.rotulo ?? rotulo}
        className="vidro inline-flex size-11 items-center justify-center rounded-full text-texto no-underline hover:text-texto">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg>
      </Link>
      {titulo && <><span className="text-[15px] font-semibold text-texto/85">{titulo}</span><span aria-hidden="true" className="w-11" /></>}
    </div>
  );
}
