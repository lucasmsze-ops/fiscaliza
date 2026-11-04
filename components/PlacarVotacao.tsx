import type { VotacaoResumo } from "@/lib/congresso";
import { inteiro } from "@/lib/card";

/**
 * Placar como a fonte publica. Secreta (Senado): só quem votou. Votação de pessoa na Câmara: o voto
 * fica registrado, mas a direção não é divulgada (placar zerado); nunca mostrar "0 sim · 0 não".
 */
export function PlacarVotacao({ v, barra = false }: { v: VotacaoResumo; barra?: boolean }) {
  if (v.secreta || !v.placar) return <span className="text-suave">votação secreta: o Senado publica só quem votou</span>;
  const { sim, nao, abstencao, obstrucao } = v.placar;
  const total = sim + nao + abstencao + obstrucao;
  if (total === 0) return <span className="text-suave">a Câmara não divulga a direção dos votos nesta votação</span>;
  return (
    <span className="grid w-full gap-2">
      <span className="tabular-nums">
        Placar: <strong className="text-[#2f855a] dark:text-[#68d391]">{inteiro(sim)} sim</strong> · <strong className="text-[#c53030] dark:text-[#fc8181]">{inteiro(nao)} não</strong>
        {abstencao > 0 && <> · {inteiro(abstencao)} abstenções</>}
        {obstrucao > 0 && <> · {inteiro(obstrucao)} em obstrução</>}
      </span>
      {barra && (
        <span className="flex h-2.5 w-full overflow-hidden rounded-md bg-fundo" aria-hidden="true">
          <span className="bg-[#2f855a] dark:bg-[#68d391]" style={{ width: `${(sim / total) * 100}%` }} />
          <span className="bg-[#c53030] dark:bg-[#fc8181]" style={{ width: `${(nao / total) * 100}%` }} />
        </span>
      )}
    </span>
  );
}
