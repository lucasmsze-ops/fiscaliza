"use client";

import Link from "next/link";
import { useState } from "react";
import { cadeirasHemiciclo, type CasaHoje } from "@/lib/congresso";
import { corPartido as cor } from "@/lib/partidos";
import { ChipPartido } from "./ChipPartido";
import { Info } from "./Termo";
import { NOME_UF } from "@/lib/regioes";
import { CHIP, CHIP_ON, SEGMENTO, SEGMENTO_ON, SEGMENTOS } from "@/lib/estilo";
import { SelectChip } from "./SelectChip";

const chipOff = CHIP;
const chipOn = CHIP_ON;

/**
 * Plenário em bolinhas (tela Congresso do protótipo): cada cadeira na cor do partido de quem a ocupa,
 * bancadas em fatias pela ordem do tamanho. Passar o mouse num partido o destaca; tocar numa cadeira
 * ou num partido abre a bancada. O desenho é decorativo para leitor de tela: as pílulas de partido
 * (nome e cadeiras) e a lista da bancada são o conteúdo, e a cor nunca é a única pista.
 */
export function Plenario({ casas, camara2027 }: { casas: CasaHoje[]; camara2027: CasaHoje }) {
  const [casaSel, setCasaSel] = useState<"camara" | "senado">("camara");
  const [quando, setQuando] = useState<"hoje" | "fev">("hoje");
  const [uf, setUf] = useState("todos");
  const [hover, setHover] = useState("");
  // Abre com a maior bancada escolhida, como no protótipo (a lista embaixo do plenário nunca fica vazia).
  const [partido, setPartido] = useState(casas.find((c) => c.casa === "camara")?.bancadas[0]?.partido ?? "");

  const casa = casaSel === "camara" && quando === "fev" ? camara2027 : casas.find((c) => c.casa === casaSel)!;
  const naCasa = casaSel === "senado" ? "no Senado" : "na Câmara";
  const fileiras = casa.total > 200 ? 12 : 5;
  // Vão do meio em 47% do raio (era 40%): no celular, o número de cadeiras cabe sem encostar na fileira de dentro.
  const VAO = 0.47;
  const pts = cadeirasHemiciclo(casa.total, fileiras, VAO);
  const raio = ((1 - VAO) / (fileiras - 1)) * 0.38;
  let i = 0;
  const cadeiras = casa.bancadas.flatMap((b) => b.membros.map((m) => ({ m, partido: b.partido, p: pts[i++]! })));
  // Só o mouse destaca uma bancada no desenho; a escolhida aparece na pílula e na lista embaixo.
  const foco = hover;
  const doPartido = (p: string) => casa.bancadas.find((b) => b.partido === p)?.membros.length ?? 0;
  const bancada = partido ? (casa.bancadas.find((b) => b.partido === partido)?.membros ?? []).filter((m) => uf === "todos" || m.uf === uf) : [];
  const trocar = (f: () => void, proxima: CasaHoje) => { f(); setPartido(proxima.bancadas[0]?.partido ?? ""); setHover(""); };

  return (
    <div className="grid gap-[18px]">
      <div role="group" aria-label="Casa" className={`${SEGMENTOS} grid-cols-2`}>
        {casas.map((c) => (
          <button key={c.casa} type="button" aria-pressed={casaSel === c.casa} onClick={() => trocar(() => { setCasaSel(c.casa); if (c.casa === "senado") setQuando("hoje"); }, c.casa === "camara" && quando === "fev" ? camara2027 : c)}
            className={casaSel === c.casa ? SEGMENTO_ON : SEGMENTO}>
            {c.casa === "senado" ? "Senado" : "Câmara"} · {c.total}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" aria-pressed={quando === "hoje"} onClick={() => trocar(() => setQuando("hoje"), casas.find((c) => c.casa === casaSel)!)} className={quando === "hoje" ? chipOn : chipOff}>Hoje</button>
        {casaSel === "camara" && (
          <button type="button" aria-pressed={quando === "fev"} onClick={() => trocar(() => setQuando("fev"), camara2027)} className={quando === "fev" ? chipOn : chipOff}>A partir de fev/2027</button>
        )}
        <SelectChip valor={uf} padrao="todos" rotulo="Estado" onChange={setUf}
          opcoes={[{ valor: "todos", texto: "Todos os estados" }, ...Object.keys(NOME_UF).sort((x, y) => NOME_UF[x]!.localeCompare(NOME_UF[y]!, "pt-BR")).map((u) => ({ valor: u, texto: NOME_UF[u]! }))]} />
      </div>

      <section aria-label="Cadeiras por partido" className="vidro relative grid gap-3.5 rounded-[30px] px-3.5 py-[18px]">
        <div className="absolute top-3.5 right-3.5 z-10"><Info id="cadeiras" termo="cadeiras" rotulo="Como contamos as cadeiras" /></div>
        <p className="sr-only" aria-live="polite">{partido ? `Mostrando a bancada do ${partido}` : ""}</p>
        <figure className="relative mx-auto w-full max-w-[780px]" onMouseLeave={() => setHover("")}>
          <svg viewBox="-1.06 -0.06 2.12 1.12" className="block w-full" aria-hidden="true">
            {cadeiras.map(({ m, partido: p, p: pt }) => {
              const apagada = (foco && foco !== p) || (uf !== "todos" && m.uf !== uf);
              return (
                <circle key={m.id} cx={pt.x} cy={1 - pt.y} r={raio} fill={cor(p)}
                  opacity={apagada ? 0.18 : 1} className="cursor-pointer transition-opacity"
                  onMouseEnter={() => setHover(p)} onClick={() => setPartido(p)}>
                  <title>{`${m.nomeUrna} · ${p} · ${m.uf}`}</title>
                </circle>
              );
            })}
          </svg>
          <figcaption className="absolute inset-x-0 bottom-0.5 flex flex-col items-center">
            <span className="text-[28px] leading-[30px] font-bold tabular-nums">{foco ? doPartido(foco) : casa.total}</span>
            <span className="text-xs text-suave">{foco ? `${foco} · cadeiras` : "cadeiras"}</span>
          </figcaption>
        </figure>

        <div className="flex flex-wrap gap-1.5" aria-label={`Partidos ${naCasa}`}>
          {casa.bancadas.map((b) => {
            const on = partido === b.partido;
            return (
              <button key={b.partido} type="button" aria-pressed={on} onClick={() => setPartido(on ? "" : b.partido)}
                onMouseEnter={() => setHover(b.partido)} onMouseLeave={() => setHover("")}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[13px] font-semibold text-texto"
                style={on ? { background: `color-mix(in srgb, ${cor(b.partido)} 30%, transparent)`, borderColor: `color-mix(in srgb, ${cor(b.partido)} 70%, transparent)` } : { background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.14)" }}>
                <span className="size-2.5 rounded-full" style={{ background: cor(b.partido) }} aria-hidden="true" />
                {b.partido}<span className="font-normal text-suave">{b.membros.length}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs leading-4 text-suave tabular-nums">
          {casa.total} cadeiras, partidos em ordem de tamanho da bancada · {quando === "fev" ? "eleitos em 2026, com o partido registrado hoje" : "quem ocupa a cadeira hoje"}
        </p>
      </section>

      {partido && (
        <section aria-labelledby="bancada-titulo" className="grid gap-2">
          <h2 id="bancada-titulo" className="flex flex-wrap items-center gap-2 px-4 text-[13px] font-semibold text-suave">
            <ChipPartido sigla={partido} />{naCasa.replace(/^./, (x) => x.toUpperCase())} · {bancada.length} cadeiras{uf !== "todos" ? ` em ${NOME_UF[uf]}` : ""}
          </h2>
          <div className="vidro grid grid-cols-2 gap-2 rounded-card p-2.5 sm:[grid-template-columns:repeat(auto-fill,minmax(170px,1fr))]">
            {bancada.map((m) => (
              <Link key={m.id} href={`/p/${m.id}`} className="flex min-h-[52px] items-center gap-2 rounded-2xl bg-white/6 p-2 text-texto no-underline hover:bg-white/10 hover:text-texto">
                {m.fotoUrl
                  // <img> de propósito: a foto vem direto da URL oficial, sem passar pela Vercel (CLAUDE.md).
                  ? <img src={m.fotoUrl} alt="" width={32} height={32} loading="lazy" className="size-8 shrink-0 rounded-full border border-white/20 bg-white/12 object-cover object-top" />
                  : <span aria-hidden="true" className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/12 text-[11px] font-semibold">{m.nomeUrna.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>}
                <span className="grid min-w-0"><span className="truncate text-xs font-bold">{m.nomeUrna}</span><span className="text-[11px] text-suave">{m.uf}</span></span>
              </Link>
            ))}
            {bancada.length === 0 && <p className="col-span-2 p-2 text-sm text-suave">Nenhuma cadeira deste partido neste estado.</p>}
          </div>
        </section>
      )}
    </div>
  );
}
