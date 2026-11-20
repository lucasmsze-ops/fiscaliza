/**
 * Estilos repetidos entre as páginas, no visual iOS Liquid Glass (protótipo de 2026-11-20, sobre o design
 * system do iOS de 2026-11-14): cartões de vidro, blocos e botões em branco translúcido, cápsulas, título grande.
 * Mudar aqui muda em todas as telas. As cores e a escala de tipos estão em app/globals.css.
 */
/** Cartão de seção (lista agrupada do iOS): 16 px de respiro no celular, 20 px a partir do tablet. */
export const CARD = "rounded-card vidro p-4 sm:p-5";
/** Título da página quando fica fora de um cartão (Large Title: 34 px, como no protótipo). */
export const TITULO_PAGINA = "text-3xl font-bold tracking-[-0.6px]";
/** Título da página quando é o do primeiro cartão (Title 2: 22 px). */
export const TITULO_CARTAO = "text-xl font-bold";
/** Título de seção (cartões abaixo do primeiro; Title 3: 20 px). */
export const TITULO_SECAO = "text-lg font-semibold";
/** Rótulo de grupo acima de uma lista (Footnote, sem caixa alta, como nas listas do iOS atual). */
export const ROTULO = "text-[13px] text-suave";
/** Número em destaque de um cartão (salário, participação, votos, propostas): 22 px no celular, 28 px depois. */
export const NUMERO = "text-[22px] leading-tight font-semibold tabular-nums sm:text-[28px]";

/** Filtro em cápsula de vidro (Hoje, Todos os estados, ano); ligado, fica azul translúcido (protótipo Liquid Glass). */
export const CHIP = "inline-flex h-9 items-center gap-1.5 rounded-full vidro px-3.5 text-sm font-semibold whitespace-nowrap text-[rgba(235,235,245,0.85)] hover:bg-preench-forte hover:text-texto";
export const CHIP_ON = "inline-flex h-9 items-center gap-1.5 rounded-full vidro !border-[rgba(64,156,255,0.6)] !bg-[rgba(64,156,255,0.28)] px-3.5 text-sm font-semibold whitespace-nowrap text-texto";
/** Botão secundário: cápsula de vidro com texto branco (os botões do cabeçalho do protótipo). */
export const BOTAO = "inline-flex h-11 items-center justify-center gap-1.5 rounded-full vidro px-4 text-[15px] font-semibold whitespace-nowrap text-texto no-underline hover:bg-preench-forte hover:text-texto";
/** Botão principal (estilo "filled" do iOS, com o brilho na aresta de cima). */
export const BOTAO_PRINCIPAL = "inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-destaque px-4 text-[15px] font-semibold whitespace-nowrap text-destaque-texto no-underline shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] hover:opacity-90 hover:text-destaque-texto";
/** Bloco tocável dentro de um cartão (célula): preenchimento cinza, sem borda. */
export const BLOCO = "rounded-xl bg-preench text-texto no-underline hover:bg-preench-forte";
/** Etiqueta pequena (tipo, tema, área). */
export const ETIQUETA = "rounded-md bg-preench px-1.5 py-0.5 text-xs font-semibold text-suave";
/** Campo de texto ou seleção (campo de busca do iOS). 17 px no celular, para o Safari não dar zoom. */
export const CAMPO = "h-11 rounded-full bg-preench px-3 text-base text-texto outline-none placeholder:text-suave focus:ring-2 focus:ring-destaque/40 sm:text-[15px]";
/** Campo de busca (cápsula de vidro de 48 px do protótipo; o do Início tem 52). */
export const CAMPO_BUSCA = "h-12 w-full rounded-full vidro pr-4 pl-11 text-[17px] text-texto outline-none placeholder:text-suave focus:ring-2 focus:ring-destaque/40";
/** Diálogo e menu que abre por cima (vidro forte, mais opaco para o texto ler bem). */
export const FLUTUANTE = "rounded-[22px] vidro-forte bg-[rgba(44,45,52,0.94)] text-texto";
/** Controle segmentado de vidro (Câmara/Senado, abas do Monitorando): cápsula com o segmento escolhido mais claro. */
export const SEGMENTOS = "grid w-full gap-0.5 rounded-full vidro p-1";
export const SEGMENTO = "h-9 rounded-full px-3 text-sm font-semibold text-[rgba(235,235,245,0.75)] hover:bg-preench hover:text-texto";
export const SEGMENTO_ON = "h-9 rounded-full px-3 text-sm font-semibold bg-segmento text-texto";
