"use client";

import { CHIP, CHIP_ON } from "@/lib/estilo";

/**
 * Filtro de escolha única com a cara dos outros chips (estado no Congresso, ano nas Propostas, área no
 * plano de governo). O <select> nativo fica invisível por cima (16 px, para o Safari não dar zoom ao tocar)
 * e o chip mostra a escolha em 13 px, com a seta do menu; fica azul quando sai do valor `padrao`.
 */
export function SelectChip({ valor, padrao, opcoes, rotulo, onChange, desligado = false }: {
  valor: string;
  /** O valor "sem filtro" (todos, todas): com ele o chip fica cinza. */
  padrao: string;
  opcoes: { valor: string; texto: string }[];
  /** Nome do filtro para leitor de tela ("Estado", "Ano"). */
  rotulo: string;
  onChange: (valor: string) => void;
  desligado?: boolean;
}) {
  const atual = opcoes.find((o) => o.valor === valor)?.texto ?? valor;
  return (
    <span className={`${valor === padrao ? CHIP : CHIP_ON} relative pr-2.5 focus-within:ring-2 focus-within:ring-link ${desligado ? "opacity-60" : ""}`}>
      {atual}
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      <select value={valor} disabled={desligado} onChange={(e) => onChange(e.target.value)} aria-label={rotulo}
        className="absolute inset-0 cursor-pointer appearance-none text-[16px] opacity-0 disabled:cursor-default">
        {opcoes.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
      </select>
    </span>
  );
}
