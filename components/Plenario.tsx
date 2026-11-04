import Link from "next/link";
import { cadeirasHemiciclo, type CasaHoje } from "@/lib/congresso";

const cor = (partido: string, cores: string[]) => {
  const i = cores.indexOf(partido);
  return i === -1 ? "var(--serie-outros)" : `var(--serie-${i + 1})`;
};

/**
 * Plenário em bolinhas: cada cadeira na cor do partido de quem a ocupa hoje, bancadas em fatias
 * pela ordem do tamanho. O desenho é decorativo para leitor de tela; a lista ao lado (nome do
 * partido, cadeiras e quem são) é o conteúdo, e garante que a cor nunca é a única pista.
 */
export function Plenario({ casa, cores }: { casa: CasaHoje; cores: string[] }) {
  const fileiras = casa.total > 200 ? 12 : 5;
  const pts = cadeirasHemiciclo(casa.total, fileiras);
  const raio = ((1 - 0.4) / (fileiras - 1)) * 0.38;
  let i = 0;
  const cadeiras = casa.bancadas.flatMap((b) => b.membros.map((m) => ({ m, partido: b.partido, p: pts[i++]! })));
  const naCasa = casa.casa === "senado" ? "no Senado" : "na Câmara";

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <figure>
        <svg viewBox="-1.06 -0.06 2.12 1.12" className="w-full" aria-hidden="true">
          {cadeiras.map(({ m, partido, p }) => (
            <circle key={m.id} cx={p.x} cy={1 - p.y} r={raio} fill={cor(partido, cores)} stroke="var(--card)" strokeWidth={raio * 0.18}>
              <title>{`${m.nomeUrna} · ${partido}-${m.uf}`}</title>
            </circle>
          ))}
        </svg>
        <figcaption className="-mt-8 text-center">
          <span className="block text-3xl font-bold tabular-nums">{casa.total}</span>
          <span className="text-xs text-suave">cadeiras ocupadas hoje {naCasa}</span>
        </figcaption>
      </figure>

      <ul className="grid content-start gap-1 text-sm" aria-label={`Bancadas ${naCasa}`}>
        {casa.bancadas.map((b) => (
          <li key={b.partido}>
            <details className="group rounded-lg px-2 py-1 open:bg-fundo">
              <summary className="flex cursor-pointer list-none items-center gap-2.5">
                <span className="size-3 shrink-0 rounded-full" style={{ background: cor(b.partido, cores) }} aria-hidden="true" />
                <span className="min-w-0 flex-1 font-bold">{b.partido}</span>
                <span className="tabular-nums">{b.membros.length}</span>
                <span className="text-xs text-suave group-open:hidden">ver</span>
              </summary>
              <ul className="mt-1 mb-1 grid gap-0.5 pl-5 text-xs">
                {b.membros.map((m) => (
                  <li key={m.id}><Link href={`/p/${m.id}`} className="underline underline-offset-2">{m.nomeUrna}</Link> <span className="text-suave">· {m.uf}</span></li>
                ))}
              </ul>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
