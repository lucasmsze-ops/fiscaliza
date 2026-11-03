/**
 * Job `votacoes` (E21a, ampliado na E21c): votações nominais do plenário, votos e orientações,
 * Câmara e Senado.
 *
 * Votações novas: Câmara pela janela da última data conhecida − MARGEM_DIAS até hoje (votos e
 * detalhes chegam com atraso); Senado pelo ano inteiro (uma chamada por ano).
 * Votos: derivados de TODAS as votações nominais conhecidas, para TODOS os políticos com camaraId
 * ou senadoCodigo, a partir das respostas brutas em estado/fontes. Assim quem entra em `politicos`
 * (E21c) ganha o histórico desde 2023 sem job separado. Votação passada não muda: a resposta
 * bruta é baixada uma vez e fica em estado/fontes (as da sonda foram copiadas para lá na E22).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mapLimite } from "../../lib/async";
import { getOrientacoes, getVotacao, getVotos, listarVotacoesPlenario as listarCamara, type OrientacaoCamara, type VotacaoDetalhe, type VotoCamara } from "../../lib/camara";
import { paraLinha } from "../../lib/linhas";
import { baseCamara, linhaOrientacao, linhaVotacaoCamara, linhaVotacaoSenado, linhaVotoCamara, linhaVotoSenado, placarDe, placarSenado } from "../../lib/linhas-votacao";
import { listarOrientacoesPlenario, listarVotacoesPlenario as listarSenado, type VotacaoOrientacaoSenado, type VotacaoSenado } from "../../lib/senado";
import type { Orientacao, Votacao, Voto } from "../../lib/types";
import { FONTES, lerTabela, type LinhaBruta } from "./estado";

const MARGEM_DIAS = 14;
const INICIO_CAMARA = "2023-01-01";
const INICIO_SENADO = "2023-02-01"; // posse da 57ª legislatura (mesmo corte da sonda)
const EM_VOO = 6;

const menosDias = (iso: string, d: number) => new Date(Date.parse(`${iso}T00:00:00Z`) - d * 86_400_000).toISOString().slice(0, 10);
const ler = <T>(f: string): T | null => (existsSync(f) ? (JSON.parse(readFileSync(f, "utf8")) as T) : null);

export interface ResultadoVotacoes {
  votacoes: LinhaBruta[];
  votos: LinhaBruta[];
  orientacoes: LinhaBruta[];
  relatorio: string[];
  /** Chamadas que falharam (tentadas de novo na próxima execução). */
  falhas: number;
}

export async function jobVotacoes(hoje: string): Promise<ResultadoVotacoes> {
  const politicos = lerTabela("politicos");
  const atuais = lerTabela("votacoes") as unknown as { id: string; id_externo: string; casa: string; data: string }[];
  const porCamara = new Map(politicos.filter((p) => p.camara_id).map((p) => [Number(p.camara_id), String(p.id)]));
  const porSenado = new Map(politicos.filter((p) => p.senado_codigo).map((p) => [String(p.senado_codigo), String(p.id)]));
  const votacoes: Votacao[] = [], votos: Voto[] = [], orientacoes: Orientacao[] = [], relatorio: string[] = [];
  let falhas = 0;

  // ---------------------------------------------------------------- Câmara
  const dirVotos = `${FONTES}/camara-votos`, dirDet = `${FONTES}/camara-votacao`;
  mkdirSync(dirVotos, { recursive: true }); mkdirSync(dirDet, { recursive: true });
  const ultima = atuais.filter((v) => v.casa === "camara").map((v) => v.data).sort().at(-1);
  const ini = ultima ? menosDias(ultima, MARGEM_DIAS) : INICIO_CAMARA;
  const lista = await listarCamara(ini, hoje);
  let baixados = 0;
  const votosDe = async (id: string): Promise<VotoCamara[]> => {
    const arq = `${dirVotos}/${id}.json`;
    const guardado = ler<VotoCamara[]>(arq);
    if (guardado?.length) return guardado;
    const vs = await getVotos(id);
    baixados++;
    if (vs.length) writeFileSync(arq, JSON.stringify(vs)); // vazio: pode chegar depois
    return vs;
  };
  // Novas: votações da janela com votos; conhecidas: as nominais que já estão em `votacoes`.
  const janela = await mapLimite(lista, EM_VOO, async (v) => ({ id: v.idExterno, vs: await votosDe(v.idExterno) }));
  const novasNominais = janela.ok.filter((r) => r.vs.length > 0);
  const det = await mapLimite(novasNominais, EM_VOO, async (r) => {
    const arq = `${dirDet}/${r.id}.json`;
    let d = ler<{ detalhe: VotacaoDetalhe; orientacoes: OrientacaoCamara[] }>(arq);
    if (!d) { d = { detalhe: await getVotacao(r.id), orientacoes: await getOrientacoes(r.id) }; writeFileSync(arq, JSON.stringify(d)); }
    return { ...r, ...d };
  });
  for (const r of det.ok) {
    votacoes.push(linhaVotacaoCamara(baseCamara(r.detalhe), placarDe(r.vs)));
    for (const o of r.orientacoes) orientacoes.push(linhaOrientacao("camara", o));
  }
  const nominais = new Set([...atuais.filter((v) => v.casa === "camara").map((v) => v.id_externo), ...det.ok.map((r) => r.id)]);
  const todos = await mapLimite([...nominais], EM_VOO, async (id) => ({ id, vs: await votosDe(id) }));
  for (const r of todos.ok) for (const x of r.vs) { const pid = porCamara.get(x.camaraId); if (pid) votos.push(linhaVotoCamara(x, pid)); }
  falhas += janela.falhas.length + det.falhas.length + todos.falhas.length;
  relatorio.push(`Câmara ${ini}→${hoje}: ${lista.length} votações na janela, ${novasNominais.length} nominais; votos de ${porCamara.size} políticos em ${nominais.size} nominais (${baixados} respostas baixadas); falhas ${janela.falhas.length + det.falhas.length + todos.falhas.length}`);

  // ---------------------------------------------------------------- Senado (ano a ano)
  const anoAtual = Number(hoje.slice(0, 4));
  let votosSenado = 0;
  for (let ano = Number(INICIO_SENADO.slice(0, 4)); ano <= anoAtual; ano++) {
    const de = ano === Number(INICIO_SENADO.slice(0, 4)) ? INICIO_SENADO : `${ano}-01-01`, ate = ano === anoAtual ? hoje : `${ano}-12-31`;
    const arqV = `${FONTES}/senado-votacao-${ano}.json`, arqO = `${FONTES}/senado-orientacao-${ano}.json`;
    let vs = ano < anoAtual ? ler<VotacaoSenado[]>(arqV) : null;
    let os = ano < anoAtual ? ler<VotacaoOrientacaoSenado[]>(arqO) : null;
    try {
      if (!vs) { vs = await listarSenado(de, ate); writeFileSync(arqV, JSON.stringify(vs)); }
      if (!os) { os = await listarOrientacoesPlenario(de, ate); writeFileSync(arqO, JSON.stringify(os)); }
    } catch (e) {
      falhas++; relatorio.push(`Senado ${ano}: FALHA ${(e as Error).message.slice(0, 120)}`);
      vs ??= ler<VotacaoSenado[]>(arqV); os ??= ler<VotacaoOrientacaoSenado[]>(arqO); // segue com o último ano baixado
      if (!vs || !os) continue;
    }
    const porSeq = new Map(vs.filter((v) => v.sequencialVotacao !== null).map((v) => [v.sequencialVotacao!, v.idExterno]));
    for (const v of vs) {
      const { votos: todosV, ...base } = v;
      votacoes.push(linhaVotacaoSenado(base, placarSenado(v)));
      for (const x of todosV) { const pid = porSenado.get(x.senadoCodigo); if (pid) { votos.push(linhaVotoSenado(x, pid)); votosSenado++; } }
    }
    for (const o of os) {
      const id = porSeq.get(o.sequencialVotacao);
      if (id) for (const x of o.orientacoes) orientacoes.push(linhaOrientacao("senado", { votacaoId: id, bancada: x.bancada, orientacao: x.orientacao }));
    }
  }
  relatorio.push(`Senado ${INICIO_SENADO}→${hoje}: votos de ${porSenado.size} senadores (${votosSenado} linhas)`);

  const linhas = <T extends object>(xs: T[]) => xs.map((x) => paraLinha(x) as unknown as LinhaBruta);
  return { votacoes: linhas(votacoes), votos: linhas(votos), orientacoes: linhas(orientacoes), relatorio, falhas };
}
