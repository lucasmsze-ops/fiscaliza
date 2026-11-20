"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ItemBusca } from "@/lib/card";
import { CARGOS, ELEICOES, eleitoNoStatus, type AnoEleicao, type CargoSantinho, type Escolha, type ItemExecutivo } from "@/lib/quem-votei";
import { definirUf, escolher, tirar, useSantinho } from "@/lib/quem-votei-estado";
import { NOME_UF } from "@/lib/regioes";
import { normalizar } from "@/lib/texto";
import { ChipPartido } from "./ChipPartido";
import { EmBreve } from "./EmBreve";

const ufsOrdenadas = Object.keys(NOME_UF).sort((x, y) => NOME_UF[x]!.localeCompare(NOME_UF[y]!, "pt-BR"));

/** Índices de busca (CDN), baixados uma vez, só quando a pessoa abre a busca de um cargo. */
let politicosP: Promise<ItemBusca[]> | null = null;
let executivosP: Promise<ItemExecutivo[]> | null = null;
const indicePoliticos = () => (politicosP ??= fetch("/dados/politicos").then((r) => r.ok ? r.json() as Promise<ItemBusca[]> : []).catch(() => { politicosP = null; return []; }));
const indiceExecutivos = () => (executivosP ??= fetch("/dados/executivos").then((r) => r.ok ? r.json() as Promise<ItemExecutivo[]> : []).catch(() => { executivosP = null; return []; }));

/** Candidatos do cargo no índice, já como escolha do santinho (filtrados pela UF onde a pessoa votou). */
async function candidatos(cargo: CargoSantinho, uf: string | null): Promise<(Escolha & { busca: string })[]> {
  if (cargo === "governador" || cargo === "presidente") {
    return (await indiceExecutivos()).filter((e) => e.cargo === cargo && (cargo === "presidente" || !uf || e.uf === uf)).map((e) => ({
      id: e.id, nome: e.nomeUrna, tipo: "executivo", eleito: e.eleito, fotoUrl: e.fotoUrl, partido: e.uf ? `${e.partido}-${e.uf}` : e.partido,
      situacao: e.situacao, href: e.href, busca: e.busca, numero: e.num ?? null,
    }));
  }
  // Políticos: só quem disputou o cargo em 2026 (quem está "em exercício" sem candidatura não estava na urna).
  return (await indicePoliticos()).filter((p) => p.cargoChave === cargo && p.st !== "em_exercicio" && (!uf || p.partidoUf.endsWith(`-${uf}`))).map((p) => ({
    id: p.id, nome: p.nomeUrna, tipo: "politico", eleito: eleitoNoStatus(p.st), fotoUrl: p.fotoUrl, partido: p.partidoUf,
    situacao: p.status, href: `/p/${p.id}`, busca: p.busca, numero: p.num ?? null,
  }));
}

function Foto({ url, tamanho = 40 }: { url: string | null; tamanho?: number }) {
  return url
    // <img> de propósito: a foto vem direto da URL oficial, sem passar pela Vercel (CLAUDE.md).
    ? <img src={url} alt="" width={tamanho} height={tamanho} loading="lazy" className="shrink-0 rounded-full bg-preench object-cover object-top" style={{ width: tamanho, height: tamanho }} />
    : <span aria-hidden="true" className="shrink-0 rounded-full bg-preench" style={{ width: tamanho, height: tamanho }} />;
}

/** Busca dentro de um cargo do santinho: nome de urna, nome civil ou número de urna. */
function Escolher({ ano, cargo, uf, ja, fechar }: { ano: AnoEleicao; cargo: CargoSantinho; uf: string | null; ja: Set<string>; fechar: () => void }) {
  const [q, setQ] = useState("");
  const [lista, setLista] = useState<(Escolha & { busca: string })[] | null>(null);
  const campo = useRef<HTMLInputElement>(null);
  useEffect(() => { campo.current?.focus(); candidatos(cargo, uf).then(setLista); }, [cargo, uf]);
  const t = normalizar(q);
  const achados = useMemo(() => {
    if (!lista) return [];
    const termos = t ? t.split(" ") : [];
    return lista.filter((x) => !ja.has(x.id) && termos.every((w) => x.busca.split(" ").some((p) => p.startsWith(w)))).slice(0, termos.length ? 8 : 6);
  }, [lista, t, ja]);
  const executivo = cargo === "governador" || cargo === "presidente";
  // Antes da coleta de todos os candidatos (E23q) o índice só tem os eleitos: aí o aviso explica.
  const soEleitos = executivo && !!lista && lista.every((x) => x.eleito);
  return (
    <div className="grid gap-2 rounded-2xl border border-white/14 bg-white/6 p-2.5">
      <div className="flex items-center gap-2">
        <input ref={campo} type="search" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off"
          placeholder={executivo ? "Nome do candidato" : "Nome ou número de urna"} aria-label="Buscar candidato"
          className="h-10 min-w-0 flex-1 rounded-full border border-white/14 bg-white/8 px-4 text-base text-texto outline-none placeholder:text-suave focus:ring-2 focus:ring-destaque/40" />
        <button type="button" onClick={fechar} className="shrink-0 text-[13px] font-semibold text-link">Cancelar</button>
      </div>
      {!lista ? <p className="px-1 text-[13px] text-suave">Carregando…</p> : (
        <>
          {achados.map((x) => (
            <button key={x.id} type="button" onClick={() => { escolher(ano, cargo, x); fechar(); }}
              className="flex items-center gap-2.5 rounded-[10px] px-1.5 py-1.5 text-left hover:bg-preench-forte">
              <Foto url={x.fotoUrl} tamanho={32} />
              <span className="grid min-w-0"><strong className="truncate text-[15px] font-semibold">{x.nome}</strong><span className="truncate text-xs text-suave">{x.partido} · {x.situacao}</span></span>
            </button>
          ))}
          {achados.length === 0 && <p className="px-1 text-[13px] text-suave">Ninguém com esse nome{uf && !executivo ? ` em ${NOME_UF[uf]}` : ""}.</p>}
          <p className="px-1 text-xs text-suave">
            {soEleitos
              ? "Por enquanto só os eleitos: os candidatos a presidente e governador que não foram eleitos ainda não estão no site."
              : executivo
                ? "Todos os candidatos a presidente e governador de 2026, do TSE."
                : "O Fiscaliza tem os eleitos e os 20 mais votados de cada cidade; quem teve menos votos ainda não está no site."}
          </p>
        </>
      )}
    </div>
  );
}

/** Casinhas do número de urna (protótipo Liquid Glass): azuis com o número quando há escolha, vazias senão. */
function Casinhas({ n, numero }: { n: number; numero: string | null }) {
  const dig = numero && numero.length === n ? numero.split("") : null;
  return (
    <div aria-label={dig ? `Número ${numero}` : `Número de ${n} dígitos${numero === null ? ", vazio" : ""}`} className="flex shrink-0 gap-[5px]">
      {Array.from({ length: n }, (_, j) => (
        <span key={j} className={`flex h-[46px] w-[34px] items-center justify-center rounded-[11px] border text-[26px] font-bold text-white tabular-nums shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] ${dig ? "border-[rgba(140,196,255,0.6)] bg-[rgba(64,156,255,0.22)]" : "border-white/18 bg-white/6"}`}>{dig?.[j] ?? ""}</span>
      ))}
    </div>
  );
}

/** Dígitos do número de urna de cada cargo. */
const DIGITOS: Record<CargoSantinho, number> = { presidente: 2, governador: 2, senador: 3, deputado_federal: 4, deputado_estadual: 5 };
/** Do cargo mais alto ao mais baixo, como no protótipo; o senador ocupa duas linhas (1º e 2º voto). */
const ORDEM: CargoSantinho[] = ["presidente", "governador", "senador", "deputado_federal", "deputado_estadual"];

/** Uma linha do santinho: o cargo, as casinhas, quem a pessoa escolheu (com "Trocar") ou o botão para escolher. */
function Vaga({ ano, c, i, s, primeira }: { ano: AnoEleicao; c: (typeof CARGOS)[number]; i: number; s: ReturnType<typeof useSantinho>; primeira: boolean }) {
  const [buscando, setBuscando] = useState(false);
  const escolhas = s.escolhas[c.chave] ?? [];
  const x = escolhas[i] ?? null;
  const ja = new Set(escolhas.map((e) => e.id));
  const rotulo = c.chave === "senador" ? `Senador · ${i + 1}º voto` : c.chave === "deputado_estadual" ? "Deputado estadual" : c.rotulo;
  const partido = x?.partido.replace(/-[A-Z]{2}$/, "");
  return (
    <div className={`relative grid gap-2.5 px-5 pt-3.5 pb-4 ${primeira ? "" : "border-t border-borda"} ${c.acompanha ? "" : "opacity-60"}`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="pt-0.5 text-[17px] leading-[21px] font-bold">{rotulo}</h3>
        <Casinhas n={DIGITOS[c.chave]} numero={x ? x.numero ?? "" : null} />
      </div>
      {!c.acompanha ? (
        <p className="text-[13px] leading-[18px] text-texto/75">Ainda não acompanhamos deputados estaduais e distritais. O Fiscaliza começa pelo Congresso, pelo presidente e pelos governadores.</p>
      ) : x ? (
        <div className="flex items-center justify-between gap-2.5">
          <div className="grid min-w-0 gap-0.5">
            {x.href ? <Link href={x.href} className="text-xl leading-6 font-extrabold tracking-[-0.2px] text-texto no-underline hover:text-texto">{x.nome}</Link> : <span className="text-xl leading-6 font-extrabold tracking-[-0.2px]">{x.nome}</span>}
            <span className="flex flex-wrap items-center gap-1.5">{partido && <ChipPartido sigla={partido} />}<span className="text-[13px] text-texto/75">{x.situacao}</span></span>
          </div>
          <button type="button" onClick={() => { tirar(ano, c.chave, x.id); setBuscando(true); }}
            className="h-9 shrink-0 rounded-full border border-white/18 bg-white/8 px-3.5 text-[13px] font-semibold text-texto">Trocar</button>
        </div>
      ) : buscando ? (
        <Escolher ano={ano} cargo={c.chave} uf={s.uf} ja={ja} fechar={() => setBuscando(false)} />
      ) : (
        <button type="button" onClick={() => setBuscando(true)}
          className="flex min-h-12 items-center justify-center gap-1.5 rounded-2xl border-[1.5px] border-dashed border-[rgba(64,156,255,0.6)] bg-[rgba(64,156,255,0.08)] text-[15px] font-semibold text-[#8CC4FF] hover:bg-[rgba(64,156,255,0.16)]">
          + {c.chave === "senador" && i === 1 ? "Escolher o 2º voto" : "Escolher em quem votei"}
        </button>
      )}
    </div>
  );
}

// 16 px: com menos, o Safari do iPhone dá zoom na página ao tocar no campo.
const SELECT = "vidro h-11 w-full appearance-none rounded-full px-3.5 text-base font-semibold text-texto";

/**
 * Aba "Quem votei" (pedido de 2026-11-19; santinho em ingresso do protótipo Liquid Glass, E23s): por eleição (por
 * enquanto só a de 2026), do cargo mais alto ao mais baixo; quem foi eleito entra no Monitorando, onde fica o que
 * aconteceu com eles. Tudo só neste navegador.
 */
export function QuemVotei() {
  const [ano, setAno] = useState<AnoEleicao>(ELEICOES[0].ano);
  const s = useSantinho(ano);
  const vagas = ORDEM.flatMap((k) => { const c = CARGOS.find((x) => x.chave === k)!; return Array.from({ length: c.vagas }, (_, i) => ({ c, i })); });
  const feitas = vagas.filter(({ c, i }) => c.acompanha && (s.escolhas[c.chave]?.length ?? 0) > i).length;
  const total = vagas.filter(({ c }) => c.acompanha).length;
  return (
    <div className="grid gap-[18px]">
      <div className="grid grid-cols-2 gap-2.5">
        <label className="grid gap-1.5">
          <span className="px-1.5 text-[13px] text-suave">Eleição</span>
          <select value={String(ano)} onChange={(e) => setAno(Number(e.target.value) as AnoEleicao)} className={SELECT}>
            {ELEICOES.map((e) => <option key={e.ano} value={e.ano}>{e.rotulo}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className="px-1.5 text-[13px] text-suave">Onde você votou</span>
          <select value={s.uf ?? "todos"} onChange={(e) => definirUf(ano, e.target.value === "todos" ? null : e.target.value)} className={SELECT}>
            <option value="todos">Escolha o estado</option>
            {ufsOrdenadas.map((u) => <option key={u} value={u}>{NOME_UF[u]}</option>)}
          </select>
        </label>
      </div>

      <section aria-labelledby="santinho-titulo" className="vidro-forte relative grid overflow-hidden rounded-[30px]">
        <header className="grid gap-1.5 px-5 pt-[22px] pb-[18px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-[2px] text-texto/75 uppercase">Eleição {ano}{s.uf ? ` · ${NOME_UF[s.uf]}` : ""}</span>
            <span className="inline-flex h-6 items-center rounded-full border border-white/22 bg-white/14 px-2.5 text-xs font-bold tabular-nums">{feitas}/{total}</span>
          </div>
          <h2 id="santinho-titulo" className="text-[40px] leading-[42px] font-extrabold tracking-[-1.2px]">Quem votei?</h2>
          <p className="text-[13px] leading-[18px] text-texto/75">Do cargo mais alto ao mais baixo. Quem foi eleito entra no Monitorando automaticamente.</p>
        </header>
        {/* Picote do ingresso: dois recortes na cor do fundo e a linha tracejada. */}
        <div aria-hidden="true" className="relative h-6">
          <span className="absolute top-0 -left-3 size-6 rounded-full bg-fundo" />
          <span className="absolute top-0 -right-3 size-6 rounded-full bg-fundo" />
          <span className="absolute inset-x-5 top-[11px] border-t-2 border-dashed border-white/22" />
        </div>
        {vagas.map(({ c, i }, n) => <Vaga key={`${c.chave}-${i}`} ano={ano} c={c} i={i} s={s} primeira={n === 0} />)}
        <footer className="flex items-center gap-1.5 border-t border-borda px-5 pt-4 pb-5 text-[13px] text-texto/75">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
          <span>Fica só neste aparelho. <EmBreve oQue="O login" className="font-semibold text-link">Faça login</EmBreve> para salvar suas informações.</span>
        </footer>
      </section>
    </div>
  );
}
