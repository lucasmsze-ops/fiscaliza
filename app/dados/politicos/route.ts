import { itemBusca } from "@/lib/card";
import { repo } from "@/lib/repo";

// Índice da busca por nome, gerado no build e servido pela CDN (sem servidor por requisição).
export const dynamic = "force-static";
export const revalidate = 86400;

export async function GET() {
  const politicos = await repo.listarPoliticos();
  return Response.json(politicos.map(itemBusca));
}
