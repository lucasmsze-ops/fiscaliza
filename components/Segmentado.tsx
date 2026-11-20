"use client";

import { SEGMENTO, SEGMENTO_ON, SEGMENTOS } from "@/lib/estilo";

/**
 * Controle segmentado de vidro (o mesmo visual do Câmara/Senado no Congresso): o item escolhido fica no
 * segmento mais claro. Funciona como abas (role="tablist"); `controla` liga cada aba ao seu painel.
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
    <div role="tablist" aria-label={rotulo} className={`${SEGMENTOS} sm:w-96`} style={{ gridTemplateColumns: `repeat(${itens.length}, minmax(0, 1fr))` }}>
      {itens.map((i) => (
        <button key={i.valor} type="button" role="tab" aria-selected={valor === i.valor} aria-controls={controla ? `${controla}-${i.valor}` : undefined}
          onClick={() => onChange(i.valor)}
          className={valor === i.valor ? SEGMENTO_ON : SEGMENTO}>
          {i.texto}
        </button>
      ))}
    </div>
  );
}
