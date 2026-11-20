"use client";

/**
 * Controle segmentado do iOS (o mesmo visual do Câmara/Senado no Congresso): o item escolhido fica no
 * segmento cinza #636366. Funciona como abas (role="tablist"); `controla` liga cada aba ao seu painel.
 */
export function Segmentado<T extends string>({ itens, valor, onChange, rotulo, controla }: {
  itens: { valor: T; texto: string }[];
  valor: T;
  onChange: (v: T) => void;
  rotulo: string;
  /** Prefixo do id do painel de cada aba ("mo-painel" → "mo-painel-quem-votei"). */
  controla?: string;
}) {
  return (
    <div role="tablist" aria-label={rotulo} className="grid w-full gap-0.5 rounded-[9px] bg-preench p-0.5 sm:w-96" style={{ gridTemplateColumns: `repeat(${itens.length}, minmax(0, 1fr))` }}>
      {itens.map((i) => (
        <button key={i.valor} type="button" role="tab" aria-selected={valor === i.valor} aria-controls={controla ? `${controla}-${i.valor}` : undefined}
          onClick={() => onChange(i.valor)}
          className={`h-8 rounded-[7px] px-3 text-[13px] font-semibold text-texto ${valor === i.valor ? "bg-segmento shadow-[0_3px_8px_rgba(0,0,0,0.12),0_3px_1px_rgba(0,0,0,0.04)]" : "hover:bg-preench"}`}>
          {i.texto}
        </button>
      ))}
    </div>
  );
}
