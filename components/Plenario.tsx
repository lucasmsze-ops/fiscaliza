"use client";

import Link from "next/link";
import { useState } from "react";
import { cadeirasHemiciclo, corPartido as cor, type CasaHoje } from "@/lib/congresso";
import { NOME_UF } from "@/lib/regioes";
import { CHIP, CHIP_ON } from "@/lib/estilo";
import { SelectChip } from "./SelectChip";

const chipOff = CHIP;
const chipOn = CHIP_ON;

/**
 * Plenário em bolinhas (tela Congresso do protótipo): cada cadeira na cor do partido de quem a ocupa,
 * bancadas em fatias pela ordem do tamanho. Passar o mouse num partido o destaca; tocar numa cadeira
 * ou num partido abre a bancada. O desenho é decorativo para leitor de tela: as pílulas de partido
 * (nome e cadeiras) e a lista da bancada são o conteúdo, e a cor nunca é a única pista.
 */
export function Plenario({ casas, camara2027, cores }: { casas: CasaHoje[]; camara2027: CasaHoje; cores: string[] }) {
  const [casaSel, setCasaSel] = useState<"camara" | "senado">("camara");
  const [quando, setQuando] = useState<"hoje" | "fev">("hoje");
  const [uf, setUf] = useState("todos");
  const [hover, setHover] = useState("");
  const [partido, setPartido] = useState("");

  const casa = casaSel === "camara" && quando === "fev" ? camara2027 : casas.find((c) => c.casa === casaSel)!;
  const naCasa = casaSel === "senado" ? "no Senado" : "na Câmara";
  const fileiras = casa.total > 200 ? 12 : 5;
  // Vão do meio em 47% do raio (era 40%): no celular, o número de cadeiras cabe sem encostar na fileira de dentro.
  const VAO = 0.47;
  const pts = cadeirasHemiciclo(casa.total, fileiras, VAO);
  const raio = ((1 - VAO) / (fileiras - 1)) * 0.38;
  let i = 0;
  const cadeiras = casa.bancadas.flatMap((b) => b.membros.map((m) => ({ m, partido: b.partido, p: pts[i++]! })));
  const foco = hover || partido;
  const doPartido = (p: string) => casa.bancadas.find((b) => b.partido === p)?.membros.length ?? 0;
  const bancada = partido ? (casa.bancadas.find((b) => b.partido === partido)?.membros ?? []).filter((m) => uf === "todos" || m.uf === uf) : [];
  const trocar = (f: () => void) => { f(); setPartido(""); setHover(""); };

  return (
    <div className="grid gap-3.5">
      {/* Controle segmentado do iOS: a Casa escolhida fica no segmento cinza #636366. */}
      <div role="tablist" aria-label="Casa" className="grid w-full grid-cols-2 gap-0.5 rounded-[9px] bg-preench p-0.5 sm:w-80">
        {casas.map((c) => (
          <button key={c.casa} type="button" role="tab" aria-selected={casaSel === c.casa} onClick={() => trocar(() => { setCasaSel(c.casa); if (c.casa === "senado") setQuando("hoje"); })}
            className={`h-8 rounded-[7px] px-3 text-[13px] font-semibold ${casaSel === c.casa ? "bg-segmento text-texto shadow-[0_3px_8px_rgba(0,0,0,0.12),0_3px_1px_rgba(0,0,0,0.04)]" : "text-texto hover:bg-preench"}`}>
            {c.casa === "senado" ? "Senado" : "Câmara"} <span className="font-normal text-suave">· {c.total}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" aria-pressed={quando === "hoje"} onClick={() => trocar(() => setQuando("hoje"))} className={`${quando === "hoje" ? chipOn : chipOff} h-8 text-[13px]`}>Hoje</button>
        {casaSel === "camara" && (
          <button type="button" aria-pressed={quando === "fev"} onClick={() => trocar(() => setQuando("fev"))} className={`${quando === "fev" ? chipOn : chipOff} h-8 text-[13px]`}>A partir de fev/2027</button>
        )}
        <SelectChip valor={uf} padrao="todos" rotulo="Estado" onChange={setUf}
          opcoes={[{ valor: "todos", texto: "Todos os estados" }, ...Object.keys(NOME_UF).sort((x, y) => NOME_UF[x]!.localeCompare(NOME_UF[y]!, "pt-BR")).map((u) => ({ valor: u, texto: NOME_UF[u]! }))]} />
      </div>

      <div>
        <p className="min-h-[26px] text-center text-[15px] font-semibold" aria-live="polite">
          {hover ? `${hover} · ${doPartido(hover)} cadeiras · toque para ver a lista` : partido ? `Mostrando a bancada do ${partido}` : ""}
        </p>
        <figure className="relative mx-auto max-w-[780px]" onMouseLeave={() => setHover("")}>
          <svg viewBox="-1.06 -0.06 2.12 1.12" className="w-full" aria-hidden="true">
            {cadeiras.map(({ m, partido: p, p: pt }) => {
              const apagada = (foco && foco !== p) || (uf !== "todos" && m.uf !== uf);
              return (
                <circle key={m.id} cx={pt.x} cy={1 - pt.y} r={raio} fill={cor(p)} stroke="var(--card)" strokeWidth={raio * 0.18}
                  opacity={apagada ? 0.18 : 1} className="cursor-pointer transition-opacity"
                  onMouseEnter={() => setHover(p)} onClick={() => setPartido(p)}>
                  <title>{`${m.nomeUrna} · ${p} · ${m.uf}`}</title>
                </circle>
              );
            })}
          </svg>
          {/* No celular o vão do hemiciclo tem ~60 px de raio: número em 24 px para não encostar nas cadeiras. */}
          <figcaption className="absolute inset-x-0 bottom-1 text-center sm:bottom-2">
            <span className="block text-2xl leading-none font-semibold tabular-nums sm:text-[32px]">{foco ? doPartido(foco) : casa.total}</span>
            <span className="text-xs text-suave sm:text-[13px]">{foco ? `${foco} · cadeiras` : "cadeiras"}</span>
          </figcaption>
        </figure>
      </div>

      <div className="flex flex-wrap gap-1.5" aria-label={`Partidos ${naCasa}`}>
        {casa.bancadas.map((b) => (
          <button key={b.partido} type="button" aria-pressed={partido === b.partido} onClick={() => setPartido(partido === b.partido ? "" : b.partido)}
            onMouseEnter={() => setHover(b.partido)} onMouseLeave={() => setHover("")}
            className={`inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-semibold hover:bg-preench-forte ${partido === b.partido ? "bg-preench-forte" : "border-borda"}`}>
            <span className="size-2.5 rounded-full" style={{ background: cor(b.partido) }} aria-hidden="true" />
            {b.partido} <span className="font-normal text-suave">{b.membros.length}</span>
          </button>
        ))}
      </div>

      {partido && (
        <div className="border-t border-borda pt-3.5">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2.5">
            <h3 className="text-base font-semibold">{partido} {naCasa} · {bancada.length} cadeiras{uf !== "todos" ? ` em ${uf}` : ""}</h3>
            <button type="button" onClick={() => setPartido("")} className={`${chipOff} h-8 text-[13px]`}>Ver todos os partidos</button>
          </div>
          <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]">
            {bancada.map((m) => (
              <Link key={m.id} href={`/p/${m.id}`} className="flex items-center gap-2 rounded-xl bg-preench p-2 text-texto no-underline hover:bg-preench-forte">
                {m.fotoUrl
                  // <img> de propósito: a foto vem direto da URL oficial, sem passar pela Vercel (CLAUDE.md).
                  ? <img src={m.fotoUrl} alt="" width={36} height={36} loading="lazy" className="size-9 shrink-0 rounded-full bg-preench object-cover object-top" />
                  : <span aria-hidden="true" className="size-9 shrink-0 rounded-full bg-preench" />}
                <span className="grid min-w-0"><strong className="truncate text-[13px]">{m.nomeUrna}</strong><span className="text-[11px] text-suave">{m.uf}</span></span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-suave tabular-nums">
        {casa.total} cadeiras, partidos em ordem de tamanho da bancada · {quando === "fev" ? "eleitos em 2026, com o partido registrado hoje" : "quem ocupa a cadeira hoje"}
      </p>
    </div>
  );
}
