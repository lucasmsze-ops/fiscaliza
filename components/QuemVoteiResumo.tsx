"use client";

import Link from "next/link";
import { useState } from "react";
import { CARGOS, ELEICOES } from "@/lib/quem-votei";
import { useSantinho } from "@/lib/quem-votei-estado";
import { NOME_UF } from "@/lib/regioes";
import { BOTAO_PRINCIPAL } from "@/lib/estilo";

const ELEICAO = ELEICOES[0];
/** Dígitos do número de urna de cada cargo (as casinhas do santinho). */
const DIGITOS: Record<string, number> = { deputado_federal: 4, deputado_estadual: 5, senador: 3, governador: 2, presidente: 2 };
/** As mesmas linhas do santinho do Monitorando: do cargo mais alto ao mais baixo, o Senado em dois votos, só o que o site acompanha. */
const ORDEM = ["presidente", "governador", "senador", "deputado_federal"] as const;
const VAGAS = ORDEM.flatMap((k) => { const c = CARGOS.find((x) => x.chave === k)!; return Array.from({ length: c.vagas }, (_, i) => ({ c, i })); });

/**
 * "Quem votei?" no Início (protótipo Liquid Glass, 2026-11-20): quantos cargos a pessoa já preencheu no
 * santinho deste aparelho e o atalho para preencher. O santinho mesmo fica no Monitorando.
 */
export function QuemVoteiResumo() {
  const s = useSantinho(ELEICAO.ano);
  const [aberto, setAberto] = useState(false);
  const feitos = VAGAS.filter(({ c, i }) => (s.escolhas[c.chave]?.length ?? 0) > i).length;
  return (
    <section aria-labelledby="ini-santinho" className="vidro-forte overflow-hidden rounded-card">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <div className="grid min-w-0 flex-1 gap-[3px]">
          <span className="text-[11px] font-bold tracking-[1.6px] text-suave uppercase">Eleição {ELEICAO.ano}{s.uf && NOME_UF[s.uf] ? ` · ${NOME_UF[s.uf]}` : ""}</span>
          <h2 id="ini-santinho" className="text-[22px] leading-[26px] font-extrabold tracking-[-0.4px]">Quem votei?</h2>
          <span className="text-[13px] text-suave">{feitos} de {VAGAS.length} escolhidos · fica só neste aparelho</span>
        </div>
        <button type="button" aria-expanded={aberto} aria-controls="ini-santinho-lista" onClick={() => setAberto(!aberto)}
          className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full border border-white/16 bg-white/8 px-3 text-[13px] font-semibold text-texto hover:bg-preench-forte">
          {aberto ? "Fechar" : "Ver cargos"}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={aberto ? "rotate-180" : ""}><path d="m6 9 6 6 6-6" /></svg>
        </button>
      </div>
      {aberto && (
        <ul id="ini-santinho-lista" className="grid px-4 pb-1">
          {VAGAS.map(({ c, i }) => {
            const x = s.escolhas[c.chave]?.[i];
            const dig = x?.numero && x.numero.length === DIGITOS[c.chave] ? x.numero.split("") : null;
            const rotulo = c.chave === "senador" ? `Senador · ${i + 1}º voto` : c.rotulo;
            return (
              <li key={`${c.chave}-${i}`}>
                <Link href="/monitorando" className="flex min-h-[52px] items-center gap-3 border-t border-borda text-texto no-underline hover:text-texto">
                  <span className="grid min-w-0 flex-1">
                    <span className="text-[15px] font-semibold">{rotulo}</span>
                    {x && <span className="truncate text-[13px] text-suave">{x.nome}</span>}
                  </span>
                  <span aria-hidden="true" className="flex gap-1">
                    {Array.from({ length: DIGITOS[c.chave] ?? 2 }, (_, j) => (
                      <span key={j} className={`inline-flex h-[26px] w-5 items-center justify-center rounded-[7px] border text-[13px] font-bold tabular-nums ${dig ? "border-[rgba(140,196,255,0.6)] bg-[rgba(64,156,255,0.22)]" : "border-white/18 bg-white/6"}`}>{dig?.[j] ?? ""}</span>
                    ))}
                  </span>
                  <span className="text-[13px] font-semibold text-link">{x ? "Trocar ›" : "Escolher ›"}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <div className="px-4 pt-1 pb-4">
        <Link href="/monitorando" className={`${BOTAO_PRINCIPAL} w-full`}>Abrir Monitorando</Link>
      </div>
    </section>
  );
}
