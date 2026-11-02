# Referência: politicometro.org

Inventário das funcionalidades do Politicômetro (https://www.politicometro.org), visitado em
2026-11-01 pelo navegador, como um visitante (sem login). Serve para decidir o que o Fiscaliza
quer ter. Aqui só há descrição do que o site faz, em palavras nossas: nenhum texto, layout ou dado
deles entra no Fiscaliza. Dado novo, se entrar, vem das mesmas fontes oficiais, pelo nosso cron.

Nada aqui está decidido. Cada linha tem uma sugestão; a decisão é do usuário e, quando muda
escopo ou princípio, vira mudança no `CLAUDE.md` e no `PLANO.md`.

## O que é o Politicômetro, em números

| | Politicômetro | Fiscaliza hoje |
|---|---|---|
| Quem cobre | 70.800 eleitos em exercício, de vereador a presidente, mais 1.682 eleitos em 2026 | 438 políticos de SP (deputado federal e senador) |
| Páginas de político | ~71.600 | 438 |
| Fontes | Câmara, Senado, TSE, IBGE, Receita, Tesouro, TCU, CGU, STF, 18 Assembleias, ~930 Câmaras Municipais | TSE, Câmara, Senado, IBGE |
| Atualização | Rotina própria em servidor no Brasil, várias vezes ao dia | Coleta única da sonda; cron diário previsto (E19–E20) |
| Custo | Servidor e banco pagos pelo desenvolvedor; pede Pix | Zero (princípio 1) |
| Conta de usuário | Opcional, por e-mail com código, para "monitorar" | Não existe (princípio 3) |

O lema deles é o mesmo nosso: sem nota, ranking, adjetivo nem recomendação de voto; "—" é dado não
publicado, nunca zero. A diferença está no formato: eles são a enciclopédia completa de todo
eleito; nós somos o card de três números a partir de em quem a pessoa votou.

## O que só o Fiscaliza tem

- **Colinha a partir do voto:** a pessoa marca em quem votou em 2026 e leva os cards. Lá, a cidade
  mostra quem governa e legisla ali, e os "mais votados na cidade" são de 2022, só 10 por cargo,
  sem montar nada.
- **"Seu voto contou para":** a explicação do quociente para a lista em que a pessoa votou.
- **Quiz de concordância:** responder votações e ver o quanto cada um votou como você. O mais próximo que vi lá é
  o "votaram igual?" entre políticos, no comparador.
- **Cobrar com a votação discordante:** e-mail pronto citando onde o voto diferiu. Lá, "Como cobrar"
  aponta canais oficiais (Fale Conosco, Fala.BR, MPF/TCU), sem texto pronto.
- **Governismo por político no card.** Lá, o alinhamento ao Governo só aparece agregado na página de
  partidos (três faixas: contra, divide, com) e a fidelidade ao partido aparece no resumo do ano.
- **Preview de compartilhamento com os números** (imagem OG da colinha). Lá, o card para baixar é
  por pessoa, em formato feed e stories.

## Inventário

Coluna **Conflito**: regra do `CLAUDE.md` que a funcionalidade esbarra, se houver.
Coluna **Sugestão**: MVP (antes do lançamento), v1.1, v1.2, ou fora.

### 1. Página do político (o "crachá")

| Funcionalidade deles | Fiscaliza hoje | Conflito | Sugestão |
|---|---|---|---|
| Cabeçalho: idade, naturalidade, "eleito N vezes, reeleito N", mandato atual e o próximo | Cargo, partido, status 2026 | — | MVP: mandato atual + próximo cabe no card; idade e naturalidade só na página |
| Salário do mês, do ano e acumulado no mandato | Não tem | — | v1.1: valor vem de ato legal, igual para todos; pouco esforço |
| "Quanto custa o mandato": salário + gabinete + cota da UF + moradia, com base legal | Não tem | — | v1.1, junto com salário |
| Patrimônio declarado ao TSE por eleição, sem descrição dos bens | Backlog v1.2 | — | v1.1: dado já é do TSE, que já usamos |
| Dinheiro de campanha por eleição: arrecadado, gasto, % de dinheiro público | Não tem | — | v1.1 |
| Linha do tempo de candidaturas 2004–2026 (eleito por QP ou média, votos) | Só 2026 | — | v1.2 |
| Presença em sessões deliberativas (grade por sessão, faltas justificadas) | Participação em votações nominais | **Fora de escopo: "presença literal em sessões"** | Fora, salvo decisão de mudar o `CLAUDE.md` |
| Propostas de autoria, com autor principal vs coautoria, "podem virar lei" vs pedidos, "viraram lei" | Previsto no cron (E19), sem interface | — | MVP ou v1.1: contagem de autoria principal e quantas viraram lei |
| Temas das propostas por palavras-chave da ementa (sem IA) | Não tem | Princípio 6 (cabe no card?) | v1.2, só na página do político |
| Todos os votos, linha do tempo com filtros (ano, tema, voto, busca) | Últimas 10 e totais por tipo | — | v1.1: lista completa com filtro por ano |
| Fidelidade ao partido no ano | Backlog v1.2 | — | v1.2 (já previsto) |
| Cota: por mês, categoria, maiores fornecedores, nº de notas | Por mês e categoria | — | v1.1: maiores fornecedores |
| Cota dos senadores (CEAPS) | Lacuna aberta | — | **MVP**: hoje o card de senador não tem cota |
| Emendas parlamentares | Backlog v1.1 | — | v1.1 (já previsto) |
| Comissões (titular/suplente) | Não tem | Votações de comissão estão fora; ser membro não | v1.2 |
| Discursos no Plenário | Não tem | **Fora de escopo: "discursos"** | Fora |
| Viagens e missões oficiais | Afastamentos (inclui missão) | — | Já coberto em "afastado N dias" |
| Equipe do gabinete: pessoas, folha do mês, % do limite | Não tem | — | v1.2 |
| Contato: telefone, e-mail, sala, redes declaradas ao TSE | Telefone, e-mail, redes da Câmara | — | MVP: redes declaradas ao TSE cobrem os eleitos novos |
| "O que está e o que não está nesta página": checklist com fonte | Lacunas em `docs/LACUNAS.md` | — | MVP: versão curta na página do político |
| "Nome e cargo conferidos com a lista oficial em <data>" | Data só em `/como-funciona` | — | MVP: data da coleta em cada página |
| "Quando governou": plano de governo × indicadores do município | Não tem | Escopo é Congresso | Fora |
| Como cobrar: canais oficiais (Fale Conosco, Fala.BR, MPF/TCU) | Cobrar por e-mail | — | MVP: somar os canais ao lado do Cobrar |
| Reportar erro e direito de resposta | Não tem | Formulário exigiria guardar mensagem | MVP: `mailto:` para o e-mail do projeto, sem tabela |
| Baixar card (feed e stories) | OG da colinha | — | v1.1: card por político no mesmo `next/og` |
| Comparar com outra pessoa | Backlog v1.2 | — | v1.2 (já previsto) |
| "Monitorar" (exige conta) | Não tem | **Princípio 3** | Fora; alternativa sem conta: seguir no localStorage |

### 2. Votações e Congresso

| Funcionalidade deles | Fiscaliza hoje | Conflito | Sugestão |
|---|---|---|---|
| Todas as votações do Plenário desde 2001, com filtros (tema, Casa, data, ano, só o que muda lei) | Nominais 2023–26 por político; 14 no quiz | — | v1.1: `/votacoes` com a lista completa do período |
| Detalhe da votação: o que é, o que foi votado, quórum necessário, placar, hemiciclo voto a voto, filtro por UF, orientação e voto de cada partido | Placar e fonte | — | v1.1: placar por partido e orientação já estão no nosso dado |
| "O caminho da proposta" (apresentada → comissões → Plenário → outra Casa → sanção) | Situação no texto do quiz | — | v1.2 |
| Agenda e pauta do Plenário, "sessão agora" | Não tem | Princípio 2 se for consulta ao vivo; "votação da semana" está em v1.1 | v1.1, só pelo cron (pauta do dia) |
| "O que virou lei" desde 1985 | Não tem | — | Fora (enciclopédia) |
| Resumo simplificado de cada votação ("muda uma lei sobre...") | Ementa oficial | Resumo por LLM em tempo de requisição é proibido; no cron, não | Decidir: resumo no cron, revisado, ou só ementa |

### 3. Lugar: cidade, estado, mapa

| Funcionalidade deles | Fiscaliza hoje | Conflito | Sugestão |
|---|---|---|---|
| Mapa do Brasil e de cada estado, clicável | Busca por cidade | Princípio 6 | Fora no MVP; a busca é mais rápida |
| "Quem me representa" na cidade: vereadores, prefeito, governador, deputados estaduais e federais, senadores, presidente | Só quem recebeu o voto | **Fora de escopo: estaduais, governadores, presidente** | Fora |
| Bancadas em hemiciclo por partido (estado, cidade, Congresso) | Não tem | Princípio 6 | v1.2, no detalhe da votação |
| Diretório A–Z com filtros de cargo, partido e UF | Busca por nome | — | Fora; a busca resolve |
| Geolocalização "achar minha cidade" | Não tem | Princípio 2: transformar coordenada em cidade exige serviço externo | Fora |
| Tour de boas-vindas | Não tem | — | Decidir com o teste de usuários |

### 4. Seções de contexto

| Funcionalidade deles | Fiscaliza hoje | Conflito | Sugestão |
|---|---|---|---|
| Eleições: resultados de 1994 a 2026, todos os cargos, por lugar | Votos 2026 de SP | Escopo | Fora |
| Governos: presidentes, governadores e prefeitos, indicadores ano a ano | Não tem | **Fora de escopo: presidente como entidade, governadores** | Fora |
| Planos de governo lado a lado (presidente, governador, prefeito) | Não tem | Escopo | Fora |
| Partidos: régua esquerda–direita (pesquisa acadêmica citada), filiados, eleitos | Não tem | **Princípio 4**: rótulo ideológico qualifica, mesmo com fonte | Fora, salvo decisão explícita |
| STF: pauta, julgados, ministros | Não tem | Escopo | Fora |
| Impostômetro (arrecadação da Receita) | Não tem | Escopo | Fora |
| Entenda os cargos (o que cada um faz, base na Constituição) | Glossário nos "?" | — | MVP: seção curta sobre deputado e senador em `/como-funciona` |
| Dicionário político | 14 termos no glossário | — | v1.1: página de termos com âncora (já temos a seção) |

### 5. Transparência do próprio site

| Funcionalidade deles | Fiscaliza hoje | Conflito | Sugestão |
|---|---|---|---|
| Sobre: neutralidade, metodologia, fontes, o que não cobre, lacunas, privacidade | `/como-funciona` | — | Já temos |
| Como atualizamos: tabela de fontes com frequência e última carga; "fora do prazo" | Data da coleta | — | MVP (E20): tabela gerada pelo cron |
| Quem publica e quem não publica (cidades e estados sem dado aberto) | Não tem | Escopo municipal | Fora |
| Mais vistos, visitas ao vivo, origem e aparelho dos visitantes | Sem analytics | Princípio 3 (cookieless aceito) | Decidir junto com o analytics da E15 |
| Processos e sanções (TCU, CGU, Justiça Eleitoral) | Não tem | Princípio 4 exige cuidado extremo | v1.2, só decisão oficial, nunca investigação |

### 6. Engajamento

| Funcionalidade deles | Fiscaliza hoje | Conflito | Sugestão |
|---|---|---|---|
| Conta por e-mail, monitorar políticos | Não tem | **Princípio 3; fora de escopo: tabela de assinantes** | Fora |
| Avisos por e-mail ou WhatsApp | Não tem | **Fora de escopo: e-mail transacional, newsletter**; web push está em v1.1 | Fora; alerta por web push em v1.1 |
| Canal no WhatsApp e Instagram | Não tem | — | Fora do código; decisão de divulgação |
| Formulário de sugestões | Não tem | Guardar mensagem exige tabela | MVP: `mailto:` |
| Pix para doações | Não tem | — | Decisão do projeto, não de código |
| "Ouvir esta página" | Não tem | — | v1.2: leitura nativa do navegador, sem serviço |
| Tema claro e escuro manual | Segue o sistema | — | v1.2 |
| Servidor MCP para assistentes de IA (em breve) | Não tem | — | v1.2, a partir dos dados abertos já previstos |

## O que eu sugeriria levar para o MVP

São itens que cabem no card ou na página do político, usam fontes que já temos e não ferem
princípio. Em ordem de valor para quem chega pela colinha:

1. **Cota dos senadores (CEAPS):** fecha a maior lacuna do card de senador.
2. **Propostas de autoria:** quantas apresentou como autor principal e quantas viraram lei. A
   coleta já está prevista na E19.
3. **Mandato atual e próximo no cabeçalho:** "em exercício até 31/01/2027 · eleito para 2027–2031".
4. **Data da coleta e "o que está e o que não está"** em cada página do político.
5. **Canais oficiais de cobrança** ao lado do botão Cobrar, e **"reportar erro"** por `mailto:`.
6. **Seção sobre o que faz um deputado e um senador** em `/como-funciona`.
7. **Redes sociais declaradas ao TSE**, para os eleitos que ainda não estão na Câmara.

O resto do que cabe no projeto está distribuído entre v1.1 e v1.2 nas tabelas.

## Decisões que só o usuário pode tomar

- **Escopo:** o Politicômetro cobre todos os cargos. Copiar "praticamente todas as funcionalidades"
  significa sair de deputado federal e senador, o que o `CLAUDE.md` põe fora de escopo
  (estaduais, governadores, presidente). Também multiplica a coleta: eles rodam um servidor próprio
  pago, e não medimos se o plano free do Supabase e do GitHub Actions comportaria esse volume.
- **Presença em sessões e discursos:** estão em "Fora de escopo". Entram só se o `CLAUDE.md` mudar.
- **Conta e avisos por e-mail ou WhatsApp:** contrariam o princípio 3.
- **Régua esquerda–direita dos partidos:** contraria o princípio 4, mesmo com fonte acadêmica.
- **Resumo simplificado das votações:** só ementa oficial, ou resumo gerado no cron e revisado.
