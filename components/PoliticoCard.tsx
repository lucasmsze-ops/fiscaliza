import { inteiro, pct, reais, type CardDados, type CardResumo } from "@/lib/card";
import { ComoCobrar } from "./ComoCobrar";
import { ReceberAvisos } from "./ReceberAvisos";
import { Termo } from "./Termo";

const externo = { target: "_blank", rel: "noreferrer noopener" } as const;

/** Foto, nome, cargo, partido e status: igual nas duas variantes do card. */
function Cabecalho({ r, compacto = false }: { r: CardResumo; compacto?: boolean }) {
  return (
    <header className={`flex ${compacto ? "gap-3" : "gap-4"}`}>
      {r.fotoUrl && (
        // <img> de propósito: a foto vem direto da URL oficial, sem passar pela Vercel (CLAUDE.md).
        <img src={r.fotoUrl} alt={`Foto oficial de ${r.nomeUrna}`} width={compacto ? 48 : 72} height={compacto ? 64 : 96} loading="lazy" decoding="async"
          className={`${compacto ? "h-16 w-12" : "h-24 w-[4.5rem]"} shrink-0 rounded-lg bg-black/5 object-cover dark:bg-white/10`} />
      )}
      <div className="min-w-0">
        <h2 id={`nome-${r.id}`} className={`${compacto ? "text-base" : "text-lg"} font-semibold leading-tight break-words`}>{r.nomeUrna}</h2>
        <p className={`${compacto ? "mt-0.5 text-xs" : "mt-1 text-sm"} text-[var(--suave)]`}>{r.cargo} · {r.partidoUf}</p>
        <p className={`${compacto ? "mt-0.5 text-xs" : "mt-1 text-sm"}`}>{r.status}</p>
      </div>
    </header>
  );
}

/**
 * Variante compacta do mesmo card, para busca e lista da cidade: só o cabeçalho e uma linha de
 * contexto opcional (ex.: votos no município). Sem números: eles ficam no card completo.
 */
export function PoliticoCardCompacto({ r, contexto }: { r: CardResumo; contexto?: string }) {
  return (
    <div className="w-full text-left" aria-labelledby={`nome-${r.id}`}>
      <Cabecalho r={r} compacto />
      {contexto && <p className="mt-2 text-xs text-[var(--suave)] tabular-nums">{contexto}</p>}
    </div>
  );
}

/**
 * O único card do site (busca, colinha, página do político e OG). Recebe `CardDados` prontos
 * (lib/card.ts) e só exibe: o que é null não aparece, nunca vira traço, zero ou texto de exemplo.
 */
export function PoliticoCard({ d, linkPagina = false }: { d: CardDados; linkPagina?: boolean }) {
  const n = d.numeros;
  // Avisos (fake door) só fazem sentido para quem tem ou terá mandato.
  const temAvisos = n.tipo !== "sem_mandato";
  return (
    <article className="w-full max-w-sm rounded-2xl border border-black/10 p-4 dark:border-white/15" aria-labelledby={`nome-${d.id}`}>
      <Cabecalho r={d} />

      <section className="mt-4 border-t border-black/10 pt-4 dark:border-white/15" aria-label="Números do mandato">
        {n.tipo === "mandato" && (
          <>
            <dl className="grid grid-cols-2 gap-3">
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

            </dl>
            <p className="mt-3 text-xs text-[var(--suave)]">
              <Termo id={`${d.id}-nominal`} termo="nominal">Votações nominais</Termo> do plenário {n.casa === "senado" ? "do Senado" : "da Câmara"}, {n.periodo}.
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
          <a href={d.ceap.urlOficial} {...externo} className="mt-1 inline-block text-xs underline underline-offset-2">ver as despesas {d.ceap.casa === "senado" ? "no Senado" : "na Câmara"}</a>
        </section>
      )}

      {d.comoCobrar && (
        <section className="mt-4 border-t border-black/10 pt-4 dark:border-white/15" aria-label="Como cobrar">
          <ComoCobrar c={d.comoCobrar} quem={d.nomeUrna} />
        </section>
      )}

      {(temAvisos || d.urlPerfil || linkPagina) && (
        <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-4 dark:border-white/15">
          {temAvisos ? <ReceberAvisos id={d.id} sobre={`sobre ${d.nomeUrna}`} /> : <span />}
          <span className="flex gap-3 text-xs">
            {linkPagina && <a href={`/p/${d.id}`} className="underline underline-offset-2">mais detalhes</a>}
            {d.urlPerfil && <a href={d.urlPerfil} {...externo} className="underline underline-offset-2">perfil oficial</a>}
          </span>
        </footer>
      )}
    </article>
  );
}
