import Link from "next/link";

/** Os 12 pontos em arco do protótipo Liquid Glass (um plenário visto de cima). */
const PONTOS: [number, number][] = [
  [4, 16], [5.07, 12], [8, 9.07], [12, 8], [16, 9.07], [18.93, 12], [20, 16],
  [7, 16], [8.46, 12.46], [12, 11], [15.54, 12.46], [17, 16],
];

/** Marca do site: o selo de vidro com o plenário e o nome em Inter Tight. Leva ao Início. */
export function Marca() {
  return (
    <Link href="/" aria-label="Fiscaliza, início" className="inline-flex items-center gap-2.5 text-texto no-underline hover:text-texto">
      <span aria-hidden="true" className="vidro inline-flex size-[34px] items-center justify-center rounded-[11px]">
        <svg width="24" height="24" viewBox="0 0 24 24" className="fill-current">
          {PONTOS.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.25" />)}
        </svg>
      </span>
      <span className="font-display text-[19px] font-bold tracking-[-0.4px]">Fiscaliza</span>
    </Link>
  );
}
