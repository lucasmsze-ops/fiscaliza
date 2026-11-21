import Link from "next/link";
import { hrefSecao } from "@/lib/glossario";

/** Rodapé de todas as páginas (app/layout.tsx): metodologia, fontes e código. */
export function Rodape() {
  return (
    // Centralizado, links em cinza e alvos de 44 px, como no protótipo Liquid Glass. Rótulos curtos para caber numa
    // linha no celular (pedido de 2026-11-21: em duas, o fim da página ficava com muito espaço).
    <footer className="py-1 text-[13px]">
      <nav aria-label="Rodapé" className="flex flex-wrap justify-center gap-x-5">
        <Link href="/como-funciona" className="inline-flex min-h-11 items-center text-suave no-underline hover:text-texto">Como funciona</Link>
        <Link href={hrefSecao("fontes")} className="inline-flex min-h-11 items-center text-suave no-underline hover:text-texto">Fontes</Link>
        <Link href={hrefSecao("licencas")} className="inline-flex min-h-11 items-center text-suave no-underline hover:text-texto">Código e licenças</Link>
      </nav>
    </footer>
  );
}
