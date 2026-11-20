import Link from "next/link";
import { inteiro, pct } from "@/lib/card";
import type { PaginaDados } from "@/lib/pagina";

/**
 * Resumo do mandato no Congresso de quem foi eleito governador (E23t): os números do crachá dele no site
 * (participação, propostas, áreas) e o link para o crachá completo. Só o que o resumo da página já traz.
 */
export function AtuacaoCongresso({ pagina }: { pagina: PaginaDados }) {
  const c = pagina.card, n = c.numeros, p = pagina.propostas;
  const m = pagina.mandatos.find((x) => x.fim === null);
  const casa = m?.cargo === "senador" ? "Senado" : "Câmara";
  return (
    <div className="grid gap-3">
      <p className="text-[15px] leading-relaxed text-texto/85">
        {c.cargo} em exercício{m ? ` desde ${m.inicio.slice(8, 10)}/${m.inicio.slice(5, 7)}/${m.inicio.slice(0, 4)}` : ""}.
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        {n.tipo === "mandato" && (
          <div className="grid content-start gap-1 rounded-[18px] border border-white/8 bg-white/6 p-3.5">
            <span className="text-xs text-suave">Participação nas votações</span>
            <span className="text-[22px] leading-tight font-semibold tabular-nums">{pct(n.participacao)}</span>
            <span className="text-xs text-suave">{inteiro(n.participacao.numerador)} de {inteiro(n.participacao.denominador)} no {casa}, {n.periodo}</span>
          </div>
        )}
        {p && (
          <div className="grid content-start gap-1 rounded-[18px] border border-white/8 bg-white/6 p-3.5">
            <span className="text-xs text-suave">Propostas desde {p.desde}</span>
            <span className="text-[22px] leading-tight font-semibold tabular-nums">{inteiro(p.leis)}</span>
            <span className="text-xs text-suave">{inteiro(p.viraramNorma)} viraram norma</span>
          </div>
        )}
      </div>
      {p?.areas && p.areas.length > 0 && (
        <p className="text-[13px] text-suave">Áreas com mais propostas: {p.areas.slice(0, 3).map((a) => `${a.tema} (${inteiro(a.total)})`).join(", ")}.</p>
      )}
      <Link href={`/p/${c.id}`} className="inline-flex min-h-11 items-center text-[15px] font-semibold no-underline">Ver o crachá no Congresso ›</Link>
    </div>
  );
}
