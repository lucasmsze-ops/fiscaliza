import Link from "next/link";
import { hrefSecao } from "@/lib/glossario";

/** Rodapé de todas as páginas (app/layout.tsx): metodologia, fontes e código. */
export function Rodape() {
  return (
    <footer className="mx-auto max-w-xl px-4 py-8 text-xs text-[var(--suave)]">
      <nav aria-label="Rodapé" className="flex flex-wrap gap-x-3 gap-y-1">
        <Link href="/como-funciona" className="underline underline-offset-2">Como funciona</Link>
        <Link href="/votacoes" className="underline underline-offset-2">Votações do quiz</Link>
        <Link href={hrefSecao("fontes")} className="underline underline-offset-2">Fontes: TSE, Câmara e Senado</Link>
        <Link href={hrefSecao("licencas")} className="underline underline-offset-2">Código e licenças</Link>
      </nav>
    </footer>
  );
}
