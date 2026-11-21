/**
 * Job `pauta` (2026-11-13): o que está marcado para o Plenário das duas Casas, de hoje em diante, para
 * a lista "Próximas votações" de /votacoes. Atualizado uma vez por dia (nunca ao vivo).
 *
 * Câmara: sessões deliberativas de `/eventos?idOrgao=180` nas próximas 3 semanas e a pauta de cada uma.
 * Senado: agenda do mês corrente e do seguinte (`/plenario/agenda/mes`), só sessões deliberativas do
 * Senado (as do Congresso, como vetos, não entram, como nas votações).
 *
 * Toda linha leva `coletado_em` (o dia desta coleta). O cron nunca apaga: item que saiu da pauta (sessão
 * cancelada, matéria retirada) fica com a coleta antiga, e o site mostra só os da coleta mais recente.
 */
import { getPautaEvento, listarSessoesDeliberativas } from "../../lib/camara";
import { somaDias } from "../../lib/datas";
import { getAgendaPlenarioMes } from "../../lib/senado";
import type { LinhaBruta } from "./estado";


export async function jobPauta(hoje: string): Promise<{ tabelas: Record<string, LinhaBruta[]>; relatorio: string[]; falhas: number; atualizadas: string[] }> {
  const linhas: LinhaBruta[] = [];
  const relatorio: string[] = [];
  let falhas = 0;
  const atualizadas: string[] = [];

  try {
    const sessoes = (await listarSessoesDeliberativas(hoje, somaDias(hoje, 21))).filter((s) => s.situacao !== "Cancelada" && s.dataHoraInicio.slice(0, 10) >= hoje);
    let itens = 0;
    for (const s of sessoes) {
      for (const x of await getPautaEvento(s.id)) {
        const p = x.proposicao;
        if (!p) continue;
        itens++;
        linhas.push({
          id: `camara:${s.id}:${x.ordem}:${p.id}`, casa: "camara", data: s.dataHoraInicio.slice(0, 10), hora: s.dataHoraInicio.slice(11, 16) || null,
          sessao: s.tipo, ordem: x.ordem, materia: `${p.tipo} ${p.numero}/${p.ano}`, tipo: p.tipo, ementa: p.ementa,
          relacionada: x.relacionada ? `${x.relacionada.tipo} ${x.relacionada.numero}/${x.relacionada.ano}` : null,
          ementa_relacionada: x.relacionada?.ementa ?? null, apreciacao: x.regime,
          url_oficial: `https://www.camara.leg.br/evento-legislativo/${s.id}`, coletado_em: hoje,
        });
      }
    }
    relatorio.push(`Câmara: ${sessoes.length} sessões deliberativas marcadas, ${itens} itens na pauta`);
    atualizadas.push("camara_pauta");
  } catch (e) {
    falhas++;
    relatorio.push(`Câmara: pauta FALHOU (${(e as Error).message})`);
  }

  try {
    const prox = new Date(`${hoje.slice(0, 7)}-01T12:00:00Z`); prox.setUTCMonth(prox.getUTCMonth() + 1);
    const meses = [hoje.replaceAll("-", ""), `${prox.toISOString().slice(0, 7).replace("-", "")}01`];
    const sessoes = (await Promise.all(meses.map(getAgendaPlenarioMes))).flat()
      .filter((s) => s.casa === "SF" && /DELIBERATIVA/.test(s.tipo) && !/N[ÃA]O DELIBERATIVA/.test(s.tipo) && s.data >= hoje && !/não realizada|cancelada/i.test(s.situacao));
    let itens = 0;
    for (const s of sessoes) {
      s.materias.forEach((m, i) => {
        itens++;
        linhas.push({
          id: `senado:${s.codigo}:${m.codigo}`, casa: "senado", data: s.data, hora: s.hora, sessao: s.tipo.toLowerCase().replace(/^./, (c) => c.toUpperCase()),
          ordem: i + 1, materia: `${m.sigla} ${m.numero}/${m.ano}`, tipo: m.sigla, ementa: m.ementa, relacionada: null, ementa_relacionada: null,
          apreciacao: m.apreciacao && m.apreciacao !== "-" ? m.apreciacao : null, url_oficial: `https://www25.senado.leg.br/web/atividade/materias/-/materia/${m.codigo}`, coletado_em: hoje,
        });
      });
    }
    relatorio.push(`Senado: ${sessoes.length} sessões deliberativas marcadas, ${itens} matérias na pauta`);
    atualizadas.push("senado_pauta");
  } catch (e) {
    falhas++;
    relatorio.push(`Senado: pauta FALHOU (${(e as Error).message})`);
  }

  return { tabelas: falhas === 2 ? {} : { pauta: linhas }, relatorio, falhas, atualizadas };
}
