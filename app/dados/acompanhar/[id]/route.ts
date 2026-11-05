import { resumoParaAcompanhar } from "@/lib/acompanhar";
import { repo } from "@/lib/repo";

// Resumo de um político para a tela Monitorando: lido do resumo pronto da página, gerado na primeira
// visita e servido pela CDN (ISR). Quem a pessoa acompanha nunca sai do navegador dela.
export const revalidate = 86400;
export async function generateStaticParams() {
  return [];
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9-]{1,120}$/.test(id)) return new Response("id inválido", { status: 400 });
  const pg = await repo.getPagina(id);
  if (!pg) return new Response("não encontrado", { status: 404 });
  return Response.json(resumoParaAcompanhar(pg));
}
