import { hrefExecutivo, idExecutivo, type ItemExecutivo } from "@/lib/quem-votei";
import { repo } from "@/lib/repo";
import { normalizar } from "@/lib/texto";
import type { CandidatoExecutivo } from "@/lib/types";

// Índice de presidente e governadores de 2026 para o "Quem votei" (Monitorando): todos os candidatos
// (`candidatos_executivo`, E23q), com o crachá e o id do Monitorando para os eleitos (`executivos`). Antes da
// migração 0011 a tabela de candidatos não existe e ficam só os eleitos. CDN, uma vez por dia.
export const dynamic = "force-static";
export const revalidate = 86400;

const situacao = (c: Pick<CandidatoExecutivo, "situacao" | "genero">) => {
  const a = c.genero === "feminino" ? "a" : "o";
  return c.situacao === "eleito" ? `Eleit${a} em 2026` : c.situacao === "nao_eleito" ? `Não eleit${a} em 2026` : "Situação não informada pelo TSE";
};

export async function GET() {
  const [eleitos, candidatos] = await Promise.all([repo.listarExecutivos(), repo.listarCandidatosExecutivo().catch(() => [])]);
  const doEleito = new Map(eleitos.map((e) => [e.id, e]));
  const base: CandidatoExecutivo[] = candidatos.length ? candidatos : eleitos.map((e) => ({ ...e, situacao: "eleito" as const }));
  const itens: ItemExecutivo[] = base.map((c) => {
    const e = c.situacao === "eleito" ? doEleito.get(c.id) : undefined;
    return {
      id: e ? idExecutivo(e) : `candidato-${c.tseSqCandidato}`, cargo: c.cargo, uf: c.uf, nomeUrna: c.nomeUrna, partido: c.partido,
      fotoUrl: c.fotoUrl, eleito: !!e, situacao: situacao(c), href: e ? hrefExecutivo(e) : null,
      busca: normalizar(`${c.nomeUrna} ${c.nome} ${c.numeroUrna ?? ""}`),
    };
  });
  // Eleitos primeiro em cada cargo e UF; depois os demais por nome.
  itens.sort((a, b) => Number(b.eleito) - Number(a.eleito) || a.nomeUrna.localeCompare(b.nomeUrna, "pt-BR"));
  return Response.json(itens);
}
