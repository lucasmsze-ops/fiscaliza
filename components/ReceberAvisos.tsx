/**
 * Fake door de avisos (CLAUDE.md): o botão existe para sabermos se as pessoas querem avisos, mas
 * avisos não existem. Nunca pede e-mail, telefone ou qualquer contato. Popover nativo do HTML,
 * sem JavaScript. A contagem anônima dos toques entra com o Supabase (E19).
 */
export function ReceberAvisos({ id, sobre, pequeno = false }: {
  /** Único na página. */
  id: string;
  /** Do que seriam os avisos, para o texto: "sobre Kiko Celeguim". */
  sobre: string;
  /** Versão compacta (cartões de lista): um sino com o texto escondido para leitor de tela. */
  pequeno?: boolean;
}) {
  const alvo = `avisos-${id}`;
  return (
    <>
      {pequeno ? (
        <button type="button" popoverTarget={alvo} aria-label="Receber aviso"
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-borda px-2.5 text-xs font-bold text-link hover:border-destaque">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" /></svg>
          Avisar
        </button>
      ) : (
        <button type="button" popoverTarget={alvo}
          className="rounded-xl border border-borda-forte bg-card px-4 py-2 text-sm font-bold">
          Receber avisos
        </button>
      )}
      <div id={alvo} popover="auto"
        className="m-auto max-w-[min(22rem,calc(100vw-2rem))] rounded-card border border-borda bg-card p-4 text-left text-sm leading-relaxed text-texto shadow-xl backdrop:bg-black/40">
        <p className="font-semibold">Avisos ainda não existem</p>
        <p className="mt-1">O Fiscaliza ainda não manda avisos {sobre}. Nada sobre você foi pedido nem guardado.</p>
        <button type="button" popoverTarget={alvo} popoverTargetAction="hide" className="mt-3 text-xs underline underline-offset-2">
          Fechar
        </button>
      </div>
    </>
  );
}
