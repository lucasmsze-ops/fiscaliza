import Link from "next/link";
import { inteiro, type CardDados } from "@/lib/card";
import type { ComparacaoCasa } from "@/lib/comparacoes";
import { hrefSecao } from "@/lib/glossario";
import { nomePartido } from "@/lib/partidos";
import { pelaUf } from "@/lib/regioes";
import { BotaoMonitorar } from "./BotaoMonitorar";
import { ChipPartido } from "./ChipPartido";
import { EmBreve } from "./EmBreve";
import type { Mandato } from "@/lib/types";
import { Info } from "./Termo";

const dataBr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const umaCasa = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const iniciais = (n: string) => n.split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("");

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

/** Barra horizontal da participação (protótipo Liquid Glass): rótulo e % em cima, a barra embaixo. */
function Barra({ rotulo, valor, cor, suave = false }: { rotulo: string; valor: number; cor: string; suave?: boolean }) {
  return (
    <div className="grid gap-1.5">
      <div className={`flex justify-between gap-3 text-[13px] ${suave ? "text-suave" : ""}`}><span className="truncate">{rotulo}</span><span className="font-semibold tabular-nums">{umaCasa(valor)}%</span></div>
      <div className="h-2.5 overflow-hidden rounded-[5px] bg-white/10"><div className="h-full rounded-[5px]" style={{ width: `${valor}%`, background: cor }} /></div>
    </div>
  );
}

/**
 * Topo da página do político no layout do protótipo Liquid Glass (2026-11-20): cabeçalho centrado, participação
 * nas votações ao lado da média da Casa e quem vota mais parecido. Exibe os `CardDados` do card
 * (lib/card.ts), nunca outro cálculo; o que é null não aparece. "Votou com o partido?" e os cartões de
 * salário e participação saíram do crachá com o protótipo (o salário fica na nota do pé da página).
 */
export function Cracha({ d, mandato, comparacao }: {
  d: CardDados;
  /** Mandato em curso no Congresso, se houver. */
  mandato: Mandato | null;
  comparacao: ComparacaoCasa | null;
}) {
  const n = d.numeros;
  const partido = d.partidoUf.slice(0, -3), ufCandidatura = d.partidoUf.slice(-2);
  // Com mandato em curso, o cabeçalho diz a cadeira (cargo e UF do mandato): `partidoUf` e `cargo` vêm da
  // candidatura de 2026, que pode ser outra (deputada por SP candidata no PR; deputada candidata ao Senado).
  const fem = /^(Senadora|Deputada)/.test(d.cargo);
  const cargoCadeira = mandato ? (mandato.cargo === "senador" ? (fem ? "Senadora" : "Senador") : (fem ? "Deputada federal" : "Deputado federal")) : d.cargo;
  const uf = mandato?.uf ?? ufCandidatura;
  const candidaturaDiferente = mandato && (cargoCadeira !== d.cargo || uf !== ufCandidatura);
  const nome = nomePartido(partido);
  const fim = mandato ? fimDoMandato(mandato) : null;
  const casaMedia = comparacao?.casa === "senado" ? `Média dos ${comparacao.membros} senadores` : `Média dos ${comparacao?.membros} deputados`;

  return (
    <>
      {/* Cabeçalho centrado do protótipo Liquid Glass (2026-11-20): foto, nome, cadeira, partido e os botões. */}
      <section aria-labelledby="nome-politico" className="flex flex-col items-center gap-2.5 pt-1 pb-2 text-center">
        {d.fotoUrl
          // <img> de propósito: a foto vem direto da URL oficial, sem passar pela Vercel (CLAUDE.md).
          ? <img src={d.fotoUrl} alt={`Foto oficial de ${d.nomeUrna}`} width={104} height={104} decoding="async" className="vidro size-[104px] shrink-0 rounded-full object-cover object-top" />
          : <span aria-hidden="true" className="vidro inline-flex size-[104px] shrink-0 items-center justify-center rounded-full text-3xl font-bold">{iniciais(d.nomeUrna)}</span>}
        <h1 id="nome-politico" className="mt-1 text-[28px] leading-[34px] font-bold tracking-[-0.4px] break-words">{d.nomeUrna}</h1>
        <p className="text-[15px] text-suave">{cargoCadeira} {pelaUf(uf)}</p>
        <ChipPartido sigla={partido} grande>{partido}{nome && nome.toLowerCase() !== partido.toLowerCase() ? ` · ${nome}` : ""}</ChipPartido>
        <p className="text-[13px] text-suave">
          {mandato
            ? <>Em exercício{mandato.titular ? "" : " como suplente"} desde {dataBr(mandato.inicio)}{fim ? ` · mandato até ${dataBr(fim)}` : ""}</>
            : d.status}
          {candidaturaDiferente && <><br />{d.status} ({d.cargo.toLowerCase()} {pelaUf(ufCandidatura)})</>}
        </p>
        <div className="mt-1.5 flex flex-wrap justify-center gap-2">
          <BotaoMonitorar id={d.id} nome={d.nomeUrna} grande />
          {/* Comparar volta quando a comparação for revista (decisão de 2026-11-20); /comparar continua no ar. */}
          <EmBreve oQue="A comparação de políticos" className="vidro inline-flex h-11 items-center justify-center rounded-full px-5 text-[15px] font-semibold text-texto hover:bg-preench-forte">Comparar</EmBreve>
        </div>
      </section>

      {n.tipo === "mandato" && n.participacao.percentual !== null && (
        <section aria-labelledby="cr-presenca" className="vidro grid gap-3.5 rounded-card p-[18px]">
          <div className="flex items-start gap-3">
            <div className="grid min-w-0 flex-1 gap-0.5">
              <h2 id="cr-presenca" className="text-[17px] font-semibold">Participação nas votações</h2>
              <span className="text-[13px] text-suave">
                {n.periodo}{comparacao?.mediaParticipacao != null ? `, ao lado da média de quem está em exercício ${comparacao.casa === "senado" ? "no Senado" : "na Câmara"} hoje` : ""} · {inteiro(n.participacao.numerador)} de {inteiro(n.participacao.denominador)} votações
              </span>
            </div>
            <Info id="cr-presenca" termo="participacao" rotulo="Como contamos a participação nas votações" />
          </div>
          <Barra rotulo={d.nomeUrna.split(" ")[0]!} valor={n.participacao.percentual} cor="#409CFF" />
          {comparacao?.mediaParticipacao != null && <Barra rotulo={casaMedia} valor={comparacao.mediaParticipacao} cor="rgba(235,235,245,0.45)" suave />}
          {n.textoAfastado && <p className="text-[13px] text-suave">{n.textoAfastado}</p>}
        </section>
      )}
      {n.tipo === "primeiro_voto" && <p className="vidro rounded-card p-[18px] text-[15px]">Primeiro voto em fevereiro de 2027.</p>}
      {n.tipo === "sem_mandato" && <p className="vidro rounded-card p-[18px] text-[15px]">Sem mandato no Congresso em {n.periodo}.</p>}

      {comparacao && comparacao.parecidos.length > 0 && (
        <section aria-labelledby="cr-parecidos" className="grid gap-2">
          <h2 id="cr-parecidos" className="px-1 text-[22px] font-bold tracking-[-0.3px]">Com quem vota mais parecido</h2>
          <div className="vidro overflow-hidden rounded-card">
            {comparacao.parecidos.map((s, i) => (
              <Link key={s.id} href={`/p/${s.id}`} className={`flex min-h-14 items-center gap-3 px-4 py-2 text-texto no-underline hover:bg-white/5 hover:text-texto ${i ? "border-t border-borda" : ""}`}>
                {s.fotoUrl
                  ? <img src={s.fotoUrl} alt="" width={40} height={40} loading="lazy" className="size-10 shrink-0 rounded-full border border-white/20 bg-white/12 object-cover object-top" />
                  : <span aria-hidden="true" className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/12 text-[13px] font-semibold">{iniciais(s.nomeUrna)}</span>}
                <span className="grid min-w-0 flex-1 gap-1">
                  <span className="truncate text-[15px] font-semibold">{s.nomeUrna}</span>
                  <span className="flex min-w-0 items-center gap-1.5"><ChipPartido sigla={s.partido} /><span className="truncate text-[13px] text-suave">{s.uf} · {inteiro(s.comuns)} votações em comum</span></span>
                </span>
                <span className="text-[17px] font-semibold tabular-nums">{umaCasa(s.pct)}%</span>
              </Link>
            ))}
          </div>
          <p className="px-5 text-xs text-suave">
            % de votos iguais nas mesmas votações nominais{n.tipo === "mandato" ? `, ${n.periodo}` : ""}. Não é nota nem posição política.{" "}
            <Link href={hrefSecao("parecidos")} className="no-underline">Como calculamos</Link>
          </p>
        </section>
      )}
    </>
  );
}
