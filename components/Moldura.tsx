import Link from "next/link";
import { hrefSecao } from "@/lib/glossario";
import { RastroNavegacao } from "./BarraVoltar";
import { CabecalhoCelular } from "./CabecalhoCelular";
import { MenuItens } from "./MenuItens";
import { Rodape } from "./Rodape";
import { BOTAO } from "@/lib/estilo";

/** Marca do site: as barras e o nome, como no protótipo. */
function Marca() {
  return (
    <Link href="/" className="flex items-center gap-2.5 text-texto no-underline">
      <svg width="22" height="18" viewBox="0 0 26 20" aria-hidden="true" className="fill-current">
        <rect x="0" y="17" width="26" height="3" rx="1" /><rect x="3" y="9" width="4" height="7" rx="1" />
        <rect x="9" y="3" width="4" height="13" rx="1" /><rect x="15" y="11" width="4" height="5" rx="1" />
      </svg>
      <span className="text-[17px] font-bold">Fiscaliza</span>
    </Link>
  );
}

/**
 * Linha do cabeçalho: a marca e, à direita, o ícone de Dúvidas, que leva ao Sobre (/como-funciona saiu do
 * menu em 2026-11-14). Igual no cabeçalho do celular e no topo do menu lateral.
 */
function LinhaMarca() {
  return (
    <div className="flex items-center justify-between gap-3">
      <Marca />
      <Link href="/como-funciona" aria-label="Dúvidas: como o Fiscaliza funciona" title="Dúvidas"
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-link no-underline hover:bg-preench">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9.5" /><path d="M9.6 9.3a2.5 2.5 0 0 1 4.85.85c0 1.65-2.45 2.2-2.45 3.6M12 17h.01" />
        </svg>
      </Link>
    </div>
  );
}

/** De onde vêm os dados: o atalho para a metodologia, embaixo do menu. */
function CartaoFontes() {
  return (
    <div className="mt-5 grid gap-1 rounded-card bg-card p-4">
      <strong className="text-[15px] font-semibold">De onde vêm os dados?</strong>
      <span className="text-[13px] text-suave">Só fontes oficiais: TSE, Câmara e Senado, com o link de cada número.</span>
      <Link href={hrefSecao("fontes")} className={`${BOTAO} mt-2.5`}>Ver metodologia</Link>
    </div>
  );
}

/**
 * Moldura de todas as páginas (app/layout.tsx): menu lateral no computador; no celular, a marca e o
 * menu em abas logo abaixo (pedido do usuário em 2026-11-04: abas, não um botão que abre). Visual do
 * iOS adaptado para site (2026-11-14): nada de tab bar de app.
 */
export function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-[1440px] gap-6 px-4 lg:px-6">
      <aside className="hidden w-[250px] shrink-0 py-6 lg:block">
        <nav aria-label="Menu principal" className="sticky top-6">
          <div className="pr-1 pb-4 pl-3.5"><LinhaMarca /></div>
          <div className="mb-3 h-px bg-borda" />
          <MenuItens />
          <CartaoFontes />
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        {/* grid-cols-1 e min-w-0: a faixa de abas rola por dentro em vez de alargar a página. */}
        <RastroNavegacao />
        {/* Celular: marca e abas só nas telas N1; nas N2, a página traz o botão de voltar. */}
        <CabecalhoCelular>
          <LinhaMarca />
          <nav aria-label="Menu principal" className="min-w-0"><MenuItens abas /></nav>
        </CabecalhoCelular>

        {children}
        <Rodape />
      </div>
    </div>
  );
}
