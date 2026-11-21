"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ItemBusca } from "@/lib/card";
import { LINHAS, MAX_COMPARAR, type ColunaComparar } from "@/lib/comparar";
import { corPartido } from "@/lib/partidos";
import { normalizar } from "@/lib/texto";
import type { PessoaNoCargo } from "@/lib/visao";
import { CARD, TITULO_CARTAO, TITULO_PAGINA, TITULO_SECAO, CHIP } from "@/lib/estilo";

const chip = CHIP;
export interface Atalho { titulo: string; pessoas: { id: string; nomeUrna: string; fotoUrl: string | null }[] }

function Foto({ url, tamanho }: { url: string | null; tamanho: number }) {
  return url
    // <img> de propósito: a foto vem direto da URL oficial, sem passar pela Vercel (CLAUDE.md).
    ? <img src={url} alt="" width={tamanho} height={tamanho} loading="lazy" className="shrink-0 rounded-full bg-preench object-cover object-top" style={{ width: tamanho, height: tamanho }} />
    : <span aria-hidden="true" className="shrink-0 rounded-full bg-preench" style={{ width: tamanho, height: tamanho }} />;
}

/**
 * Comparar lado a lado (protótipo `Comparar`, E23f): de 2 a 5 pessoas, só com as linhas que têm
 * fonte. A seleção fica na URL (?ids=a,b), para compartilhar; nada vai para o servidor além do pedido
 * dos dados públicos de cada pessoa (/dados/comparar/[id], CDN).
 */
export function Comparar({ atalhos, pessoas }: { atalhos: Atalho[]; pessoas: PessoaNoCargo[] }) {
  const [ids, setIds] = useState<string[]>([]);
  const [colunas, setColunas] = useState<Record<string, ColunaComparar | "erro">>({});
  const [q, setQ] = useState("");
  const [indice, setIndice] = useState<ItemBusca[] | null>(null);
  const pedido = useRef<Promise<void> | null>(null);

  // Começa pela URL (link compartilhado ou "Comparar com outro político" no crachá).
  useEffect(() => {
    const da = new URLSearchParams(window.location.search).get("ids");
    if (da) setIds([...new Set(da.split(",").filter((x) => /^[a-z0-9-]{1,120}$/.test(x)))].slice(0, MAX_COMPARAR));
  }, []);

  function trocar(novos: string[]) {
    setIds(novos);
    const url = new URL(window.location.href);
    if (novos.length) url.searchParams.set("ids", novos.join(",")); else url.searchParams.delete("ids");
    window.history.replaceState(null, "", url);
  }
  const adicionar = (id: string) => { if (!ids.includes(id) && ids.length < MAX_COMPARAR) trocar([...ids, id]); setQ(""); };

  useEffect(() => {
    for (const id of ids) {
      if (colunas[id]) continue;
      fetch(`/dados/comparar/${id}`).then(async (r) => {
        const c: ColunaComparar | "erro" = r.ok ? await r.json() as ColunaComparar : "erro";
        setColunas((x) => ({ ...x, [id]: c }));
      }).catch(() => setColunas((x) => ({ ...x, [id]: "erro" })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(",")]);

  const carregar = () => { pedido.current ??= fetch("/dados/politicos").then(async (r) => { if (r.ok) setIndice(await r.json() as ItemBusca[]); }).catch(() => { pedido.current = null; }); };
  const t = normalizar(q);
  const sugestoes = useMemo(() => {
    if (t.length < 3 || !indice || ids.length >= MAX_COMPARAR) return [];
    const termos = t.split(" ");
    return indice.filter((p) => !ids.includes(p.id) && termos.every((x) => p.busca.split(" ").some((w) => w.startsWith(x)))).slice(0, 6);
  }, [t, indice, ids]);

  const prontas = ids.map((id) => colunas[id]);
  // Com uma pessoa só: sugestões da mesma Casa e do mesmo estado, entre quem está no cargo hoje.
  const primeira = pessoas.find((p) => p.id === ids[0]);
  const mesmas = ids.length === 1 && primeira ? pessoas.filter((p) => p.id !== primeira.id && p.casa === primeira.casa && p.uf === primeira.uf).slice(0, 8) : [];

  return (
    <main className="grid gap-6 pb-4 lg:pb-8">
      <div>
        <h1 className={`mb-1.5 ${TITULO_PAGINA}`}>Comparar lado a lado</h1>
        <p className="max-w-[620px] text-[15px] text-suave">De 2 a 5 pessoas, com o que as fontes oficiais publicam e os mesmos números do crachá. Sem nota nem ranking. “—” é dado que não existe para aquela pessoa, nunca zero, e vem com o porquê.</p>
      </div>

      <div className="relative">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="absolute top-4 left-4 text-suave"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
        <label htmlFor="cq" className="sr-only">Nome de quem você quer comparar</label>
        <input id="cq" type="search" autoComplete="off" value={q} disabled={ids.length >= MAX_COMPARAR} onFocus={carregar} onChange={(x) => { setQ(x.target.value); carregar(); }}
          placeholder={ids.length >= MAX_COMPARAR ? "Limite de 5 pessoas" : "Digite um nome para comparar"}
          className="h-11 w-full rounded-xl bg-card pr-4 pl-11 text-base text-texto outline-none placeholder:text-suave focus:ring-2 focus:ring-destaque/40 disabled:opacity-60" />
        {sugestoes.length > 0 && (
          <div className="absolute inset-x-0 top-14 z-10 overflow-hidden rounded-[22px] vidro-forte bg-[rgba(44,45,52,0.94)]">
            {sugestoes.map((p) => (
              <button key={p.id} type="button" onClick={() => adicionar(p.id)} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm hover:bg-preench-forte">
                <Foto url={p.fotoUrl} tamanho={34} />
                <span><strong>{p.nomeUrna}</strong> <span className="text-xs text-suave">{p.cargo} · {p.partidoUf} · {p.status}</span></span>
              </button>
            ))}
          </div>
        )}
      </div>

      {ids.length === 0 && (
        <div className="grid gap-2.5">
          <strong className="text-sm">Ou comece por um destes:</strong>
          <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fill,minmax(230px,1fr))]">
            {atalhos.map((a) => (
              <button key={a.titulo} type="button" onClick={() => trocar(a.pessoas.map((p) => p.id))}
                className="grid gap-2 rounded-card vidro p-4 text-left hover:bg-preench-forte">
                <span className="flex items-center">
                  {a.pessoas.map((p, i) => <span key={p.id} className={`rounded-full ring-2 ring-card ${i ? "-ml-2.5" : ""}`}><Foto url={p.fotoUrl} tamanho={40} /></span>)}
                  <span className="ml-2.5 text-xs font-semibold text-suave">Lado a lado</span>
                </span>
                <strong className="text-base">{a.titulo}</strong>
                <span className="text-xs text-suave">{a.pessoas.map((p) => p.nomeUrna).join(" · ")}</span>
                <span className="text-[13px] font-semibold text-link">Comparar ›</span>
              </button>
            ))}
          </div>
          <p className="text-[13px] text-suave">Não sabe o nome? <Link href="/mapa" className="underline underline-offset-2">Veja quem representa o seu estado</Link>.</p>
        </div>
      )}

      {ids.length === 1 && (
        <div className="grid gap-2.5 rounded-xl bg-destaque/15 p-3.5">
          <span className="text-sm">Adicione mais uma pessoa para comparar{prontas[0] && prontas[0] !== "erro" ? ` com ${prontas[0].nomeUrna}` : ""}: digite o nome acima{mesmas.length ? " ou escolha alguém do mesmo cargo e estado" : ""}.</span>
          {mesmas.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {mesmas.map((p) => (
                <button key={p.id} type="button" onClick={() => adicionar(p.id)} className={`${chip} gap-2`}>
                  <Foto url={p.fotoUrl} tamanho={24} />{p.nomeUrna} <span className="font-normal text-suave">{p.partido}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {ids.length > 0 && (
        <div className="grid gap-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <strong>{ids.length} de {MAX_COMPARAR} pessoas</strong>
            <button type="button" onClick={() => trocar([])} className={chip}>Limpar comparação</button>
          </div>
          <div className="overflow-x-auto rounded-card vidro">
            <table className="w-full border-collapse" style={{ minWidth: 170 + ids.length * 170 }}>
              <thead>
                <tr>
                  <th className="sticky left-0 z-[1] w-[170px] border-b border-borda bg-card px-3 py-3 text-left"><span className="sr-only">Linha</span></th>
                  {ids.map((id, i) => {
                    const c = prontas[i];
                    return (
                      <th key={id} scope="col" className="border-b border-borda px-3 py-3 text-left align-top font-normal">
                        {!c ? <span className="text-sm text-suave">Carregando…</span> : c === "erro" ? <span className="text-sm text-suave">Não deu para carregar.</span> : (
                          <span className="grid justify-items-start gap-1.5">
                            <Foto url={c.fotoUrl} tamanho={52} />
                            <Link href={`/p/${c.id}`} className="text-[15px] font-semibold text-texto">{c.nomeUrna}</Link>
                            <span className="inline-flex items-center gap-1 text-xs text-suave">{c.cargo} · <span aria-hidden="true" className="size-2 rounded-full" style={{ background: corPartido(c.partidoUf.slice(0, -3)) }} />{c.partidoUf}</span>
                          </span>
                        )}
                        <button type="button" onClick={() => trocar(ids.filter((x) => x !== id))} className="mt-1 min-h-7 text-xs text-suave hover:text-texto">Tirar ×</button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {LINHAS.map((l) => (
                  <tr key={l.k}>
                    <th scope="row" className="sticky left-0 z-[1] border-b border-borda bg-card px-3 py-3 text-left align-top text-[13px] font-normal text-suave">{l.rotulo}</th>
                    {ids.map((id, i) => {
                      const c = prontas[i];
                      const v = c && c !== "erro" ? c.linhas[l.k] : null;
                      return (
                        <td key={id} className="border-b border-borda px-3 py-3 align-top">
                          {v && <>
                            <span className="block text-xl leading-tight font-semibold tabular-nums">{v.valor ?? "—"}</span>
                            {v.nota && <span className="mt-0.5 block text-xs text-suave">{v.nota}</span>}
                          </>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-suave">
            Fontes: Câmara, Senado e TSE; os números são os do crachá de cada pessoa. Idade e patrimônio declarado ainda não são coletados.{" "}
            <Link href="/como-funciona" className="underline underline-offset-2">Como cada número é calculado</Link>.
          </p>
        </div>
      )}
    </main>
  );
}
