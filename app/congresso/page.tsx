import type { Metadata } from "next";
import Link from "next/link";
import { Abas } from "@/components/Abas";
import { AgendaPlenario } from "@/components/AgendaPlenario";
import { BarraTopo } from "@/components/BarraTopo";
import { PlacarVotacao } from "@/components/PlacarVotacao";
import { Plenario } from "@/components/Plenario";
import { Termo } from "@/components/Termo";
import { inteiro } from "@/lib/card";
import { montarCongresso } from "@/lib/congresso";
import { hrefSecao } from "@/lib/glossario";
import { repo } from "@/lib/repo";

export const revalidate = 86400;
export const metadata: Metadata = {
  title: "Congresso · Fiscaliza",
  description: "Quem ocupa cada cadeira da Câmara e do Senado hoje, as votações nominais do Plenário dia a dia e como foi cada uma. Dados oficiais.",
};

const externo = { target: "_blank", rel: "noreferrer noopener" } as const;
const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const DIA_SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const card = "rounded-card border border-borda bg-card p-[22px] shadow-card";

export default async function Congresso() {
  const [d, atualizacoes] = await Promise.all([montarCongresso(repo), repo.getAtualizacoes()]);
  const coleta = atualizacoes.map((a) => a.coletadoEm).sort().at(-1);

  return (
    <>
    <BarraTopo secao="Páginas" pagina="Congresso" />
    <main className="grid gap-6 pb-8">
      <section className={`${card} flex flex-wrap items-center gap-[22px]`}>
        <span className="inline-flex h-16 min-w-16 shrink-0 items-center justify-center rounded-card bg-destaque px-2 text-xl font-bold text-destaque-texto tabular-nums">{inteiro(d.noAno.total)}</span>
        <div className="max-w-[760px] flex-[1_1_380px]">
          <h1 className="mb-1 text-xl font-bold">Congresso</h1>
          <p className="text-sm leading-relaxed text-suave">
            <strong className="text-texto">{inteiro(d.noAno.total)}</strong> <Termo id="cg-nominal" termo="nominal">votações nominais</Termo> no Plenário da Câmara
            e do Senado em {d.noAno.ano}. Aqui está quem ocupa cada cadeira, o que já foi votado e como foi: toque num dia ou numa votação para ver o placar.
            {coleta && <> Dados coletados nas fontes oficiais em {new Date(coleta).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}.</>}
          </p>
        </div>
      </section>

      <section className={`${card} grid gap-3.5`} aria-labelledby="cg-como">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="cg-como" className="text-xl font-bold">Como está o Congresso</h2>
          <Link href={hrefSecao("congresso")} className="shrink-0 text-xs underline underline-offset-2">como contamos</Link>
        </div>
        <p className="text-sm text-suave">Cada bolinha é uma cadeira, na cor do partido. Passe o mouse para destacar um partido; toque numa cadeira ou num partido para ver a lista de quem está nele.</p>
        <Plenario casas={d.casas} camara2027={d.camara2027} cores={d.cores} />
      </section>

      <section className={card} aria-label="Agenda do Plenário">
        <AgendaPlenario porDia={d.porDia} mesInicial={d.mesInicial} diaInicial={d.diaInicial} votacoesMes={d.votacoesMes} />
      </section>

      <section className={`${card} grid gap-3`} aria-labelledby="cg-sessao">
        <h2 id="cg-sessao" className="text-xl font-bold">Votações da última sessão</h2>
        <Abas id="sessao" abas={d.ultimaSessao.map((s) => {
          const aprov = s.votacoes.filter((v) => v.resultado === "aprovada").length;
          const rej = s.votacoes.filter((v) => v.resultado === "rejeitada").length;
          const wd = new Date(`${s.data}T12:00:00Z`).getUTCDay();
          return {
            chave: s.casa, rotulo: `${s.casa === "senado" ? "Senado" : "Câmara"} · ${ddmm(s.data)}`,
            conteudo: (
              <div className="grid gap-3">
                <p className="text-sm text-suave">Sessão de {DIA_SEMANA[wd]}, {ddmm(s.data)}/{s.data.slice(0, 4)}: as votações nominais do Plenário {s.casa === "senado" ? "do Senado" : "da Câmara"} nesse dia.</p>
                <div className="flex gap-6">
                  <div><div className="text-[28px] leading-none font-bold tabular-nums">{s.votacoes.length}</div><div className="text-xs text-suave">votações nominais</div></div>
                  <div><div className="text-[28px] leading-none font-bold text-[#2f855a] tabular-nums dark:text-[#68d391]">{aprov}</div><div className="text-xs text-suave">aprovadas</div></div>
                  <div><div className="text-[28px] leading-none font-bold text-suave tabular-nums">{rej}</div><div className="text-xs text-suave">rejeitadas</div></div>
                </div>
                {s.votacoes.map((v) => (
                  <details key={v.id} className="group rounded-xl border border-borda p-3.5 open:bg-fundo">
                    <summary className="grid cursor-pointer list-none gap-1.5">
                      <span className="flex w-full justify-between gap-3">
                        <strong className="text-[15px] leading-snug">{v.descricao}</strong>
                        {v.resultado && <span className={`shrink-0 text-xs font-bold ${v.resultado === "aprovada" ? "text-[#2f855a] dark:text-[#68d391]" : "text-suave"}`}>{v.resultado}</span>}
                      </span>
                      <span className="text-xs text-suave">{v.proposicao ?? "sem matéria principal informada"}</span>
                    </summary>
                    <div className="mt-2.5 grid gap-2 border-t border-borda pt-2.5 text-sm">
                      <PlacarVotacao v={v} barra />
                      <a href={v.urlOficial} {...externo} className="text-[13px] underline underline-offset-2">Página oficial ›</a>
                    </div>
                  </details>
                ))}
              </div>
            ),
          };
        })} />
      </section>
    </main>
    </>
  );
}
