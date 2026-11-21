import Link from "next/link";
import { BarraVoltar } from "@/components/BarraVoltar";
import { BuscaTopo } from "@/components/BuscaTopo";

/**
 * Página não encontrada (antes era a padrão do Next, em inglês e sem saída). Mantém a moldura do site e oferece a
 * busca e os caminhos principais: endereço antigo, político que saiu do site, votação ainda não publicada.
 */
export default function NaoEncontrada() {
  const link = "vidro flex min-h-12 items-center justify-between rounded-card px-4 text-base font-semibold text-texto no-underline hover:text-texto";
  return (
    <>
      <BarraVoltar volta="/" rotulo="Início" />
      <main className="mx-auto grid max-w-xl gap-4 pt-2 pb-4 lg:pb-8">
        <div className="grid gap-2 px-1">
          <h1 className="text-3xl font-bold tracking-[-0.6px]">Página não encontrada</h1>
          <p className="text-[15px] leading-[21px] text-suave">O endereço pode ter mudado ou estar incompleto. Procure pelo nome do político ou do projeto, ou volte por um dos caminhos abaixo.</p>
        </div>
        <BuscaTopo tipo="tudo" />
        <nav aria-label="Caminhos" className="grid gap-2">
          <Link href="/" className={link}>Início <span aria-hidden="true" className="text-suave">›</span></Link>
          <Link href="/mapa" className={link}>Quem representa cada estado <span aria-hidden="true" className="text-suave">›</span></Link>
          <Link href="/votacoes" className={link}>Votações do Plenário <span aria-hidden="true" className="text-suave">›</span></Link>
        </nav>
      </main>
    </>
  );
}
