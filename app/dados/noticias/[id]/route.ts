import { repo } from "@/lib/repo";

// Matérias da Agência Câmara e da Agência Senado que citam o político (E23r), para o "Quem votei". Gerado na
// primeira visita e servido pela CDN (ISR, um dia, como a coleta); a matéria abre no site da agência.
export const revalidate = 86400;
export async function generateStaticParams() {
  return [];
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9-]{1,120}$/.test(id)) return new Response("id inválido", { status: 400 });
  // Antes da migração 0012 a tabela não existe: lista vazia, a seção diz que não há matéria.
  return Response.json(await repo.noticiasDe(id, 20).catch(() => []));
}
