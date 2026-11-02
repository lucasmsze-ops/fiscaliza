import { itemBusca } from "@/lib/card";
import { repo } from "@/lib/repo";

// Índice da busca por nome, gerado no build e servido pela CDN (sem servidor por requisição).
export const dynamic = "force-static";
export const revalidate = 86400;

export async function GET() {
  // Mais votados primeiro: a busca mostra só os primeiros resultados e mantém esta ordem.
  const politicos = [...await repo.listarPoliticos()].sort((a, b) => (b.votos2026 ?? -1) - (a.votos2026 ?? -1));
  return Response.json(politicos.map(itemBusca));
}
