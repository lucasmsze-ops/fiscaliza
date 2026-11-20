import { chaveMateria, materiasDoItem, type ItemPautaAutores } from "@/lib/pauta";
import { repo } from "@/lib/repo";

// Pauta do Plenário (de hoje em diante, última coleta) com os autores do site de cada matéria, para a aba
// "Quem votei" da tela Monitorando mostrar os projetos pautados de quem a pessoa votou. Uma vez por dia, na CDN.
export const dynamic = "force-static";
export const revalidate = 86400;

export async function GET() {
  const hoje = new Date().toISOString().slice(0, 10);
  const pauta = await repo.listarPauta(hoje);
  const autores = await repo.autoresDasMaterias(pauta.flatMap(materiasDoItem));
  const itens: ItemPautaAutores[] = pauta.map((x) => ({
    ...x, autores: [...new Set(materiasDoItem(x).flatMap((m) => autores.get(chaveMateria(m)) ?? []))],
  }));
  return Response.json(itens);
}
