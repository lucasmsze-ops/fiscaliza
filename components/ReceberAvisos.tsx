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
        <button type="button" popoverTarget={alvo}
          className="vidro inline-flex h-10 shrink-0 items-center gap-1.5 justify-self-start rounded-full px-3.5 text-sm font-semibold text-texto hover:bg-preench-forte">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" /></svg>
          Avisar
        </button>
      ) : (
        <button type="button" popoverTarget={alvo}
          className="rounded-full bg-preench px-4 py-2 text-[15px] font-semibold text-link hover:bg-preench-forte">
          Receber avisos
        </button>
      )}
      <div id={alvo} popover="auto"
        className="m-auto max-w-[min(22rem,calc(100vw-2rem))] rounded-[22px] vidro-forte bg-[rgba(44,45,52,0.94)] p-4 text-left text-sm leading-relaxed text-texto backdrop:bg-black/40">
        <p className="font-semibold">Avisos ainda não existem</p>
        <p className="mt-1">O Fiscaliza ainda não manda avisos {sobre}. Nada sobre você foi pedido nem guardado.</p>
        <button type="button" popoverTarget={alvo} popoverTargetAction="hide" className="mt-3 text-[13px] font-semibold text-link">
          Fechar
        </button>
      </div>
    </>
  );
}
