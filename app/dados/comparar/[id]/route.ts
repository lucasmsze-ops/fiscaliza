import { montarColuna } from "@/lib/comparar";
import { repo } from "@/lib/repo";
import { hojeBrasil } from "@/lib/datas";

// Coluna de uma pessoa na tela Comparar, do resumo pronto da página: gerada na primeira visita e
// servida pela CDN (ISR). Quem a pessoa compara vai só na URL da página, nunca para o servidor.
export const revalidate = 86400;
export async function generateStaticParams() {
  return [];
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9-]{1,120}$/.test(id)) return new Response("id inválido", { status: 400 });
  const [pg, p] = await Promise.all([repo.getPagina(id), repo.getPolitico(id)]);
  if (!pg) return new Response("não encontrado", { status: 404 });
  return Response.json(montarColuna(pg, p, hojeBrasil()));
}
