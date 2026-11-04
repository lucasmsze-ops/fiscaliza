import type { ReactNode } from "react";
import { inteiro, pct, reais, type CardDados } from "@/lib/card";
import { SUBSIDIO_CONGRESSO } from "@/lib/salario";
import type { Mandato } from "@/lib/types";
import { Compartilhar } from "./Compartilhar";
import { ReceberAvisos } from "./ReceberAvisos";
import { Termo } from "./Termo";

const externo = { target: "_blank", rel: "noreferrer noopener" } as const;
const dataBr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
/** Valor legal com centavos, como no decreto (a cota e as médias usam `reais`, sem centavos). */
const reaisExatos = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Um número principal: rótulo, valor e o que explica o valor. */
function Numero({ rotulo, valor, children }: { rotulo: ReactNode; valor: ReactNode; children?: ReactNode }) {
  return (
    <div className="rounded-card border border-borda bg-card p-4 shadow-card">
      <p className="text-xs font-bold text-suave">{rotulo}</p>
      <p className="mt-1.5 text-2xl font-bold tabular-nums">{valor}</p>
      {children && <div className="mt-1 grid gap-0.5 text-xs text-suave tabular-nums">{children}</div>}
    </div>
  );
}

/**
 * Topo da página do político no layout do crachá do protótipo (docs/PROTOTIPO.md): quem é e os
 * números principais. Exibe os mesmos `CardDados` do PoliticoCard (lib/card.ts), nunca outro
 * cálculo; o que é null não aparece.
 */
export function Cracha({ d, mandato, salario }: {
  d: CardDados;
  /** Mandato em curso no Congresso, se houver. */
  mandato: Mandato | null;
  /** Subsídio em vigor, só para quem exerce mandato hoje (lib/salario.ts). */
  salario: { valor: number; desde: string } | null;
}) {
  const n = d.numeros;
  return (
    <>
      <section aria-labelledby="nome-politico" className="rounded-card border border-borda bg-card p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex min-w-0 gap-4">
            {d.fotoUrl && (
              // <img> de propósito: a foto vem direto da URL oficial, sem passar pela Vercel (CLAUDE.md).
              <img src={d.fotoUrl} alt={`Foto oficial de ${d.nomeUrna}`} width={96} height={128} decoding="async"
                className="h-32 w-24 shrink-0 rounded-xl bg-fundo object-cover" />
            )}
            <div className="min-w-0">
              <h1 id="nome-politico" className="text-2xl leading-tight font-bold break-words">{d.nomeUrna}</h1>
              <p className="mt-1 text-sm text-suave">{d.cargo} · {d.partidoUf}</p>
              <p className="mt-1 text-sm">{d.status}</p>
              {mandato && (
                <p className="mt-2 inline-block rounded-lg bg-fundo px-2.5 py-1 text-xs">
                  Em exercício{mandato.titular ? "" : " como suplente"} desde {dataBr(mandato.inicio)}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Compartilhar rotulo="Compartilhar" titulo={`${d.nomeUrna} · ${d.cargo} · ${d.partidoUf}`} texto="O que fez no mandato, com dados oficiais." />
            {n.tipo !== "sem_mandato" && <ReceberAvisos id={d.id} sobre={`sobre ${d.nomeUrna}`} />}
          </div>
        </div>
      </section>

      <section aria-label="Números principais" className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {salario && (
          <Numero rotulo={<Termo id="cr-salario" termo="salario">salário por mês</Termo>} valor={reaisExatos(salario.valor)}>
            <span>desde {dataBr(salario.desde)} · <a href={SUBSIDIO_CONGRESSO.url} {...externo} className="underline underline-offset-2">{SUBSIDIO_CONGRESSO.ato}</a></span>
          </Numero>
        )}
        {n.tipo === "mandato" && (
          <>
            <Numero rotulo={<Termo id="cr-part" termo="participacao">participação em votações</Termo>} valor={pct(n.participacao)}>
              <span>{inteiro(n.participacao.numerador)} de {inteiro(n.participacao.denominador)} votações nominais</span>
              {n.textoAfastado && <span><Termo id="cr-afast" termo="afastado">{n.textoAfastado}</Termo></span>}
            </Numero>
            <Numero rotulo={<Termo id="cr-gov" termo="governismo">governismo</Termo>}
              valor={n.governismo.percentual === null ? "—" : pct(n.governismo)}>
              {n.governismo.percentual === null
                ? <span>sem voto em orientação do Governo</span>
                : <span>{inteiro(n.governismo.numerador)} de {inteiro(n.governismo.denominador)} votos com orientação do Governo</span>}
            </Numero>
          </>
        )}
        {n.tipo === "primeiro_voto" && <Numero rotulo="votações" valor="—"><span>Primeiro voto em fevereiro de 2027.</span></Numero>}
        {n.tipo === "sem_mandato" && <Numero rotulo="votações" valor="—"><span>Sem mandato no Congresso em {n.periodo}.</span></Numero>}
        {d.ceap && (
          <Numero rotulo={<><Termo id="cr-ceap" termo="ceap">cota parlamentar</Termo> · <Termo id="cr-mes" termo="mesReferencia">{d.ceap.mes}</Termo></>}
            valor={d.ceap.valor === null ? "—" : reais(d.ceap.valor)}>
            {d.ceap.valor === null && <span>sem lançamento no mês</span>}
            <span><Termo id="cr-media" termo="mediaUf">média {d.ceap.uf}</Termo> {reais(d.ceap.mediaUf)}</span>
            <a href={d.ceap.urlOficial} {...externo} className="underline underline-offset-2">ver as despesas {d.ceap.casa === "senado" ? "no Senado" : "na Câmara"}</a>
          </Numero>
        )}
      </section>
      {n.tipo === "mandato" && (
        <p className="mt-2 text-xs text-suave">
          <Termo id="cr-nominal" termo="nominal">Votações nominais</Termo> do plenário {n.casa === "senado" ? "do Senado" : "da Câmara"}, {n.periodo}.
        </p>
      )}
    </>
  );
}
