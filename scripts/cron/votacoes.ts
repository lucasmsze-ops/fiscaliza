/**
 * Job `votacoes` (E21a): votações nominais do plenário, votos e orientações, Câmara e Senado,
 * incremental. Parte da última data já conhecida menos MARGEM_DIAS (a Câmara publica votos e
 * detalhes com atraso) e vai até hoje. Respostas brutas ficam em estado/fontes: votação passada
 * não muda, então nunca é baixada de novo. Votos só dos políticos que já estão em `politicos`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mapLimite } from "../../lib/async";
import { getOrientacoes, getVotacao, getVotos, listarVotacoesPlenario as listarCamara, type OrientacaoCamara, type VotacaoDetalhe, type VotoCamara } from "../../lib/camara";
import { paraLinha } from "../../lib/linhas";
import { baseCamara, linhaOrientacao, linhaVotacaoCamara, linhaVotacaoSenado, linhaVotoCamara, linhaVotoSenado, placarDe, placarSenado } from "../../lib/linhas-votacao";
import { listarOrientacoesPlenario, listarVotacoesPlenario as listarSenado } from "../../lib/senado";
import type { Orientacao, Votacao, Voto } from "../../lib/types";
import { FONTES, lerTabela, type LinhaBruta } from "./estado";

const MARGEM_DIAS = 14;
const INICIO = "2023-01-01";
const EM_VOO = 6;

const menosDias = (iso: string, d: number) => new Date(Date.parse(`${iso}T00:00:00Z`) - d * 86_400_000).toISOString().slice(0, 10);

function cache<T>(arquivo: string): T | null {
  return existsSync(arquivo) ? (JSON.parse(readFileSync(arquivo, "utf8")) as T) : null;
}

export interface ResultadoVotacoes {
  votacoes: LinhaBruta[];
  votos: LinhaBruta[];
  orientacoes: LinhaBruta[];
  relatorio: string[];
  /** Chamadas que falharam (a votação fica para a próxima execução, dentro da margem). */
  falhas: number;
}

export async function jobVotacoes(hoje: string): Promise<ResultadoVotacoes> {
  const politicos = lerTabela("politicos");
  const atuais = lerTabela("votacoes") as unknown as { casa: string; data: string }[];
  const porCamara = new Map(politicos.filter((p) => p.camara_id).map((p) => [Number(p.camara_id), String(p.id)]));
  const porSenado = new Map(politicos.filter((p) => p.senado_codigo).map((p) => [String(p.senado_codigo), String(p.id)]));
  const desde = (casa: string) => {
    const ultima = atuais.filter((v) => v.casa === casa).map((v) => v.data).sort().at(-1);
    return ultima ? menosDias(ultima, MARGEM_DIAS) : INICIO;
  };
  const votacoes: Votacao[] = [], votos: Voto[] = [], orientacoes: Orientacao[] = [], relatorio: string[] = [];

  // ---------------------------------------------------------------- Câmara
  const dirVotos = `${FONTES}/camara-votos`, dirDet = `${FONTES}/camara-votacao`;
  mkdirSync(dirVotos, { recursive: true }); mkdirSync(dirDet, { recursive: true });
  const ini = desde("camara");
  const lista = await listarCamara(ini, hoje);
  let doCache = 0;
  const comVotos = await mapLimite(lista, EM_VOO, async (v) => {
    const arq = `${dirVotos}/${v.idExterno}.json`;
    let vs = cache<VotoCamara[]>(arq);
    if (vs) doCache++;
    else { vs = await getVotos(v.idExterno); if (vs.length) writeFileSync(arq, JSON.stringify(vs)); } // vazio: pode chegar depois
    return { v, vs };
  });
  const nominais = comVotos.ok.filter((r) => r.vs.length > 0);
  const det = await mapLimite(nominais, EM_VOO, async (r) => {
    const arq = `${dirDet}/${r.v.idExterno}.json`;
    let d = cache<{ detalhe: VotacaoDetalhe; orientacoes: OrientacaoCamara[] }>(arq);
    if (!d) { d = { detalhe: await getVotacao(r.v.idExterno), orientacoes: await getOrientacoes(r.v.idExterno) }; writeFileSync(arq, JSON.stringify(d)); }
    return { ...r, ...d };
  });
  for (const r of det.ok) {
    votacoes.push(linhaVotacaoCamara(baseCamara(r.detalhe), placarDe(r.vs)));
    for (const x of r.vs) { const id = porCamara.get(x.camaraId); if (id) votos.push(linhaVotoCamara(x, id)); }
    for (const o of r.orientacoes) orientacoes.push(linhaOrientacao("camara", o));
  }
  const falhasCam = comVotos.falhas.length + det.falhas.length;
  relatorio.push(`Câmara ${ini}→${hoje}: ${lista.length} votações listadas, ${nominais.length} nominais (${doCache} do cache), ${falhasCam} falhas`);

  // ---------------------------------------------------------------- Senado
  const iniS = desde("senado");
  const [vsSen, orient] = await Promise.all([listarSenado(iniS, hoje), listarOrientacoesPlenario(iniS, hoje)]);
  const porSeq = new Map(vsSen.filter((v) => v.sequencialVotacao !== null).map((v) => [v.sequencialVotacao!, v.idExterno]));
  for (const v of vsSen) {
    const { votos: todos, ...base } = v;
    votacoes.push(linhaVotacaoSenado(base, placarSenado(v)));
    for (const x of todos) { const id = porSenado.get(x.senadoCodigo); if (id) votos.push(linhaVotoSenado(x, id)); }
  }
  let semVotacao = 0;
  for (const o of orient) {
    const id = porSeq.get(o.sequencialVotacao);
    if (!id) { semVotacao++; continue; }
    for (const x of o.orientacoes) orientacoes.push(linhaOrientacao("senado", { votacaoId: id, bancada: x.bancada, orientacao: x.orientacao }));
  }
  relatorio.push(`Senado ${iniS}→${hoje}: ${vsSen.length} votações nominais, orientações em ${orient.length - semVotacao} (${semVotacao} sem votação no /votacao)`);

  const linhas = <T extends object>(xs: T[]) => xs.map((x) => paraLinha(x) as unknown as LinhaBruta);
  return { votacoes: linhas(votacoes), votos: linhas(votos), orientacoes: linhas(orientacoes), relatorio, falhas: falhasCam };
}
