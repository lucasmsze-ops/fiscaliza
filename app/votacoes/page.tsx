import type { Metadata } from "next";
import { Abas } from "@/components/Abas";
import { AgendaPlenario } from "@/components/AgendaPlenario";
import { BarraTopo } from "@/components/BarraTopo";
import { CartaoVotacao } from "@/components/CartaoVotacao";
import { montarVotacoes } from "@/lib/congresso";
import { repo } from "@/lib/repo";

export const revalidate = 86400;
export const metadata: Metadata = {
  title: "Votações · Fiscaliza",
  description: "As votações nominais do Plenário da Câmara e do Senado dia a dia, com o placar e como votou cada partido. Dados oficiais.",
};

const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const DIA_SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const card = "rounded-card border border-borda bg-card p-[22px] shadow-card";

/** Agenda do Plenário e votações da última sessão (saíram de /congresso em 2026-11-04, sem mudança). */
export default async function Votacoes() {
  const [d, atualizacoes] = await Promise.all([montarVotacoes(repo), repo.getAtualizacoes()]);
  const coleta = atualizacoes.map((a) => a.coletadoEm).sort().at(-1);

  return (
    <>
    <BarraTopo secao="Páginas" pagina="Votações" />
    <main className="grid gap-6 pb-8">
      <h1 className="sr-only">Votações</h1>
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
                <div className="grid gap-2.5 md:grid-cols-2">
                  {s.votacoes.map((v) => <CartaoVotacao key={v.id} v={v} />)}
                </div>
              </div>
            ),
          };
        })} />
      </section>
      {coleta && <p className="text-xs text-suave">Dados coletados nas fontes oficiais em {new Date(coleta).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}. Toque numa votação para ver o placar e como votou cada partido.</p>}
    </main>
    </>
  );
}
