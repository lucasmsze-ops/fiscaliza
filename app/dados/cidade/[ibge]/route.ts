import { repo } from "@/lib/repo";

// Top-20 de cada município (com empatados), um JSON estático por cidade gerado no build.
export const dynamic = "force-static";
export const dynamicParams = false;
export const revalidate = 86400;

export async function generateStaticParams() {
  return (await repo.listarMunicipios()).map((m) => ({ ibge: String(m.ibge) }));
}

export interface CidadeJson {
  ibge: number;
  nome: string;
  /** [id do político, votos na cidade, posição] em ordem de votos. */
  deputado_federal: [string, number, number][];
  senador: [string, number, number][];
}

export async function GET(_req: Request, { params }: { params: Promise<{ ibge: string }> }) {
  const ibge = Number((await params).ibge);
  const m = await repo.getMunicipio(ibge);
  if (!m) return new Response("Município não encontrado", { status: 404 });
  const linhas = await repo.buscarPorCidade(ibge);
  const por = (cargo: "deputado_federal" | "senador") =>
    linhas.filter((l) => l.cargo === cargo).map((l): [string, number, number] => [l.politico.id, l.votos, l.posicao]);
  const corpo: CidadeJson = { ibge, nome: m.nome, deputado_federal: por("deputado_federal"), senador: por("senador") };
  return Response.json(corpo);
}
