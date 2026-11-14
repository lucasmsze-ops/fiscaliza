import Link from "next/link";
import { hrefSecao } from "@/lib/glossario";

/** Rodapé de todas as páginas (app/layout.tsx): metodologia, fontes e código. */
export function Rodape() {
  return (
    // Centralizado, com links soltos (sem sublinhado) e um separador fino acima, como os rodapés de site da Apple.
    <footer className="mt-4 border-t border-borda py-6 text-[13px]">
      <nav aria-label="Rodapé" className="flex flex-wrap justify-center gap-x-5 gap-y-2">
        <Link href="/como-funciona" className="no-underline hover:underline">Como funciona</Link>
        <Link href={hrefSecao("fontes")} className="no-underline hover:underline">Fontes: TSE, Câmara e Senado</Link>
        <Link href={hrefSecao("licencas")} className="no-underline hover:underline">Código e licenças</Link>
      </nav>
    </footer>
  );
}
