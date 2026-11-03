import Link from "next/link";
import { hrefSecao } from "@/lib/glossario";
import { MenuItens } from "./MenuItens";
import { Rodape } from "./Rodape";

/** Marca do site: as barras e o nome, como no protótipo. */
function Marca() {
  return (
    <Link href="/" className="flex items-center gap-2.5 text-texto no-underline">
      <svg width="22" height="18" viewBox="0 0 26 20" aria-hidden="true" className="fill-current">
        <rect x="0" y="17" width="26" height="3" rx="1" /><rect x="3" y="9" width="4" height="7" rx="1" />
        <rect x="9" y="3" width="4" height="13" rx="1" /><rect x="15" y="11" width="4" height="5" rx="1" />
      </svg>
      <span className="text-sm font-bold tracking-wider uppercase">Fiscaliza</span>
    </Link>
  );
}

/** De onde vêm os dados: o atalho para a metodologia, embaixo do menu. */
function CartaoFontes() {
  return (
    <div className="mt-5 grid gap-1.5 rounded-card bg-destaque p-4 text-destaque-texto">
      <strong className="text-sm">De onde vêm os dados?</strong>
      <span className="text-xs">Só fontes oficiais: TSE, Câmara e Senado, com o link de cada número.</span>
      <Link href={hrefSecao("fontes")}
        className="mt-2 inline-flex h-9 items-center justify-center rounded-xl bg-card text-[11px] font-bold tracking-wide text-texto uppercase no-underline">
        Ver metodologia
      </Link>
    </div>
  );
}

/**
 * Moldura de todas as páginas (app/layout.tsx): menu lateral no computador; no celular, cabeçalho
 * com o menu numa gaveta (popover nativo, sem JS), porque o rodapé do celular é da barra da colinha.
 */
export function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-[1440px] gap-6 px-4 lg:px-6">
      <aside className="hidden w-[250px] shrink-0 py-6 lg:block">
        <nav aria-label="Menu principal" className="sticky top-6">
          <div className="px-3.5 pb-4"><Marca /></div>
          <div className="mb-3.5 h-px bg-gradient-to-r from-transparent via-borda to-transparent" />
          <MenuItens />
          <CartaoFontes />
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between py-4 lg:hidden">
          <Marca />
          <button type="button" popoverTarget="menu-celular"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-borda bg-card px-3.5 text-sm font-bold shadow-card">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            Menu
          </button>
          <nav id="menu-celular" popover="auto" aria-label="Menu principal"
            className="inset-y-0 right-auto left-0 m-0 h-dvh border-0 max-h-none w-72 max-w-[85vw] overflow-y-auto bg-fundo p-4 text-texto shadow-xl backdrop:bg-black/40">
            <div className="flex items-center justify-between px-3.5 pb-4">
              <Marca />
              <button type="button" popoverTarget="menu-celular" popoverTargetAction="hide" className="text-sm underline underline-offset-2">Fechar</button>
            </div>
            <MenuItens fecharGaveta="menu-celular" />
            <CartaoFontes />
          </nav>
        </header>

        {children}
        <Rodape />
      </div>
    </div>
  );
}
