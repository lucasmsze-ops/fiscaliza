import Link from "next/link";
import type { ComoCobrarCard } from "@/lib/card";
import { CANAIS_CONFERIDOS_EM, CANAIS_EXTERNOS, OUVIDORIA, type Canal } from "@/lib/cobrar";
import { hrefSecao } from "@/lib/glossario";

const externo = { target: "_blank", rel: "noreferrer noopener" } as const;
const dataBr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

function ItemCanal({ c }: { c: Canal }) {
  return (
    <li>
      <a href={c.url} {...externo} className="font-medium underline underline-offset-2">{c.rotulo}</a>
      <span className="block text-xs text-[var(--suave)]">{c.para}</span>
    </li>
  );
}

/**
 * Canais oficiais para cobrar quem exerce mandato (no lugar do antigo botão Cobrar): contato do
 * gabinete, ouvidoria da Casa e órgãos de controle. Fechado por padrão (`<details>`, sem JS).
 */
export function ComoCobrar({ c, quem }: { c: ComoCobrarCard; quem: string }) {
  return (
    <details className="group">
      <summary className="cursor-pointer list-none text-sm font-semibold">
        Como cobrar <span className="font-normal text-[var(--suave)] group-open:hidden">· canais oficiais</span>
      </summary>
      <div className="mt-3 text-sm">
        {(c.email || c.telefone) && (
          <>
            <p className="text-xs text-[var(--suave)]">Gabinete de {quem}</p>
            <ul className="mt-1 grid gap-1">
              {c.email && <li>E-mail: <a href={`mailto:${c.email}`} className="underline underline-offset-2 break-all">{c.email}</a></li>}
              {c.telefone && <li>Telefone: {c.telefone}</li>}
            </ul>
          </>
        )}
        <p className="mt-3 text-xs text-[var(--suave)]">{c.casa === "senado" ? "No Senado" : "Na Câmara"}</p>
        <ul className="mt-1 grid gap-2"><ItemCanal c={OUVIDORIA[c.casa]} /></ul>
        <p className="mt-3 text-xs text-[var(--suave)]">Dinheiro público e serviços federais</p>
        <ul className="mt-1 grid gap-2">{CANAIS_EXTERNOS.map((x) => <ItemCanal key={x.url} c={x} />)}</ul>
        <p className="mt-3 text-xs text-[var(--suave)]">
          Endereços conferidos nas páginas oficiais em {dataBr(CANAIS_CONFERIDOS_EM)}.{" "}
          <Link href={hrefSecao("cobrar")} className="underline underline-offset-2">Sobre os canais</Link>
        </p>
      </div>
    </details>
  );
}
