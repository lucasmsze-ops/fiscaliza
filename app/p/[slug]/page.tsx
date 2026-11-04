import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Abas } from "@/components/Abas";
import { BarraTopo } from "@/components/BarraTopo";
import { ComoCobrar } from "@/components/ComoCobrar";
import { Cracha } from "@/components/Cracha";
import { Termo } from "@/components/Termo";
import { inteiro, reais, resumoNumeros } from "@/lib/card";
import { hrefSecao, type Secao as SecaoComoFunciona } from "@/lib/glossario";
import type { PaginaDados } from "@/lib/pagina";
import { repo } from "@/lib/repo";
import { subsidioEm } from "@/lib/salario";
import type { TipoVoto } from "@/lib/types";

export const revalidate = 86400;
// No build, só quem tem mandato (Câmara ou Senado); os demais (~3 mil suplentes e não eleitos) são
// gerados na primeira visita e ficam em cache (ISR). Slug inexistente: notFound().
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await repo.listarPoliticos()).filter((p) => p.camaraId || p.senadoCodigo).map((p) => ({ slug: p.id }));
}

type Props = { params: Promise<{ slug: string }> };
const externo = { target: "_blank", rel: "noreferrer noopener" } as const;
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const dataBr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const ROTULO: Record<TipoVoto, string> = {
  sim: "Sim", nao: "Não", abstencao: "Abstenção", obstrucao: "Obstrução", art17: "Presidia a sessão",
  nao_informado: "Voto não divulgado", secreto: "Votou (votação secreta)", ausente: "Não registrou voto",
};
/** Ordem fixa de exibição: o jsonb do Postgres não preserva a ordem das chaves de `totais`. */
const ORDEM_VOTOS = Object.keys(ROTULO) as TipoVoto[];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const pg = await repo.getPagina((await params).slug);
  if (!pg) return { title: "Fiscaliza" };
  const c = pg.card;
  return {
    title: `${c.nomeUrna} · ${c.cargo} · ${c.partidoUf} · Fiscaliza`,
    description: `${c.status}. ${resumoNumeros(c).replace(/^./, (x) => x.toUpperCase())}. Dados oficiais do TSE, da Câmara e do Senado.`,
  };
}

/** Card de seção. `secao`: seção de /como-funciona com a regra de cálculo; só para blocos com número. */
function Cartao({ titulo, secao, children, className = "" }: { titulo: string; secao?: SecaoComoFunciona; children: React.ReactNode; className?: string }) {
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

function Votos({ v }: { v: NonNullable<PaginaDados["votacoes"]> }) {
  return (
    <>
      <p className="text-suave">{inteiro(v.total)} votações nominais do plenário {v.casa === "senado" ? "do Senado" : "da Câmara"} durante o mandato, 2023–2026. Como votou:</p>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 tabular-nums sm:max-w-md">
        {ORDEM_VOTOS.map((t) => [t, v.totais[t]] as const).filter(([, n]) => n > 0).map(([t, n]) => (
          <div key={t} className="flex justify-between gap-2">
            <dt>{t === "obstrucao" ? <Termo id="pg-obs" termo="obstrucao">{ROTULO[t]}</Termo> : ROTULO[t]}</dt>
            <dd className="font-bold">{inteiro(n)}</dd>
          </div>
        ))}
      </dl>
      <h3 className="mt-6 font-bold">Últimas 10 votações</h3>
      <ul className="mt-2 grid gap-3">
        {v.ultimas.map((u, i) => (
          <li key={i} className="border-b border-borda pb-2">
            <p className="flex justify-between gap-3"><span className="text-xs text-suave">{dataBr(u.data)}{u.proposicao ? ` · ${u.proposicao}` : ""}</span><span className="shrink-0 font-bold">{ROTULO[u.voto]}</span></p>
            <p className="mt-1 text-xs leading-relaxed">{u.descricao.replace(/\s*Sim:\s*\d.*$/s, "")} <a href={u.urlOficial} {...externo} className="underline underline-offset-2">fonte</a></p>
          </li>
        ))}
      </ul>
    </>
  );
}

function Propostas({ p }: { p: NonNullable<PaginaDados["propostas"]> }) {
  return (
    <>
      <p className="text-suave">Apresentadas desde {p.desde}, com o parlamentar entre os autores.</p>
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div><dt className="text-xs text-suave"><Termo id="pg-leis" termo="propostasLei">podem virar lei</Termo></dt><dd className="text-xl font-bold tabular-nums">{inteiro(p.leis)}</dd></div>
        <div><dt className="text-xs text-suave"><Termo id="pg-primeiro" termo="primeiroAutor">como primeiro autor</Termo></dt><dd className="text-xl font-bold tabular-nums">{inteiro(p.primeiroAutor)}</dd></div>
        <div><dt className="text-xs text-suave">viraram norma</dt><dd className="text-xl font-bold tabular-nums">{inteiro(p.viraramNorma)}</dd></div>
        <div><dt className="text-xs text-suave">requerimentos, emendas e outros pedidos</dt><dd className="text-xl font-bold tabular-nums">{inteiro(p.outras)}</dd></div>
      </dl>
      {p.ultimas.length > 0 ? (
        <>
          <h3 className="mt-6 font-bold">Mais recentes que podem virar lei</h3>
          <ul className="mt-2 grid gap-3">
            {p.ultimas.map((x) => (
              <li key={`${x.casa}-${x.tipo}-${x.numero}-${x.ano}`} className="flex gap-3 border-b border-borda pb-3">
                <span className="w-[4.5rem] shrink-0 self-start rounded-lg border border-borda py-1 text-center">
                  <span className="block text-[11px] text-suave">{x.tipo}</span>
                  <span className="block font-bold tabular-nums">{x.numero}/{String(x.ano).slice(2)}</span>
                </span>
                <span className="min-w-0">
                  <span className="block text-xs text-suave">
                    {x.casa === "senado" ? "Senado" : "Câmara"} · {dataBr(x.apresentacao)} · {x.primeiroAutor ? "primeiro autor" : "coautor"}{x.virouNorma ? " · virou norma" : ""}
                  </span>
                  <span className="mt-0.5 block leading-relaxed">{x.ementa ?? "— (a fonte não traz a ementa)"}</span>
                  <span className="mt-0.5 block text-xs text-suave">
                    {x.situacao && <>{x.situacao} · </>}<a href={x.urlOficial} {...externo} className="underline underline-offset-2">página oficial</a>
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-4">Nenhuma proposta que pode virar lei com autoria desde {p.desde}.</p>
      )}
    </>
  );
}

export default async function PaginaPolitico({ params }: Props) {
  const pg = await repo.getPagina((await params).slug);
  if (!pg) notFound();
  const { card: c, votacoes: v, ceap, contatos, propostas } = pg;
  const hoje = new Date().toISOString().slice(0, 10);
  const mandato = pg.mandatos.find((m) => m.fim === null) ?? null;
  const salario = c.comoCobrar ? subsidioEm(hoje) : null;
  const coleta = (await repo.getAtualizacoes()).map((a) => a.coletadoEm).sort().at(-1);

  const abas = [
    ...(propostas ? [{ chave: "propostas", rotulo: "Propostas", conteudo: <Propostas p={propostas} /> }] : []),
    ...(v ? [{ chave: "votos", rotulo: "Votos", conteudo: <Votos v={v} /> }] : []),
  ];
  const temContatos = contatos.email || contatos.telefone || contatos.redesSociais.length > 0 || contatos.urlPerfil || c.comoCobrar;
  // "Nesta página" diz só o que esta página mostra (para um candidato, quase nada além do TSE).
  const nestaPagina = [
    // Todo status exceto "Em exercício" vem de uma candidatura de 2026 (lib/card.ts#rotuloStatus).
    c.status.endsWith("em 2026") && "candidatura de 2026 (TSE)",
    pg.mandatos.length > 0 && "mandatos e afastamentos",
    v && "votações nominais do plenário desde 2023",
    propostas && "propostas de autoria desde 2023",
    ceap && "cota parlamentar",
    salario && "salário",
    temContatos && "canais oficiais",
  ].filter((x): x is string => Boolean(x));

  return (
    <>
    <BarraTopo secao="Políticos" pagina={c.nomeUrna} />
    <main className="mx-auto max-w-5xl pb-8">
      <Cracha d={c} mandato={mandato} salario={salario} />

      {abas.length > 0 && (
        <Cartao titulo="O que fez no mandato" className="mt-4">
          <Abas id="mandato" abas={abas} />
        </Cartao>
      )}

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
        {ceap && (
          <Cartao titulo={`Cota parlamentar (${ceap.casa === "senado" ? "CEAPS" : "CEAP"}) mês a mês`} secao="ceap">
            <p className="text-suave">Valor líquido do mês e <Termo id="pg-media" termo="mediaUf">média da bancada de {ceap.uf}</Termo>. Meses em aberto ainda recebem lançamentos.</p>
            <table className="mt-3 w-full tabular-nums">
              <thead><tr className="text-left text-xs text-suave"><th className="font-normal">Mês</th><th className="text-right font-normal">Valor</th><th className="text-right font-normal">Média {ceap.uf}</th></tr></thead>
              <tbody>
                {ceap.meses.map((m) => (
                  <tr key={`${m.ano}-${m.mes}`} className="border-t border-borda">
                    <td className="py-1">{MESES[m.mes - 1]}/{m.ano}{m.aberto && <span className="ml-1 text-xs text-suave">em aberto</span>}</td>
                    <td className="py-1 text-right">{m.valor === null ? "sem lançamento" : reais(m.valor)}</td>
                    <td className="py-1 text-right text-suave">{reais(m.mediaUf)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {ceap.mesReferencia && ceap.categorias.length > 0 && (
              <>
                <h3 className="mt-6 font-bold">Por categoria, {MESES[ceap.mesReferencia.mes - 1]}/{ceap.mesReferencia.ano}</h3>
                <ul className="mt-2 grid gap-1 tabular-nums">
                  {ceap.categorias.map((k) => (
                    <li key={k.nome} className="flex justify-between gap-3"><span className="min-w-0">{k.nome.charAt(0) + k.nome.slice(1).toLowerCase()}</span><span className="shrink-0">{reais(k.valor)}</span></li>
                  ))}
                </ul>
              </>
            )}
            {c.ceap && <p className="mt-3 text-xs"><a href={c.ceap.urlOficial} {...externo} className="underline underline-offset-2">Ver as despesas {c.ceap.casa === "senado" ? "no Senado" : "na Câmara"}</a></p>}
          </Cartao>
        )}

        <div className="grid gap-4">
          {(pg.mandatos.length > 0 || pg.afastamentos.length > 0) && (
            <Cartao titulo="Mandatos e afastamentos" secao="participacao">
              <ul className="grid gap-1">
                {pg.mandatos.map((m) => (
                  <li key={`${m.cargo}-${m.inicio}`}>{m.cargo === "senador" ? "Senado" : "Câmara"}{m.titular ? "" : " (suplente)"}: {dataBr(m.inicio)} a {m.fim ? dataBr(m.fim) : "hoje"}</li>
                ))}
              </ul>
              {pg.afastamentos.length > 0 && (
                <>
                  <h3 className="mt-4 font-bold"><Termo id="pg-afast" termo="afastado">Afastamentos desde 2023</Termo></h3>
                  <ul className="mt-2 grid gap-1 text-xs">
                    {pg.afastamentos.map((a, i) => <li key={i}>{dataBr(a.inicio)} a {a.fim ? dataBr(a.fim) : "hoje"} · {a.motivo}</li>)}
                  </ul>
                </>
              )}
            </Cartao>
          )}

          {temContatos && (
            <Cartao titulo="Contatos oficiais">
              <ul className="grid gap-1">
                {contatos.email && <li>E-mail do gabinete: <a href={`mailto:${contatos.email}`} className="underline underline-offset-2 break-all">{contatos.email}</a></li>}
                {contatos.telefone && <li>Telefone do gabinete: {contatos.telefone}</li>}
                {contatos.redesSociais.map((r) => <li key={r}><a href={r} {...externo} className="underline underline-offset-2 break-all">{r.replace(/^https?:\/\/(www\.)?/, "")}</a></li>)}
                {contatos.urlPerfil && <li><a href={contatos.urlPerfil} {...externo} className="underline underline-offset-2">Perfil oficial</a></li>}
              </ul>
              {c.comoCobrar && <div className="mt-4 border-t border-borda pt-4"><ComoCobrar c={c.comoCobrar} quem={c.nomeUrna} /></div>}
            </Cartao>
          )}

          <Cartao titulo="Sobre esta página">
            {coleta && <p>Dados coletados nas fontes oficiais em {new Date(coleta).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}.</p>}
            <p className={coleta ? "mt-2" : ""}>
              <strong>Nesta página:</strong> {nestaPagina.slice(0, -1).join(", ")}{nestaPagina.length > 1 ? " e " : ""}{nestaPagina.at(-1)}.
              {!v && !propostas && !ceap && " Sem mandato no Congresso desde 2023: não há votações, propostas nem cota."}
            </p>
            <p className="mt-2">
              <strong>Ainda não:</strong> patrimônio e contas de campanha, votos com filtro e fidelidade ao partido, comissões e equipe
              do gabinete, emendas parlamentares. <Link href={hrefSecao("fora")} className="underline underline-offset-2">O que fica fora</Link>
            </p>
          </Cartao>
        </div>
      </div>
    </main>
    </>
  );
}
