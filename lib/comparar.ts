/**
 * Comparar lado a lado (/comparar, E23f): uma coluna por pessoa, só com o que tem fonte oficial e já
 * aparece no crachá (os números são os mesmos, para as telas não se contradizerem). Sem nota nem
 * ranking: a tabela não ordena nem destaca ninguém. "—" vem sempre com o porquê.
 */
import { MINIMO_FIDELIDADE } from "./acompanhar";
import type { PaginaDados } from "./pagina";
import { nomePartido } from "./partidos";
import { subsidioEm } from "./salario";
import type { Politico } from "./types";

export const MAX_COMPARAR = 5;

/** Uma célula: o valor e, menor, o detalhe ou o porquê do "—". */
export interface Celula { valor: string | null; nota: string | null }

export interface ColunaComparar {
  id: string;
  nomeUrna: string;
  fotoUrl: string | null;
  cargo: string;
  partidoUf: string;
  linhas: {
    partido: Celula; situacao: Celula; salario: Celula; votos2026: Celula;
    participacao: Celula; comPartido: Celula; propostas: Celula; desde: Celula;
  };
}

export const LINHAS: { k: keyof ColunaComparar["linhas"]; rotulo: string }[] = [
  { k: "partido", rotulo: "Partido" },
  { k: "situacao", rotulo: "Situação em 2026" },
  { k: "salario", rotulo: "Salário por mês" },
  { k: "votos2026", rotulo: "Votos em 2026" },
  { k: "participacao", rotulo: "Participação em votações, 2023–2026" },
  { k: "comPartido", rotulo: "Votou com o partido" },
  { k: "propostas", rotulo: "Propostas que podem virar lei, desde 2023" },
  { k: "desde", rotulo: "Na Casa desde" },
];

const int = (n: number) => n.toLocaleString("pt-BR");
const pct = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const reais = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const c = (valor: string | null, nota: string | null = null): Celula => ({ valor, nota });

export function montarColuna(pg: PaginaDados, p: Politico | null, hoje: string): ColunaComparar {
  const d = pg.card, n = d.numeros;
  const sigla = d.partidoUf.slice(0, -3);
  const nome = nomePartido(sigla);
  const emCurso = pg.mandatos.some((m) => m.fim === null && m.inicio <= hoje);
  const sal = emCurso ? subsidioEm(hoje) : null;
  const f = pg.fidelidade, totalF = f ? f.com + f.contra : 0;
  const pr = pg.propostas;
  // A Casa do mandato mais recente e o primeiro mandato registrado nela. Não "no Congresso": de quem é
  // senador hoje só temos os mandatos do Senado (um ex-deputado não aparece como deputado aqui).
  const ultimo = [...pg.mandatos].sort((a, b) => b.inicio.localeCompare(a.inicio))[0];
  const naCasa = ultimo ? pg.mandatos.filter((m) => m.cargo === ultimo.cargo) : [];
  const inicio = naCasa.map((m) => m.inicio).sort()[0];
  return {
    id: d.id, nomeUrna: d.nomeUrna, fotoUrl: d.fotoUrl, cargo: d.cargo, partidoUf: d.partidoUf,
    linhas: {
      partido: c(sigla, nome && nome.toLowerCase() !== sigla.toLowerCase() ? nome : null),
      situacao: c(d.status),
      salario: sal ? c(reais(sal.valor), "o mesmo para todo o Congresso") : c(null, "sem mandato no Congresso hoje"),
      votos2026: p?.votos2026 != null ? c(int(p.votos2026), `candidatura a ${d.cargo.toLowerCase()}`) : c(null, "não disputou deputado federal ou senador em 2026"),
      participacao: n.tipo === "mandato" && n.participacao.percentual !== null
        ? c(pct(n.participacao.percentual), `${int(n.participacao.numerador)} de ${int(n.participacao.denominador)} votações`)
        : c(null, n.tipo === "primeiro_voto" ? "primeiro voto em fevereiro de 2027" : "sem mandato no Congresso no período"),
      comPartido: f && totalF >= MINIMO_FIDELIDADE
        ? c(pct(Math.round((1000 * f.com) / totalF) / 10), `em ${int(totalF)} votações com orientação do partido`)
        : c(null, n.tipo === "mandato" ? "poucas votações com a orientação do partido identificada" : "sem mandato no Congresso no período"),
      propostas: pr ? c(int(pr.leis), `${int(pr.primeiroAutor)} como primeiro autor · ${int(pr.viraramNorma)} ${pr.viraramNorma === 1 ? "virou" : "viraram"} norma`) : c(null, "sem registro na Câmara ou no Senado"),
      desde: inicio && ultimo
        ? c(inicio.slice(0, 4), `${ultimo.cargo === "senador" ? "no Senado" : "na Câmara"} · ${naCasa.length === 1 ? "1 período de exercício registrado" : `${naCasa.length} períodos de exercício registrados`}`)
        : c(null, "sem mandato no Congresso registrado"),
    },
  };
}
