import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PoliticoCard } from "@/components/PoliticoCard";
import { Termo } from "@/components/Termo";
import { inteiro, reais, resumoNumeros } from "@/lib/card";
import { hrefSecao, type Secao as SecaoComoFunciona } from "@/lib/glossario";
import { montarPagina } from "@/lib/pagina";
import { repo } from "@/lib/repo";
import type { TipoVoto } from "@/lib/types";

export const revalidate = 86400;
export const dynamicParams = false;

export async function generateStaticParams() {
  return (await repo.listarPoliticos()).map((p) => ({ slug: p.id }));
}

type Props = { params: Promise<{ slug: string }> };
const externo = { target: "_blank", rel: "noreferrer noopener" } as const;
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const dataBr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const ROTULO: Record<TipoVoto, string> = {
  sim: "Sim", nao: "Não", abstencao: "Abstenção", obstrucao: "Obstrução", art17: "Presidia a sessão",
  nao_informado: "Voto não divulgado", secreto: "Votou (votação secreta)", ausente: "Não registrou voto",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const pg = await montarPagina(repo, (await params).slug);
  if (!pg) return { title: "Fiscaliza" };
  const c = pg.card;
  return {
    title: `${c.nomeUrna} · ${c.cargo} · ${c.partidoUf} · Fiscaliza`,
    description: `${c.status}. ${resumoNumeros(c).replace(/^./, (x) => x.toUpperCase())}. Dados oficiais do TSE, da Câmara e do Senado.`,
  };
}

/** `secao`: seção de /como-funciona com a regra de cálculo; só para blocos com número. */
function Secao({ titulo, secao, children }: { titulo: string; secao?: SecaoComoFunciona; children: React.ReactNode }) {
  return (
    <section className="mt-10" aria-label={titulo}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold">{titulo}</h2>
        {secao && <Link href={hrefSecao(secao)} className="shrink-0 text-xs text-[var(--suave)] underline underline-offset-2">como contamos</Link>}
      </div>
      <div className="mt-3 text-sm">{children}</div>
    </section>
  );
}

export default async function PaginaPolitico({ params }: Props) {
  const pg = await montarPagina(repo, (await params).slug);
  if (!pg) notFound();
  const { card: c, votacoes: v, ceap, contatos } = pg;
  const casaNome = v?.casa === "senado" ? "do Senado" : "da Câmara";

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <p className="text-sm"><Link href="/" className="underline underline-offset-2">Fiscaliza</Link></p>
      <div className="mt-4 grid justify-items-center"><PoliticoCard d={c} /></div>

      {v && (
        <Secao titulo={`Votações nominais do plenário ${casaNome}, 2023–2026`} secao="participacao">
          <p className="text-[var(--suave)]">{inteiro(v.total)} votações durante o mandato. Como votou:</p>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 tabular-nums">
            {(Object.entries(v.totais) as [TipoVoto, number][]).filter(([, n]) => n > 0).map(([t, n]) => (
              <div key={t} className="flex justify-between gap-2">
                <dt>{t === "obstrucao" ? <Termo id="pg-obs" termo="obstrucao">{ROTULO[t]}</Termo> : ROTULO[t]}</dt>
                <dd className="font-medium">{inteiro(n)}</dd>
              </div>
            ))}
          </dl>
          <h3 className="mt-6 font-medium">Últimas 10 votações</h3>
          <ul className="mt-2 grid gap-3">
            {v.ultimas.map((u, i) => (
              <li key={i} className="border-b border-black/10 pb-2 dark:border-white/15">
                <p className="flex justify-between gap-3"><span className="text-xs text-[var(--suave)]">{dataBr(u.data)}{u.proposicao ? ` · ${u.proposicao}` : ""}</span><span className="shrink-0 font-medium">{ROTULO[u.voto]}</span></p>
                <p className="mt-1 text-xs leading-relaxed">{u.descricao.replace(/\s*Sim:\s*\d.*$/s, "")} <a href={u.urlOficial} {...externo} className="underline underline-offset-2">fonte</a></p>
              </li>
            ))}
          </ul>
        </Secao>
      )}

      {ceap && (
        <Secao titulo="Cota parlamentar (CEAP) mês a mês" secao="ceap">
          <p className="text-[var(--suave)]">Valor líquido do mês e <Termo id="pg-media" termo="mediaUf">média da bancada de {ceap.uf}</Termo>. Meses em aberto ainda recebem lançamentos.</p>
          <table className="mt-3 w-full tabular-nums">
            <thead><tr className="text-left text-xs text-[var(--suave)]"><th className="font-normal">Mês</th><th className="text-right font-normal">Valor</th><th className="text-right font-normal">Média {ceap.uf}</th></tr></thead>
            <tbody>
              {ceap.meses.map((m) => (
                <tr key={`${m.ano}-${m.mes}`} className="border-t border-black/10 dark:border-white/15">
                  <td className="py-1">{MESES[m.mes - 1]}/{m.ano}{m.aberto && <span className="ml-1 text-xs text-[var(--suave)]">em aberto</span>}</td>
                  <td className="py-1 text-right">{m.valor === null ? "sem lançamento" : reais(m.valor)}</td>
                  <td className="py-1 text-right text-[var(--suave)]">{reais(m.mediaUf)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {ceap.mesReferencia && ceap.categorias.length > 0 && (
            <>
              <h3 className="mt-6 font-medium">Por categoria, {MESES[ceap.mesReferencia.mes - 1]}/{ceap.mesReferencia.ano}</h3>
              <ul className="mt-2 grid gap-1 tabular-nums">
                {ceap.categorias.map((k) => (
                  <li key={k.nome} className="flex justify-between gap-3"><span className="min-w-0">{k.nome.charAt(0) + k.nome.slice(1).toLowerCase()}</span><span className="shrink-0">{reais(k.valor)}</span></li>
                ))}
              </ul>
            </>
          )}
          {c.ceap && <p className="mt-3 text-xs"><a href={c.ceap.urlOficial} {...externo} className="underline underline-offset-2">Ver as despesas na Câmara</a></p>}
        </Secao>
      )}

      {(pg.mandatos.length > 0 || pg.afastamentos.length > 0) && (
        <Secao titulo="Mandatos e afastamentos" secao="participacao">
          <ul className="grid gap-1">
            {pg.mandatos.map((m) => (
              <li key={`${m.cargo}-${m.inicio}`}>{m.cargo === "senador" ? "Senado" : "Câmara"}{m.titular ? "" : " (suplente)"}: {dataBr(m.inicio)} a {m.fim ? dataBr(m.fim) : "hoje"}</li>
            ))}
          </ul>
          {pg.afastamentos.length > 0 && (
            <>
              <h3 className="mt-4 font-medium"><Termo id="pg-afast" termo="afastado">Afastamentos desde 2023</Termo></h3>
              <ul className="mt-2 grid gap-1 text-xs">
                {pg.afastamentos.map((a, i) => <li key={i}>{dataBr(a.inicio)} a {a.fim ? dataBr(a.fim) : "hoje"} · {a.motivo}</li>)}
              </ul>
            </>
          )}
        </Secao>
      )}

      {(contatos.email || contatos.telefone || contatos.redesSociais.length > 0 || contatos.urlPerfil) && (
        <Secao titulo="Contatos oficiais">
          <ul className="grid gap-1">
            {contatos.email && <li>E-mail do gabinete: <a href={`mailto:${contatos.email}`} className="underline underline-offset-2">{contatos.email}</a></li>}
            {contatos.telefone && <li>Telefone do gabinete: {contatos.telefone}</li>}
            {contatos.redesSociais.map((r) => <li key={r}><a href={r} {...externo} className="underline underline-offset-2">{r.replace(/^https?:\/\/(www\.)?/, "")}</a></li>)}
            {contatos.urlPerfil && <li><a href={contatos.urlPerfil} {...externo} className="underline underline-offset-2">Perfil oficial</a></li>}
          </ul>
        </Secao>
      )}

    </main>
  );
}
