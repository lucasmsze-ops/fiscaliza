/**
 * Níveis de navegação (pedido de 2026-11-14). N1 são as telas do menu (Sobre saiu do menu no mesmo dia: abre
 * pelo ícone de Dúvidas do cabeçalho e é N2): têm o menu no topo (celular) e,
 * conforme a tela, a busca. Todo o resto é N2 (crachá, executivo, votação, Comparar...): sem o menu do
 * topo no celular e com o botão de voltar.
 */
export const N1 = [
  { href: "/", rotulo: "Visão geral", icone: "M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" },
  { href: "/congresso", rotulo: "Congresso", icone: "M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6M9 11h.01M15 11h.01" },
  { href: "/votacoes", rotulo: "Votações", icone: "M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" },
  // Neste aparelho (no protótipo, a seção "Conta"; aqui sem Entrar nem conta).
  { href: "/monitorando", rotulo: "Monitorando", icone: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" },
] as const;

/** A tela é N1 (uma das do menu, exatamente: /votacoes/[id] é N2). */
export const ehN1 = (caminho: string) => N1.some((i) => i.href === caminho);
/** Nome da tela N1 (para o rótulo do botão de voltar), ou null. */
export const nomeN1 = (caminho: string) => N1.find((i) => i.href === caminho)?.rotulo ?? null;
