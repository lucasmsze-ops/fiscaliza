import { limitesDoMes, resumirVotacao } from "@/lib/congresso";
import { repo } from "@/lib/repo";

// Votações nominais de um mês (AAAA-MM) para a agenda de /congresso, baixadas quando a pessoa troca
// de mês. Cada mês é gerado na primeira visita e fica na CDN (ISR); nada consulta a fonte oficial.
export const revalidate = 86400;
export async function generateStaticParams() {
  return [];
}

export async function GET(_: Request, { params }: { params: Promise<{ mes: string }> }) {
  const { mes } = await params;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) return new Response("mês inválido", { status: 400 });
  return Response.json((await repo.votacoesEntre(...limitesDoMes(mes))).map(resumirVotacao));
}
