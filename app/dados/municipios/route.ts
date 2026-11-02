import { repo } from "@/lib/repo";

// Lista das 5.571 cidades para a busca da página inicial: [código IBGE, nome, UF]. Estática, servida
// pela CDN e baixada só quando a pessoa começa a digitar (fora do HTML da página inicial).
export const dynamic = "force-static";
export const revalidate = 86400;

export type MunicipioJson = [number, string, string];

export async function GET() {
  const ms = await repo.listarMunicipios();
  return Response.json(ms.map((m): MunicipioJson => [m.ibge, m.nome, m.uf]));
}
