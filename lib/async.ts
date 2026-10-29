/** Executa `fn` sobre `itens` com no máximo `limite` chamadas em voo. Erros não abortam o lote. */
export async function mapLimite<T, R>(
  itens: T[],
  limite: number,
  fn: (item: T, i: number) => Promise<R>,
): Promise<{ ok: R[]; falhas: { item: T; erro: unknown }[] }> {
  const ok: R[] = [];
  const falhas: { item: T; erro: unknown }[] = [];
  let i = 0;
  async function worker() {
    while (i < itens.length) {
      const idx = i++;
      const item = itens[idx]!;
      try { ok.push(await fn(item, idx)); } catch (erro) { falhas.push({ item, erro }); }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limite, itens.length) }, worker));
  return { ok, falhas };
}
