"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ResumoAcompanhar } from "@/lib/acompanhar";
import type { ItemBusca } from "@/lib/card";
import { BOTAO, CARD, ROTULO, TITULO_SECAO } from "@/lib/estilo";
import { alternar, monitora, useMonitorando } from "@/lib/monitorando";
import { NOME_FONTE, type Noticia } from "@/lib/noticias";
import type { ItemPautaAutores } from "@/lib/pauta";
import { CARGOS, ELEICOES, eleitoNoStatus, type AnoEleicao, type CargoSantinho, type Escolha, type ItemExecutivo } from "@/lib/quem-votei";
import { definirUf, escolher, tirar, useSantinho } from "@/lib/quem-votei-estado";
import { NOME_UF } from "@/lib/regioes";
import { normalizar } from "@/lib/texto";
import type { TipoVoto } from "@/lib/types";
import { tipoPorExtenso } from "@/lib/votacao";
import { SelectChip } from "./SelectChip";

const externo = { target: "_blank", rel: "noreferrer noopener" } as const;
const VOTO: Record<TipoVoto, string> = {
  sim: "Votou Sim", nao: "Votou Não", abstencao: "Absteve-se", obstrucao: "Votou obstrução", art17: "Presidia a sessão",
  nao_informado: "Votou (direção não divulgada)", secreto: "Votou (votação secreta)", ausente: "Não registrou voto",
};
const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
/** Data de publicação no fuso de Brasília (a matéria das 23h não vira o dia seguinte). */
const diaBr = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
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
      situacao: e.situacao, href: e.href, busca: e.busca,
    }));
  }
  // Políticos: só quem disputou o cargo em 2026 (quem está "em exercício" sem candidatura não estava na urna).
  return (await indicePoliticos()).filter((p) => p.cargoChave === cargo && p.st !== "em_exercicio" && (!uf || p.partidoUf.endsWith(`-${uf}`))).map((p) => ({
    id: p.id, nome: p.nomeUrna, tipo: "politico", eleito: eleitoNoStatus(p.st), fotoUrl: p.fotoUrl, partido: p.partidoUf,
    situacao: p.status, href: `/p/${p.id}`, busca: p.busca,
  }));
}

function Foto({ url, tamanho = 40 }: { url: string | null; tamanho?: number }) {
  return url
    // <img> de propósito: a foto vem direto da URL oficial, sem passar pela Vercel (CLAUDE.md).
    ? <img src={url} alt="" width={tamanho} height={tamanho} loading="lazy" className="shrink-0 rounded-full bg-preench object-cover object-top" style={{ width: tamanho, height: tamanho }} />
    : <span aria-hidden="true" className="shrink-0 rounded-full bg-preench" style={{ width: tamanho, height: tamanho }} />;
}

/** "+ Monitorar" do santinho: ligado só para quem foi eleito (quem não foi não tem mandato para acompanhar). */
function MonitorarEscolha({ x }: { x: Escolha }) {
  const on = monitora(useMonitorando(), x.id);
  if (!x.eleito) {
    return <button type="button" disabled title="Não eleito em 2026: não há mandato para acompanhar" className="inline-flex h-8 shrink-0 cursor-not-allowed items-center rounded-full bg-preench px-3 text-[13px] font-semibold text-suave opacity-50">Monitorar</button>;
  }
  return (
    <button type="button" aria-pressed={on} onClick={() => alternar(x.id, x.nome)}
      className={`inline-flex h-8 shrink-0 items-center rounded-full px-3 text-[13px] font-semibold whitespace-nowrap ${on ? "bg-destaque text-destaque-texto" : "bg-preench text-link hover:bg-preench-forte"}`}>
      {on ? "✓ Monitorando" : "+ Monitorar"}
    </button>
  );
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
    <div className="grid gap-2 rounded-xl bg-preench p-2.5">
      <div className="flex items-center gap-2">
        <input ref={campo} type="search" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off"
          placeholder={executivo ? "Nome do candidato" : "Nome ou número de urna"} aria-label="Buscar candidato"
          className="h-9 min-w-0 flex-1 rounded-[10px] bg-card px-3 text-base text-texto outline-none placeholder:text-suave focus:ring-2 focus:ring-destaque/40 sm:text-[15px]" />
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

/** Uma linha do santinho: o cargo, quem a pessoa escolheu e o botão para escolher. */
function Cargo({ ano, c, s }: { ano: AnoEleicao; c: (typeof CARGOS)[number]; s: ReturnType<typeof useSantinho> }) {
  const [buscando, setBuscando] = useState(false);
  const escolhas = s.escolhas[c.chave] ?? [];
  const ja = new Set(escolhas.map((x) => x.id));
  return (
    <div className="grid gap-2 border-t border-borda pt-3 first:border-t-0 first:pt-0">
      <p className={ROTULO}>{c.rotulo}{c.vagas > 1 ? ` · ${c.vagas} votos` : ""}</p>
      {!c.acompanha ? (
        <p className="rounded-xl bg-preench p-3 text-[13px] text-suave">
          Ainda não acompanhamos deputados estaduais e distritais. O Fiscaliza começa pelo Congresso, pelo presidente e pelos governadores; as assembleias vêm depois.
        </p>
      ) : (
        <>
          {escolhas.map((x) => (
            // Nome inteiro na primeira linha; no celular o "Monitorar" desce para baixo do nome, no tablet fica ao lado.
            <div key={x.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-xl bg-preench p-2.5 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto]">
              <Foto url={x.fotoUrl} />
              <span className="grid min-w-0">
                {x.href ? <Link href={x.href} className="text-[15px] leading-snug font-semibold text-texto no-underline">{x.nome}</Link> : <strong className="text-[15px] leading-snug font-semibold">{x.nome}</strong>}
                <span className="text-xs text-suave">{x.partido} · {x.situacao}</span>
              </span>
              <span className="col-start-2 row-start-2 justify-self-start sm:col-start-3 sm:row-start-1"><MonitorarEscolha x={x} /></span>
              <button type="button" onClick={() => tirar(ano, c.chave, x.id)} aria-label={`Tirar ${x.nome} do santinho`}
                className="col-start-3 row-start-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full text-suave hover:bg-preench-forte hover:text-texto sm:col-start-4">×</button>
            </div>
          ))}
          {buscando
            ? <Escolher ano={ano} cargo={c.chave} uf={s.uf} ja={ja} fechar={() => setBuscando(false)} />
            : escolhas.length < c.vagas && (
              <button type="button" onClick={() => setBuscando(true)} className={`${BOTAO} justify-self-start`}>
                + {escolhas.length ? "Escolher o segundo voto" : "Escolher em quem votei"}
              </button>
            )}
        </>
      )}
    </div>
  );
}

/** O que aconteceu com quem a pessoa votou: votos recentes no Plenário, projetos deles na pauta e notícias das agências oficiais. */
function OQueAconteceu({ escolhas }: { escolhas: Escolha[] }) {
  const politicos = escolhas.filter((x) => x.tipo === "politico");
  const ids = politicos.map((x) => x.id).join(",");
  const [resumos, setResumos] = useState<Record<string, ResumoAcompanhar | "erro">>({});
  const [pauta, setPauta] = useState<ItemPautaAutores[] | null>(null);
  const [noticias, setNoticias] = useState<Record<string, Noticia[]>>({});
  const [limVotos, setLimVotos] = useState(6);
  const [limNoticias, setLimNoticias] = useState(6);
  useEffect(() => {
    for (const x of politicos) {
      if (resumos[x.id]) continue;
      fetch(`/dados/acompanhar/${x.id}`).then(async (r) => {
        const v = r.ok ? await r.json() as ResumoAcompanhar : "erro" as const;
        setResumos((a) => ({ ...a, [x.id]: v }));
      }).catch(() => setResumos((a) => ({ ...a, [x.id]: "erro" })));
    }
    for (const x of politicos) {
      if (noticias[x.id]) continue;
      fetch(`/dados/noticias/${x.id}`).then(async (r) => {
        const v = r.ok ? await r.json() as Noticia[] : [];
        setNoticias((a) => ({ ...a, [x.id]: v }));
      }).catch(() => setNoticias((a) => ({ ...a, [x.id]: [] })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);
  useEffect(() => { fetch("/dados/pauta").then(async (r) => setPauta(r.ok ? await r.json() as ItemPautaAutores[] : [])).catch(() => setPauta([])); }, []);

  const nomes = new Map(politicos.map((x) => [x.id, x.nome]));
  const votos = politicos.flatMap((x) => { const r = resumos[x.id]; return r && r !== "erro" ? r.eventos.filter((e) => e.tipo === "voto").map((e) => ({ ...e, quem: x.nome })) : []; })
    .sort((a, b) => b.data.localeCompare(a.data) || a.quem.localeCompare(b.quem, "pt-BR"));
  const pautados = (pauta ?? []).flatMap((x) => { const deles = x.autores.filter((a) => nomes.has(a)); return deles.length ? [{ ...x, deles }] : []; });
  const carregandoVotos = politicos.some((x) => !resumos[x.id]);
  // A mesma matéria pode citar duas pessoas do santinho: uma linha só, com os dois nomes.
  const materias = [...new Map(politicos.flatMap((x) => noticias[x.id] ?? []).map((n) => [n.id, n])).values()]
    .sort((a, b) => b.data.localeCompare(a.data));
  const carregandoNoticias = politicos.some((x) => !noticias[x.id]);

  if (!politicos.length) return null;
  return (
    <section className={`${CARD} grid gap-5`} aria-labelledby="qv-novo">
      <h2 id="qv-novo" className={TITULO_SECAO}>O que aconteceu</h2>

      <div className="grid gap-2.5">
        <h3 className="text-[15px] font-semibold">Votos no Plenário</h3>
        {carregandoVotos ? <p className="text-sm text-suave">Carregando…</p> : votos.length === 0 ? (
          <p className="text-[15px] text-suave">Nenhum voto de quem você votou nas votações nominais recentes. Quem foi eleito pela primeira vez em 2026 começa a votar em fevereiro de 2027.</p>
        ) : (
          <>
            <ul className="grid">
              {votos.slice(0, limVotos).map((v) => (
                <li key={`${v.quem}-${v.chave}`} className="grid gap-1 border-t border-borda py-2.5 first:border-t-0 first:pt-0">
                  <span className="text-xs text-suave">{ddmm(v.data)} · {v.quem} · {v.voto ? VOTO[v.voto] : "Votou"}{v.orientacao ? ` · ${v.orientacao}` : ""}</span>
                  <Link href={v.href} className="line-clamp-2 text-[15px] leading-snug text-texto no-underline hover:underline">{v.titulo}</Link>
                  {v.materia && <span className="text-xs text-suave">{v.materia}</span>}
                </li>
              ))}
            </ul>
            {votos.length > limVotos && <button type="button" onClick={() => setLimVotos((l) => l + 10)} className={`${BOTAO} justify-self-center`}>Ver mais ({votos.length - limVotos})</button>}
          </>
        )}
      </div>

      <div className="grid gap-2.5">
        <h3 className="text-[15px] font-semibold">Projetos na pauta do Plenário</h3>
        {!pauta ? <p className="text-sm text-suave">Carregando…</p> : pautados.length === 0 ? (
          <p className="text-[15px] text-suave">Nenhum projeto de autoria de quem você votou está na pauta marcada agora. A pauta sai poucos dias antes de cada sessão.</p>
        ) : (
          <ul className="grid">
            {pautados.map((x) => (
              <li key={x.id} className="grid gap-1 border-t border-borda py-2.5 first:border-t-0 first:pt-0">
                <span className="text-xs text-suave">{x.casa === "senado" ? "Senado" : "Câmara"} · {ddmm(x.data)}{x.hora ? ` · ${x.hora.replace(":00", "h").replace(":", "h")}` : ""} · autoria de {x.deles.map((a) => nomes.get(a)).join(", ")}</span>
                <a href={x.urlOficial} {...externo} className="line-clamp-2 text-[15px] leading-snug text-texto no-underline hover:underline">{(x.relacionada ? x.ementaRelacionada ?? x.ementa : x.ementa) ?? x.materia}</a>
                <span className="text-xs text-suave">{x.materia}{tipoPorExtenso(x.materia) ? ` · ${tipoPorExtenso(x.materia)}` : ""}{x.apreciacao ? ` · ${x.apreciacao}` : ""}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="grid gap-2.5">
        <h3 className="text-[15px] font-semibold">Notícias das agências da Câmara e do Senado</h3>
        {carregandoNoticias ? <p className="text-sm text-suave">Carregando…</p> : materias.length === 0 ? (
          <p className="text-[15px] text-suave">Nenhuma matéria recente da Agência Câmara ou da Agência Senado cita quem você votou.</p>
        ) : (
          <>
            <ul className="grid">
              {materias.slice(0, limNoticias).map((n) => (
                <li key={n.id} className="grid gap-1 border-t border-borda py-2.5 first:border-t-0 first:pt-0">
                  <span className="text-xs text-suave">{NOME_FONTE[n.fonte]} · {diaBr(n.data)} · cita {n.politicos.filter((p) => nomes.has(p)).map((p) => nomes.get(p)).join(", ")}</span>
                  <a href={n.url} {...externo} className="line-clamp-2 text-[15px] leading-snug text-texto no-underline hover:underline">{n.titulo} <span className="text-suave">↗</span></a>
                </li>
              ))}
            </ul>
            {materias.length > limNoticias && <button type="button" onClick={() => setLimNoticias((l) => l + 10)} className={`${BOTAO} justify-self-center`}>Ver mais ({materias.length - limNoticias})</button>}
          </>
        )}
      </div>

      <p className="text-xs text-suave">Votos e pauta das fontes oficiais da Câmara e do Senado; notícias só das agências oficiais das duas Casas (sem jornais nem resumos). Tudo na coleta diária.</p>
    </section>
  );
}

/**
 * Aba "Quem votei" (pedido de 2026-11-19): o santinho de quem a pessoa votou, por eleição (por enquanto
 * só a de 2026) e na ordem da urna; quem foi eleito entra no Monitorando. Embaixo, o que aconteceu com
 * eles: votos no Plenário e projetos na pauta. Tudo só neste navegador.
 */
export function QuemVotei() {
  const [ano, setAno] = useState<AnoEleicao>(ELEICOES[0].ano);
  const s = useSantinho(ano);
  const todas = CARGOS.flatMap((c) => s.escolhas[c.chave] ?? []);
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <SelectChip valor={String(ano)} padrao={String(ELEICOES[0].ano)} rotulo="Eleição" onChange={(v) => setAno(Number(v) as AnoEleicao)}
          opcoes={ELEICOES.map((e) => ({ valor: String(e.ano), texto: e.rotulo }))} />
        <SelectChip valor={s.uf ?? "todos"} padrao="todos" rotulo="Onde você votou" onChange={(v) => definirUf(ano, v === "todos" ? null : v)}
          opcoes={[{ valor: "todos", texto: "Onde você votou?" }, ...ufsOrdenadas.map((u) => ({ valor: u, texto: NOME_UF[u]! }))]} />
      </div>

      <section className={`${CARD} grid gap-3`} aria-labelledby="qv-santinho">
        <div>
          <h2 id="qv-santinho" className={TITULO_SECAO}>Meu santinho</h2>
          <p className="mt-1 text-[13px] text-suave">Na ordem da urna de 2026. Quem foi eleito entra no Monitorando automaticamente. Fica só neste aparelho.</p>
        </div>
        {CARGOS.map((c) => <Cargo key={c.chave} ano={ano} c={c} s={s} />)}
      </section>

      <OQueAconteceu escolhas={todas} />
    </div>
  );
}
