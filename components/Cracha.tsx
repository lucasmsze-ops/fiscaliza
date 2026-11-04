import Link from "next/link";
import type { ReactNode } from "react";
import { inteiro, pct, type CardDados } from "@/lib/card";
import type { ComparacaoCasa } from "@/lib/comparacoes";
import { corPartido } from "@/lib/congresso";
import { hrefSecao } from "@/lib/glossario";
import { nomePartido } from "@/lib/partidos";
import { pelaUf } from "@/lib/regioes";
import { SUBSIDIO_CONGRESSO } from "@/lib/salario";
import type { Mandato } from "@/lib/types";
import { Compartilhar } from "./Compartilhar";
import { Termo } from "./Termo";

const externo = { target: "_blank", rel: "noreferrer noopener" } as const;
const dataBr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
/** Valor legal com centavos, como no decreto. */
const reaisExatos = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const umaCasa = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const iniciais = (n: string) => n.split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("");
const card = "rounded-card border border-borda bg-card p-4 shadow-card sm:p-[22px]";

/**
 * Fim do mandato em curso, quando decorre da lei: deputados, o fim da legislatura (31/01/2027);
 * senadores titulares eleitos em 2018 ou 2022, 8 anos depois da posse. Suplente: depende do titular.
 */
export function fimDoMandato(m: Mandato): string | null {
  if (m.cargo === "deputado_federal") return m.inicio >= "2023-02-01" && m.inicio <= "2027-01-31" ? "2027-01-31" : null;
  if (!m.titular) return null;
  if (m.inicio === "2019-02-01") return "2027-01-31";
  if (m.inicio === "2023-02-01") return "2031-01-31";
  return null;
}

function Icone({ d }: { d: string }) {
  return (
    <span className="hidden size-[45px] shrink-0 items-center justify-center rounded-xl bg-destaque text-destaque-texto sm:inline-flex">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
    </span>
  );
}

function Numero({ rotulo, valor, detalhe, icone, largo = false }: { rotulo: ReactNode; valor: ReactNode; detalhe?: ReactNode; icone: string; largo?: boolean }) {
  return (
    <div className={`${card} flex items-center justify-between gap-3 ${largo ? "col-span-2" : ""}`}>
      <span className="grid gap-1">
        <span className="text-xs font-bold text-suave">{rotulo}</span>
        <span className="text-lg font-bold tabular-nums sm:text-xl">{valor} {detalhe && <span className="block text-xs font-bold text-[#2f855a] sm:inline dark:text-[#68d391]">{detalhe}</span>}</span>
      </span>
      <Icone d={icone} />
    </div>
  );
}

/**
 * Topo da página do político no layout do crachá do protótipo (docs/PROTOTIPO.md): faixa, cartão
 * com foto, cargo, partido e mandato, e os números principais. Exibe os `CardDados` do card
 * (lib/card.ts), nunca outro cálculo; o que é null não aparece.
 */
/** Mínimo de votações com a orientação identificada para mostrar o percentual. */
const MINIMO_FIDELIDADE = 20;
const COR_COM = "var(--destaque)", COR_CONTRA = "#f6ad55";

/** "Votou com o partido?" (pizza do protótipo): com e contra a orientação da bancada do partido no dia. */
function ComPartido({ f, periodo }: { f: { com: number; contra: number }; periodo: string }) {
  const total = f.com + f.contra;
  const pCom = total ? (100 * f.com) / total : 0;
  const r = 52, c = 2 * Math.PI * r;
  return (
    <div className={`${card} grid content-start gap-3`}>
      <div>
        <h2 className="text-lg font-bold"><Termo id="cr-fid" termo="comPartido">Votou com o partido?</Termo></h2>
        <p className="mt-1 text-[13px] text-suave">Nas {inteiro(total)} votações nominais de {periodo} em que deu para saber a orientação da bancada do partido no dia.</p>
      </div>
      {total < MINIMO_FIDELIDADE ? (
        <p className="text-sm text-suave">Poucas votações com a orientação do partido identificada para um percentual. Na Câmara, a orientação de blocos de nome cortado na fonte fica fora da conta.</p>
      ) : (
        <div className="flex items-center gap-4 sm:gap-[18px]">
          <svg viewBox="0 0 140 140" className="size-[110px] shrink-0 sm:size-[140px]" role="img" aria-label={`${umaCasa(pCom)}% com o partido, ${umaCasa(100 - pCom)}% contra`}>
            <circle cx="70" cy="70" r={r} fill="none" stroke={COR_CONTRA} strokeWidth="22" />
            <circle cx="70" cy="70" r={r} fill="none" stroke={COR_COM} strokeWidth="22" strokeDasharray={`${(pCom / 100) * c} ${c}`} transform="rotate(-90 70 70)" />
          </svg>
          <div className="grid gap-3">
            {[[COR_COM, pCom, `com o partido (${inteiro(f.com)} votações)`], [COR_CONTRA, 100 - pCom, `contra o partido (${inteiro(f.contra)} votações)`]].map(([cor, v, t]) => (
              <div key={String(t)} className="flex items-start gap-2.5">
                <span className="mt-1.5 size-3 shrink-0 rounded-full" style={{ background: String(cor) }} />
                <span><span className="text-xl font-bold tabular-nums">{umaCasa(Number(v))}%</span><br /><span className="text-xs text-suave">{t}</span></span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function Cracha({ d, mandato, salario, comparacao, fidelidade, cores }: {
  d: CardDados;
  /** Mandato em curso no Congresso, se houver. */
  mandato: Mandato | null;
  /** Subsídio em vigor, só para quem exerce mandato hoje (lib/salario.ts). */
  salario: { valor: number; desde: string } | null;
  comparacao: ComparacaoCasa | null;
  fidelidade: { com: number; contra: number } | null;
  cores: string[];
}) {
  const n = d.numeros;
  const partido = d.partidoUf.slice(0, -3), uf = d.partidoUf.slice(-2);
  const nome = nomePartido(partido);
  const fim = mandato ? fimDoMandato(mandato) : null;
  const casaMedia = comparacao?.casa === "senado" ? `Média dos ${comparacao.membros} senadores` : `Média dos ${comparacao?.membros} deputados`;

  return (
    <>
      <section aria-labelledby="nome-politico" className="relative pb-2">
        <div className="h-20 rounded-card bg-destaque sm:h-[180px]" />
        <div className="relative mx-3 -mt-10 flex flex-wrap items-center justify-between gap-4 rounded-card border-[1.5px] border-card bg-card/95 p-4 shadow-card backdrop-blur-xl sm:mx-[22px] sm:-mt-[70px] sm:gap-5 sm:px-[22px] sm:py-[18px]">
          <div className="flex min-w-0 items-center gap-3 sm:gap-[18px]">
            {d.fotoUrl
              // <img> de propósito: a foto vem direto da URL oficial, sem passar pela Vercel (CLAUDE.md).
              ? <img src={d.fotoUrl} alt={`Foto oficial de ${d.nomeUrna}`} width={90} height={90} decoding="async" className="size-16 shrink-0 rounded-full bg-fundo object-cover object-top sm:size-[90px]" />
              : <span aria-hidden="true" className="inline-flex size-16 shrink-0 items-center justify-center rounded-full bg-fundo text-xl font-black sm:size-[90px] sm:text-3xl">{iniciais(d.nomeUrna)}</span>}
            <div className="grid min-w-0 gap-1.5">
              <h1 id="nome-politico" className="text-xl leading-tight font-black break-words sm:text-3xl">{d.nomeUrna}</h1>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-sm font-bold text-suave sm:text-base">{d.cargo} {pelaUf(uf)}</span>
                <span className="inline-flex h-[26px] items-center rounded-lg px-3 text-xs font-bold"
                  style={{ background: `color-mix(in srgb, ${corPartido(partido, cores)} 24%, transparent)` }}>
                  {partido}{nome && nome.toLowerCase() !== partido.toLowerCase() ? ` · ${nome}` : ""}
                </span>
              </div>
              <span className="text-xs text-suave">
                {mandato
                  ? <>Em exercício{mandato.titular ? "" : " como suplente"} desde {dataBr(mandato.inicio)}{fim ? ` · mandato até ${dataBr(fim)}` : ""}</>
                  : d.status}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Compartilhar rotulo="Compartilhar" titulo={`${d.nomeUrna} · ${d.cargo} · ${d.partidoUf}`} texto="O que fez no mandato, com dados oficiais."
              classe="inline-flex h-10 items-center rounded-xl border border-borda bg-card px-4 text-xs font-bold hover:border-destaque" />
          </div>
        </div>
      </section>

      <section aria-label="Números principais" className="grid grid-cols-2 gap-3 sm:gap-[18px]">
        {salario && (
          <Numero icone="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
            rotulo={<Termo id="cr-salario" termo="salario">Salário por mês</Termo>} valor={reaisExatos(salario.valor)} />
        )}
        {n.tipo === "mandato" && (
          <Numero icone="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"
            rotulo={<Termo id="cr-part" termo="participacao">Participação em votações, {n.periodo}</Termo>}
            valor={pct(n.participacao)} detalhe={`${inteiro(n.participacao.numerador)} de ${inteiro(n.participacao.denominador)}`} />
        )}
        {n.tipo === "primeiro_voto" && <Numero icone="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" rotulo="Votações" valor="Primeiro voto em fevereiro de 2027" largo />}
        {n.tipo === "sem_mandato" && <Numero icone="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-5M12 8h.01" rotulo="Votações" valor={`Sem mandato no Congresso em ${n.periodo}`} largo />}
      </section>

      {n.tipo === "mandato" && (fidelidade || (comparacao?.mediaParticipacao != null && n.participacao.percentual !== null)) && (
        <section aria-label="Gráficos" className="grid gap-3 sm:gap-[18px] [grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr))]">
          {fidelidade && <ComPartido f={fidelidade} periodo={n.periodo} />}
          {comparacao?.mediaParticipacao != null && n.participacao.percentual !== null && (
            <div className={`${card} grid gap-3`}>
              <div>
                <h2 className="text-lg font-bold">Participação nas votações</h2>
                <p className="mt-1 text-[13px] text-suave">{n.periodo}, ao lado da média de quem está em exercício {comparacao.casa === "senado" ? "no Senado" : "na Câmara"} hoje.</p>
              </div>
              <div className="flex h-[140px] items-end justify-center gap-9 border-b border-borda sm:h-[180px]">
                {[[d.nomeUrna, n.participacao.percentual, "var(--destaque)"], [casaMedia, comparacao.mediaParticipacao, "var(--borda-forte)"]].map(([l, v, c]) => (
                  <div key={String(l)} className="flex h-full w-[84px] flex-col items-center justify-end gap-1.5">
                    <span className="text-lg font-bold tabular-nums">{umaCasa(Number(v))}%</span>
                    <span className="block w-full rounded-t-xl" style={{ height: `calc((100% - 32px) * ${Number(v) / 100})`, background: String(c) }} />
                  </div>
                ))}
              </div>
              <div className="flex justify-center gap-9 text-center text-xs text-suave">
                <span className="w-[84px] truncate">{d.nomeUrna.split(" ")[0]}</span><span className="w-[84px]">{casaMedia}</span>
              </div>
              <Link href={hrefSecao("participacao")} className="text-xs underline underline-offset-2">como contamos</Link>
            </div>
          )}
        </section>
      )}

      {comparacao && comparacao.parecidos.length > 0 && (
        <section className={`${card} grid gap-1.5`} aria-labelledby="cr-parecidos">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="cr-parecidos" className="text-lg font-bold"><Termo id="cr-parec" termo="parecidos">Quem vota mais parecido</Termo></h2>
            <span className="text-xs text-suave">% de votos iguais nas mesmas votações nominais, {n.tipo === "mandato" ? n.periodo : "2023–2026"}</span>
          </div>
          <div className="grid gap-x-7 [grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr))]">
            {comparacao.parecidos.map((s) => (
              <Link key={s.id} href={`/p/${s.id}`} className="flex items-center gap-3 border-b border-borda py-2.5 text-texto no-underline hover:bg-fundo">
                {s.fotoUrl
                  ? <img src={s.fotoUrl} alt="" width={40} height={40} loading="lazy" className="size-10 shrink-0 rounded-full bg-fundo object-cover object-top" />
                  : <span aria-hidden="true" className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-fundo text-xs font-bold">{iniciais(s.nomeUrna)}</span>}
                <span className="grid flex-1 gap-1.5">
                  <span className="flex justify-between gap-2"><strong className="text-[13px]">{s.nomeUrna}</strong><strong className="text-[13px] text-link tabular-nums">{umaCasa(s.pct)}%</strong></span>
                  <span className="block h-1 rounded bg-fundo"><span className="block h-1 rounded bg-destaque" style={{ width: `${s.pct}%` }} /></span>
                  <span className="text-xs text-suave">{s.partido} · {s.uf} · {inteiro(s.comuns)} votações em comum</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {salario && (
        <p className="text-xs text-suave">
          Salário: subsídio bruto desde {dataBr(salario.desde)}, <a href={SUBSIDIO_CONGRESSO.url} {...externo} className="underline underline-offset-2">{SUBSIDIO_CONGRESSO.ato}</a>.
        </p>
      )}
    </>
  );
}
