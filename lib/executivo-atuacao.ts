/**
 * O que o crachá do executivo mostra de atuação (E23t, pedido de 2026-11-20):
 * - presidente que já governava (eleito em 2022 segundo o histórico do TSE): o que o Poder Executivo federal enviou
 *   ao Congresso desde 2023 (`proposicoes_executivo`);
 * - governador que tem mandato no Congresso: o crachá dele no site, achado pelo nome civil e pela UF (o TSE e o
 *   Senado escrevem o nome com espaços diferentes: "ABDELAZIZ" × "Abdel Aziz", então compara só as letras).
 * As Assembleias Legislativas não têm dado aberto unificado (Passo 6): atos de governador ficam de fora.
 */
import type { Repo } from "./repo";
import { normalizar } from "./texto";
import type { ExecutivoEleito, Politico } from "./types";

/** Governa desde 2023: eleito presidente em 2022 (histórico de candidaturas do TSE). */
export const presidenteEmExercicio = (e: ExecutivoEleito) =>
  e.cargo === "presidente" && (e.historico ?? []).some((h) => h.ano === 2022 && /^presidente$/i.test(h.cargo) && /^eleit/i.test(h.resultado ?? ""));

/**
 * Governa desde 1/1/2023: eleito em 2022 para o mesmo cargo (presidente, ou governador, que disputou a reeleição sem
 * deixar o cargo; regra da E23w). Quem não governa vê as contas e os índices como ponto de partida, "antes da posse".
 */
export const governaDesde2023 = (e: ExecutivoEleito) =>
  (e.historico ?? []).some((h) => h.ano === 2022 && (e.cargo === "presidente" ? /^presidente$/i : /^governador$/i).test(h.cargo) && /^eleit/i.test(h.resultado ?? ""));

const letras = (s: string) => normalizar(s).replace(/[^a-z]/g, "");

/** O parlamentar do site que é a mesma pessoa do governador eleito (nome civil e UF); null se não houver. */
export async function parlamentarDoGovernador(repo: Repo, e: ExecutivoEleito): Promise<Politico | null> {
  if (e.cargo !== "governador" || !e.nome) return null;
  const alvo = letras(e.nome);
  const achados = (await repo.listarPoliticos()).filter((p) => (p.camaraId || p.senadoCodigo) && p.uf === e.uf && letras(p.nome) === alvo);
  return achados.length === 1 ? achados[0]! : null;
}
