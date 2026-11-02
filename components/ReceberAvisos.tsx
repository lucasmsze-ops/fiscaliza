/**
 * Fake door de avisos (CLAUDE.md): o botão existe para sabermos se as pessoas querem avisos, mas
 * avisos não existem. Nunca pede e-mail, telefone ou qualquer contato. Popover nativo do HTML,
 * sem JavaScript. A contagem anônima dos toques entra com o Supabase (E19).
 */
export function ReceberAvisos({ id, sobre }: {
  /** Único na página. */
  id: string;
  /** Do que seriam os avisos, para o texto: "sobre Kiko Celeguim", "sobre a sua colinha". */
  sobre: string;
}) {
  const alvo = `avisos-${id}`;
  return (
    <>
      <button type="button" popoverTarget={alvo}
        className="rounded-full border border-black/20 px-4 py-2 text-sm font-medium dark:border-white/25">
        Receber avisos
      </button>
      <div id={alvo} popover="auto"
        className="m-auto max-w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-black/10 bg-[var(--fundo)] p-4 text-left text-sm leading-relaxed text-[var(--texto)] shadow-xl backdrop:bg-black/40 dark:border-white/15">
        <p className="font-semibold">Avisos ainda não existem</p>
        <p className="mt-1">O Fiscaliza ainda não manda avisos {sobre}. Nada sobre você foi pedido nem guardado.</p>
        <button type="button" popoverTarget={alvo} popoverTargetAction="hide" className="mt-3 text-xs underline underline-offset-2">
          Fechar
        </button>
      </div>
    </>
  );
}
