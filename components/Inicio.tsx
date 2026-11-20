import Link from "next/link";
import { BuscaTopo } from "./BuscaTopo";
import { QuemVoteiResumo } from "./QuemVoteiResumo";
import { cadeirasHemiciclo, type VotacaoResumo } from "@/lib/congresso";
import { ESTADOS_MAPA, MAPA_H, MAPA_W } from "@/lib/mapa-brasil";
import { CADEIRAS, hrefVotacao, tipoPorExtenso } from "@/lib/votacao";

const NOME_CASA = { camara: "Câmara", senado: "Senado" } as const;
const dataLonga = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`);
  const semana = d.toLocaleDateString("pt-BR", { weekday: "long", timeZone: "UTC" });
  return `${semana}, ${d.toLocaleDateString("pt-BR", { timeZone: "UTC" })}`;
};
const dataCurta = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

/** Contornos dos estados, só de enfeite, esmaecendo para as bordas (o mapa do hero do protótipo). */
function MapaFundo() {
  return (
    <svg aria-hidden="true" viewBox={`0 0 ${MAPA_W} ${MAPA_H}`} width="430" height="416"
      className="pointer-events-none absolute top-[70px] -right-[150px] overflow-visible [mask-image:radial-gradient(circle_at_55%_45%,#000_30%,transparent_72%)] sm:right-0">
      <g fill="rgba(255,255,255,0.025)" stroke="rgba(255,255,255,0.22)" strokeWidth="1.1" strokeLinejoin="round">
        {Object.entries(ESTADOS_MAPA).map(([uf, e]) => <path key={uf} d={e.d} />)}
      </g>
    </svg>
  );
}

/** Placar em meia-lua: uma bolinha por cadeira, Sim em branco, Não em cinza, quem não votou apagado. */
function PlacarMini({ v }: { v: VotacaoResumo }) {
  const p = v.placar!;
  const total = CADEIRAS[v.casa];
  const outros = p.abstencao + p.obstrucao;
  const pts = cadeirasHemiciclo(total, v.casa === "senado" ? 5 : 9);
  const cor = (i: number) => i < p.sim ? "#F2F2F7" : i < p.sim + p.nao ? "#8E8E93" : i < p.sim + p.nao + outros ? "#48484A" : "rgba(255,255,255,0.12)";
  const r = v.casa === "senado" ? 0.0504 : 0.024;
  return (
    <svg viewBox="-1.06 -0.06 2.12 1.12" width="128" height="68" role="img" className="block"
      aria-label={`Placar ${v.casa === "senado" ? "no Senado" : "na Câmara"}: ${p.sim} Sim, ${p.nao} Não, ${outros} abstenção ou obstrução, de ${total} cadeiras`}>
      {pts.map((c, i) => <circle key={i} cx={c.x} cy={1 - c.y} r={r} fill={cor(i)} />)}
    </svg>
  );
}

/** A votação mais recente do Plenário (Câmara ou Senado), com o placar, e o atalho para as demais. */
function UltimaVotacao({ v }: { v: VotacaoResumo }) {
  const aprovada = v.resultado === "aprovada";
  const tipo = tipoPorExtenso(v.proposicao);
  return (
    <section aria-labelledby="ini-ultima" className="vidro overflow-hidden rounded-card">
      <Link href={hrefVotacao(v.id)} className="flex gap-3 px-4 pt-4 pb-3.5 text-texto no-underline hover:text-texto">
        <div className="grid min-w-0 flex-1 content-start gap-1.5">
          <span className="text-xs font-semibold text-suave">{NOME_CASA[v.casa]} · {dataLonga(v.data)}</span>
          <h2 id="ini-ultima" className="line-clamp-3 text-[15px] leading-5 font-semibold">{v.ementa ?? v.descricao}</h2>
          {v.proposicao && <span className="text-xs text-suave">{v.proposicao}{tipo ? ` · ${tipo}` : ""}</span>}
          {v.resultado && (
            <span className={`mt-0.5 inline-flex h-6 items-center justify-self-start rounded-full border px-2.5 text-xs font-bold ${aprovada ? "border-verde/45 bg-verde/20 text-[#5EE37E]" : "border-vermelho/45 bg-vermelho/20 text-[#FF7A70]"}`}>
              {aprovada ? "Aprovada" : "Rejeitada"}
            </span>
          )}
        </div>
        {v.placar && !v.secreta && (
          <div className="flex w-32 shrink-0 flex-col items-center justify-center gap-1.5">
            <PlacarMini v={v} />
            <span className="flex gap-2.5 text-xs tabular-nums">
              <span className="flex items-center gap-1"><span aria-hidden="true" className="size-2 rounded-full bg-[#F2F2F7]" /><strong>{v.placar.sim}</strong> Sim</span>
              <span className="flex items-center gap-1 text-suave"><span aria-hidden="true" className="size-2 rounded-full bg-[#8E8E93]" /><strong>{v.placar.nao}</strong> Não</span>
            </span>
          </div>
        )}
      </Link>
      <Link href="/votacoes" className="flex min-h-12 items-center justify-between border-t border-borda px-4 text-[15px] font-semibold no-underline">
        Ver todas as votações recentes
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
      </Link>
    </section>
  );
}

/** O que ainda vem (protótipo Liquid Glass): só o anúncio, sem botão que leve a lugar nenhum. */
const EM_BREVE = [
  { t: "Compare políticos", d: "Compare lado a lado os políticos que desejar.", icone: <><rect x="3" y="4" width="7" height="16" rx="2" /><rect x="14" y="4" width="7" height="16" rx="2" /></> },
  { t: "STF", d: "Acompanhe julgamentos e votações do Judiciário.", icone: <path d="M12 3v18M7 21h10M5 7h14m-14 0-3 7a3.5 3.5 0 0 0 6 0L5 7Zm14 0-3 7a3.5 3.5 0 0 0 6 0l-3-7Z" /> },
  { t: "Impostômetro", d: "Acompanhe os detalhes da arrecadação.", icone: <><ellipse cx="12" cy="6" rx="7" ry="3" /><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" /></> },
];

/**
 * Início (protótipo Liquid Glass, 2026-11-20): o que é o site, a busca de político ou projeto, o santinho
 * "Quem votei?", a votação mais recente e o que vem em breve. O mapa por estado ficou em /mapa.
 */
export function Inicio({ ultima, coleta }: { ultima: VotacaoResumo | null; coleta: string | null }) {
  return (
    <div className="grid gap-5 pb-2">
      <section aria-labelledby="ini-titulo" className="relative -mx-4 overflow-x-clip px-5 pt-10 pb-2 lg:mx-0 lg:px-1 lg:pt-12">
        <div aria-hidden="true" className="pointer-events-none absolute top-[60px] -right-[170px] size-[460px] rounded-full bg-[radial-gradient(circle,rgba(120,150,200,0.30)_0%,rgba(120,150,200,0.08)_45%,transparent_70%)] sm:right-0" />
        <MapaFundo />
        {coleta && (
          <span className="vidro relative inline-flex h-7 items-center gap-2 rounded-full px-3 text-xs font-semibold text-texto/85">
            <span aria-hidden="true" className="size-[7px] rounded-full bg-verde shadow-[0_0_0_3px_rgba(48,209,88,0.22),0_0_10px_rgba(48,209,88,0.8)]" />
            Dados oficiais · atualizado em {dataCurta(coleta)}
          </span>
        )}
        <h1 id="ini-titulo" className="relative mt-[18px] max-w-[330px] font-display text-[44px] leading-[44px] font-bold tracking-[-1.8px] [text-shadow:0_2px_28px_rgba(0,0,0,0.55)] sm:max-w-[560px] sm:text-[56px] sm:leading-[56px]">
          Quem te representa<span className="block text-[rgba(235,235,245,0.5)]">e o que fez no mandato.</span>
        </h1>
        <p className="relative mt-4 max-w-[300px] text-[15px] leading-[22px] tracking-[-0.1px] text-[rgba(235,235,245,0.72)] sm:max-w-[440px]">
          Acompanhe no detalhe os senadores e deputados federais que elegemos. Buscamos o direito à transparência para termos o poder de cobrar.
        </p>
      </section>

      <div className="relative z-10 w-full"><BuscaTopo tipo="tudo" grande /></div>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <QuemVoteiResumo />
        {ultima && <UltimaVotacao v={ultima} />}
      </div>

      <section aria-labelledby="ini-embreve" className="grid gap-2.5">
        <h2 id="ini-embreve" className="mt-2 px-1 text-[22px] font-bold tracking-[-0.3px]">Mais informações</h2>
        <div className="grid gap-2.5 lg:grid-cols-3">
          {EM_BREVE.map((x) => (
            <div key={x.t} className="vidro flex items-center gap-3.5 rounded-[24px] p-4">
              <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-[14px] border border-white/16 bg-white/10">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{x.icone}</svg>
              </span>
              <span className="grid min-w-0 flex-1 gap-[3px]"><span className="text-base font-semibold">{x.t}</span><span className="text-[13px] text-suave">{x.d}</span></span>
              <span className="inline-flex h-[22px] shrink-0 items-center rounded-full border border-white/20 bg-white/12 px-[9px] text-[11px] font-bold whitespace-nowrap text-texto/90">Em breve</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
