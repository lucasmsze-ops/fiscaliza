"use client";

import Link from "next/link";
import { useState } from "react";
import { cadeirasHemiciclo, corPartido as cor, type CasaHoje } from "@/lib/congresso";
import { NOME_UF } from "@/lib/regioes";

const chip = "h-9 rounded-xl border px-4 text-xs font-bold whitespace-nowrap";
const chipOff = `${chip} border-borda bg-card hover:border-destaque`;
const chipOn = `${chip} border-destaque bg-destaque text-destaque-texto`;

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
  const pts = cadeirasHemiciclo(casa.total, fileiras);
  const raio = ((1 - 0.4) / (fileiras - 1)) * 0.38;
  let i = 0;
  const cadeiras = casa.bancadas.flatMap((b) => b.membros.map((m) => ({ m, partido: b.partido, p: pts[i++]! })));
  const foco = hover || partido;
  const doPartido = (p: string) => casa.bancadas.find((b) => b.partido === p)?.membros.length ?? 0;
  const bancada = partido ? (casa.bancadas.find((b) => b.partido === partido)?.membros ?? []).filter((m) => uf === "todos" || m.uf === uf) : [];
  const trocar = (f: () => void) => { f(); setPartido(""); setHover(""); };

  return (
    <div className="grid gap-3.5">
      <div className="flex flex-wrap gap-2">
        {casas.map((c) => (
          <button key={c.casa} type="button" aria-pressed={casaSel === c.casa} onClick={() => trocar(() => { setCasaSel(c.casa); if (c.casa === "senado") setQuando("hoje"); })}
            className={casaSel === c.casa ? chipOn : chipOff}>{c.casa === "senado" ? "Senado" : "Câmara"} · {c.total}</button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" aria-pressed={quando === "hoje"} onClick={() => trocar(() => setQuando("hoje"))} className={`${quando === "hoje" ? chipOn : chipOff} h-8 text-[13px]`}>Hoje</button>
        {casaSel === "camara" && (
          <button type="button" aria-pressed={quando === "fev"} onClick={() => trocar(() => setQuando("fev"))} className={`${quando === "fev" ? chipOn : chipOff} h-8 text-[13px]`}>A partir de fev/2027</button>
        )}
        <select value={uf} onChange={(e) => setUf(e.target.value)} aria-label="Estado" className="h-8 rounded-full border border-borda bg-card px-2.5 text-[13px]">
          <option value="todos">Todos os estados</option>
          {Object.keys(NOME_UF).sort().map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>

      <div>
        <p className="min-h-[26px] text-center text-[15px] font-bold" aria-live="polite">
          {hover ? `${hover} · ${doPartido(hover)} cadeiras · toque para ver a lista` : partido ? `Mostrando a bancada do ${partido}` : ""}
        </p>
        <figure className="relative mx-auto max-w-[780px]" onMouseLeave={() => setHover("")}>
          <svg viewBox="-1.06 -0.06 2.12 1.12" className="w-full" aria-hidden="true">
            {cadeiras.map(({ m, partido: p, p: pt }) => {
              const apagada = (foco && foco !== p) || (uf !== "todos" && m.uf !== uf);
              return (
                <circle key={m.id} cx={pt.x} cy={1 - pt.y} r={raio} fill={cor(p, cores)} stroke="var(--card)" strokeWidth={raio * 0.18}
                  opacity={apagada ? 0.18 : 1} className="cursor-pointer transition-opacity"
                  onMouseEnter={() => setHover(p)} onClick={() => setPartido(p)}>
                  <title>{`${m.nomeUrna} · ${p} · ${m.uf}`}</title>
                </circle>
              );
            })}
          </svg>
          <figcaption className="absolute inset-x-0 bottom-2 text-center">
            <span className="block text-[32px] leading-none font-bold tabular-nums">{foco ? doPartido(foco) : casa.total}</span>
            <span className="text-[13px] text-suave">{foco ? `${foco} · cadeiras` : "cadeiras"}</span>
          </figcaption>
        </figure>
      </div>

      <div className="flex flex-wrap gap-1.5" aria-label={`Partidos ${naCasa}`}>
        {casa.bancadas.map((b) => (
          <button key={b.partido} type="button" aria-pressed={partido === b.partido} onClick={() => setPartido(partido === b.partido ? "" : b.partido)}
            onMouseEnter={() => setHover(b.partido)} onMouseLeave={() => setHover("")}
            className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[13px] font-bold hover:bg-fundo ${partido === b.partido ? "border-destaque bg-fundo" : "border-borda"}`}>
            <span className="size-2.5 rounded-full" style={{ background: cor(b.partido, cores) }} aria-hidden="true" />
            {b.partido} <span className="font-normal text-suave">{b.membros.length}</span>
          </button>
        ))}
      </div>

      {partido && (
        <div className="border-t border-borda pt-3.5">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2.5">
            <h3 className="text-base font-bold">{partido} {naCasa} · {bancada.length} cadeiras{uf !== "todos" ? ` em ${uf}` : ""}</h3>
            <button type="button" onClick={() => setPartido("")} className={`${chipOff} h-8 text-[13px]`}>Ver todos os partidos</button>
          </div>
          <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]">
            {bancada.map((m) => (
              <Link key={m.id} href={`/p/${m.id}`} className="flex items-center gap-2 rounded-xl border border-borda p-2 text-texto no-underline hover:border-destaque">
                {m.fotoUrl
                  // <img> de propósito: a foto vem direto da URL oficial, sem passar pela Vercel (CLAUDE.md).
                  ? <img src={m.fotoUrl} alt="" width={36} height={36} loading="lazy" className="size-9 shrink-0 rounded-full bg-fundo object-cover object-top" />
                  : <span aria-hidden="true" className="size-9 shrink-0 rounded-full bg-fundo" />}
                <span className="grid min-w-0"><strong className="truncate text-[13px]">{m.nomeUrna}</strong><span className="text-[11px] text-suave">{m.uf}</span></span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <p className="text-[11px] text-suave tabular-nums">
        {casa.total} cadeiras, partidos em ordem de tamanho da bancada · {quando === "fev" ? "eleitos em 2026, com o partido registrado hoje" : "quem ocupa a cadeira hoje"}
      </p>
    </div>
  );
}
