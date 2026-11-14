/**
 * Estilos repetidos entre as páginas (pente-fino de layout de 2026-11-14): um cartão, um título de
 * página e um título de seção, iguais em todo o site. Mudar aqui muda em todas as telas.
 */
/** Cartão de seção: 16 px de respiro no celular, 22 px a partir do tablet (o do protótipo). */
export const CARD = "rounded-card border border-borda bg-card p-4 shadow-card sm:p-[22px]";
/** Título da página quando fica fora de um cartão (Comparar, Monitorando, Como funciona). */
export const TITULO_PAGINA = "text-2xl leading-tight font-bold sm:text-[28px]";
/** Título da página quando é o do primeiro cartão (Visão geral, Votações). */
export const TITULO_CARTAO = "text-xl leading-tight font-bold";
/** Título de seção (cartões abaixo do primeiro). */
export const TITULO_SECAO = "text-lg leading-snug font-bold";
