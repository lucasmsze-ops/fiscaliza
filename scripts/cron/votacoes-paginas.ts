/**
 * Página de cada votação nominal (/votacoes/[id], E23k), depois de "votou com o partido". O partido
 * de cada voto vem das respostas em cache das fontes (lib/fidelidade.ts usa a mesma leitura).
 *
 * Câmara: a fonte lista só quem votou. Quem não votou = deputado em exercício no dia (mandato em
 * curso e sem licença cobrindo a data) que não aparece na lista, com o partido do voto mais próximo
 * dele no tempo (se nunca votou, o partido de hoje). Senado: a fonte lista os 81.
 *
 * Grava `estado/dados/resumos_votacao.json` (votacao_id, pagina); o envio ao banco é em resumos.ts.
 */
import { siglaPartido } from "../../lib/partidos";
import type { Casa, TipoVoto, Votacao } from "../../lib/types";
import { montarPaginaVotacao, tipoDe } from "../../lib/votacao";
import { lerTabela, type LinhaBruta } from "./estado";
import { votosComPartido } from "./fidelidade";

const votacaoDe = (l: LinhaBruta): Votacao => ({
  id: String(l.id), idExterno: String(l.id_externo), casa: l.casa as Casa, data: String(l.data), proposicao: (l.proposicao as string) ?? null,
  ementa: (l.ementa as string) ?? null, objeto: (l.objeto as string) ?? null, descricao: String(l.descricao),
  resultado: (l.resultado as Votacao["resultado"]) ?? null, placar: (l.placar as Votacao["placar"]) ?? null, secreta: Boolean(l.secreta), urlOficial: String(l.url_oficial),
});

export function calcularPaginasVotacao(): { linhas: LinhaBruta[]; relatorio: string[] } {
  const politicos = lerTabela("politicos");
  const partidoHoje = new Map(politicos.map((p) => [String(p.id), String(p.partido)]));
  const votacoes = lerTabela("votacoes").map(votacaoDe);
  const dataDe = new Map(votacoes.map((v) => [v.id, v.data]));

  const porVotacao = new Map<string, { politicoId: string; voto: TipoVoto; partido: string }[]>();
  const historico = new Map<string, { data: string; partido: string }[]>();
  for (const x of votosComPartido(politicos, true)) {
    const l = porVotacao.get(x.votacaoId) ?? [];
    l.push(x);
    porVotacao.set(x.votacaoId, l);
    const data = dataDe.get(x.votacaoId);
    if (data) { const h = historico.get(x.politicoId) ?? []; h.push({ data, partido: x.partido }); historico.set(x.politicoId, h); }
  }
  for (const h of historico.values()) h.sort((a, b) => a.data.localeCompare(b.data));
  const partidoPerto = (pid: string, data: string) => {
    const h = historico.get(pid);
    if (!h?.length) return partidoHoje.get(pid) ?? "S/PARTIDO";
    let melhor = h[0]!;
    for (const x of h) if (Math.abs(Date.parse(x.data) - Date.parse(data)) < Math.abs(Date.parse(melhor.data) - Date.parse(data))) melhor = x;
    return melhor.partido;
  };

  const mandatos = lerTabela("mandatos").filter((m) => m.cargo === "deputado_federal");
  const afastamentos = lerTabela("afastamentos");
  const deputadosEm = (data: string) => {
    const afastados = new Set(afastamentos.filter((a) => String(a.inicio) <= data && (a.fim === null || String(a.fim) >= data)).map((a) => String(a.politico_id)));
    return new Set(mandatos.filter((m) => String(m.inicio) <= data && (m.fim === null || String(m.fim) >= data) && !afastados.has(String(m.politico_id))).map((m) => String(m.politico_id)));
  };

  const oriPor = new Map<string, { bancada: string; orientacao: string }[]>();
  for (const o of lerTabela("orientacoes")) {
    const l = oriPor.get(String(o.votacao_id)) ?? [];
    l.push({ bancada: String(o.bancada), orientacao: String(o.orientacao) });
    oriPor.set(String(o.votacao_id), l);
  }
  const porMateria = new Map<string, Votacao[]>();
  for (const v of votacoes) if (v.proposicao) { const k = `${v.casa}|${v.proposicao}`; const l = porMateria.get(k) ?? []; l.push(v); porMateria.set(k, l); }
  const propostas = new Map(lerTabela("proposicoes").map((p) => [`${p.casa}|${p.tipo} ${p.numero}/${p.ano}`, { apresentacao: (p.apresentacao as string) ?? null, situacao: (p.situacao as string) ?? null }]));

  const linhas: LinhaBruta[] = [];
  let semVotos = 0, semPartido = 0;
  for (const v of votacoes) {
    const registrados = porVotacao.get(v.id) ?? [];
    if (!registrados.length) { semVotos++; continue; }
    const votos = registrados.map((x) => ({ voto: x.voto, partido: x.partido }));
    if (v.casa === "camara") {
      const votaram = new Set(registrados.map((x) => x.politicoId));
      for (const pid of deputadosEm(v.data)) if (!votaram.has(pid)) votos.push({ voto: "ausente", partido: partidoPerto(pid, v.data) });
    }
    const materia = v.proposicao ? (porMateria.get(`${v.casa}|${v.proposicao}`) ?? [v]) : [v];
    const chaveProposta = v.proposicao ? `${v.casa}|${tipoDe(v.proposicao)} ${v.proposicao.replace(/^[A-Z]+\s*/, "").split(" ")[0]}` : "";
    const pagina = montarPaginaVotacao(v, votos.map((x) => ({ ...x, partido: siglaPartido(x.partido) })), oriPor.get(v.id) ?? [], [...materia], propostas.get(chaveProposta) ?? null);
    if (pagina.naoVotouSemPartido > 0) semPartido++;
    linhas.push({ votacao_id: v.id, pagina });
  }
  return {
    linhas: linhas.sort((a, b) => String(a.votacao_id).localeCompare(String(b.votacao_id))),
    relatorio: [`${linhas.length} páginas de votação; ${semVotos} votações sem votos em cache (fora); ${semPartido} da Câmara com deputados que não votaram e sem partido identificado (fora do registro de mandatos)`],
  };
}
