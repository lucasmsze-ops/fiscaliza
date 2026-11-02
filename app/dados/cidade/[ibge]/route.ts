import { resumoCard, type CardResumo } from "@/lib/card";
import { repo } from "@/lib/repo";

// Top-20 de cada município (com empatados), um JSON por cidade gerado na primeira busca e guardado em cache (ISR).
export const dynamic = "force-static";
export const dynamicParams = true;
export const revalidate = 86400;

// 5.571 cidades: nenhuma no build; cada JSON é gerado na primeira busca e fica em cache (ISR).
export async function generateStaticParams() {
  return [];
}

export interface CidadeJson {
  ibge: number;
  nome: string;
  /** [id do político, votos na cidade, posição] em ordem de votos. */
  deputado_federal: [string, number, number][];
  senador: [string, number, number][];
  /** Cabeçalho do card de cada um da lista: a tela da cidade não depende do índice nacional (~190 KB). */
  pessoas: Record<string, CardResumo>;
}

export async function GET(_req: Request, { params }: { params: Promise<{ ibge: string }> }) {
  const ibge = Number((await params).ibge);
  const m = await repo.getMunicipio(ibge);
  if (!m) return new Response("Município não encontrado", { status: 404 });
  const linhas = await repo.buscarPorCidade(ibge);
  const por = (cargo: "deputado_federal" | "senador") =>
    linhas.filter((l) => l.cargo === cargo).map((l): [string, number, number] => [l.politico.id, l.votos, l.posicao]);
  const pessoas = Object.fromEntries(linhas.map((l) => [l.politico.id, resumoCard(l.politico)]));
  const corpo: CidadeJson = { ibge, nome: m.nome, deputado_federal: por("deputado_federal"), senador: por("senador"), pessoas };
  return Response.json(corpo);
}
