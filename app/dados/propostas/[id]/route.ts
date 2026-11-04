import type { PropostaListada } from "@/lib/pagina";
import { repo } from "@/lib/repo";

// Todas as propostas que podem virar lei de um político (aba Propostas do crachá, "ver mais"),
// baixadas só quando a pessoa pede. Cada lista é gerada na primeira visita e fica na CDN (ISR).
export const revalidate = 86400;
export async function generateStaticParams() {
  return [];
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9-]{1,120}$/.test(id)) return new Response("id inválido", { status: 400 });
  const lista: PropostaListada[] = (await repo.getAutorias(id))
    .sort((a, b) => b.proposicao.apresentacao.localeCompare(a.proposicao.apresentacao) || b.proposicao.id.localeCompare(a.proposicao.id))
    .map(({ proposicao: x, ordem }) => ({
      casa: x.casa, tipo: x.tipo, numero: x.numero, ano: x.ano, ementa: x.ementa, apresentacao: x.apresentacao,
      situacao: x.situacao, virouNorma: x.virouNorma, urlOficial: x.urlOficial, primeiroAutor: ordem === 1,
    }));
  return Response.json(lista);
}
