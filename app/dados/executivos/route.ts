import { hrefExecutivo, idExecutivo, type ItemExecutivo } from "@/lib/quem-votei";
import { repo } from "@/lib/repo";
import { normalizar } from "@/lib/texto";

// Índice de presidente e governadores de 2026 para o "Quem votei" (Monitorando). Hoje só os eleitos
// (tabela `executivos`); os não eleitos entram com a coleta de todos os candidatos (E23q). CDN, uma vez por dia.
export const dynamic = "force-static";
export const revalidate = 86400;

export async function GET() {
  const es = await repo.listarExecutivos();
  const itens: ItemExecutivo[] = es.map((e) => ({
    id: idExecutivo(e), cargo: e.cargo, uf: e.uf, nomeUrna: e.nomeUrna, partido: e.partido, fotoUrl: e.fotoUrl,
    eleito: true, href: hrefExecutivo(e), busca: normalizar(`${e.nomeUrna} ${e.nome} ${e.numeroUrna ?? ""}`),
  }));
  return Response.json(itens);
}
