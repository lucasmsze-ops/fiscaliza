import { corPartido } from "@/lib/partidos";

/**
 * Etiqueta do partido na cor dele (protótipo Liquid Glass): fundo a 38% e borda a 75% da cor oficial
 * (lib/partidos.ts), texto branco e o brilho de vidro na aresta de cima.
 */
export function ChipPartido({ sigla, children, grande = false }: { sigla: string; children?: React.ReactNode; grande?: boolean }) {
  const cor = corPartido(sigla);
  return (
    <span className={`inline-flex shrink-0 items-center rounded-[7px] border font-bold tracking-[0.2px] whitespace-nowrap text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] ${grande ? "h-[26px] px-2.5 text-[13px]" : "h-[22px] px-2 text-xs"}`}
      style={{ background: `color-mix(in srgb, ${cor} 38%, transparent)`, borderColor: `color-mix(in srgb, ${cor} 75%, transparent)` }}>
      {children ?? sigla}
    </span>
  );
}
