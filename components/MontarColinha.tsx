"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CidadeJson } from "@/app/dados/cidade/[ibge]/route";
import type { MunicipioJson } from "@/app/dados/municipios/route";
import type { CardResumo, ItemBusca } from "@/lib/card";
import { alternar, caminhoColinha, CHAVE_STORAGE, COLINHA_VAZIA, idsDaColinha, lerColinha, MAX_SENADORES, type Colinha } from "@/lib/colinha";
import { hrefSecao } from "@/lib/glossario";
import { normalizar } from "@/lib/texto";
import { PoliticoCardCompacto } from "./PoliticoCard";

export interface MunicipioBusca { ibge: number; nome: string; uf: string }

const inteiro = (n: number) => n.toLocaleString("pt-BR");
const CHAVE_CIDADE = "fiscaliza.cidade.v1";

function lerStorage(chave: string): string | null {
  try { return localStorage.getItem(chave); } catch { return null; }
}
function gravarStorage(chave: string, valor: string) {
  try { localStorage.setItem(chave, valor); } catch { /* modo privado: a colinha continua na URL */ }
}

type Cargo2026 = "deputado_federal" | "senador";

/** Top-20 de um cargo na cidade. Componente de módulo (não recriado a cada render: mantém DOM, foco e fotos). */
function ListaCidade({ cargo, linhas, cidade, pessoas, marcado, marcar }: {
  cargo: Cargo2026; linhas: [string, number, number][]; cidade: string; pessoas: Record<string, CardResumo>;
  marcado: (id: string) => boolean; marcar: (cargo: Cargo2026, id: string) => void;
}) {
  return (
    <ul className="mt-3 grid gap-2">
      {linhas.map(([id, votos, posicao]) => {
        const p = pessoas[id];
        if (!p) return null;
        const sel = marcado(id);
        return (
          <li key={id}>
            <button type="button" aria-pressed={sel} onClick={() => marcar(cargo, id)}
              className={`w-full rounded-2xl border p-3 transition ${sel ? "border-[var(--texto)] ring-2 ring-[var(--texto)]" : "border-black/10 dark:border-white/15"}`}>
              <PoliticoCardCompacto r={p} contexto={`${posicao}º em ${cidade} · ${inteiro(votos)} votos${sel ? " · ✓ na sua colinha" : ""}`} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Entrada do site: cidade ou nome → marcar em quem votou → colinha. Tudo no navegador; os dados
 * vêm de JSON estático (/dados/politicos e /dados/cidade/[ibge]) servido pela CDN.
 */
export function MontarColinha() {
  const [termo, setTermo] = useState("");
  const [municipios, setMunicipios] = useState<MunicipioBusca[]>([]);
  const pedidoMunicipios = useRef<Promise<void> | null>(null);
  /** Lista das cidades (~45 KB comprimida): baixada na primeira vez que a pessoa toca na busca. */
  function carregarMunicipios() {
    pedidoMunicipios.current ??= fetch("/dados/municipios").then(async (r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setMunicipios((await r.json() as MunicipioJson[]).map(([ibge, nome, uf]) => ({ ibge, nome, uf })));
    }).catch(() => { pedidoMunicipios.current = null; setErro("Não foi possível carregar a lista de cidades."); });
    return pedidoMunicipios.current;
  }
  const [indice, setIndice] = useState<Map<string, ItemBusca> | null>(null);
  const [cidade, setCidade] = useState<CidadeJson | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [colinha, setColinha] = useState<Colinha>(COLINHA_VAZIA);

  // Restaura a colinha e a última cidade deste navegador.
  useEffect(() => {
    setColinha(lerColinha(lerStorage(CHAVE_STORAGE)));
    const ultima = Number(lerStorage(CHAVE_CIDADE));
    if (ultima) void escolherCidade(ultima);
  }, []);

  async function carregarIndice(): Promise<Map<string, ItemBusca>> {
    if (indice) return indice;
    const r = await fetch("/dados/politicos");
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const m = new Map((await r.json() as ItemBusca[]).map((p) => [p.id, p]));
    setIndice(m);
    return m;
  }

  async function escolherCidade(ibge: number) {
    setCarregando(true); setErro(null);
    try {
      const r = await fetch(`/dados/cidade/${ibge}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setCidade(await r.json() as CidadeJson);
      setTermo("");
      gravarStorage(CHAVE_CIDADE, String(ibge));
    } catch {
      setErro("Não foi possível carregar a cidade. Tente de novo.");
    } finally {
      setCarregando(false);
    }
  }

  const campo = useRef<HTMLInputElement>(null);
  function irParaBusca() {
    campo.current?.scrollIntoView({ block: "center" });
    campo.current?.focus();
  }

  function marcar(cargo: Cargo2026, id: string) {
    const nova = alternar(colinha, cargo, id);
    setColinha(nova);
    gravarStorage(CHAVE_STORAGE, JSON.stringify(nova));
  }

  const t = normalizar(termo);
  const cidadesAchadas = useMemo(() => (t.length < 2 ? [] : municipios.filter((m) => normalizar(m.nome).includes(t))
    .sort((a, b) => Number(!normalizar(a.nome).startsWith(t)) - Number(!normalizar(b.nome).startsWith(t)) || a.nome.localeCompare(b.nome, "pt-BR"))
    .slice(0, 6)), [t, municipios]);
  // Cada palavra digitada precisa começar alguma palavra do nome (ou o número de urna), em qualquer
  // ordem: "joao silva" acha "JOÃO DA SILVA". O índice vem dos mais votados para os menos; quem casa
  // pelo nome de urna (o que aparece na urna) vem antes de quem casa só pelo nome civil.
  const pessoasAchadas = useMemo(() => {
    if (t.length < 3 || !indice) return [];
    const termos = t.split(" ");
    const casa = (texto: string) => { const ps = texto.split(" "); return termos.every((q) => ps.some((w) => w.startsWith(q))); };
    return [...indice.values()]
      .filter((p) => casa(p.busca))
      .sort((a, b) => Number(!casa(normalizar(a.nomeUrna))) - Number(!casa(normalizar(b.nomeUrna))))
      .slice(0, 6);
  }, [t, indice]);

  const caminho = caminhoColinha(colinha);
  const escolhidos = idsDaColinha(colinha).map((id) => cidade?.pessoas[id]?.nomeUrna ?? indice?.get(id)?.nomeUrna ?? id);
  const marcado = (id: string) => colinha.deputado === id || colinha.senadores.includes(id);

  return (
    <div className="pb-28">
      <label htmlFor="busca" className="block text-sm font-medium">Sua cidade ou o nome de quem recebeu seu voto</label>
      <input id="busca" ref={campo} type="search" inputMode="search" autoComplete="off" value={termo}
        onFocus={() => void carregarMunicipios()}
        onChange={(e) => { setTermo(e.target.value); void carregarMunicipios(); if (e.target.value.length >= 3) void carregarIndice().catch(() => setErro("Não foi possível carregar a busca.")); }}
        className="mt-2 w-full rounded-xl border border-black/20 bg-transparent px-4 py-3 text-base dark:border-white/25" />

      {(cidadesAchadas.length > 0 || pessoasAchadas.length > 0) && (
        <div className="mt-2 rounded-xl border border-black/10 p-2 dark:border-white/15">
          {cidadesAchadas.map((m) => (
            <button key={m.ibge} type="button" onClick={() => void escolherCidade(m.ibge)} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-black/5 dark:hover:bg-white/10">
              {m.nome} <span className="text-xs text-[var(--suave)]">· cidade · {m.uf}</span>
            </button>
          ))}
          {pessoasAchadas.map((p) => (
            <button key={p.id} type="button" aria-pressed={marcado(p.id)} onClick={() => { marcar(p.cargoChave, p.id); setTermo(""); }}
              className="block w-full rounded-lg px-3 py-2 text-left hover:bg-black/5 dark:hover:bg-white/10">
              {p.nomeUrna} <span className="text-xs text-[var(--suave)]">· {p.cargo} · {p.partidoUf}{marcado(p.id) ? " · ✓" : ""}</span>
            </button>
          ))}
        </div>
      )}

      {erro && <p className="mt-3 text-sm" role="alert">{erro}</p>}
      {carregando && <p className="mt-3 text-sm text-[var(--suave)]">Carregando…</p>}

      {cidade && !carregando && (
        <section className="mt-8" aria-labelledby="titulo-cidade">
          <h2 id="titulo-cidade" className="text-xl font-semibold">Mais votados em {cidade.nome}</h2>
          <p className="mt-1 text-sm text-[var(--suave)]">Toque em quem recebeu seu voto em 2026. <Link href={hrefSecao("cidade")} className="underline underline-offset-2">Fonte: TSE</Link>.</p>

          <h3 className="mt-6 font-semibold">Deputado federal <span className="text-sm font-normal text-[var(--suave)]">· escolha 1</span></h3>
          <ListaCidade cargo="deputado_federal" linhas={cidade.deputado_federal} cidade={cidade.nome} pessoas={cidade.pessoas} marcado={marcado} marcar={marcar} />
          <p className="mt-3 text-sm text-[var(--suave)]">
            Não está na lista?{" "}
            <button type="button" onClick={irParaBusca} className="underline underline-offset-2">Busque pelo nome ou pelo número de urna</button>.
          </p>

          <h3 className="mt-8 font-semibold">Senado <span className="text-sm font-normal text-[var(--suave)]">· escolha até {MAX_SENADORES}</span></h3>
          <ListaCidade cargo="senador" linhas={cidade.senador} cidade={cidade.nome} pessoas={cidade.pessoas} marcado={marcado} marcar={marcar} />
        </section>
      )}

      {caminho && (
        <div className="barra-fixa fixed inset-x-0 bottom-0 border-t border-black/10 bg-[var(--fundo)] px-4 py-3 dark:border-white/15">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
            <p className="min-w-0 truncate text-sm"><span className="text-[var(--suave)]">Sua colinha:</span> {escolhidos.join(", ")}</p>
            <Link href={caminho} className="shrink-0 rounded-full bg-[var(--texto)] px-5 py-2 text-sm font-semibold text-[var(--fundo)]">Ver colinha</Link>
          </div>
        </div>
      )}
    </div>
  );
}
