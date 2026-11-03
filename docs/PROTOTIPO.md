# Protótipo de telas (Claude Design)

Referência visual e de conteúdo para o Passo 4 em diante. Lido e cruzado com o `CLAUDE.md` e o
`PLANO.md` em 2026-11-03. No mesmo dia, o plano antecipou as telas que já têm dado real no banco
(E23 a E23d): crachá, Congresso, "quem me representa" no Congresso, Cargos e Dicionário.

- **Onde está:** canvas "Fiscaliza — Protótipo" no claude.ai,
  `https://claude.ai/artifact/9VkftS3ZKzdgwb3dJpLDv5`. Uma sessão do Claude Code lê as telas direto
  pelo link (ferramenta Artifact, `read` com `paths` em `project/*.dc.html`); não é preciso exportar.
  Reler no começo de cada etapa que usa uma tela, porque o protótipo pode ter mudado.
- **O que é:** 11 telas e 3 componentes (menu lateral, barra do topo, mapa dos estados) em HTML do
  Claude Design. Não dá para copiar para o site: o desenho é refeito nos componentes do Next.js.
- **Todos os nomes, partidos e números são fictícios.** Nenhum valor do protótipo entra no site
  (princípio 5). Cada campo só aparece quando tiver fonte oficial; sem fonte, "—" com o porquê.

## Visual

Tema claro inspirado no Purity UI Dashboard (Creative Tim): usar as escolhas visuais, não o código.

| Token | Valor no protótipo |
|-------|--------------------|
| Fundo da página | `#F7FAFC` |
| Card | branco, raio 15 px, sombra `0 3.5px 5.5px rgba(0,0,0,.02)` |
| Destaque | teal `#4FD1C5` com texto escuro `#1A202C`; links `#2C7A7B` |
| Texto | `#2D3748`; secundário `#64748B` (no site `#5F6B7E`: 5,15:1 sobre o fundo, contra 4,54:1); bordas `#E2E8F0` |
| Fonte | Roboto 400/500/700/900 |

No site (aplicado na E22b, `app/globals.css`, `components/Moldura.tsx`):
- Roboto entra por `next/font`, servida pelo próprio site no build, nunca buscada na hora.
- O tema escuro continua, seguindo o sistema como hoje, com tokens derivados destes. O botão
  claro/escuro segue no Passo 7.
- O menu lateral do protótipo vira uma fileira rolável abaixo de 760 px. No site, decidir na etapa
  de visual entre barra no rodapé e gaveta, medindo: colinha e página do político abrem em < 1 s no
  4G.

## Telas → etapa e fonte

### Crachá do político (`PerfilV2`) → página `/p/[slug]`

| Campo | Fonte | Etapa |
|-------|-------|-------|
| Nome, cargo, UF, partido | `politicos` (já no site) | E23 |
| "Em exercício desde … · mandato até …" | `mandatos` (já no banco) | E23 |
| Salário por mês | ato legal do subsídio (não há API) | E23 |
| Participação nas votações do ano | `votos` (já no card) | E23 (topo) / E26 |
| "Votou com o partido?" nas votações em que o partido orientou | `orientacoes` + `votos` | E26 |
| Participação ao lado da média da Casa | `votos`, média calculada no cron | E26 |
| Patrimônio declarado por eleição, "N vezes maior que em 2010" | TSE `bem_candidato` | E24 (2026) + E29 (2008–2022) |
| Quem vota mais parecido | `votos` (dado existe) | **decisão 2** |
| Aba Propostas: lista, "podem virar lei", filtros por ano e tema | `proposicoes` (já no banco) | E25 (tema já é decisão da E25) |
| Aba Votos: votação, orientação do partido, voto, link oficial | `votacoes`, `votos`, `orientacoes` | E26 |
| Aba Emendas: destino, valor, pago | Portal da Transparência (chave de API) | **decisão 3** |
| Monitorar | navegador (localStorage) | **decisão 1** |
| Comparar com outro político | ver Comparar | E26b |
| Compartilhar | card `next/og` | E33 |

**O que o card atual tem e o crachá do protótipo não mostra.** Tudo continua, porque é o objeto
central do `CLAUDE.md`. Na E23, achar o lugar de cada um no layout do crachá:
- governismo;
- cota do mês contra a média da bancada da mesma UF e Casa;
- "afastado N dias";
- "Como cobrar", com os canais oficiais;
- "Receber avisos" (fake door): é o substituto permitido para os alertas do protótipo.

### Visão geral (`Main`)
- **Mapa "Quem governa" por estado e cidade:** governador, prefeito e presidente. Depende do
  Passo 5; até lá, **decisão 4**.
- **Cartões por cargo que abrem a lista A–Z com filtros de partido e estado:** senadores e
  deputados federais já existem; os demais cargos vêm no Passo 5.
- **Busca na barra do topo (político ou página):** o site já tem busca por nome e cidade; a barra
  do topo só a leva para todas as páginas (etapa de visual).

### Congresso (`Congresso`)
- **Plenário em bolinhas por partido, com a lista de quem está em cada bancada:** `politicos` em
  exercício. Antecipado para a E23b.
- **Últimas votações com placar e "O que virou lei":** E23b (`votacoes` e `virou_norma` já estão no
  banco). A lista completa com filtros e o detalhe da votação seguem na E30 e na E31.
- **Agenda do mês e pauta da sessão:** E32, pelo cron.
- **"Sem sessão agora · consultado há 0 min":** sugere consulta ao vivo (princípio 2). No site
  vira "atualizado em {data da coleta}", vindo de `atualizacoes`.

### Me representa (`Representantes`)
- **Cidade ou estado → quem está no cargo, em anéis (Brasília, estado, cidade), com a contagem da
  Constituição:** a parte do Congresso foi antecipada para a E23c (senadores e deputados federais
  da UF). Prefeito, governador, deputados estaduais e vereadores vêm no Passo 5.
- **Bandeja "Monitorando (n)":** **decisão 1**.

### Entrar / Monitorando (`Entrar`)
- **Entrar com código por e-mail, "Criar conta", resumo por e-mail, alertas:** fora de escopo
  (princípio 3; "conta, login, monitorar com cadastro" e "e-mail … ou qualquer aviso real"). **Não
  entram.**
- **"Quem você acompanha" e "O que aconteceu desde a última visita", guardados só no aparelho:**
  cabem, com a data da última visita no localStorage. Itens possíveis com o dado do cron:
  - votos;
  - propostas apresentadas;
  - gasto de cota por mês e categoria (E27).
- **Itens do feed que não entram:**
  - "Discursou no Plenário": discursos estão fora de escopo.
  - Atos do Executivo, contratos de prefeitura: sem fonte aberta no escopo atual.

### Comparar (`Comparar`, `CompararCom`) → E26b (depois de patrimônio e fidelidade)
- **De 2 a 5 lado a lado, sem nota nem ranking:** bate com o princípio 4.
- **Linhas:** partido, idade, salário, cota, patrimônio, votos na última eleição, propostas,
  participação, mandatos.
- **Idade:** pede a data de nascimento do TSE, que hoje não é gravada; conferir na hora.

### Propostas (`Propostas`)
- **Lista geral com filtros (Casa, tipo, situação, busca na ementa) e link oficial:**
  `proposicoes`, só as que têm autor no site.
- **MPV:** não é coletada (o autor é a Presidência).
- **Linha do tempo "Apresentada → comissão → Plenário → outra casa → sanção":** pede a
  tramitação, que não é coletada (hoje só a situação atual). A lista entra na E25; a linha do tempo,
  só se a tramitação passar a ser coletada.

### Cargos, Dicionário → E23d
- **Ambas são texto fixo com fonte legal:** antecipadas por não dependerem de coleta.
- **Dicionário:** junta com os termos de `lib/glossario.ts`, sem duplicar.

### Sobre
- **No protótipo está em branco:** no site é `/como-funciona`.

## O que o protótipo não pode levar para o site

| No protótipo | Regra | No site |
|--------------|-------|---------|
| Conta, código por e-mail, resumo por e-mail, alertas | princípio 3, fora de escopo | não entra; "monitorar" só no aparelho; alertas viram a fake door "Receber avisos" |
| "Presença nas votações" | presença literal está fora de escopo | "participação", como no `lib/glossario.ts` |
| "Discursou no Plenário" | discursos fora de escopo | não entra |
| "Consultado há 0 min", "sem sessão agora" | princípio 2 (nada ao vivo) | data da coleta do cron |
| Números de exemplo | princípio 5 | só dado oficial, ou "—" com o porquê |

## Decisões abertas (do usuário)

1. **Colinha × Monitorando.** O protótipo não tem a colinha, que hoje é o centro do produto
   ("monta a colinha em < 1 min", `/c/[ids]`). Opções:
   - o "Monitorando neste aparelho" vira a evolução da colinha (mesma lista, mesma URL para
     compartilhar);
   - os dois convivem.
2. **"Quem vota mais parecido".**
   - Fora do plano, mas o dado existe.
   - Precisa de critério: votações nominais do período em que os dois votaram, % de votos
     iguais, mínimo de votações em comum.
   - Precisa de texto em `/como-funciona`.
   - É comparação entre dois políticos, não régua nem ranking; o "quem vota como eu" saiu porque
     dependia do quiz.
3. **Aba Emendas.**
   - Hoje no backlog: Portal da Transparência, chave de API única no cron.
   - Decidir se entra no Passo 4 (nova etapa depois da E27) ou fica para depois.
4. **Visão geral e "Me representa" antes do Passo 5.**
   - Mostrar só o Congresso, com aviso de que governos e câmaras municipais chegam depois?
   - Ou manter a página inicial atual até o Passo 5?
