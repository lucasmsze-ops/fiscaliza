/**
 * Níveis de navegação (pedido de 2026-11-14). N1 são as telas do menu (Sobre saiu do menu no mesmo dia: abre
 * pelo ícone de Dúvidas do cabeçalho e é N2): têm a tab bar no rodapé (celular, desde 2026-11-20) e,
 * conforme a tela, a busca. Todo o resto é N2 (crachá, executivo, votação, Comparar...): sem a tab bar
 * no celular e com o botão de voltar.
 */
export const N1 = [
  // Desde 2026-11-20 (protótipo Liquid Glass): Início em "/" e o mapa, que era a Visão geral, em /mapa.
  // Ícones do protótipo, cada um num só `d` (vários subcaminhos).
  { href: "/", rotulo: "Início", icone: "M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1H15v-6.5H9V21H4.5a1 1 0 0 1-1-1z" },
  { href: "/mapa", rotulo: "Mapa", icone: "m3 7 6-3 6 3 6-3v13l-6 3-6-3-6 3V7Z M9 4v13M15 7v13" },
  { href: "/congresso", rotulo: "Congresso", icone: "M3 21h18M5 21V10M19 21V10M9 21V10M15 21V10M2 10l10-6 10 6" },
  { href: "/votacoes", rotulo: "Votações", icone: "M7 3h10a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z m1 6 1.5 1.5L12 8M8 15l1.5 1.5L12 14M14.5 9.5H17M14.5 15.5H17" },
  // Neste aparelho (sem conta: Entrar e cadastro ainda são "Em breve").
  { href: "/monitorando", rotulo: "Monitorando", icone: "M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" },
] as const;

/** A tela é N1 (uma das do menu, exatamente: /votacoes/[id] é N2). */
export const ehN1 = (caminho: string) => N1.some((i) => i.href === caminho);
/** Nome da tela N1 (para o rótulo do botão de voltar), ou null. */
export const nomeN1 = (caminho: string) => N1.find((i) => i.href === caminho)?.rotulo ?? null;
