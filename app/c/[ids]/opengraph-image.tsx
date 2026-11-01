import { ImageResponse } from "next/og";
import { montarCard, resumoNumeros } from "@/lib/card";
import { idsDaUrl } from "@/lib/colinha";
import { repo } from "@/lib/repo";

// Imagem de preview da colinha (WhatsApp, redes). Única exceção ao "nunca proxiar": as fotos
// oficiais são buscadas na hora de gerar a imagem (CLAUDE.md). Só número da fonte, sem adjetivo.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Colinha das eleições de 2026: em quem a pessoa votou para o Congresso, com participação e governismo de cada um";
export const revalidate = 86400;

const COR = { fundo: "#ffffff", texto: "#111827", suave: "#4b5563", linha: "#e5e7eb" };

export default async function Imagem({ params }: { params: Promise<{ ids: string }> }) {
  const ids = idsDaUrl((await params).ids);
  const cs = (await Promise.all(ids.map((id) => montarCard(repo, id)))).filter((c) => c !== null);
  // Medidas por quantidade de linhas, para tudo caber em 630 px com o rodapé da fonte.
  const m = cs.length <= 1 ? { foto: 220, nome: 56, sub: 30, num: 30, gap: 0 } : cs.length === 2 ? { foto: 160, nome: 44, sub: 26, num: 26, gap: 20 } : { foto: 112, nome: 36, sub: 22, num: 25, gap: 12 };
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: COR.fundo, color: COR.texto, padding: "32px 56px 28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ display: "flex", fontSize: 38 }}>Minha colinha · 2026</div>
          <div style={{ display: "flex", fontSize: 24, color: COR.suave }}>Fiscaliza</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: "center", gap: m.gap }}>
          {cs.map((c) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 28, borderTop: `2px solid ${COR.linha}`, paddingTop: m.gap }}>
              {c.fotoUrl ? <img src={c.fotoUrl} width={Math.round(m.foto * 0.75)} height={m.foto} style={{ objectFit: "cover", borderRadius: 12 }} alt="" /> : null}
              <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", fontSize: m.nome, letterSpacing: -0.5 }}>{c.nomeUrna}</div>
                <div style={{ display: "flex", fontSize: m.sub, color: COR.suave, marginTop: 2 }}>{`${c.cargo} · ${c.partidoUf} · ${c.status}`}</div>
                <div style={{ display: "flex", fontSize: m.num, marginTop: 6 }}>{resumoNumeros(c).replace(/^./, (x) => x.toUpperCase())}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", fontSize: 19, color: COR.suave, borderTop: `2px solid ${COR.linha}`, paddingTop: 10 }}>
          Dados oficiais: TSE, Câmara dos Deputados e Senado Federal. Participação e governismo: votações nominais do plenário.
        </div>
      </div>
    ),
    size,
  );
}
