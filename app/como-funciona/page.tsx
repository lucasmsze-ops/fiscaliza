import type { Metadata } from "next";
import Link from "next/link";
import { BarraVoltar } from "@/components/BarraVoltar";
import { Termo } from "@/components/Termo";
import { AbrirPelaAncora } from "@/components/AbrirPelaAncora";
import { PERIODO_GOVERNO, reais } from "@/lib/card";
import { GLOSSARIO, SECOES, type Secao } from "@/lib/glossario";
import { CANAIS_CONFERIDOS_EM, CANAIS_EXTERNOS, OUVIDORIA } from "@/lib/cobrar";
import { SITUACOES_ENCERRADAS } from "@/lib/propostas";
import { repo } from "@/lib/repo";
import { SUBSIDIO_CONGRESSO, subsidioEm } from "@/lib/salario";
import { TITULO_PAGINA } from "@/lib/estilo";
import { hojeBrasil } from "@/lib/datas";

// Metodologia de cada número, fontes, privacidade e licenças (E15). Toda métrica da interface
// linka para uma seção daqui (via components/Termo.tsx). Os números desta página saem do mesmo
// `repo` que o resto do site: nada é digitado à mão. Notas técnicas em docs/METODOLOGIA.md.
export const metadata: Metadata = {
  title: "Como funciona · Fiscaliza",
  description: "Como cada número do Fiscaliza é calculado, de onde vem cada dado, o que fica fora, privacidade e licenças.",
};
export const revalidate = 86400;

const externo = { target: "_blank", rel: "noreferrer noopener" } as const;
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const mesAno = (iso: string) => `${MESES[Number(iso.slice(5, 7)) - 1]}/${iso.slice(0, 4)}`;
const dataBr = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
const n = (v: number) => v.toLocaleString("pt-BR");
/** Data sem hora ("2026-11-01"), sem conversão de fuso. */
const diaBr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

const REPO_URL = "https://github.com/lucasmsze-ops/fiscaliza";

/**
 * Um assunto da página como linha que abre (pedido de 2026-11-20: o índice levava a cartões mais abaixo, o que não fazia
 * sentido numa lista). `<details>` nativo, sem JavaScript; `AbrirPelaAncora` abre o que vier no endereço (#participacao).
 */
function Secao({ id, children }: { id: Secao; children: React.ReactNode }) {
  const titulo = SECOES.find((s) => s.id === id)!.titulo;
  return (
    <details id={id} className="group scroll-mt-16 border-t border-borda first:border-t-0">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 py-2.5 text-base text-texto hover:bg-white/5 [&::-webkit-details-marker]:hidden">
        <h2 id={`h-${id}`} className="flex-1 text-base font-normal group-open:font-semibold">{titulo}</h2>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(235,235,245,0.55)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 transition-transform group-open:rotate-90"><path d="m9 5 7 7-7 7" /></svg>
      </summary>
      <div className="grid gap-3 px-4 pb-4 text-[15px] leading-relaxed text-texto/85">{children}</div>
    </details>
  );
}

const Ext = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} {...externo} className="underline underline-offset-2">{children}</a>
);

export default async function ComoFunciona() {
  const [politicos, municipios, camara, senado, oriCamara, oriSenado, mediasSp] = await Promise.all([
    repo.listarPoliticos(), repo.listarMunicipios(), repo.getVotacoes("camara"), repo.getVotacoes("senado"),
    repo.getOrientacoes("camara", "Governo"), repo.getOrientacoes("senado", "Governo"), repo.getMediasUf("SP", "camara"),
  ]);

  const conta = (f: (p: (typeof politicos)[number]) => boolean) => politicos.filter(f).length;
  const eleitos = conta((p) => p.status === "eleito" || p.status === "reeleito");
  const suplentes = conta((p) => p.status === "suplente");
  const naoEleitos = conta((p) => p.status === "nao_eleito");
  const emExercicio = conta((p) => p.status === "em_exercicio");
  const coleta = politicos.map((p) => p.updatedAt).sort().at(-1)!;

  const faixa = (vs: { data: string }[]) => {
    const ds = vs.map((v) => v.data).sort();
    return `${mesAno(ds[0]!)} a ${mesAno(ds.at(-1)!)}`;
  };
  const secretas = senado.filter((v) => v.secreta).length;
  const posicional = new Set(["Sim", "Não", "Obstrução"]);
  const comOrientacao = (os: { votacaoId: string; orientacao: string }[]) => new Set(os.filter((o) => posicional.has(o.orientacao)).map((o) => o.votacaoId)).size;
  const oriC = comOrientacao(oriCamara), oriS = comOrientacao(oriSenado);

  const ordenadas = [...mediasSp].sort((a, b) => a.ano * 100 + a.mes - (b.ano * 100 + b.mes));
  const fechado = ordenadas.filter((m) => m.fechado).at(-1);
  const abertos = ordenadas.filter((m) => !m.fechado);
  const rotuloMes = (m: { ano: number; mes: number }) => `${MESES[m.mes - 1]}/${m.ano}`;
  const subsidioHoje = subsidioEm(hojeBrasil())!;

  return (
    <>
    <BarraVoltar volta="/" rotulo="Início" />
    <main className="mx-auto grid max-w-xl gap-4 pb-4 lg:pb-8">
      <div className="grid gap-2.5 px-1">
        <h1 className={TITULO_PAGINA}>Como funciona</h1>
        <p className="text-[17px] leading-[23px] text-texto/85">O Fiscaliza mostra o que os dados abertos do TSE, da Câmara dos Deputados e do Senado Federal registram sobre quem recebeu seu voto.</p>
        <p className="text-[15px] leading-[21px] text-suave">O site não qualifica ninguém: mostra o número e a fonte. Cada número tem uma regra de cálculo, descrita nesta página, e um link para a página oficial. O que a fonte não traz aparece como lacuna, nunca como zero.</p>
      </div>

      <section aria-label="Cobertura" className="grid grid-cols-2 gap-2.5">
        {([
          [n(politicos.length), "pessoas acompanhadas"],
          [n(municipios.length), "municípios com lista de mais votados"],
          [n(camara.length), `votações nominais na Câmara (${faixa(camara)})`],
          [n(senado.length), `no Senado (${faixa(senado)}), ${n(secretas)} secretas`],
        ] as const).map(([v, t]) => (
          <div key={t} className="vidro grid content-start gap-1 rounded-[24px] p-4">
            <span className="text-[28px] font-bold tabular-nums">{v}</span><span className="text-[13px] text-suave">{t}</span>
          </div>
        ))}
      </section>

      <section aria-labelledby="cf-nesta" className="grid gap-2">
        <h2 id="cf-nesta" className="px-5 text-[13px] font-semibold tracking-[0.4px] text-suave uppercase">Nesta página</h2>
        <AbrirPelaAncora />
        <div className="vidro overflow-hidden rounded-card">

      <Secao id="cobertura">
        <p>
          O site cobre o Brasil inteiro: {n(politicos.length)} pessoas. São {n(eleitos + suplentes + naoEleitos)} que disputaram
          deputado federal ou o Senado em 2026 e aparecem entre os 20 mais votados de alguma cidade, ou foram eleitas ({n(eleitos)} eleitas,
          {n(suplentes)} suplentes e {n(naoEleitos)} não eleitas), e {n(emExercicio)} parlamentares em exercício sem candidatura de 2026
          a esses cargos com resultado no TSE. Os {n(municipios.length)} municípios do país têm lista de mais votados.
        </p>
        <p>
          Votações: {n(camara.length)} <Termo id="cf-nominal" termo="nominal">votações nominais</Termo> do plenário da Câmara ({faixa(camara)})
          e {n(senado.length)} do Senado ({faixa(senado)}), das quais {n(secretas)} secretas. Os números cobrem o período de
          governo {PERIODO_GOVERNO.inicio.slice(0, 4)}–{PERIODO_GOVERNO.fim.slice(0, 4)}.
        </p>
        <p>
          Quem foi eleito em 2026 e não está no Congresso hoje toma posse em 1º de fevereiro de 2027. Até lá, o card mostra
          “primeiro voto em fevereiro de 2027” e nenhum número. Suplentes e não eleitos sem mandato no período aparecem com
          foto, partido, situação e votos de 2026, sem números de mandato.
        </p>
      </Secao>

      <Secao id="cidade">
        <p>
          <strong>Mapa e cidade:</strong> no Mapa, ao tocar num estado ou escolher a cidade, o site mostra quem está no
          cargo hoje em Brasília por aquele estado: os 3 senadores e a contagem de deputados federais (todos eleitos pelo estado
          inteiro). Governador, prefeito, deputados estaduais e vereadores entram depois. Contornos dos estados:{" "}
          <Ext href="https://github.com/giuliano-macedo/geodata-br-states">geodata-br-states</Ext> (licença MIT), a partir das
          malhas do IBGE.
        </p>
      </Secao>

      <Secao id="participacao">
        <p>
          <strong>O que é:</strong> percentual das votações nominais do plenário da Casa, dentro do mandato e no período de governo,
          em que o político registrou voto. O rótulo é “participação em votações”, nunca “presença”: o site não mede presença em sessão.
        </p>
        <p>
          <strong>Conta como voto registrado:</strong> Sim, Não, Abstenção, Obstrução, presidir a sessão (art. 17 do Regimento da
          Câmara; art. 51 do Regimento do Senado), voto registrado cujo valor a fonte não divulga e voto em votação secreta do
          Senado (o painel registra que votou, só não diz como).
        </p>
        <p>
          <strong>Conta como ausência:</strong> não constar da lista de votos da votação (Câmara) ou qualquer registro de
          comparecimento sem voto no Senado, inclusive “presente, não registrou voto”.
        </p>
        <p>
          <strong>Mandato:</strong> só entram votações realizadas enquanto a pessoa exercia o mandato. Sem mandato no período, o
          número não existe e o card diz “sem mandato”, nunca 0%.
        </p>
        <p id="afastado" className="scroll-mt-4">
          <strong>Afastamentos:</strong> licença não é descontada. Ao lado do número, o card mostra “afastado N dias”: a soma dos
          afastamentos registrados pela Câmara (histórico do deputado) ou pelo Senado (licenças) dentro do período, sem contar
          dias repetidos, com o motivo como a fonte escreve (secretaria de estado, ministério, licença saúde, missão, interesse particular).
        </p>
        <p>
          <strong>Senado:</strong> {n(secretas)} das {n(senado.length)} votações nominais do plenário de {faixa(senado)} foram secretas
          (quase todas sabatinas de autoridades). Elas entram na participação e ficam fora do governismo.
        </p>
      </Secao>

      <Secao id="governismo">
        <p>
          <strong>O que é:</strong> percentual dos votos Sim, Não ou Obstrução do político que coincidiram com a orientação do líder
          do Governo, nas votações em que o Governo orientou Sim, Não ou Obstrução.
        </p>
        <p>
          <strong>Fora do denominador:</strong> votações em que o Governo liberou a bancada ou não orientou; abstenção, ausência,
          presidência da sessão, voto não divulgado e voto secreto. No período, o Governo orientou Sim, Não ou Obstrução
          em {n(oriC)} das {n(camara.length)} votações da Câmara e em {n(oriS)} das {n(senado.length)} do Senado.
        </p>
        <p>
          <strong>Período de governo, não legislatura:</strong> o número cobre {PERIODO_GOVERNO.inicio.slice(0, 4)}–{PERIODO_GOVERNO.fim.slice(0, 4)}.
          Em 1º de janeiro de 2027 começa outro período e a contagem recomeça do zero.
        </p>
        <p>
          <strong>Fonte:</strong> orientações de bancada publicadas pela Câmara (por votação) e pelo Senado (orientação de bancada do
          plenário). O número descreve a coincidência com a orientação do Governo do momento; o site não o interpreta.
        </p>
      </Secao>

      <Secao id="ceap">
        <p>
          <strong>O que é:</strong> a Cota para o Exercício da Atividade Parlamentar, verba mensal para despesas do mandato
          (passagens, escritório, divulgação, combustível e outras): CEAP na Câmara, CEAPS no Senado. O card mostra o valor líquido do
          mês, com estornos descontados, e a média da bancada do mesmo estado, na mesma Casa, no mesmo mês.
        </p>
        <p>
          <strong>Média da bancada do estado, nunca nacional:</strong> o valor da cota varia por estado. Entram na média todos os
          parlamentares do estado com algum lançamento no mês, inclusive quem já deixou o cargo; quem não lançou nada no mês fica fora.
          No Senado, a bancada tem até 3 senadores, contando a própria pessoa do card. Deputados contam pela bancada em que exercem o
          mandato, mesmo que tenham disputado 2026 por outro estado.
        </p>
        <p>
          <strong>Mês de referência:</strong> Câmara e Senado registram as despesas com meses de atraso. A coleta é mensal; um mês é
          considerado fechado quando o total da bancada é idêntico em duas coletas com pelo menos 20 dias entre elas e todos os meses
          anteriores também são. Na primeira coleta do Brasil inteiro (novembro de 2026) ainda não havia coleta anterior para comparar:
          valeu o último mês fechado de São Paulo, medido antes. O card mostra o último mês fechado
          {fechado ? ` (hoje, ${rotuloMes(fechado)})` : ""}; a página do político mostra todos os meses e marca os em aberto
          {abertos.length ? ` (${abertos.map(rotuloMes).join(", ")})` : ""}.
        </p>
        <p>
          <strong>Fonte:</strong> despesas por deputado na API de dados abertos da Câmara, com link no card para a página oficial de
          transparência do mês. O arquivo CSV anual da Câmara não é usado porque omite as passagens aéreas emitidas pelo sistema da
          própria Câmara. No Senado, o arquivo anual da CEAPS nos dados abertos administrativos, com link para a página de transparência
          do senador (que mostra o ano). Alguns recibos da CEAPS vêm sem tipo de despesa e aparecem como “tipo não informado pela fonte”.
          Os dados começam em janeiro de 2025.
        </p>
      </Secao>

      <Secao id="propostas">
        <p>
          <strong>O que conta:</strong> propostas apresentadas desde 2023 em que o parlamentar aparece entre os autores. Na Câmara,
          vale quem a Câmara marca como proponente: as assinaturas só de apoio (comuns em PEC) ficam fora. No Senado, vale a autoria de
          iniciativa da matéria.
        </p>
        <p>
          <strong>Podem virar lei:</strong> PL, PLP, PEC, PDL e PRC (Câmara) ou PRS (Senado). Dessas, a página mostra quantas, em
          quantas o parlamentar é o <strong>primeiro autor</strong> (ordem de assinatura 1) e quantas viraram norma jurídica (situação
          “Transformado em Norma Jurídica” na Câmara, “Transformada em Norma Jurídica” no Senado). Os demais tipos (requerimentos,
          indicações, emendas, pareceres) aparecem só como contagem, porque são pedidos e não leis.
        </p>
        <p>
          <strong>Gráfico:</strong> o percentual que virou norma é a divisão das que viraram norma pelas apresentadas (primeiro autor e
          coautor juntos), arredondada. Com &quot;todos os anos&quot;, vale o total desde 2023; escolhendo um ano, só as apresentadas
          naquele ano. Uma proposta pode levar anos para virar norma: as mais recentes ainda podem estar em tramitação, e o número
          não compara ninguém com ninguém.
        </p>
        <p>
          <strong>Fonte:</strong> arquivos anuais de proposições e autores dos dados abertos da Câmara e o serviço de processos dos
          dados abertos do Senado, com link para a página oficial de cada proposta. Só quem passou pela Câmara na legislatura atual ou
          está no Senado tem propostas coletadas.
        </p>
        <p>
          <strong>Lista de propostas:</strong> a página <Link href="/propostas">Propostas</Link> reúne todas as que têm algum
          parlamentar do site entre os autores, e só esses autores aparecem nela. A situação é a última que a Câmara ou o Senado
          registrou, como a fonte escreve, e o filtro a agrupa em três: <strong>virou norma</strong> (a regra acima);{" "}
          <strong>encerrada sem virar norma</strong> ({SITUACOES_ENCERRADAS.map((s) => `“${s.charAt(0) + s.slice(1).toLowerCase()}”`).join(", ")});
          e <strong>em tramitação</strong>, todas as demais. Quando a fonte não traz a situação, a proposta aparece com “—” e só
          sem filtro de situação. A busca procura todas as palavras na ementa oficial, sem diferença de acento ou maiúscula, ou
          o número (“PL 1234/2025”).
        </p>
      </Secao>

      <Secao id="congresso">
        <p>
          <strong>Quem ocupa a cadeira hoje:</strong> quem tem mandato em curso na Casa e não está afastado na data. O titular
          licenciado continua com o mandato, mas a cadeira é do suplente que assumiu. O partido é o que a Câmara ou o Senado
          registra hoje, e o estado é o da cadeira, mesmo quando a pessoa disputou a eleição de 2026 por outro estado.
        </p>
        <p>
          <strong>Cores e ordem:</strong> as fatias do Plenário seguem o tamanho da bancada, da maior para a menor; não há ordem de
          esquerda ou direita. Cada partido aparece na cor oficial dele (registrada no Wikidata a partir da identidade do partido),
          levemente escurecida para dar contraste; PRD, Missão e UP, sem cor oficial encontrada, têm uma cor de apoio. A cor só
          distingue: as pílulas abaixo do desenho trazem o nome e o número de cadeiras de cada partido.
          Siglas que o TSE e as Casas escrevem de jeitos diferentes (PCDOB e PCdoB) aparecem numa grafia só.
        </p>
        <p>
          <strong>A partir de fevereiro de 2027:</strong> na Câmara, os 513 eleitos em 2026, com o partido registrado hoje. No Senado essa
          visão não aparece: das 27 cadeiras eleitas em 2022, só se sabe quem ocupa hoje, não quem ocupará em fevereiro.
        </p>
        <p>
          <strong>Próximas e últimas votações:</strong> as próximas são a pauta que a Câmara e o Senado publicam para as sessões
          deliberativas do Plenário, coletada uma vez por dia (pode mudar até a sessão, e nem tudo da pauta vai a votação nominal). As
          últimas são as votações nominais da última sessão de cada Casa, com o placar publicado pela fonte; o calendário filtra por dia.
          Nas votações secretas o Senado publica só quem votou, não como; em votação de pessoa a Câmara registra o voto, mas não divulga a
          direção.
        </p>
        <p>
          <strong>Temas:</strong> a classificação de assunto que a própria Câmara e o próprio Senado dão a cada matéria (por exemplo,
          &quot;Saúde&quot; ou &quot;Segurança Pública&quot;). Não é classificação nossa; matéria sem classificação fica sem tema.
        </p>
        <p>
          <strong>Presidente e governador:</strong> no Mapa, os eleitos em 2026 segundo o TSE, com a data da posse: 5 de janeiro de 2027
          para o presidente e 6 de janeiro para os governadores (Emenda Constitucional 111/2021).
          Não há fonte aberta de quem está no cargo hoje (governadores que renunciaram em abril de 2026 para disputar a eleição foram
          substituídos pelos vices), por isso o site mostra só o eleito e a data da posse.
        </p>
        <p>
          <strong>Página de cada votação:</strong> o que foi votado naquele momento (texto principal, emenda, destaque, requerimento,
          recurso, redação final ou escolha de autoridade) sai da descrição oficial por regra fixa; quando a descrição não segue um padrão
          conhecido, só a descrição aparece. A regra de aprovação vem da Constituição (PEC: 3/5 em dois turnos; lei complementar: maioria
          absoluta); a marca de votos necessários só aparece na votação do texto principal. Não votou, na Câmara, é 513 menos quem
          registrou voto. Como votou cada partido usa o partido de cada parlamentar no dia, como a Câmara e o Senado registraram no voto;
          para o deputado que não votou, o partido do voto dele mais próximo no tempo. A orientação é a da bancada do partido (ou da
          federação, ou do bloco cujo nome lista o partido); sem isso, &quot;sem orientação registrada&quot;. A ementa é a oficial, sem
          resumo; a caixa de termos explica palavras jurídicas que aparecem nela.
        </p>
      </Secao>

      <Secao id="promessas">
        <p>
          <strong>De onde vêm as promessas:</strong> do plano de governo que cada eleito em 2026 registrou no TSE (o PDF oficial,
          publicado nos dados abertos do Tribunal). O texto de cada promessa é o do documento, entre aspas, com a página. Não resumimos
          nem reescrevemos.
        </p>
        <p>
          <strong>Quais entram:</strong> lemos todas as frases de compromisso do plano (as com verbo no futuro, como &quot;vamos&quot; e
          &quot;criaremos&quot;) e ficamos com as que têm uma entrega concreta que um ato oficial ou um dado oficial pode mostrar: criar
          uma política, um programa ou um órgão, mandar ou aprovar uma lei, uma obra, uma meta com número ou prazo. Compromissos genéricos
          (&quot;fortaleceremos&quot;, &quot;continuaremos&quot;) e de manutenção do que já existe ficam fora, porque nenhum ato marca o
          seu cumprimento. Por enquanto, os planos de Lula (28 promessas) e de Tarcísio (28).
        </p>
        <p>
          <strong>Como acompanhamos:</strong> ao lado de cada promessa, só atos oficiais publicados (Diário Oficial, Câmara, Senado,
          Assembleia) ou dados oficiais (como os do INEP e do INPE), com data, fonte e link, registrados à mão. Sem ato, a promessa
          aparece como &quot;sem ato oficial ainda&quot;. O site não diz se uma promessa foi cumprida, está em risco ou foi descumprida,
          nem calcula percentual do plano: isso seria um julgamento nosso, e o Fiscaliza só mostra dado oficial.
        </p>
      </Secao>

      <Secao id="parecidos">
        <p>
          <strong>O que é:</strong> para quem está em exercício hoje, os 5 parlamentares da mesma Casa que mais votaram igual a ele
          ou ela. Conta o % de votos iguais (Sim, Não, Abstenção ou Obstrução) nas votações nominais do Plenário de 2023 a 2026 em
          que os dois votaram. Votação secreta, voto não divulgado e ausência ficam fora. Só entra quem tem pelo menos 50
          votações em comum; o empate é desfeito pelo número de votações em comum.
        </p>
        <p>
          É uma comparação entre duas pessoas, voto a voto. Não é nota, ranking nem posição política: votar parecido com alguém
          não diz se os votos foram bons ou ruins.
        </p>
        <p>
          <strong>Votou com o partido?</strong> Para cada votação nominal de 2023 a 2026, o voto (Sim, Não ou Obstrução) é comparado
          com a orientação da bancada do partido da pessoa <em>naquele dia</em>, como a Câmara e o Senado registram no voto: quem
          trocou de partido é comparado com o partido de cada época. A bancada é o próprio partido; se ele não orientou sozinho, a
          federação; se não, o bloco parlamentar cujo nome o lista. Ficam fora: orientação “liberado” ou em branco, abstenção,
          ausência, voto secreto e as votações em que a Câmara registra a orientação de um bloco com o nome cortado (“Bl
          PlFdrPtUniPp...”) e o partido não aparece no trecho visível. É o caso de quase todo o ano de 2025 para MDB, Republicanos,
          Podemos e PSDB. Com menos de 20 votações identificadas, o site não mostra percentual.
        </p>
        <p>
          <strong>Participação ao lado da média:</strong> a média é a da participação em votações (mesma regra do card) de todos os
          que estão em exercício hoje na Casa.
        </p>
      </Secao>

      <Secao id="salario">
        <p>
          O subsídio mensal dos membros do Congresso é o mesmo para deputados federais e senadores e é fixado por decreto legislativo:
          {" "}<Ext href={SUBSIDIO_CONGRESSO.url}>{SUBSIDIO_CONGRESSO.ato}</Ext>. O valor em vigor hoje é {reais(subsidioHoje.valor)}, desde
          {" "}{diaBr(subsidioHoje.desde)}. É o valor bruto, antes de impostos; não inclui a cota parlamentar nem a verba de gabinete.
          Conferido no texto oficial em {diaBr(SUBSIDIO_CONGRESSO.conferidoEm)}.
        </p>
      </Secao>

      <Secao id="cobrar">
        <p>
          Para quem exerce mandato hoje, o card e a página do político mostram o contato oficial do gabinete (e-mail e
          telefone, quando a Casa publica) e os canais públicos onde qualquer pessoa pode se manifestar. O site não escreve
          nem envia mensagens: o link abre o seu aplicativo de e-mail ou a página oficial do canal.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li><Ext href={OUVIDORIA.camara.url}>{OUVIDORIA.camara.rotulo}</Ext>: {OUVIDORIA.camara.para}</li>
          <li><Ext href={OUVIDORIA.senado.url}>{OUVIDORIA.senado.rotulo}</Ext>: {OUVIDORIA.senado.para}</li>
          {CANAIS_EXTERNOS.map((c) => <li key={c.url}><Ext href={c.url}>{c.rotulo}</Ext>: {c.para}</li>)}
        </ul>
        <p>
          Cada endereço foi aberto e conferido na página oficial em {diaBr(CANAIS_CONFERIDOS_EM)}. Quem foi eleito em 2026 e ainda não
          tomou posse não tem gabinete: os canais aparecem a partir da posse.
        </p>
      </Secao>

      <Secao id="fora">
        <ul className="list-disc space-y-1 pl-5">
          <li>Vetos presidenciais: são votados em sessão conjunta do Congresso e não constam das votações da Câmara nem do Senado usadas aqui.</li>
          <li>Votações de comissões, votações simbólicas (sem registro individual de voto), discursos e presença em sessão.</li>
          <li>Votações que a Câmara lista como nominais mas sem a lista de votos na API: ficam fora de todos os números.</li>
          <li>Emendas parlamentares e patrimônio declarado: não estão nesta versão.</li>
          <li>Cota parlamentar por fornecedor e nota a nota: o site mostra o total do mês e a soma por categoria, com link para as notas na página oficial.</li>
          <li>Presidente da República, deputados estaduais, governadores e prefeitos.</li>
        </ul>
      </Secao>

      <Secao id="fontes">
        <ul className="list-disc space-y-1 pl-5">
          <li><Ext href="https://dadosabertos.tse.jus.br">TSE, dados abertos</Ext>: candidatos, votação por município e zona, votação por partido, totais por município e o relatório de resultado da totalização (gabarito do cálculo das vagas).</li>
          <li><Ext href="https://resultados.tse.jus.br">TSE, divulgação de resultados</Ext>: fotos dos candidatos e resultado por município.</li>
          <li><Ext href="https://dadosabertos.camara.leg.br">Câmara dos Deputados, dados abertos</Ext>: deputados, histórico, votações, votos, orientações de bancada e despesas da cota, proposições e autores.</li>
          <li><Ext href="https://legis.senado.leg.br/dadosabertos/docs/">Senado Federal, dados abertos</Ext>: senadores, mandatos, licenças, votações, orientação de bancada e processos (autoria).</li>
          <li><Ext href="https://servicodados.ibge.gov.br/api/docs/localidades">IBGE, localidades</Ext>: códigos de município.</li>
        </ul>
        <p>
          Nenhuma página consulta essas fontes enquanto você navega: os dados são coletados antes e publicados prontos, e cada
          card e página linkam para a página oficial de origem. Última coleta: {dataBr(coleta)}.
        </p>
        <p>
          Quando o dado real contradiz um número do site, o número está errado e deve ser corrigido; as lacunas conhecidas ficam
          registradas no código-fonte (<code>docs/LACUNAS.md</code>).
        </p>
      </Secao>

      <Secao id="privacidade">
        <ul className="list-disc space-y-1 pl-5">
          <li>Sem conta, sem e-mail, sem cadastro. Não existe tabela de usuários.</li>
          <li>O que você filtra ou procura fica só no seu navegador; o servidor não registra nada.</li>
          <li>Quem você monitora fica guardado só neste navegador (armazenamento local), junto com o que você já viu. Nada disso vai para o
            nosso servidor: o navegador baixa os dados públicos de cada pessoa e compara ali mesmo. Limpar os dados do navegador apaga a lista.</li>
          <li>O botão “Receber avisos” só explica que avisos ainda não existem. Ele não pede nem guarda e-mail, telefone ou qualquer contato.</li>
          <li>Sem cookies e, nesta versão, sem ferramenta de medição de audiência.</li>
          <li>As fotos são carregadas direto dos servidores oficiais da Câmara, do Senado e do TSE. Esses servidores recebem o pedido da imagem, sem o endereço da página que você está vendo (política de referência <code>same-origin</code>).</li>
        </ul>
      </Secao>

      <Secao id="licencas">
        <ul className="list-disc space-y-1 pl-5">
          <li>Código aberto sob a licença <Ext href="https://www.gnu.org/licenses/agpl-3.0.pt-br.html">AGPL-3.0</Ext>: <Ext href={REPO_URL}>código-fonte no GitHub</Ext>.</li>
          <li>Dados derivados (os arquivos que o site publica) sob <Ext href="https://creativecommons.org/licenses/by/4.0/deed.pt-br">CC-BY 4.0</Ext>. As fontes originais são do TSE, da Câmara e do Senado.</li>
          <li>Projeto sem fins lucrativos, feito por duas pessoas.</li>
        </ul>
      </Secao>

      <Secao id="glossario">
        <dl className="grid gap-3">
          {Object.values(GLOSSARIO).map((g) => (
            <div key={g.titulo}>
              <dt className="font-medium">{g.titulo}</dt>
              <dd className="text-suave">{g.texto}</dd>
            </div>
          ))}
        </dl>
      </Secao>
        </div>
        <p className="px-5 text-[13px] text-suave">Toque num assunto para abrir.</p>
      </section>
    </main>
    </>
  );
}
