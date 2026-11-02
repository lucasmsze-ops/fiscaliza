import type { Metadata } from "next";
import Link from "next/link";
import { Termo } from "@/components/Termo";
import { PERIODO_GOVERNO } from "@/lib/card";
import { GLOSSARIO, SECOES, type Secao } from "@/lib/glossario";
import { MIN_COMPARAVEIS } from "@/lib/quiz";
import { repo } from "@/lib/repo";

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

const REPO_URL = "https://github.com/lucasmsze-ops/fiscaliza";

function Secao({ id, children }: { id: Secao; children: React.ReactNode }) {
  const titulo = SECOES.find((s) => s.id === id)!.titulo;
  return (
    <section id={id} className="mt-10 scroll-mt-4" aria-labelledby={`h-${id}`}>
      <h2 id={`h-${id}`} className="text-lg font-semibold"><a href={`#${id}`} className="no-underline hover:underline">{titulo}</a></h2>
      <div className="mt-3 grid gap-3 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

const Ext = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} {...externo} className="underline underline-offset-2">{children}</a>
);

export default async function ComoFunciona() {
  const [politicos, municipios, camara, senado, quiz, oriCamara, oriSenado, mediasSp] = await Promise.all([
    repo.listarPoliticos(), repo.listarMunicipios(), repo.getVotacoes("camara"), repo.getVotacoes("senado"),
    repo.getVotacoesQuiz(), repo.getOrientacoes("camara", "Governo"), repo.getOrientacoes("senado", "Governo"), repo.getMediasUf("SP"),
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

  const quizCamara = quiz.filter((q) => q.camara).length;
  const quizSenado = quiz.filter((q) => q.senado).length;
  // Orientação do Governo na votação de referência da pergunta (Câmara; Senado quando só lá houve votação).
  const oriPorVotacao = new Map([...oriCamara, ...oriSenado].filter((o) => posicional.has(o.orientacao)).map((o) => [o.votacaoId, o.orientacao]));
  const oriQuiz = quiz.map((q) => oriPorVotacao.get((q.camara ?? q.senado)!.id) ?? null);
  const quizSim = oriQuiz.filter((o) => o === "Sim").length, quizNao = oriQuiz.filter((o) => o === "Não").length, quizSem = oriQuiz.filter((o) => o === null).length;

  const ordenadas = [...mediasSp].sort((a, b) => a.ano * 100 + a.mes - (b.ano * 100 + b.mes));
  const fechado = ordenadas.filter((m) => m.fechado).at(-1);
  const abertos = ordenadas.filter((m) => !m.fechado);
  const rotuloMes = (m: { ano: number; mes: number }) => `${MESES[m.mes - 1]}/${m.ano}`;

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <p className="text-sm"><Link href="/" className="underline underline-offset-2">Fiscaliza</Link></p>
      <h1 className="mt-4 text-2xl font-bold">Como funciona</h1>
      <p className="mt-3 text-sm leading-relaxed">
        O Fiscaliza mostra o que os dados abertos do TSE, da Câmara dos Deputados e do Senado Federal registram sobre quem recebeu seu voto.
        Cada número tem uma regra de cálculo, descrita nesta página, e um link para a página oficial de origem.
        O site não qualifica ninguém: mostra o número e a fonte. Nenhum dado é inventado: o que a fonte não traz aparece como lacuna, nunca como zero.
      </p>

      <nav aria-label="Seções" className="mt-6 rounded-2xl border border-black/10 p-4 text-sm dark:border-white/15">
        <ol className="grid gap-1 sm:grid-cols-2">
          {SECOES.map((s) => <li key={s.id}><a href={`#${s.id}`} className="underline underline-offset-2">{s.titulo}</a></li>)}
        </ol>
      </nav>

      <Secao id="cobertura">
        <p>
          Nesta versão, o site cobre São Paulo: {n(politicos.length)} pessoas, sendo {n(eleitos + suplentes + naoEleitos)} que disputaram
          deputado federal ou o Senado em 2026 ({n(eleitos)} eleitas, {n(suplentes)} suplentes e {n(naoEleitos)} não eleitas)
          e {n(emExercicio)} senadores em exercício que não disputaram. Os {n(municipios.length)} municípios do estado têm lista de mais votados.
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
          Ao escolher a cidade, o site lista, por cargo, os 20 candidatos com mais votos no município em 2026, segundo o
          boletim do TSE por município e zona. Quando há empate com o 20º colocado, todos os empatados entram; a ordem entre
          empatados é a do número de urna e não significa nada.
        </p>
        <p>
          Contam só votos nominais válidos: brancos, nulos e votos anulados por decisão judicial ficam fora. A posição é a do
          município. A eleição de deputado federal é decidida no estado inteiro, pelo sistema proporcional (veja{" "}
          <a href="#voto-contou" className="underline underline-offset-2">“Seu voto contou para”</a>).
        </p>
        <p>
          Você marca em quem votou. A escolha fica no seu navegador e no endereço da colinha; o servidor não registra nada
          (veja <a href="#privacidade" className="underline underline-offset-2">Privacidade</a>).
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
          (quase todas sabatinas de autoridades). Elas entram na participação e ficam fora do governismo e da concordância.
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

      <Secao id="concordancia">
        <p>
          O <Link href="/votacoes" className="underline underline-offset-2">quiz</Link> tem {n(quiz.length)} perguntas, cada uma ligada à
          votação do texto principal de uma matéria no plenário: {n(quizCamara)} com votação na Câmara e {n(quizSenado)} no Senado
          (quando a mesma matéria foi votada nas duas Casas, a pergunta vale para deputados e senadores). Para cada uma, você
          responde Sim ou Não ao texto votado.
        </p>
        <p>
          <strong>O que é:</strong> percentual das perguntas que você respondeu em que o voto Sim ou Não do político coincidiu com a
          sua resposta. Só entram perguntas em que o político votou Sim ou Não: abstenção, ausência, voto secreto e votações fora
          do mandato ficam fora.
        </p>
        <p>
          <strong>Base mínima:</strong> o card sempre mostra a base (“6 de 11 votações do quiz”) e só mostra o percentual com pelo
          menos {MIN_COMPARAVEIS} votações comparáveis; abaixo disso, “poucos votos para comparar”. Sem resposta sua, o número não
          aparece. Eleito sem mandato: “primeiro voto em fevereiro de 2027”.
        </p>
        <p>
          <strong>Como as votações foram escolhidas:</strong> votação nominal e aberta do plenário entre 2023 e 2026; votação do texto
          principal, não de requerimento, urgência, destaque ou “manutenção do texto”; divisão real (o lado perdedor teve pelo menos
          20% dos votos Sim e Não em ao menos uma Casa); temas variados; e equilíbrio de orientação: nas {n(quiz.length)} perguntas, o
          Governo orientou Sim em {n(quizSim)}, Não em {n(quizNao)} e não orientou em {n(quizSem)}.
        </p>
        <p>
          <strong>Textos:</strong> a explicação de cada votação usa só a ementa, as palavras-chave e a situação registradas pela
          Câmara e pelo Senado, com link para a página oficial da matéria. “O que aconteceu depois” é a situação como a fonte a registra.
        </p>
        <p>
          <strong>Cobrar:</strong> o botão abre o seu aplicativo de e-mail com o endereço oficial do gabinete e um texto pronto. Com
          respostas no quiz, o texto cita a primeira pergunta, na ordem do quiz, em que o voto do político diferiu da sua resposta,
          com data, matéria e os dois votos. O site não envia nem recebe mensagens.
        </p>
      </Secao>

      <Secao id="voto-contou">
        <p>
          Deputado federal é eleito pelo sistema proporcional: o voto vai para a lista (partido isolado ou federação, que conta como
          uma lista só), e as vagas que a lista conquista vão aos candidatos mais votados dela. Por isso o card diz “seu voto contou
          para [lista], que elegeu N em SP”, e nunca que o voto “ajudou a eleger” alguém.
        </p>
        <p>
          <strong>Senado:</strong> eleição majoritária, sem lista. O card de senador mostra só os votos no município.
        </p>
        <p>
          <strong>Nome da lista:</strong> sigla do partido isolado (“PL”) ou “Federação” seguida da composição como o TSE escreve
          (“Federação PT/PC do B/PV”), com o nome oficial completo no “?”.
        </p>
        <p>
          <strong>Cálculo das vagas</strong> (Código Eleitoral, arts. 106 a 109, com a Lei 14.211/2021; STF, ADIs 7228, 7263 e 7325):
          o <Termo id="cf-qe" termo="quociente">quociente eleitoral</Termo> é o total de votos válidos dividido pelas vagas, desprezada
          a fração até 0,5; cada lista recebe tantas vagas quantas vezes atinge o quociente, desprezada a fração; a vaga só vai a
          candidato com pelo menos 10% do quociente; as sobras vão pela maior média, primeiro entre listas com pelo menos 80% do
          quociente e candidato com pelo menos 20%, depois entre todas. O cálculo foi conferido contra o relatório oficial de
          totalização de São Paulo em 2026: as 70 vagas coincidem.
        </p>
      </Secao>

      <Secao id="ceap">
        <p>
          <strong>O que é:</strong> a Cota para o Exercício da Atividade Parlamentar, verba mensal da Câmara para despesas do mandato
          (passagens, escritório, divulgação, combustível e outras). O card mostra o valor líquido do mês, com estornos descontados,
          e a média da bancada do mesmo estado no mesmo mês.
        </p>
        <p>
          <strong>Média da bancada do estado, nunca nacional:</strong> o valor da cota varia por estado. Entram na média só os deputados
          com algum lançamento no mês.
        </p>
        <p>
          <strong>Mês de referência:</strong> a Câmara registra as despesas com meses de atraso. Um mês é considerado fechado quando o
          total da bancada é idêntico em duas coletas e todos os meses anteriores também são. O card mostra o último mês fechado
          {fechado ? ` (hoje, ${rotuloMes(fechado)})` : ""}; a página do político mostra todos os meses e marca os em aberto
          {abertos.length ? ` (${abertos.map(rotuloMes).join(", ")})` : ""}.
        </p>
        <p>
          <strong>Fonte:</strong> despesas por deputado na API de dados abertos da Câmara, com link no card para a página oficial de
          transparência do mês. O arquivo CSV anual da Câmara não é usado porque omite as passagens aéreas emitidas pelo sistema da
          própria Câmara.
        </p>
        <p>
          <strong>Senado:</strong> a cota dos senadores (CEAPS) não está nesta versão. O card de senador não tem o bloco de cota.
        </p>
      </Secao>

      <Secao id="fora">
        <ul className="list-disc space-y-1 pl-5">
          <li>Vetos presidenciais: são votados em sessão conjunta do Congresso e não constam das votações da Câmara nem do Senado usadas aqui.</li>
          <li>Votações de comissões, votações simbólicas (sem registro individual de voto), discursos e presença em sessão.</li>
          <li>Votações que a Câmara lista como nominais mas sem a lista de votos na API: ficam fora de todos os números.</li>
          <li>Cota dos senadores (CEAPS), emendas parlamentares, projetos de autoria e patrimônio declarado: não estão nesta versão.</li>
          <li>Presidente da República, deputados estaduais, governadores e prefeitos.</li>
        </ul>
      </Secao>

      <Secao id="fontes">
        <ul className="list-disc space-y-1 pl-5">
          <li><Ext href="https://dadosabertos.tse.jus.br">TSE, dados abertos</Ext>: candidatos, votação por município e zona, votação por partido, totais por município e o relatório de resultado da totalização (gabarito do cálculo das vagas).</li>
          <li><Ext href="https://resultados.tse.jus.br">TSE, divulgação de resultados</Ext>: fotos dos candidatos e resultado por município.</li>
          <li><Ext href="https://dadosabertos.camara.leg.br">Câmara dos Deputados, dados abertos</Ext>: deputados, histórico, votações, votos, orientações de bancada e despesas da cota.</li>
          <li><Ext href="https://legis.senado.leg.br/dadosabertos/docs/">Senado Federal, dados abertos</Ext>: senadores, mandatos, licenças, votações e orientação de bancada.</li>
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
          <li>A colinha fica no endereço da página (<code>/c/…</code>) e no armazenamento local do seu navegador. As respostas do quiz ficam só no seu navegador e não são enviadas ao servidor.</li>
          <li>Sem cookies e, nesta versão, sem ferramenta de medição de audiência.</li>
          <li>As fotos são carregadas direto dos servidores oficiais da Câmara, do Senado e do TSE. Esses servidores recebem o pedido da imagem, sem o endereço da sua colinha (política de referência <code>same-origin</code>).</li>
          <li>Ao compartilhar, a imagem de preview é gerada no servidor a partir do endereço da colinha; nada fica guardado.</li>
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
              <dd className="text-[var(--suave)]">{g.texto}</dd>
            </div>
          ))}
        </dl>
      </Secao>
    </main>
  );
}
