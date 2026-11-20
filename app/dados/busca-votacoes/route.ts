import { repo } from "@/lib/repo";
import { tituloDaAgencia } from "@/lib/noticias";
import { itemBuscaPauta, itemBuscaVotacao } from "@/lib/votacao";

// Índice da busca da tela Votações (projetos e votações), no mesmo esquema de /dados/politicos: gerado
// uma vez por dia e servido pela CDN; o navegador só baixa quando a pessoa toca no campo.
export const dynamic = "force-static";
export const revalidate = 86400;

export async function GET() {
  const hoje = new Date().toISOString().slice(0, 10);
  const [votacoes, pauta, noticias] = await Promise.all([repo.votacoesEntre("2023-01-01", hoje), repo.listarPauta(hoje), repo.noticiasComMaterias("2023-01-01")]);
  // Pauta primeiro (o que vem pela frente), depois as votações da mais recente para a mais antiga; com o título da
  // notícia da agência quando há (E23u: a busca acha "ajuste fiscal").
  return Response.json([...pauta.map(itemBuscaPauta), ...votacoes.map((v) => itemBuscaVotacao(v, tituloDaAgencia(v, noticias)?.titulo))]);
}
