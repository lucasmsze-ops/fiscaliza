/**
 * Estilos repetidos entre as páginas, no design system do iOS adaptado para site (2026-11-14): cartões
 * agrupados sem borda nem sombra, blocos e botões em preenchimento cinza, cápsulas, título grande.
 * Mudar aqui muda em todas as telas. As cores e a escala de tipos estão em app/globals.css.
 */
/** Cartão de seção (lista agrupada do iOS): 16 px de respiro no celular, 20 px a partir do tablet. */
export const CARD = "rounded-card bg-card p-4 sm:p-5";
/** Título da página quando fica fora de um cartão (Large Title: 34 px; 28 px no celular). */
export const TITULO_PAGINA = "text-2xl font-bold sm:text-3xl";
/** Título da página quando é o do primeiro cartão (Title 2: 22 px). */
export const TITULO_CARTAO = "text-xl font-bold";
/** Título de seção (cartões abaixo do primeiro; Title 3: 20 px). */
export const TITULO_SECAO = "text-lg font-semibold";
/** Rótulo de grupo acima de uma lista (Footnote, sem caixa alta, como nas listas do iOS atual). */
export const ROTULO = "text-[13px] text-suave";
/** Número em destaque de um cartão (salário, participação, votos, propostas): 22 px no celular, 28 px depois. */
export const NUMERO = "text-[22px] leading-tight font-semibold tabular-nums sm:text-[28px]";

/** Filtro em cápsula, desligado e ligado (como os filtros do app Fotos e da App Store). */
export const CHIP = "inline-flex h-8 items-center gap-1.5 rounded-full bg-preench px-3.5 text-[13px] font-semibold whitespace-nowrap text-texto hover:bg-preench-forte";
export const CHIP_ON = "inline-flex h-8 items-center gap-1.5 rounded-full bg-destaque px-3.5 text-[13px] font-semibold whitespace-nowrap text-destaque-texto";
/** Botão secundário (estilo "gray" do iOS): cápsula cinza com texto azul. */
export const BOTAO = "inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-preench px-4 text-[15px] font-semibold whitespace-nowrap text-link no-underline hover:bg-preench-forte";
/** Botão principal (estilo "filled" do iOS). */
export const BOTAO_PRINCIPAL = "inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-destaque px-4 text-[15px] font-semibold whitespace-nowrap text-destaque-texto no-underline hover:opacity-90";
/** Bloco tocável dentro de um cartão (célula): preenchimento cinza, sem borda. */
export const BLOCO = "rounded-xl bg-preench text-texto no-underline hover:bg-preench-forte";
/** Etiqueta pequena (tipo, tema, área). */
export const ETIQUETA = "rounded-md bg-preench px-1.5 py-0.5 text-xs font-semibold text-suave";
/** Campo de texto ou seleção (campo de busca do iOS). 17 px no celular, para o Safari não dar zoom. */
export const CAMPO = "h-10 rounded-[10px] bg-preench px-3 text-base text-texto outline-none placeholder:text-suave focus:ring-2 focus:ring-destaque/40 sm:text-[15px]";
