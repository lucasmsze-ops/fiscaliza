import { inteiro, pct, reais, type CardDados } from "@/lib/card";
import { Termo } from "./Termo";

const externo = { target: "_blank", rel: "noreferrer noopener" } as const;

/**
 * O único card do site (busca, colinha, página do político e OG). Recebe `CardDados` prontos
 * (lib/card.ts) e só exibe: o que é null não aparece, nunca vira traço, zero ou texto de exemplo.
 */
export function PoliticoCard({ d }: { d: CardDados }) {
  const n = d.numeros;
  return (
    <article className="w-full max-w-sm rounded-2xl border border-black/10 p-4 dark:border-white/15" aria-labelledby={`nome-${d.id}`}>
      <header className="flex gap-4">
        {d.fotoUrl && (
          // <img> de propósito: a foto vem direto da URL oficial, sem passar pela Vercel (CLAUDE.md).
          <img src={d.fotoUrl} alt={`Foto oficial de ${d.nomeUrna}`} width={72} height={96} loading="lazy" decoding="async"
            className="h-24 w-[4.5rem] shrink-0 rounded-lg bg-black/5 object-cover dark:bg-white/10" />
        )}
        <div className="min-w-0">
          <h2 id={`nome-${d.id}`} className="text-lg font-semibold leading-tight break-words">{d.nomeUrna}</h2>
          <p className="mt-1 text-sm text-[var(--suave)]">{d.cargo} · {d.partidoUf}</p>
          <p className="mt-1 text-sm">{d.status}</p>
        </div>
      </header>

      <section className="mt-4 border-t border-black/10 pt-4 dark:border-white/15" aria-label="Números do mandato">
        {n.tipo === "mandato" && (
          <>
            <dl className={`grid gap-3 ${d.concordancia ? "grid-cols-3" : "grid-cols-2"}`}>
              <div>
                <dt className="text-xs text-[var(--suave)]"><Termo id={`${d.id}-part`} termo="participacao">participação em votações</Termo></dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">{pct(n.participacao)}</dd>
                <dd className="text-xs text-[var(--suave)] tabular-nums">{inteiro(n.participacao.numerador)} de {inteiro(n.participacao.denominador)}</dd>
                {n.textoAfastado && (
                  <dd className="mt-1 text-xs"><Termo id={`${d.id}-afast`} termo="afastado">{n.textoAfastado}</Termo></dd>
                )}
              </div>
              <div>
                <dt className="text-xs text-[var(--suave)]"><Termo id={`${d.id}-gov`} termo="governismo">governismo</Termo></dt>
                {n.governismo.percentual === null ? (
                  <dd className="mt-1 text-sm">sem voto em orientação do Governo</dd>
                ) : (
                  <>
                    <dd className="mt-1 text-2xl font-semibold tabular-nums">{pct(n.governismo)}</dd>
                    <dd className="text-xs text-[var(--suave)] tabular-nums">{inteiro(n.governismo.numerador)} de {inteiro(n.governismo.denominador)}</dd>
                  </>
                )}
              </div>
              {d.concordancia && d.concordancia.percentual !== null && (
                <div>
                  <dt className="text-xs text-[var(--suave)]"><Termo id={`${d.id}-conc`} termo="concordancia">com você</Termo></dt>
                  <dd className="mt-1 text-2xl font-semibold tabular-nums">{pct(d.concordancia)}</dd>
                </div>
              )}
            </dl>
            <p className="mt-3 text-xs text-[var(--suave)]">
              Votações nominais do plenário {n.casa === "senado" ? "do Senado" : "da Câmara"}, {n.periodo}.
            </p>
          </>
        )}
        {n.tipo === "primeiro_voto" && <p className="text-sm">Primeiro voto em fevereiro de 2027.</p>}
        {n.tipo === "sem_mandato" && <p className="text-sm text-[var(--suave)]">Sem mandato no Congresso em {n.periodo}.</p>}
      </section>

      {d.ceap && (
        <section className="mt-4 border-t border-black/10 pt-4 text-sm dark:border-white/15" aria-label="Cota parlamentar">
          <p className="text-xs text-[var(--suave)]">
            <Termo id={`${d.id}-ceap`} termo="ceap">cota parlamentar</Termo>{" "}
            · <Termo id={`${d.id}-mes`} termo="mesReferencia">{d.ceap.mes}</Termo>
          </p>
          <p className="mt-1">
            <span className="text-lg font-semibold tabular-nums">{d.ceap.valor === null ? "sem lançamento no mês" : reais(d.ceap.valor)}</span>
            <span className="text-[var(--suave)]"> · <Termo id={`${d.id}-media`} termo="mediaUf">média {d.ceap.uf}</Termo> {reais(d.ceap.mediaUf)}</span>
          </p>
          <a href={d.ceap.urlOficial} {...externo} className="mt-1 inline-block text-xs underline underline-offset-2">ver as despesas na Câmara</a>
        </section>
      )}

      {(d.cobrar || d.urlPerfil) && (
        <footer className="mt-4 flex items-center justify-between gap-3 border-t border-black/10 pt-4 dark:border-white/15">
          {d.cobrar ? (
            <a href={d.cobrar.href} className="rounded-full bg-[var(--texto)] px-5 py-2 text-sm font-semibold text-[var(--fundo)]">Cobrar</a>
          ) : <span />}
          {d.urlPerfil && <a href={d.urlPerfil} {...externo} className="text-xs underline underline-offset-2">perfil oficial</a>}
        </footer>
      )}
    </article>
  );
}
