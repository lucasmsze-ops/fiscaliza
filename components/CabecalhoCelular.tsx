"use client";

import { usePathname } from "next/navigation";
import { ehN1 } from "@/lib/navegacao";

/**
 * Cabeçalho do celular (marca, Entrar e Dúvidas), só nas telas N1; a navegação fica na tab bar do rodapé
 * (protótipo Liquid Glass, 2026-11-20). Nas N2 ele some e a página mostra o BarraVoltar no lugar.
 */
export function CabecalhoCelular({ children }: { children: React.ReactNode }) {
  if (!ehN1(usePathname())) return null;
  return <header className="flex items-center justify-between gap-3 pt-4 pb-1 lg:hidden">{children}</header>;
}
