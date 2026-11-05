"use client";

import Link from "next/link";
import { useMonitorando } from "@/lib/monitorando";

/** Sino da barra do topo (protótipo): atalho para Monitorando, com quantas pessoas estão na lista deste aparelho. */
export function SinoMonitorando() {
  const n = useMonitorando().pessoas.length;
  return (
    <Link href="/monitorando" aria-label={n ? `Monitorando: ${n} ${n === 1 ? "pessoa" : "pessoas"} neste aparelho` : "Monitorando neste aparelho"}
      className="relative inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-borda bg-card text-suave no-underline hover:border-destaque hover:text-texto">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
      </svg>
      {n > 0 && <span aria-hidden="true" className="absolute -top-1.5 -right-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destaque px-1 text-[11px] font-bold text-destaque-texto">{n}</span>}
    </Link>
  );
}
