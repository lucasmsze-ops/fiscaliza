"use client";

import Link from "next/link";
import { useState } from "react";
import type { PlanoDeGoverno } from "@/lib/promessas";
import { CHIP, CHIP_ON } from "@/lib/estilo";
import { SelectChip } from "./SelectChip";

const chipOff = CHIP;
const chipOn = CHIP_ON;
const externo = { target: "_blank", rel: "noreferrer noopener" } as const;
const dataBr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/**
 * Checklist do plano de governo (decisão de 2026-11-14): cada promessa com o texto do plano e a página;
 * o status é só o ato oficial registrado, com link. Sem ato, "sem ato oficial ainda": não é julgamento.
 * Sem percentual e sem ordenar por "cumprida".
 */
export function ChecklistPlano({ plano, posse, nome, antesDaPosse }: { plano: PlanoDeGoverno; posse: string; nome: string; antesDaPosse: boolean }) {
  const [tipo, setTipo] = useState("todos");
  const [area, setArea] = useState("todas");
  const tipos = [...new Set(plano.promessas.map((p) => p.tipo))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const areas = [...new Set(plano.promessas.map((p) => p.area))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const lista = plano.promessas.filter((p) => (tipo === "todos" || p.tipo === tipo) && (area === "todas" || p.area === area));
  const comAto = plano.promessas.filter((p) => p.atos.length > 0).length;

  return (
    <div className="grid gap-3.5">
      <p className="text-sm leading-relaxed text-suave">
        {plano.promessas.length} promessas do plano de governo que {nome} registrou no TSE, com o texto como está no documento e a página.
        Escolhemos as que têm uma entrega que um ato oficial pode mostrar (lei, decreto, programa criado, obra, meta com número).{" "}
        <strong className="text-texto">{comAto}</strong> com ato oficial registrado até agora
        {antesDaPosse && <> (o mandato começa em {dataBr(posse)})</>}.{" "}
        <Link href="/como-funciona#promessas" className="underline underline-offset-2">Como escolhemos e acompanhamos</Link>.
      </p>

      <div className="grid gap-2">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tipo de promessa">
          <button type="button" aria-pressed={tipo === "todos"} onClick={() => setTipo("todos")} className={tipo === "todos" ? chipOn : chipOff}>Todos os tipos</button>
          {tipos.map((t) => <button key={t} type="button" aria-pressed={tipo === t} onClick={() => setTipo(t)} className={tipo === t ? chipOn : chipOff}>{t}</button>)}
        </div>
        <SelectChip valor={area} padrao="todas" rotulo="Área" onChange={setArea}
          opcoes={[{ valor: "todas", texto: "Todas as áreas" }, ...areas.map((a) => ({ valor: a, texto: a }))]} />
      </div>

      <ol className="grid gap-2.5">
        {lista.map((p) => (
          <li key={p.id} className="grid gap-2 rounded-xl bg-preench p-3.5">
            <span className="flex flex-wrap items-center gap-1.5 text-xs text-suave">
              <span className="font-semibold text-texto">{p.area}</span>
              <span className="rounded-md bg-destaque/20 px-1.5 py-0.5 font-semibold text-texto">{p.tipo}</span>
              <span>· página {p.pagina}{p.paginaFim ? `–${p.paginaFim}` : ""} do plano</span>
            </span>
            <blockquote className="text-[15px] leading-relaxed">{p.texto}</blockquote>
            {p.atos.length === 0 ? (
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-borda pt-2 text-[13px]">
                <span className="rounded-md bg-card px-2 py-0.5 text-xs font-semibold text-suave">Sem ato oficial ainda</span>
                <span className="text-xs text-suave">O que marcaria: {p.marcaria}</span>
              </p>
            ) : (
              <ul className="grid gap-1.5 border-t border-borda pt-2">
                {p.atos.map((a) => (
                  <li key={a.url} className="text-[13px]">
                    <span className="text-xs text-suave tabular-nums">{dataBr(a.data)} · {a.fonte}</span>{" "}
                    <a href={a.url} {...externo} className="font-semibold underline underline-offset-2">{a.descricao} ↗</a>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
        {lista.length === 0 && <li className="text-sm text-suave">Nenhuma promessa com esses filtros.</li>}
      </ol>
    </div>
  );
}
