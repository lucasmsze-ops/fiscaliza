"use client";

import { usePathname } from "next/navigation";
import { ehN1 } from "@/lib/navegacao";

/**
 * Cabeçalho do celular (marca e abas do menu), só nas telas N1. Nas N2 ele some e a página mostra o
 * BarraVoltar no lugar (pedido de 2026-11-14).
 */
export function CabecalhoCelular({ children }: { children: React.ReactNode }) {
  if (!ehN1(usePathname())) return null;
  return (
    // Barra translúcida que acompanha a rolagem (material do iOS), com as abas de site.
    <header className="sticky top-0 z-30 -mx-4 grid grid-cols-1 gap-2 bg-vidro px-4 pt-3 backdrop-blur-xl backdrop-saturate-150 lg:hidden">
      {children}
    </header>
  );
}
