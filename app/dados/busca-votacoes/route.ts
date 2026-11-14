import { repo } from "@/lib/repo";
import { itemBuscaPauta, itemBuscaVotacao } from "@/lib/votacao";

// Índice da busca da tela Votações (projetos e votações), no mesmo esquema de /dados/politicos: gerado
// uma vez por dia e servido pela CDN; o navegador só baixa quando a pessoa toca no campo.
export const dynamic = "force-static";
export const revalidate = 86400;

export async function GET() {
  const hoje = new Date().toISOString().slice(0, 10);
  const [votacoes, pauta] = await Promise.all([repo.votacoesEntre("2023-01-01", hoje), repo.listarPauta(hoje)]);
  // Pauta primeiro (o que vem pela frente), depois as votações da mais recente para a mais antiga.
  return Response.json([...pauta.map(itemBuscaPauta), ...votacoes.map(itemBuscaVotacao)]);
}
