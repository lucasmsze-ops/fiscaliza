import Link from "next/link";
import { hrefSecao } from "@/lib/glossario";
import { RastroNavegacao } from "./BarraVoltar";
import { CabecalhoCelular } from "./CabecalhoCelular";
import { EmBreve, IconeConta } from "./EmBreve";
import { Marca } from "./Marca";
import { MenuItens } from "./MenuItens";
import { Rodape } from "./Rodape";
import { TabBar } from "./TabBar";
import { BOTAO } from "@/lib/estilo";

/** Dúvidas: o círculo de vidro com "?" que leva ao Como funciona (fora do menu desde 2026-11-14). */
function Duvidas() {
  return (
    <Link href="/como-funciona" aria-label="Dúvidas: como o Fiscaliza funciona" title="Dúvidas"
      className="vidro inline-flex size-11 shrink-0 items-center justify-center rounded-full text-texto no-underline hover:bg-preench-forte hover:text-texto">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9.5" /><path d="M9.3 9.2a2.8 2.8 0 0 1 5.4 1c0 1.9-2.7 2.5-2.7 4M12 17.6h.01" />
      </svg>
    </Link>
  );
}

/** Entrar: ainda não há conta, então abre o aviso "Em breve" (protótipo Liquid Glass, 2026-11-20). */
const Entrar = ({ largo = false }: { largo?: boolean }) => (
  <EmBreve oQue="O login" className={`${BOTAO} pr-4 pl-3 ${largo ? "w-full" : ""}`}><IconeConta />Entrar</EmBreve>
);

/** De onde vêm os dados: o atalho para a metodologia, embaixo do menu. */
function CartaoFontes() {
  return (
    <div className="vidro mt-5 grid gap-1 rounded-[22px] p-4">
      <strong className="text-[15px] font-semibold">De onde vêm os dados?</strong>
      <span className="text-[13px] text-suave">Só fontes oficiais: TSE, Câmara e Senado, com o link de cada número.</span>
      <Link href={hrefSecao("fontes")} className="mt-1.5 inline-flex min-h-11 items-center text-[15px] font-semibold no-underline">Ver metodologia ›</Link>
    </div>
  );
}

/**
 * Moldura de todas as páginas (app/layout.tsx), no visual do protótipo Liquid Glass (2026-11-20). Computador:
 * menu lateral. Celular: nas telas N1, a marca com Entrar e Dúvidas no topo e a tab bar de vidro no rodapé
 * (escolha do usuário); nas N2, a página traz o botão de voltar e a tab bar some.
 */
export function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-[1440px] gap-6 px-4 lg:px-6">
      <aside className="hidden w-[250px] shrink-0 py-6 lg:block">
        <nav aria-label="Menu principal" className="sticky top-6">
          <div className="flex items-center justify-between gap-3 pr-1 pb-4 pl-1"><Marca /><Duvidas /></div>
          <div className="mb-3 h-px bg-borda" />
          <MenuItens />
          <div className="mt-4"><Entrar largo /></div>
          <CartaoFontes />
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <RastroNavegacao />
        <CabecalhoCelular>
          <Marca />
          <span className="flex items-center gap-2"><Entrar /><Duvidas /></span>
        </CabecalhoCelular>

        {children}
        <Rodape />
        <TabBar />
      </div>
    </div>
  );
}
