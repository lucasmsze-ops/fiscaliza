"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { CAMPO_BUSCA } from "@/lib/estilo";
import { ANOS_FILTRO, GRUPOS_SITUACAO, hrefPropostas, NOME_TIPO_FILTRO, TIPOS_FILTRO, type FiltroPropostas } from "@/lib/propostas";
import { SelectChip } from "./SelectChip";

const TODOS = "";
const OPCOES = {
  casa: [{ valor: TODOS, texto: "Câmara e Senado" }, { valor: "camara", texto: "Câmara" }, { valor: "senado", texto: "Senado" }],
  tipo: [{ valor: TODOS, texto: "Todos os tipos" }, ...TIPOS_FILTRO.map((t) => ({ valor: t, texto: NOME_TIPO_FILTRO[t] }))],
  situacao: [{ valor: TODOS, texto: "Todas as situações" }, ...GRUPOS_SITUACAO],
  ano: [{ valor: TODOS, texto: "Todos os anos" }, ...ANOS_FILTRO.map((a) => ({ valor: String(a), texto: `Apresentadas em ${a}` }))],
};

/**
 * Busca e filtros da lista de propostas (E23g). O estado mora no endereço (`?q=&casa=&tipo=&situacao=&ano=`): o link
 * pode ser compartilhado e o voltar do navegador desfaz o filtro. A lista (o `children`, renderizada no servidor)
 * esmaece enquanto a próxima chega.
 */
export function FiltrosPropostas({ filtro, children }: { filtro: FiltroPropostas; children: React.ReactNode }) {
  const router = useRouter();
  const [carregando, iniciar] = useTransition();
  const [q, setQ] = useState(filtro.busca);
  const campo = useRef<HTMLInputElement>(null);
  const ir = (f: FiltroPropostas) => iniciar(() => router.push(hrefPropostas(f), { scroll: false }));

  // Voltar do navegador muda o filtro sem digitar: o campo acompanha (menos enquanto a pessoa digita nele).
  useEffect(() => { if (document.activeElement !== campo.current) setQ(filtro.busca); }, [filtro.busca]);
  // Busca enquanto digita, depois de uma pausa curta (cada busca é uma consulta ao banco).
  useEffect(() => {
    if (q.trim() === filtro.busca) return;
    const t = setTimeout(() => ir({ ...filtro, busca: q.trim() }), 450);
    return () => clearTimeout(t);
  }, [q]); // só o texto dispara: o filtro de agora vai junto quando a pausa termina

  const algum = filtro.busca || filtro.casa || filtro.tipo || filtro.situacao || filtro.ano;
  return (
    <>
      <form role="search" onSubmit={(e) => { e.preventDefault(); ir({ ...filtro, busca: q.trim() }); campo.current?.blur(); }} className="relative">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(235,235,245,0.6)" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true" className="pointer-events-none absolute top-[15px] left-4"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input ref={campo} type="search" value={q} onChange={(e) => setQ(e.target.value)} maxLength={80} enterKeyHint="search"
          placeholder="Palavra ou número (PL 1234/2025)" aria-label="Buscar proposta" className={CAMPO_BUSCA} />
      </form>
      <div className="-mx-1 flex flex-wrap gap-2 px-1">
        <SelectChip rotulo="Casa" valor={filtro.casa ?? TODOS} padrao={TODOS} opcoes={OPCOES.casa} onChange={(v) => ir({ ...filtro, casa: (v || null) as FiltroPropostas["casa"] })} />
        <SelectChip rotulo="Tipo" valor={filtro.tipo ?? TODOS} padrao={TODOS} opcoes={OPCOES.tipo} onChange={(v) => ir({ ...filtro, tipo: (v || null) as FiltroPropostas["tipo"] })} />
        <SelectChip rotulo="Situação" valor={filtro.situacao ?? TODOS} padrao={TODOS} opcoes={OPCOES.situacao} onChange={(v) => ir({ ...filtro, situacao: (v || null) as FiltroPropostas["situacao"] })} />
        <SelectChip rotulo="Ano" valor={filtro.ano ? String(filtro.ano) : TODOS} padrao={TODOS} opcoes={OPCOES.ano} onChange={(v) => ir({ ...filtro, ano: v ? Number(v) : null })} />
        {algum && (
          <button type="button" onClick={() => { setQ(""); ir({ casa: null, tipo: null, situacao: null, ano: null, busca: "" }); }}
            className="inline-flex h-9 items-center px-2 text-sm font-semibold text-link">Limpar</button>
        )}
      </div>
      <div aria-busy={carregando} className={`grid gap-4 transition-opacity ${carregando ? "opacity-50" : ""}`}>{children}</div>
    </>
  );
}
