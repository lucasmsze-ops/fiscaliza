import type { Metadata } from "next";
import Link from "next/link";
import { Abas } from "@/components/Abas";
import { BarraTopo } from "@/components/BarraTopo";
import { Plenario } from "@/components/Plenario";
import { Termo } from "@/components/Termo";
import { inteiro } from "@/lib/card";
import { montarCongresso } from "@/lib/congresso";
import { hrefSecao } from "@/lib/glossario";
import { repo } from "@/lib/repo";
import type { Votacao } from "@/lib/types";

export const revalidate = 86400;
export const metadata: Metadata = {
  title: "Congresso · Fiscaliza",
  description: "Quem ocupa cada cadeira da Câmara e do Senado hoje, as últimas votações nominais do Plenário e as propostas que viraram norma. Dados oficiais.",
};

const externo = { target: "_blank", rel: "noreferrer noopener" } as const;
const dataBr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const nomeCasa = (c: string) => (c === "senado" ? "Senado" : "Câmara");

function Cartao({ titulo, secao, children, className = "" }: { titulo: string; secao?: Parameters<typeof hrefSecao>[0]; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-card border border-borda bg-card p-5 shadow-card ${className}`} aria-label={titulo}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-bold">{titulo}</h2>
        {secao && <Link href={hrefSecao(secao)} className="shrink-0 text-xs underline underline-offset-2">como contamos</Link>}
      </div>
      <div className="mt-3 text-sm">{children}</div>
    </section>
  );
}

/** Placar como a fonte publica; secreta (Senado) sem direção dos votos. */
function Placar({ v }: { v: Votacao }) {
  if (v.secreta || !v.placar) return <span className="text-suave">votação secreta: o Senado publica só quem votou</span>;
  const { sim, nao, abstencao, obstrucao } = v.placar;
  // Votação de pessoa na Câmara: o voto fica registrado, mas a fonte não divulga a direção (placar zerado).
  if (sim + nao + abstencao + obstrucao === 0) return <span className="text-suave">a Câmara não divulga a direção dos votos nesta votação</span>;
  return (
    <span className="tabular-nums">
      <strong>{inteiro(sim)}</strong> sim · <strong>{inteiro(nao)}</strong> não
      {abstencao > 0 && <> · {inteiro(abstencao)} abstenções</>}
      {obstrucao > 0 && <> · {inteiro(obstrucao)} em <Termo id={`cg-obs-${v.id}`} termo="obstrucao">obstrução</Termo></>}
    </span>
  );
}

export default async function Congresso() {
  const [d, atualizacoes] = await Promise.all([montarCongresso(repo), repo.getAtualizacoes()]);
  const coleta = atualizacoes.map((a) => a.coletadoEm).sort().at(-1);

  return (
    <>
    <BarraTopo secao="Fiscaliza" pagina="Congresso" />
    <main className="mx-auto max-w-5xl pb-8">
      <section className="rounded-card border border-borda bg-card p-5 shadow-card">
        <h1 className="text-2xl font-bold">Congresso</h1>
        <p className="mt-1 max-w-2xl text-sm text-suave">
          Quem ocupa cada cadeira da Câmara e do Senado hoje, as últimas <Termo id="cg-nominal" termo="nominal">votações nominais</Termo> do
          Plenário e as propostas que viraram norma.
          {coleta && <> Dados coletados nas fontes oficiais em {new Date(coleta).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}.</>}
        </p>
      </section>

      <Cartao titulo="Como está o Congresso" secao="congresso" className="mt-4">
        <p className="mb-4 text-suave">Cada bolinha é uma cadeira, na cor do partido de quem a ocupa hoje. Toque num partido para ver quem está nele.</p>
        <Abas id="plenario" abas={d.casas.map((c) => ({ chave: c.casa, rotulo: `${nomeCasa(c.casa)} · ${c.total}`, conteudo: <Plenario casa={c} cores={d.cores} /> }))} />
      </Cartao>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
        <Cartao titulo="Últimas votações nominais" secao="participacao">
          <ul className="grid gap-3">
            {d.votacoes.map((v) => (
              <li key={v.id} className="border-b border-borda pb-3">
                <p className="flex flex-wrap items-center justify-between gap-2 text-xs text-suave">
                  <span>{dataBr(v.data)} · {nomeCasa(v.casa)}{v.proposicao ? ` · ${v.proposicao}` : ""}</span>
                  {v.resultado && <span className="rounded-md bg-fundo px-2 py-0.5 font-bold text-texto">{v.resultado === "aprovada" ? "aprovada" : "rejeitada"}</span>}
                </p>
                <p className="mt-1 leading-relaxed">{v.descricao.replace(/\s*Sim:\s*\d.*$/s, "")}</p>
                <p className="mt-1 flex flex-wrap justify-between gap-2 text-xs"><Placar v={v} /><a href={v.urlOficial} {...externo} className="underline underline-offset-2">página oficial</a></p>
              </li>
            ))}
          </ul>
        </Cartao>

        <Cartao titulo="O que virou norma" secao="propostas">
          <p className="text-suave">Propostas de parlamentares do site apresentadas desde 2023 que viraram norma jurídica, as 10 mais recentes pela data de apresentação.</p>
          <ul className="mt-3 grid gap-3">
            {d.normas.map(({ proposicao: x, autores }) => (
              <li key={x.id} className="flex gap-3 border-b border-borda pb-3">
                <span className="w-[4.5rem] shrink-0 self-start rounded-lg border border-borda py-1 text-center">
                  <span className="block text-[11px] text-suave">{x.tipo}</span>
                  <span className="block font-bold tabular-nums">{x.numero}/{String(x.ano).slice(2)}</span>
                </span>
                <span className="min-w-0">
                  <span className="block text-xs text-suave">{nomeCasa(x.casa)} · apresentada em {dataBr(x.apresentacao)}</span>
                  <span className="mt-0.5 block leading-relaxed">{x.ementa ?? "— (a fonte não traz a ementa)"}</span>
                  <span className="mt-0.5 block text-xs">
                    {autores.length > 0 && <>
                      <span className="text-suave">Entre os autores: </span>
                      {autores.slice(0, 3).map((a, i) => <span key={a.id}>{i > 0 && ", "}<Link href={`/p/${a.id}`} className="underline underline-offset-2">{a.nomeUrna}</Link></span>)}
                      {autores.length > 3 && <span className="text-suave"> e mais {autores.length - 3}</span>}
                      {" · "}
                    </>}
                    <a href={x.urlOficial} {...externo} className="underline underline-offset-2">página oficial</a>
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Cartao>
      </div>
    </main>
    </>
  );
}
