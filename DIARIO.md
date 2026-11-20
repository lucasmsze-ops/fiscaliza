# Diário de sessões

Uma entrada por sessão, a mais recente no topo. É o fio da meada: a próxima sessão lê
só a última entrada e o `PLANO.md`.

Modelo:

```
## AAAA-MM-DD · Ex
**Feito:** o que ficou pronto (arquivos, rotas, testes).
**Decidido:** escolhas que não estão óbvias no código e por quê.
**Lacunas:** o que a fonte não tinha (também vai para docs/LACUNAS.md).
**Próximo passo:** a primeira coisa a fazer na próxima sessão.
```

---

## 2026-11-20 · E23r · notícias das agências oficiais
**Feito:** job `noticias` (`scripts/cron/noticias.ts`, `lib/noticias.ts`) no cron diário: RSS da Agência Câmara
(paginado até cobrir 48 h) e da Agência Senado (`todasnoticias` + `noticias`), sem biblioteca. Grava só as matérias
que citam alguém do site, com título, link, data, agência e ids dos citados (migração 0012, índice GIN no array);
o texto é lido e descartado. Ligação pela menção "Nome (PARTIDO-UF)": o trecho antes do parêntese termina no nome
de urna ou no nome parlamentar oficial (caches da Câmara e do Senado) e a UF é a do político; nome repetido na UF
fica de fora. Rota `/dados/noticias/[id]` (ISR) e seção "Notícias das agências da Câmara e do Senado" no "Quem votei".
**Decidido (usuário):** coleta uma vez por dia.
**Medido (sem publicar):** 100 matérias da Câmara (5 páginas) e 17 do Senado; 98 citam políticos do site. Com só o
nome de urna, 58 de 64 menções ligavam; o nome parlamentar resolve "Randolfe Rodrigues", "David Soares" e afins.
**Lacunas:** Senado sem paginação (só o fim de cada dia); menção por apelido não liga (docs/LACUNAS.md).
**No ar:** 0012 rodada pelo usuário; push 94f1a4c; cron manual 44666975935 verde: 98 matérias publicadas (90 da
Câmara, 8 do Senado). Em produção, `/dados/noticias/laura-carneiro-rj` com 8 e `tarcisio-motta-rj` com 3.
**Próximo passo:** hospedar os PDFs dos planos de governo (fecha a E23n); aplicar o kit do iOS 27 (cartão de tarefa).

## 2026-11-19 · E23q · todos os candidatos a presidente e governador
**Feito:** o job `executivos` passou a gravar, além dos 28 eleitos com o crachá, todos os candidatos de 2026 em
`candidatos_executivo` (migração 0011): 14 a presidente e 201 a governador, situação final pelo turno mais alto.
`/dados/executivos` junta os dois (eleitos com o crachá e o id do Monitorando; os demais com id `candidato-<sq>`,
sem crachá) e, enquanto a tabela nova estiver vazia, cai para só os eleitos, com o aviso no santinho.
**Decidido:** tabela própria em vez da coluna `eleito` em `executivos`, para a Visão geral e o crachá não mudarem.
**Lacunas:** 11 candidatos com situação `#NULO` no TSE (entre eles Pablo Marçal, a presidente) aparecem como
"situação não informada pelo TSE".
**Conferido (sem publicar):** 215 candidatos; os 28 eleitos casam com o crachá.
**Publicação:** 0011 rodada pelo usuário; push (d9458f9); cron manual 44663905018 coletou os 215 candidatos mas
não publicou nada: a validação barrou `politicos[1947]` sem UF. O cron já falhava assim desde o run agendado de 19/11:
o perfil da senadora Jussara Lima (suplente em exercício, PI) passou a vir sem `UfParlamentar` e virou o id
`jussara-lima-`. Corrigido: a UF vem da lista de em exercício quando o perfil não traz, e político sem UF sai do
estado (com as linhas ligadas a ele) antes da validação; nunca foi publicado.
**No ar:** correção 5eff847; cron manual 44665014385 verde: saneamento tirou `jussara-lima-` (com 4 mandatos e 19
afastamentos do estado), Senado com 82 de 82 ligados ao TSE, `jussara-lima-pi` publicada, 215 candidatos em
`candidatos_executivo`, e os dados parados desde 18/11 publicados (998 votos, 4 votações, 659 resumos). Este commit é
o redeploy (o índice `/dados/executivos` do deploy anterior foi gerado com a tabela vazia).
**Próximo passo:** E23r (notícias das agências da Câmara e do Senado).

## 2026-11-19 · E23p · Quem votei
**Feito:** a tela Monitorando ganhou duas abas (controle segmentado, `components/Segmentado.tsx`): "Quem votei"
e "Monitorando". Em "Quem votei", filtro de eleição (só 2026) e de estado, e o santinho na ordem da urna, só no
navegador (`lib/quem-votei.ts`, `lib/quem-votei-estado.ts`, `components/QuemVotei.tsx`). A busca de cada cargo usa
`/dados/politicos` (ganhou a chave `st` da situação) e o novo `/dados/executivos`. Quem foi eleito entra no
Monitorando sozinho (`garantir` em `lib/monitorando.ts`); não eleito fica com o "Monitorar" desligado; deputado
estadual mostra que o cargo ainda não é acompanhado. Presidente e governador entram no Monitorando com ids
`executivo-*` e cartão próprio (posse, link para o crachá). Embaixo do santinho, "O que aconteceu": votos no
Plenário de quem a pessoa votou e projetos de autoria deles na pauta (`/dados/pauta`, `lib/pauta.ts`,
`repo.autoresDasMaterias`; na última pauta, 6 de 15 matérias tinham autor no site).
**Decidido (perguntas ao usuário):** tirar alguém do santinho não tira do Monitorando; notícias só da Agência
Câmara e da Agência Senado (RSS, cron), E23r; coletar todos os candidatos a presidente e governador, E23q.
**Conferido:** os RSS das duas agências (`camara.leg.br/noticias/rss/ultimas-noticias`,
`senado.leg.br/noticias/feed/todasnoticias/RSS`) trazem o texto inteiro, com "Nome (PARTIDO-UF)" (41 e 23 menções
nos feeds de hoje), mas só as 20 e 15 últimas matérias: a coleta precisa rodar várias vezes por dia.
**Achado:** o `next build` passou a parar na 1ª vez com um aviso de segurança do Next 16.4.3 (7 avisos moderados,
corrigidos na 16.4.6); na 2ª vez segue. O build da Vercel pode parar igual.
**Próximo passo:** decidir a atualização do Next; push da E23p; depois E23q e E23r (migrações rodadas pelo usuário).

## 2026-11-14 · E23o · design system do iOS
**Feito:** visual trocado pelo do iOS, adaptado para site. `app/globals.css` com as cores do sistema da
Apple no claro e no escuro, fonte do sistema (sai a Roboto: nenhum download de fonte) e a escala do Dynamic
Type nos tamanhos do Tailwind. `lib/estilo.ts` ganhou CHIP, BOTAO, BLOCO, ETIQUETA, CAMPO e ROTULO, usados
no lugar dos chips que cada tela definia. Cartões sem borda nem sombra; botões e filtros em cápsula; blocos
dentro do cartão em preenchimento cinza; popovers sem borda; menu lateral em lista simples com ícones azuis;
no celular, a barra do topo fica translúcida e fixa; crachás (político e executivo) sem a faixa colorida;
Câmara/Senado num controle segmentado; regiões do mapa nas cores de sistema; rótulos sem caixa alta.
`docs/PROTOTIPO.md` registra os tokens novos e mantém os antigos como histórico.
**Decidido (perguntas ao usuário):** azul do sistema como destaque; é um site, não um app, então nada de
tab bar no rodapé. Onde o azul ou o cinza do iOS ficariam abaixo de 4,5:1 com texto pequeno, entram as
variantes acessíveis da Apple (botão `#0071E3`, link `#0066CC`, no escuro `#409CFF`; cinza `#6C6C70`).
**Corrigido:** aviso de hidratação no Plenário (o último dígito de `Math.cos` diferia entre o Node e o
navegador): coordenadas arredondadas em `cadeirasHemiciclo`.
**Apoio:** preview `fiscaliza-dev` (porta 3111, `next dev` com Supabase) no launch.json do $HOME; os outros
três rodam `next start` e mostram o build antigo.
**Sempre escuro (mesmo dia, pedido do usuário):** só os tokens do escuro em `:root`, `color-scheme: dark` e
`themeColor` preto no viewport; as variações `dark:` saíram; verdes e vermelhos antigos viraram os do iOS
(`--verde` #30D158, `--vermelho` #FF453A, laranja #FF9F0A na pizza). Conferido com o aparelho no tema claro.
**Congresso (mesmo dia, pedido do usuário):** título "Congresso Federal", sem o subtítulo; vão do hemiciclo de
40% para 47% do raio e número em 24 px no celular (o 513 encostava nas cadeiras); filtro de estado virou um
chip com seta e nome do estado (o `<select>` nativo fica invisível por cima, em 16 px, para o Safari não dar zoom).
**Mapa (mesmo dia, pedido do usuário):** regiões em tons pastel, como as bolinhas do Congresso, com a sigla
em `#1C1C1E` (`ROTULO_REGIAO`, contraste > 9:1); com um estado escolhido, os outros esmaecem e a sigla fica clara.
**Navegação (mesmo dia, pedido do usuário):** sai o sino (atalho para Monitorando) e o `SinoMonitorando`. A
busca do topo ganhou escopo: políticos na Visão geral e no Congresso (sem páginas nos resultados); projetos e
votações em Votações, com índice novo `/dados/busca-votacoes` (pauta + 1.541 votações nominais desde 2023,
~120 KB comprimido, baixado ao tocar no campo); nenhuma busca em Monitorando, Sobre e nas N2. Telas do menu são
N1 (`lib/navegacao.ts`); as demais são N2: no celular o cabeçalho com o menu some (`CabecalhoCelular`) e a
`BarraVoltar` mostra "‹ Congresso", "‹ Votações" etc. (volta no histórico se a pessoa veio do site, guardado
em sessionStorage; senão, vai para a N1 de origem). No computador o menu lateral continua.
**Cabeçalho (mesmo dia, pedido do usuário):** saiu o caminho "Páginas / ..." de todas as telas (a `BarraTopo`
virou só a busca) e as reticências do texto das buscas; Sobre saiu do menu (ficam 4 abas, que cabem sem rolar)
e abre pelo ícone de Dúvidas ao lado da marca, no celular e no menu lateral; como não está no menu, é N2.
**Não feito:** botão de Login no cabeçalho (fake door com modal). Login está em "Fora de escopo" e fere o
princípio 3 do CLAUDE.md; o usuário decidiu deixar sem Login.
**Menu do celular (mesmo dia):** as quatro abas espalhadas na largura, alinhadas às margens da página e com o
mesmo espaço entre elas (14 px; 15 px a partir de 430 px; 13 px abaixo de 360 px). Em 320 px com o contador de
Monitorando a faixa rola por dentro, sem alargar a página.
**Votações (mesmo dia, pedido do usuário):** título fora de cartão ("Votações do Plenário"), com o filtro por dia
à direita (no celular só o ícone, para caber na mesma linha) e "Atualizado em dd/mm/aaaa" embaixo; o calendário
abre num cartão próprio. "Últimas votações" vem antes de "Próximas votações"; saíram os subtítulos das duas e a
linha "Sessão de ...: N votações". Corrigido: `capitalize` fazia "Novembro De 2026" no calendário e no título do
dia; o dia escolhido ganhava borda branca depois da troca de tema.
**Propostas no crachá (mesmo dia, pedido do usuário):** no topo da aba Propostas, "Apresentadas" e "Viraram norma"
(com o % das apresentadas) e colunas por ano de apresentação, a parte que virou norma em azul (`--serie-1`) e o
resto em cinza (skill dataviz, forma de ênfase; validador: CVD e contraste ok contra #1C1C1E). Dados da lista
completa que a aba já baixa: sem cron nem migração. Dica por coluna no hover e no foco, tabela para leitor de
tela. Votos sem gráfico (pedido). Conferido em Esperidião Amin: 121 apresentadas, 11 viraram norma (5+1+5+0).
No mesmo dia, a pedido: as colunas por ano viraram uma pizza (viraram norma × não viraram, como a do "Votou
com o partido?"); a explicação foi para um botão "i" (popover nativo) no canto da pizza; o filtro de ano subiu
para cima dos números e da pizza, que passam a seguir o ano (todos os anos = o total); a busca no resumo fica
acima da lista. Conferido: 2025 dá 34 apresentadas e 5 viraram norma (15%).
**Crachá (mesmo dia, pedido do usuário):** saíram os ícones coloridos dos cartões de salário e participação (já
não apareciam no celular). O "?" do `Termo` ficou proporcional ao texto (em) e centrado na altura das letras:
antes era um círculo fixo de 20 px que ficava ~3 px abaixo do centro em texto de 12 px; medido depois, ±0,1 px
em texto de 12 e de 20 px.
**Revisão de UX do site todo (mesmo dia, pedido do usuário), celular e computador:**
- Visão geral: "+ Monitorar" no pé dos cartões de deputados (alinhado entre vizinhos quando o nome quebra);
  rótulos de grupo (Presidente, Governador, Senadores, Regiões) de 11 px para 13 px (`ROTULO`).
- Números em destaque com um estilo só (`ROTULO` + `NUMERO` em `lib/estilo.ts`) no crachá, no executivo e
  nas Propostas; no celular o rótulo reserva duas linhas para os números lado a lado ficarem na mesma altura;
  o período da participação foi para o detalhe. O detalhe "916 de 1.107" deixou de ser verde (cor de "bom"
  julga o número; princípio 4).
- Ementas da lista de propostas em peso normal, 15 px, até 4 linhas (3 na tabela), com o texto inteiro no
  `title` e na página oficial; antes eram parágrafos inteiros em negrito.
- Filtros de escolha única viraram o mesmo chip com seta (`components/SelectChip.tsx`): estado (Congresso),
  ano (Propostas), área (plano de governo) e pessoa (Monitorando). "Ver mais" com o mesmo botão em todo lugar.
- Links: sublinhado só no meio de frase; links e botões soltos ("Como contamos", "Ver os N partidos",
  "Fechar", "Parar de monitorar", rodapé) sem sublinhado. Rodapé centralizado, com separador.
- Congresso com o título fora do cartão e "Atualizado em", como Votações (a nota solta no fim saiu).
- Comparar: "viraram lei" → "viraram norma", como no crachá. Rodapé do hemiciclo e cabeçalho da tabela de
  propostas de 11 px para 12 px.
**Mapa (mesmo dia, pedido do usuário):** o pastel saiu; as regiões usam as cores da paleta de partidos do
Congresso (`--serie-*`). Entre as 8, escolhida por busca exaustiva a combinação em que regiões vizinhas se
distinguem com daltonismo (pior par vizinho ΔE 8,6 simulado, 22,5 em visão normal; validador da skill dataviz):
Norte roxo, Nordeste coral, Centro-Oeste verde, Sudeste azul, Sul rosa. Rótulo escuro, branco no verde
(`rotuloRegiao`).
Logo depois, a pedido, as matizes trocaram: Norte verde `#199E70`, Nordeste laranja `#D95926`, Centro-Oeste roxo
`#6250D6` (o mais fechado, para se afastar do azul do Sul), Sudeste rosa `#E87BA4`, Sul azul `#3987E5`; pior par
vizinho ΔE 9,0 com daltonismo e 13,4 em visão normal (roxo × azul); rótulo branco só no roxo.
**Próximo passo:** push (sem migração nem cron); depois decidir onde hospedar os PDFs dos planos (E23n).

## 2026-11-14 · ajustes e pente-fino de layout
**Feito:** crachá com o cargo e a UF da cadeira no cabeçalho e no título (a candidatura de 2026 vai abaixo
quando é outra: Rosangela Moro, Tiririca, Hélio Lopes; e quem é deputado e disputou o Senado, como Erika
Kokay). Estilos comuns em `lib/estilo.ts` (cartão 16/22 px, título de página 24/28 px, de seção 18 px),
aplicados em todas as telas: antes eram 16 a 22 px de respiro e títulos de 12 a 32 px. Visão geral sem
espaço duplo antes da lista e nomes longos em duas linhas; pauta com data curta e temas numa linha
própria; partidos da votação com a orientação sempre na mesma linha; botões do crachá numa linha no
celular, com o aviso de "link copiado" em balão; executivo com a foto ao lado do nome e a ocupação no
gênero declarado; Comparar com "do/da" no nome do estado; textos que falavam em "passar o mouse" e
"sua cidade" (busca que saiu) corrigidos.
**Próximo passo:** push (sem migração nem cron).

## 2026-11-14 · E23n · crachá do executivo
**Feito:** `/executivos/[id]` com o que o TSE publica (job `executivos` lê também `bem_candidato` e
`historico_candidatura` de 2026, baixados pelo workflow, e o JSON de resultado por turno); migração 0010.
Cartões de presidente e governador da Visão geral abrem o crachá.
**Decidido (perguntas ao usuário):** crachá próprio; só os eleitos; checklist do plano só com ato oficial
(o painel pessoal do usuário julga status e resume notícias por IA, o que fere os princípios 2, 4 e 5);
promessas selecionadas por mim e revisadas por ele.
**Corrigido:** posse em 5/1 (presidente) e 6/1/2027 (governadores), EC 111/2021, não 1º/1.
**Achados:** histórico de candidaturas vem com `#NE` no resultado de eleições antigas (Lula 2006) e "Inapto"
na de 2018; a foto e o resultado do presidente estão na eleição federal (6257/6258).
**No ar:** 0010 rodada pelo usuário; push; cron manual 43552965530 verde (28 executivos republicados com
vice, votos, bens e histórico); este commit é o redeploy.
**Promessas (mesmo dia):** proposta de 28 + 28 (`docs/promessas/`), escolhidas entre 320 e 271 frases de
compromisso; 56 citações conferidas contra o texto do PDF; aprovada pelo usuário sem mudanças. Viraram
`data/promessas/2026.json` e o checklist no crachá (filtros por tipo e área; "sem ato oficial ainda").
**Próximo passo:** push (sem migração nem cron); depois registrar atos oficiais à medida que saírem
(a partir da posse, 5 e 6/1/2027), e decidir onde hospedar os PDFs dos planos.

## 2026-11-13 · E23m · menu, Visão geral com o estado, Votações
**Feito:** menu com "Outros"; Visão geral absorveu a Me representa (redirecionamento com `?uf=`/`?cidade=`);
job `executivos` (1 presidente e 27 governadores eleitos em 2026, migração 0008); detalhe da votação
reordenado, com a lista de cada parlamentar por partido (`membros` no resumo, ~45 MB nos 1.537 resumos);
`/votacoes` com próximas (job `pauta`: hoje 7 matérias no Senado em 17 e 18/11, a Câmara ainda sem sessão
deliberativa marcada) e últimas, calendário como filtro; temas oficiais (1.285 de 1.537 votações; as do
Senado sem tema são escolhas de autoridade, que não têm classificação). Migração 0009 (pauta e temas).
**Decidido (perguntas ao usuário):** executivos = eleitos em 2026 com a posse (não há fonte de quem está
no cargo hoje); títulos = assunto + tema oficial, nada escrito por nós.
**Achados:** o `consulta_cand` repete as UFs no `_BRASIL`; a foto do presidente está na eleição federal
(6257); a pauta deliberativa da Câmara aparece em `/eventos` só poucos dias antes; das votações herdadas
da sonda não há o detalhe em cache, então o id da matéria sai de `/proposicoes?siglaTipo&numero&ano`.
**2026-11-14:** busca de cidade saiu da Visão geral; níveis com subtítulo e cartões; deputados em grade no
celular; menu com 5 itens (Comparar fica fora do menu, só pelo crachá); regra de aprovação num "i".
**No ar:** 0008 e 0009 rodadas pelo usuário; push; cron manual 43549848221 verde: 28 executivos, 7 itens de
pauta (Senado), 800 matérias consultadas para temas (1.289 de 1.541 votações com tema), 1.541 votações
republicadas com `temas`, 1.541 resumos de votação regravados com `membros`; este commit é o redeploy.
**Próximo passo:** E23g (Propostas) ou os executivos (ideia do usuário).
**Corrigido (2026-11-14):** a posse dos eleitos em 2026 não é 1º/1: pela EC 111/2021, o presidente toma
posse em 5/1/2027 e os governadores em 6/1/2027 (visto no painel do usuário). `executivos.posse` e o texto.

## 2026-11-13 · E23f · Comparar
**Feito:** `/comparar` (`components/Comparar.tsx`, `lib/comparar.ts`, `/dados/comparar/[id]`), aba no
menu, link no crachá. `SupabaseRepo.getPolitico` passa a buscar uma linha só quando a lista não está em
memória (a rota precisa de `votos_2026`, que não está no resumo).
**Decidido:** só as linhas que o crachá já mostra, para as telas não se contradizerem; sem ordenar
colunas nem destacar o maior valor. Cota fora (decisão de 2026-11-04). "Na Casa desde" no lugar de "No
Congresso desde": Mara Gabrilli (deputada de 2011 a 2019) aparecia "desde 2019", porque de senadores só
coletamos os mandatos do Senado.
**Lacunas:** idade (o cron não grava a data de nascimento do TSE) e patrimônio (E24).
**Próximo passo:** push (sem migração nem cron); depois E23g (Propostas).

## 2026-11-05 · E23e · Monitorando neste aparelho
**Feito:** `lib/monitorando.ts` (localStorage, `useSyncExternalStore`, avisos entre abas),
`components/BotaoMonitorar.tsx` (crachá, Me representa, lista da Visão geral), bandeja na Me representa,
`/monitorando` (`components/Monitorando.tsx`), `/dados/acompanhar/[id]` (`lib/acompanhar.ts`), item no
menu com contagem e sino na barra do topo; páginas novas na busca do topo.
**Decidido:** novidade por chave vista (voto `v:<votação>`, proposta `p:<casa>:<matéria>`), não por data:
a coleta pode trazer um voto de dias antes. Quem entra na lista começa com o que já existia como visto;
os vistos são podados para o que ainda aparece nos resumos. Cota fora (saiu do crachá).
**Corrigido:** com 6 abas, o cabeçalho do celular alargava a página (566 px numa tela de 375):
`grid-cols-1` e `min-w-0` na Moldura.
**Próximo passo:** push (sem migração nem cron); depois E23f (Comparar).

## 2026-11-05 · E23d · Me representa
**Feito:** `/me-representa` (`components/MeRepresenta.tsx`), aba no menu (no celular a faixa rola e a
aba atual fica à vista). Só o que tem dado: em Brasília, 3 senadores e os deputados federais da UF.
**Achado:** `politicos.uf` é a UF da candidatura de 2026: SP aparecia com 68 deputados (Rosangela
Moro e Tiririca contados no PR e no CE), RJ com 45 (Hélio Lopes em RR). Agora `mandatos.uf` (posse no
histórico da Câmara, mandato do Senado; migração 0007, testada no PGlite) alimenta `bancadas`, então
Visão geral, Congresso e "mais parecidos" também passam a usar a UF da cadeira.
**Comparação:** ensaio `--sem-publicar`: 1.452 mandatos, todos iguais aos de antes fora a coluna `uf`;
3 antigos da sonda (João Paulo Cunha, 2003–2014) ficam com `uf` nulo; as 27 bancadas = cadeiras da
Constituição. O crachá ainda mostra a UF da candidatura no cabeçalho (lacuna registrada).
**No ar:** 0007 rodada pelo usuário; push; cron manual 41956487823 verde (1.452 mandatos publicados com
`uf`, 659 resumos regravados: a lista "mais parecidos" passa a mostrar a UF da cadeira); este commit é o redeploy.
**Próximo passo:** E23e (Monitorando neste aparelho).

## 2026-11-04 · E23l · página Votações
**Feito:** `/votacoes` (agenda e última sessão, movidas sem mudança de /congresso; `montarVotacoes`
separado de `montarCongresso`, então /congresso não lê mais votações); aba Votações no menu; título
de cada votação da aba Votos do crachá liga para `/votacoes/[id]` (`VotoListado.votacaoId`).
**Comparação com o publicado:** recalculando os 3.724 resumos sem o campo novo, 3.458 batem com o hash
no ar; os 266 restantes diferem só em `propostas` (209: meu estado local tem os CSVs anuais da Câmara
mais novos que o do Actions, que traz isso no próximo `proposicoes`) e `card.numeros.diasAfastado`
(62: a data virou para 05/11 UTC). Com o campo, os 658 resumos com votos mudam.
**No ar:** push; cron manual 41938918127 regravou os 658 resumos e trouxe as propostas novas da Câmara
(516 proposições, 106 autorias, 169 contagens), além de 3 afastamentos e 1 político; terminou "com falhas"
só por 3 perfis da Câmara que não responderam (tentados de novo no próximo run). Este commit é o redeploy.
**Próximo passo:** E23d (Me representa).

## 2026-11-04 · E23k · layout e página da votação
**Feito:** menu do celular em abas; cor oficial por partido (`lib/partidos.ts#corPartido`); Visão geral
com chips de cargo; Congresso com abas de Casa, agenda de dias úteis com bolinha e cartões de votação
(`components/CartaoVotacao.tsx`); página `/votacoes/[id]` pré-calculada no cron
(`scripts/cron/votacoes-paginas.ts`, `lib/votacao.ts`, tabela `resumos_votacao`, migração 0006 testada
no PGlite). Ensaio local: 1.537 páginas (~6 MB, até 6,6 KB cada); placar recalculado dos votos bate com
`votacoes.placar` em 1.107/1.107 da Câmara; classificador do que foi votado sem padrão em 6 de 1.537.
**Decidido:** a contagem usa todos os votos do cache, inclusive de quem não tem página (ex-deputados):
sem isso faltavam ~30 votos por votação. Não votou na Câmara = 513 − registrados; quem não votou e
está fora do registro de mandatos (até 20 por votação) vai para uma nota, sem partido. Barras do
placar em tons neutros (Sim/Não não são bom/ruim). Hora da votação e palavras-chave ficam fora.
**Lacunas:** palavras-chave oficiais (indexação) da Câmara e tema (E23j) não coletados.
**No ar:** 0006 rodada pelo usuário; push; cron manual 41937058953 verde (1.537 resumos de votação
gravados, nenhuma outra tabela mudou); este commit é o redeploy que limpa o 404 em cache de quem
abriu uma votação antes do cron. O run agendado das 17h15 UTC também passou verde: E22 fechada.
**Próximo passo:** E23d (Me representa) ou o link da aba Votos do crachá para a página da votação.

## 2026-11-04 · 504 da lista da Câmara
**Feito:** o `parlamentares` falhou nos 4 crons do dia em `/deputados?idLegislatura=57`. Medido: 12–15 s
por página e 504 no corte de 15 s do gateway, com qualquer `itens` (10 a 1000) e com ou sem
`ordenarPor`; só a página já em cache na Câmara respondia rápido; `/deputados` (em exercício) em 0,2 s.
O job agora cai para "já conhecidos (cache) + em exercício" quando a lista da legislatura falha.
Ensaio local `--sem-publicar` com a API lenta: caiu no caminho alternativo (648), politicos 20
alteradas = exatamente as siglas PCDOB → PCdoB; 4 perfis falharam (mantidos, tentados de novo);
25 min por causa da lentidão (cabe nos 120 min do Actions).
**Decidido:** o caminho alternativo não conta como falha (quem assume cadeira aparece na lista em
exercício); perfis que falham seguem contando.
**Próximo passo:** push; o run agendado de 05/11 publica as 20 siglas (ou um manual antes).

## 2026-11-04 · celular e títulos das votações
**Feito:** pedido do usuário (títulos pouco claros, celular ruim). Votações (aba Votos, agenda e última
sessão do /congresso): título = ementa da matéria, "Votado: …" com o procedimento embaixo (ementa
já estava em `votacoes`, 1.536 de 1.537). Propostas com o tipo por extenso. Celular: crachá com faixa
baixa e foto ao lado do nome, números em 2 colunas, gráficos menores, Propostas e Votos em lista (a
tabela fica do tablet para cima), lista da Visão geral em linhas compactas, letras numa linha
rolável, campos com 16 px (o iOS dá zoom abaixo disso), título da barra do topo só no tablet+.
Conferido no navegador: celular sem rolagem horizontal, desktop igual; 83 testes.
**Decidido:** tema oficial (Câmara `proposicoesTemas`, Senado `classificacoes`) vira a E23j: pede
migração e coleta nova.
**Próximo passo:** push → cron manual (resumos com a ementa nas votações) → push deste diário.

## 2026-11-04 · E23i
**Feito:** crachá no layout do protótipo: `components/Cracha.tsx` (faixa, foto redonda, cargo pelo
estado, sigla e nome do partido, em exercício desde · mandato até, salário, participação,
participação × média da Casa, quem vota mais parecido), `components/AbasMandato.tsx` (Propostas em
tabela com ano e busca, lista completa por `/dados/propostas/[id]`; Votos em tabela). Resumo da página
ganhou `comparacao` (média e parecidos, `lib/comparacoes.ts`), `coresPartido` e o resultado de cada
votação. Nomes dos partidos do TSE. Conferido com `estado/dados`: deputada, senador, eleito sem posse,
não eleita; desktop, celular, escuro, 0 erros. 3.724 páginas em ~2 s; resumos +0,6 MB.
**Decidido (usuário):** saem do crachá governismo, cota, mandatos, contatos, Como cobrar e Receber
avisos (seguem no resumo e na metodologia). "Votou com o partido?" entrou também, a pedido: partido
no dia de cada voto lido das respostas em cache (Câmara e Senado trazem a sigla do dia), bancada =
partido, federação ou bloco cujo nome abreviado o lista; bloco cortado sem o partido fica fora
(78% dos votos identificados; 2025 de MDB, Republicanos, Podemos, PSDB quase todo fora). Conferido na
fonte: Nikolas Ferreira 73 votos contra o PL, ex.: urgência de 15/04/2026 (355 × 29), PL orientou Sim.
Resultado em `estado/dados/fidelidade.json`, fora do banco; só o resumo da página leva o número.
**Lacunas:** blocos de nome cortado na Câmara (`docs/LACUNAS.md`).
**Publicação:** run 41835209481 falhou na fidelidade: o estado inicial (tar feito no Mac) trazia
`._*.json` binários (AppleDouble); corrigido em `b1e314d` (leitura pula ocultos, workflow apaga `._*`).
Run 41836008147: fidelidade ok (354.057 de 456.711 votos identificados), 658 resumos regravados.
Os dois runs ficaram vermelhos só pelo `parlamentares` (504 da Câmara em `/deputados`): a sigla
PCdoB das 20 linhas segue pendente até um run com a Câmara respondendo.
**Próximo passo:** publicar na ordem do `docs/CRON.md`: push do código → cron manual (regrava os
resumos com os números novos e as 20 siglas PCdoB) → push deste diário (novo deploy). Depois conferir
o run agendado de 05/11 e seguir para a E23d.

## 2026-11-04 · E23b (refeita no layout do protótipo)
**Feito:** `/congresso` refeita como a tela Congresso do protótipo: cabeçalho com as votações nominais
do ano (192 em 2026), Plenário interativo (`components/Plenario.tsx`: Casa, Hoje / A partir de
fev/2027, estado, destaque do partido, pílulas, bancada em cartões), agenda do mês
(`components/AgendaPlenario.tsx`, rota `/dados/votacoes/[mes]`) e votações da última sessão por Casa
com placar e barra (`components/PlacarVotacao.tsx`). Sigla canônica de partido (`lib/partidos.ts`)
no cron e nas bancadas. Conferido com `estado/dados` e com o Supabase; desktop, celular, escuro, 0
erros; 74 testes. O cron local `--sem-publicar` falhou 2× no parlamentares (504 da Câmara);
a correção de sigla foi conferida sobre o publicado: 20 políticos PCDOB → PCdoB, nenhum outro campo.
**Decidido:** "A partir de fev/2027" só na Câmara (Senado não fecha com dado). "Sem sessão agora",
"próxima sessão" e pauta marcada ocultos (não coletados). "O que virou norma" saiu (não está no
protótipo). Limites reais do mês nas consultas (o Postgres recusou 2026-11-31; o modo JSON não pega).
**Lacunas:** grafia PCDOB/PCdoB; composição do Senado em 2027; pauta futura (`docs/LACUNAS.md`).
**Próximo passo:** push; o próximo cron do Actions publica as 20 siglas corrigidas. Conferir o run
agendado de 05/11 (fecha a E22). Depois a E23d (Me representa).

## 2026-11-04 · E23c
**Feito:** decisão do usuário: o site fica igual ao protótipo, tela por tela, com dado real; o que
não tem dado fica oculto; a colinha sai; Monitorar só no aparelho; uma tela por etapa. PLANO
reordenado (E23c Visão geral → E23i Crachá completo), CLAUDE.md (princípio 3, rotas, definição de
pronto) e `docs/PROTOTIPO.md` atualizados. `/` virou a Visão geral: mapa (`MapaBrasil`,
`lib/mapa-brasil.ts` com os contornos do protótipo, `geodata-br-states` MIT), regiões, busca de
cidade, painel do estado, "Quem está no cargo hoje", lista A–Z (`VisaoGeral`, `lib/visao.ts`).
Busca do topo sobre `/dados/politicos`. Colinha removida (`MontarColinha`, OG, `/dados/cidade`);
`/c/[ids]` → 308 para o crachá. Conferido com `estado/dados` e com o Supabase: 81 / 513, MG 3 / 53 /
853; desktop, celular, escuro, 0 erros; 70 testes. JS da página: +20 KB comprimido sobre os ~180 KB
de todas as páginas.
**Decidido:** título "Quem representa cada estado" (não "Quem governa", sem governadores ainda).
Cartões só de Senadores e Deputados federais; os outros cargos do protótipo ficam ocultos. Partido
na mesma cor de `/congresso`. "Sobre" no menu leva a `/como-funciona`.
**Lacunas:** nenhuma nova.
**Próximo passo:** push da E23c; conferir o run agendado de 05/11 (fecha a E22); depois a E23d (Me
representa).

## 2026-11-04 · E23b
**Feito:** o run agendado de 04/11 (09:17 UTC) não disparou: workflow ativo, nenhum evento
`schedule` até 11:04 UTC (atraso ou descarte do Actions); a E22 segue aberta. E23b adiantada:
`/congresso` com o Plenário de hoje (`lib/congresso.ts`, `components/Plenario.tsx`), últimas 10
votações nominais das duas Casas e "o que virou norma". `Repo` ganhou `listarMandatosEmCurso`,
`listarAfastamentosEm`, `ultimasVotacoes` e `ultimasNormas` (consultas com filtro e `limit`).
Paleta de partidos validada no claro e no escuro (skill dataviz). Conferido com `estado/dados`:
desktop, celular, escuro, abas Câmara/Senado, 0 erros; 70 testes. Contra a API da Câmara de hoje:
513 = 513; única diferença, Priscila Costa (PL-CE) assumiu no lugar de Dayany do Capitão
(UNIÃO-CE) depois da coleta.
**Decidido:** cadeira = mandato em curso sem afastamento na data (575 mandatos → 513 cadeiras). Cor
pela soma das duas Casas (mesmo partido, mesma cor), 8 cores + cinza; fatias por tamanho, nunca por
posição política. Placar zerado em votação de pessoa vira texto (lacuna registrada). No Senado,
PSB (7) fica cinza e PODE (3) tem cor: a ordem é a da soma das Casas.
**Lacunas:** votação de pessoa sem direção dos votos (`docs/LACUNAS.md`).
**Próximo passo:** cron manual (traz a troca de cadeira) e só então o push da E23b, para o build já
sair com o dado novo. Conferir o run agendado de 05/11; se de novo não disparar, investigar o
agendamento. Depois, E23c.

## 2026-11-03 · E23
**Feito:** adiantada a pedido do usuário, com a E22 aguardando o run agendado. Plano reordenado
para antecipar as telas do protótipo com dado real (E23–E23d; Comparar na E26b). Página do
político no layout do crachá: `components/Cracha.tsx` (mesmos `CardDados` do card),
`components/Abas.tsx`, `/p/[slug]` com abas Propostas e Votos, cota mês a mês, mandatos, contatos
com Como cobrar, "sobre esta página". Propostas no resumo da página (`lib/pagina.ts`; `Repo`
ganhou `getAutorias`, `getContagemProposicoes`, `getAtualizacoes`). Salário em `lib/salario.ts`
(DL 172/2022, conferido no texto oficial; teste). Conferido no navegador com `estado/dados`:
deputada, senador, eleito sem posse, não eleita; celular, desktop, escuro; 0 erros; números iguais
aos do site no ar em 3 páginas; 66 testes. Resumos crescem ~3 MB (5,5 → 8,5 MB; maior 7 KB).
**Decidido:** bloco sem dado coletado não aparece (patrimônio, fidelidade, emendas, mais parecidos,
Monitorar). Propostas só onde foram coletadas (`camara_id` ou `senado_codigo`); para os demais a
aba não existe. Salário com centavos (valor legal). Sem "?" em cada sigla da lista de propostas.
Redes do TSE e "quanto custa o mandato" foram para a E24 e a E27.
**Lacunas:** nenhuma nova.
**Próximo passo:** publicar na ordem do `docs/CRON.md` (push do código → cron manual regrava os
resumos com as propostas → push deste diário como novo deploy). Depois conferir o run agendado de
2026-11-04 (fecha a E22) e seguir para a E23b.

## 2026-11-03 · E22b
**Feito:** feita no mesmo dia, com a E22 aguardando o run agendado (exceção pedida pelo usuário; não
toca no cron). `docs/PROTOTIPO.md` cruza o protótipo do Claude Design com o plano. Tema do
protótipo em `app/globals.css`: tokens viram cores do Tailwind (`bg-card`, `border-borda`,
`bg-destaque`, `text-suave`), com escuro derivado. Roboto por `next/font`. `components/Moldura.tsx`
(menu lateral no desktop, gaveta no celular), `MenuItens.tsx`, `BarraTopo.tsx` (caminho + busca que
abre `/?q=` na entrada). Conferido no navegador (build JSON): desktop, celular, escuro, gaveta,
busca, seleção na cidade, colinha; 0 erros no console; 64 testes.
**Decidido:** menu só com páginas que existem (item futuro seria placeholder). Gaveta, não barra no
rodapé, porque o rodapé do celular é da barra "Ver colinha". Secundário `#5F6B7E` em vez do
`#64748B` do protótipo (contraste 5,15:1 contra 4,54:1). Nenhum texto ou número mudou; só saiu o
link "Fiscaliza" do topo de `/p` e `/como-funciona` (a marca no menu faz esse papel).
**Lacunas:** nenhuma.
**Próximo passo:** conferir o run agendado de 2026-11-04 (fecha a E22). Depois a E23 (crachá no layout
do protótipo, só com dado real). O plano antecipou E23–E23d, as telas que já têm dado no banco; a
decisão 1 (colinha × Monitorando) não bloqueia a E23, só o botão "Monitorar".

## 2026-11-03 · E22
**Feito:** `.github/workflows/cron.yml` (06:17 de Brasília + `workflow_dispatch`). Estado no cache do
Actions (uma entrada por execução, restaura a mais recente); sem cache, vem da release
`estado-inicial` (`estado.tar.gz`, 30 MB, 6.440 JSON, sem CPF nem hash). `consulta_cand` baixado a
cada execução para `$RUNNER_TEMP` e apagado. Proposições da Câmara viram extrato por ano (CSV
apagado); votos da sonda copiados para o estado. Tabela `atualizacoes` (migração 0005, rodada pelo
usuário). Secrets gravados pelo usuário. Primeiro run manual: publicou 5 proposições, 2 contagens e
62 resumos, mas o `parlamentares` parou com slug repetido (abaixo). Corrigido, cache apagado, segundo
run manual verde a partir da release: 0 políticos alterados, 6 fontes em `atualizacoes`.
**Decidido:** nada com CPF vai para cache ou release (repositório público: PR de fork lê cache). Sem
cache nem release, o workflow para antes do cron (não recomeça de SP). `runner.temp` não existe no
`env` do job: `FISCALIZA_TSE` vem de um passo via `$GITHUB_ENV`. Mesmo CPF com mais de uma
candidatura: vale a que foi à urna, no empate o sq maior (`porCpf`); antes valia a última linha
lida, e o TSE regenerou os arquivos em outra ordem (Carlos Jordy ligou à candidatura cancelada a
deputado). Depois do Actions, nada de publicar da máquina local: só `--sem-publicar`.
**Lacunas:** CPF com mais de uma candidatura (`docs/LACUNAS.md`). `camara_cota`/`senado_cota` só
entram em `atualizacoes` na próxima coleta mensal (dezembro); levar em conta na página `/atualizacoes`.
**Próximo passo:** conferir o run agendado de 2026-11-04 (09:17 UTC): verde e dado novo no site
(ex.: `atualizacoes` com data de 04/11). Se ok, marcar o "Pronto quando" e passar para a E22b
(visual do protótipo, nova; cruzamento em `docs/PROTOTIPO.md`, com 4 decisões abertas do usuário).

## 2026-11-02 · E21e
**Feito:** job `proposicoes` (`scripts/cron/proposicoes.ts`). Câmara pelos arquivos anuais 2023–2026
(`proposicoes`, `proposicoesAutores`) com `lib/http.ts#baixarArquivo`, que retoma com `Range`: o
servidor corta a conexão a cada ~17 s. Senado por `/processo?codigoParlamentarAutor` (324
listagens) e `/processo/{id}` só das que podem virar lei (2.918, ordem dos autores). Migração 0004
(`proposicoes`, `proposicoes_autores`, `proposicoes_contagem`), testada no PGlite. Ensaio:
25.588 proposições (311 viraram norma), 40.555 autorias, 19.533 contagens; duas execuções
seguidas, a segunda com 0 novas e 0 alteradas; validação ok. Migração rodada pelo usuário, push e
publicação: 85.676 linhas em ~75 s, 0 resumos alterados; 14 de 14 contagens no Supabase; banco com
146,6 MB (29,3%).
**Decidido:** autor = `proponente = 1` (apoio de PEC vem com 0; conferido contra a API para uma
deputada: as 2 diferenças eram apoio); `ordem` 1 = primeiro autor. Íntegra só com algum autor no
site. No Senado, PRS (resolução do Senado) no lugar de PRC, e vale a autoria de iniciativa, não a
listagem por autor (PL da Comissão Diretora). 2 em voo no Senado (429 com 3). Situação muda em
proposição antiga: ano corrente todo dia, anteriores por semana.
**Lacunas:** listagem × autoria de iniciativa no Senado; downloads cortados da Câmara; só desde 2023
e só parlamentares do site (ver `docs/LACUNAS.md`). Para a E22: 356 MB de CSV fora do cache do Actions.
**Próximo passo:** E22 — GitHub Actions, começando por como a primeira execução reconstrói o estado
(arquivos do TSE, cache de votos, CSVs de proposições).

## 2026-11-02 · E21d
**Feito:** job `cota` (`scripts/cron/cota.ts`): despesas da Câmara de todos os 648 deputados da
legislatura 57 pela API (4.619 chamadas, 0 falhas) e CEAPS do Senado pelo arquivo anual
(`lib/senado.ts#listarDespesasCeaps`, sem fornecedor nem CPF/CNPJ), 2025–2026. Migração 0003 (`casa`
nas duas tabelas, `uf` da bancada em `despesas_mes`, `parlamentares`), testada no PGlite e rodada pelo
usuário. Card e página de senador com a cota e link para a transparência do Senado. Publicado: 11.173
despesas, 1.184 médias, 632 resumos. Supabase: 1.186 de 1.186 médias batem com a soma (site + só
média) e 592 de 592 do Senado com a soma direta do arquivo bruto; cota no card de 78 de 81 senadores
e 553 de 575 deputados com mandato em curso. Banco: 128 MB.
**Decidido:** média = todos da UF com lançamento no mês, inclusive quem saiu (a regra da sonda, só
os em exercício, reabriria meses fechados a cada troca de suplente). Em SP a média mudou em 20 de 22
meses, explicada ao centavo por 10 deputados fora da lista de 70 da sonda; os 1.273 deputado-meses
publicados ficaram idênticos. Mês novo só fecha com ≥ 20 dias entre coletas (ago–out de SP estavam
iguais entre 01/11 e 02/11, feriado); primeira coleta nacional fecha até jul/2026. UF da bancada na
Casa, não a da candidatura (Tiririca, Rosangela Moro, Hélio Lopes). Média dividida em centavos
inteiros (4 médias saíram 1 centavo abaixo no meio centavo; corrigidas e republicadas).
**Lacunas:** Kajuru sem CEAPS em 2025–26; 131 despesas da CEAPS sem tipo; UF de senador fora de
exercício só pelos mandatos; cota só desde 2025 (ver `docs/LACUNAS.md`). Páginas geradas no build
ficaram sem a cota até o deploy seguinte (push antes da publicação; ver `docs/CRON.md`).
**Próximo passo:** E21e — proposições (migração 0004).

## 2026-11-02 · E21c
**Feito:** `scripts/cron/parlamentares.ts` (Câmara: 648 da legislatura 57, CPF comparado em memória
com o TSE 2026 e 2022; Senado: 81 por nome completo + UF, todos ligados) e `votacoes.ts` derivando
os votos de todos em todas as votações a partir das respostas brutas (Senado ano a ano, reproduz o
publicado sem diferença). `lib/linhas-mandato.ts` (regra do consolidar, mesmos arquivos). Ensaio
`--sem-publicar` e conferências antes de publicar: 513 de 513 deputados e 81 de 81 senadores em
exercício; 594 de 594 cards com números e "Como cobrar". Site: páginas de político e JSON de cidade
na primeira visita, JSON da cidade com o cabeçalho de cada um, lista de cidades fora do HTML (home de
59 para 2,5 KB), UF na busca. Testado no navegador com o estado nacional (Feira de Santana/BA). Push do
código, depois publicação: 570 mil linhas e 3.293 resumos em 2 min 20 s; 11 de 11 contagens; 121 MB.
**Decidido:** push antes de publicar (o código antigo só conhecia as páginas de SP). Votos sem os
arquivos anuais da Câmara: as respostas por votação bastam e já estavam em cache. 7 políticos de SP
ganharam vínculo com a Câmara (passaram pela legislatura e não estão em exercício). Correções nas
regras: anotação antes do evento no histórico da Câmara (1 deputado de RO sem mandato) e licença
repetida no Senado (5 casos).
**Lacunas:** ver `docs/LACUNAS.md` (`#NULO` no TSE, senadores que saíram, cota só de SP).
**Próximo passo:** E21d — cota da Câmara nas 27 UFs (API, média por UF) e CEAPS do Senado.

## 2026-11-02 · E21b
**Feito:** `scripts/tse/municipios.ts` → `data/municipios-ibge.json` (5.571 cidades; 13 grafias no
de-para; SP igual ao atual). `scripts/tse/nacional.ts` → `estado/fontes/tse-2026/`: 3.632 políticos
(top-20 e todos os eleitos), 458 listas, 172.329 linhas de top-20, em 7 s com DuckDB sobre os CSVs
por estado (3,4 GB). Conferências: quociente candidato a candidato contra a situação no TSE, 0
divergências nos 27 estados (513 vagas, contadas do próprio TSE); top-20 da maior cidade de cada
estado contra o JSON oficial, 54 de 54; SP idêntico ao publicado (listas, municípios, 20.365 linhas).
Corrigido `lib/tse.ts`: o arquivo de resultados usa o código do município com 5 dígitos (o CSV vem
sem zeros à esquerda; SP nunca expôs isso).
**Decidido:** a publicação nacional vai junto com a E21c, porque sem o cruzamento com Câmara e
Senado o card mentiria ("primeiro voto em fevereiro" para quem já vota). Vagas por estado saem do
TSE, não de uma tabela fixa. Todos os eleitos entram, mesmo sem top-20 (uma deputada do RJ).
Nenhum homônimo de nome de urna na mesma UF.
**Lacunas:** ver `docs/LACUNAS.md` (de-para de municípios, eleita sem top-20, "reeleito" fora de SP).
**Próximo passo:** E21c — os 594 parlamentares em exercício (Câmara pelo CPF em memória, Senado
pelo nome completo + UF), votos de todos desde 2023 pelos arquivos anuais, e publicar com a E21b.

## 2026-11-02 · E21a
**Feito:** E21 dividida em E21a–E21e (PLANO): a original juntava cinco trabalhos e não tinha o TSE
nacional, sem o qual a colinha só funciona em SP. `scripts/cron/`: `estado.ts` (estado/dados,
publicado, fontes; começa de data/*.json), `votacoes.ts` (Câmara e Senado incremental, cache das
respostas), `publicar.ts` (só linhas novas ou alteradas, sem ler o banco), `resumos.ts` (usado
também por `npm run precalcular`), `index.ts` (jobs isolados, validação antes de publicar, sai com 1
em falha). `lib/linhas-votacao.ts`: montagem das linhas extraída do `consolidar.ts`, que gera os
mesmos arquivos. `npm run cron`; `supabase:conferir` aceita `DATA_DIR`. `docs/CRON.md`.
**Decidido:** o cron compara com uma cópia local do que publicou, não com o banco (egress). Nunca
apaga linha. Janela da última data − 14 dias. Votos de novos políticos nas votações antigas virão
dos arquivos anuais (E21c), não do job diário.
**Lacunas:** nenhuma nova. Não havia votação nominal nova desde 14/10 (as sessões de 27–28/10 na
Câmara foram simbólicas). O banco está em 26,5 MB, quase tudo espaço da carga dupla da E19.
**Próximo passo:** E21b — TSE 2026 nas 27 UFs: candidatos, top-20 das 5.570 cidades, listas e
quociente por estado, municípios gerados localmente.

## 2026-11-02 · E20 (fechamento)
**Feito:** usuário criou as três variáveis na Vercel (`FISCALIZA_DADOS`, `SUPABASE_URL`,
`SUPABASE_PUBLISHABLE_KEY`, Production e Preview); copiei para a área de transferência a partir do
`.env.local`, sem a chave secreta, e limpei depois. `meta name="fiscaliza-dados"` mostra a origem
(json ou supabase) em cada página. Push: produção lendo do Supabase, conteúdo conferido. As funções
rodavam em Washington (`iad1`, padrão) com o banco em São Paulo: colinha inédita em 0,9–1,1 s.
`vercel.json` com `regions: ["gru1"]` (o Hobby permite uma região): 0,16–0,54 s; cache 0,05–0,08 s;
imagem de compartilhamento de 4,2 para 1,8 s.
**Decidido:** funções em São Paulo, junto do Supabase. A primeira visita depois de cada deploy pega
a função fria (1,7 s medido) e fica registrada como exceção conhecida.
**Lacunas:** nenhuma.
**Próximo passo:** E21 — cron do Congresso no Brasil inteiro (513 + 81), gravando só o que mudou;
carga inicial pelos arquivos anuais da Câmara; a tabela de municípios é gerada localmente (o IBGE
não responde ao runner).

## 2026-11-02 · E20 (parcial)
**Feito:** `lib/repo-supabase.ts` (API REST, chave publicável, listas em memória por 5 min);
`Repo` com `getCard` e `getPagina`; páginas trocaram `montarCard`/`montarPagina` por elas (nenhum
componente mudou). Migração 0002 (`resumos`: card, página e hash por político), rodada pelo
usuário; `npm run precalcular` grava 438 resumos em 3 s (1,3 KB em média) e não regrava nada na
segunda vez. `selecionar()` pagina de 1.000 em 1.000 com `order=` obrigatório. Teste novo: card e
página sobrevivem ao JSON. Builds nos dois modos comparados página a página: 1.089 de 1.089 iguais.
**Decidido:** o `jsonb` reordena as chaves dos objetos: "Como votou" passou a seguir uma ordem fixa
e as categorias da cota desempatam pelo nome. A lista da cidade desempata pelo número de urna numa
regra única (`lib/cidade.ts`), em vez de depender da ordem do arquivo. `pbcopy` precisa de
`LANG=en_US.UTF-8` (os comentários da 0002 colaram com acentos trocados; o SQL não foi afetado).
**Lacunas:** nenhuma de dado.
**Próximo passo:** usuário cria na Vercel `FISCALIZA_DADOS`, `SUPABASE_URL` e
`SUPABASE_PUBLISHABLE_KEY`; push; conferir produção lendo do Supabase e o tempo das páginas.

## 2026-11-02 · E19
**Feito:** usuário criou o projeto no Supabase (free, São Paulo) e rodou a migração no SQL Editor.
Criei `.env.local` a partir do modelo (fora do git, permissão 600); a URL colada era a do painel
(`supabase.com/dashboard/project/<id>`), corrigida para `https://<id>.supabase.co` sem exibir
chaves. Conexão ok com as duas chaves. `npm run seed`: 11 tabelas em 17 s.
`npm run supabase:conferir`: 11 de 11 contagens batem; 14,4 MB (1,47× o JSON, 2,9% de 500 MB).
Segunda carga: contagens iguais (idempotente).
**Decidido:** o cron grava só linhas novas ou alteradas: a segunda carga, sem mudança de dado,
levou o banco de 14 para 26 MB (versões antigas das linhas regravadas). Registrado na E21 e em
`docs/VOLUME.md`.
**Lacunas:** nenhuma.
**Próximo passo:** E20 — `SupabaseRepo` (interface `Repo` sobre o Supabase, troca por variável de
ambiente); as páginas passam a ler números pré-calculados, não todas as votações (egress).

## 2026-11-02 · E19 (preparação)
**Feito:** usuário tornou o repositório público. `supabase/migrations/0001_init.sql`: 11 tabelas com
as chaves do validador, índices de leitura, RLS com leitura pública e permissões explícitas,
`avisos_interesse` (contagem por dia, página e tipo) com `registrar_aviso()` para o público e
`tamanhos()` só para a chave secreta. `lib/supabase.ts` (cliente REST só com `fetch`),
`lib/esquema.ts` (ordem de carga e chaves), `scripts/seed.ts`, `scripts/supabase-conferir.ts`,
`.env.example`, `npm run seed` e `npm run supabase:conferir`. Testado num Postgres 17 em
WebAssembly (PGlite, numa pasta temporária, fora do projeto): migração ok, carga completa,
público lê mas não escreve nem vê avisos, toque registrado pela função.
**Decidido:** sem `supabase-js` nem `pg`: a API REST resolve upsert, contagem e funções. Chaves
novas (sb_secret, sb_publishable) e antigas (JWT) aceitas. Medido: Postgres = 1,44× o JSON.
**Lacunas:** nenhuma.
**Próximo passo:** usuário cria o projeto (região São Paulo), roda a migração no SQL Editor e
preenche `.env.local`; depois `npm run seed` e `npm run supabase:conferir` fecham a E19.

## 2026-11-02 · decisões de volume
**Feito:** usuário decidiu as questões de `docs/VOLUME.md`: cota agregada, íntegra só das
proposições que podem virar lei, dados desde 2023, repositório público. Antes de abrir o repo,
varri o histórico: nenhum segredo, nenhum CPF nem hash de CPF; achei um CPF por extenso numa
descrição oficial de votação da Câmara (prisão de deputado) e passei a ocultá-lo
(`lib/texto.ts#semCpf`, aplicado no `consolidar.ts` e nos dados; o script reproduz o mesmo
`votacoes.json`). `scripts/rede.ts` virou módulo (typecheck). 55 testes ok.
**Decidido:** o texto antigo com o CPF continua nos commits anteriores; reescrever o histórico
fica a critério do usuário (o dado já é público na Câmara). Termos da Vercel Hobby: pendente,
o usuário lê.
**Lacunas:** ver `docs/LACUNAS.md` (CPF em texto oficial).
**Próximo passo:** o usuário torna o repositório público nas configurações do GitHub; depois, E19.

## 2026-11-02 · E18 (fechamento)
**Feito:** push de `4dcdb23`; `gh workflow run rede.yml` duas vezes. Runner do GitHub (Linux x64):
14 de 15 fontes. Câmara, Senado (inclusive CEAPS), TSE e Portal da Transparência ok; IBGE com
timeout de conexão nas duas execuções.
**Decidido:** tabela de municípios (códigos IBGE) gerada localmente e versionada; o cron não chama
o IBGE. `CLAUDE.md` e `docs/VOLUME.md` atualizados.
**Lacunas:** IBGE inacessível do runner (registrado em `docs/LACUNAS.md`).
**Próximo passo:** o usuário decide as 5 questões do fim de `docs/VOLUME.md`; depois, E19 (Supabase
e schema, medindo o tamanho real com `pg_total_relation_size`).

## 2026-11-01 · E18 (parcial)
**Feito:** E17 publicada (push de `bd404da`, conferida em produção). `docs/VOLUME.md`: limites free
lidos nas páginas oficiais (Supabase 500 MB e 5 GB de egress; Vercel Hobby 1 M de leituras e 200 mil
escritas de ISR, build de 45 min; Actions ~2.000 min no privado, grátis no público) e volume
medido nas fontes (446.195 votos da Câmara 2023–26 pelos placares; cota ~233 mil lançamentos/ano
na Câmara e 23.850 no Senado; 42.695 proposições da Câmara em 2025, 8.112 que podem virar lei).
Estimativa: ~150 MB de JSON, 220–300 MB no Postgres. `scripts/rede.ts` (sem dependências, 15
fontes): 15 de 15 daqui. `.github/workflows/rede.yml` pronto, manual.
**Decidido:** fator de 1,5–2× do JSON para o Postgres (sem Postgres local; a E19 mede). A Câmara
tem arquivos anuais em lote (votos, autores, proposições), que o cron deve usar no lugar da API
na carga inicial. Requisito novo para a E20: números pré-calculados pelo cron, porque ler todas
as votações por página estouraria o egress (~18 GB/mês).
**Lacunas:** cota nota a nota não cabe no free (~1 milhão de linhas). Equipe de gabinete: fonte
aberta ainda não localizada (E28).
**Próximo passo:** push e rodar `gh workflow run rede.yml`; com o resultado, fechar a E18. Antes
da E19, o usuário decide as 5 questões do fim de `docs/VOLUME.md`.

## 2026-11-01 · E17
**Feito:** saíram o quiz (página, componentes, `lib/quiz.ts`, `concordancia()`, `data/quiz.json`,
coluna `votacoes.quiz`, script e JSONs da sonda), o botão Cobrar e "seu voto contou para"
(`fraseVotoContou()`, bloco da lista no card). Entrou **Como cobrar** (`lib/cobrar.ts`,
`components/ComoCobrar.tsx`): gabinete, ouvidoria da Casa, TCU, MPF e Fala.BR, só para quem tem
mandato em curso. Entrou **Receber avisos** (`components/ReceberAvisos.tsx`), fake door no card,
na página e na colinha. `/como-funciona`, glossário, METODOLOGIA, TESTE-USUARIOS e README ajustados;
`docs/QUIZ.md` arquivado. 55 testes, build ok, conferido a 375 px.
**Decidido:** dados editados à mão para não regravar as datas de coleta; o `consolidar.ts`
modificado gera o mesmo `votacoes.json` (conferido) e só mudaria `updated_at` em `politicos`.
Avisos não aparecem para quem não tem nem terá mandato. Canais conferidos pelo conteúdo, não pelo
status HTTP: `portal.tcu.gov.br/ouvidoria/denuncia/` responde 200 e diz "não encontrada"; ficou
a raiz da ouvidoria.
**Lacunas:** telefone do gabinete como a fonte escreve, sem DDD.
**Próximo passo:** E18 — estimar o volume do Brasil inteiro (513 + 81) a partir da sonda e conferir
os limites atuais dos planos free nas páginas oficiais; testar as APIs a partir de um runner do
GitHub.

## 2026-11-01 · mudança de escopo
**Feito:** `CLAUDE.md` reescrito (escopo, princípios, fases, fora de escopo, rotas, card,
definição de pronto) e `PLANO.md` refeito a partir da E16: Passo 3 (E17 remoção, E18 volume e
custo, E19–E22 infra), Passo 4 (E23–E34, Congresso completo no Brasil inteiro) e Passos 5–7 em
bloco. Nada de código mudou.
**Decidido (pelo usuário):** ter praticamente todas as funcionalidades do politicometro.org, menos
presença em sessões, discursos, conta e avisos reais (só fake door, em todos os lugares onde fizer
sentido) e régua esquerda–direita. Sair do Fiscaliza: quiz de concordância, botão Cobrar e "seu
voto contou para". **Decidido (premissas minhas, a confirmar):** colinha continua como entrada;
Cobrar vira "Como cobrar" com canais oficiais; fake door sem nenhum campo de contato, só contagem
anônima; custo zero continua, com a E18 como porteira; STF só com fonte aberta (sem scraping);
expansão começa pelo Congresso no Brasil inteiro; E16 suspensa até o redesenho (volta na E34).
**Lacunas:** não medimos ainda se o Brasil inteiro cabe nos planos free (é a E18).
**Próximo passo:** E17 — tirar quiz, Cobrar e "seu voto contou para"; Como cobrar e fake door.

## 2026-11-01 · referência (fora do plano)
**Feito:** mapa do politicometro.org pelo navegador, como visitante: home, página de deputado e
de senador, estado, cidade, "quem me representa", Congresso e detalhe de votação, e as ~20 seções
(sobre, atualizações, partidos, governos, eleições, STF, comparar etc.). Inventário em
`docs/REFERENCIA-POLITICOMETRO.md`: cada funcionalidade × o que temos × conflito com o `CLAUDE.md`
× sugestão (MVP, v1.1, v1.2, fora). Nada copiado; dado novo só pelas fontes oficiais.
**Decidido:** nada; o documento lista as decisões que são do usuário (escopo, presença e
discursos, conta, régua ideológica, resumo das votações). O site deles tem bloqueio anti-robô
fora do navegador: não contornado.
**Lacunas:** nenhuma de dado.
**Próximo passo:** o usuário revisa o inventário e diz o que entra; o que entrar vira etapa no
`PLANO.md` antes de completar a rodada 2 do teste (E16).

## 2026-11-01 · E16 (rodada 1)
**Feito:** push de `4e78d39`; busca por número de urna e aviso "Não está na lista?" conferidos em
produção. O usuário aplicou o teste e relatou: menos de 5 pessoas, todas montaram a colinha em
menos de 1 minuto sem ajuda, todas acharam o deputado na lista da cidade, nenhum tropeço.
Registrado em `docs/TESTE-USUARIOS.md` como resumo (sem ficha por pessoa).
**Decidido:** E16 continua aberta: o critério pede 5 pessoas, e o caminho da busca (cerca de 1 em 3
eleitores) não foi exercitado por ninguém. Nada a ajustar desta rodada.
**Lacunas:** sem tempos individuais, cidades ou idades; não se sabe se alguém era da capital.
**Próximo passo:** completar as 5 pessoas (decisão do usuário), com alguém da capital e alguém cujo
deputado não esteja no top-20 da cidade, para exercitar a busca. Usar a ficha de
`docs/TESTE-USUARIOS.md` e registrar como "Rodada 2". Só então fechar a E16.

## 2026-11-01 · E16 (preparação)
**Feito:** E15 publicada (push de `d5f5ca5`; `/como-funciona` conferida em produção). Para a E16:
`docs/TESTE-USUARIOS.md` com quem chamar, fala do moderador, quando ligar e parar o cronômetro, o
que conta como sucesso, ficha e perguntas. Piloto: 438 fotos respondem 200; página inicial 9 KB,
índice 20 KB, cidade 0,6 KB. `scripts/sonda/_cobertura-top20.ts` mediu a parte dos votos para
deputado que vai para quem aparece no top-20 da cidade: 67,4% no estado, 57,2% na capital (top-50:
83,0% e 75,5%; top-100: 92,1% e 88,1%). Senador: 100%. Busca: índice inclui o número de urna e vem
por votos; casa palavra por palavra pelo começo; nome de urna antes do civil. Aviso "Não está na
lista? Busque pelo nome ou pelo número de urna" no fim da lista de deputados. Conferido a 375 px.
**Decidido:** sucesso = chegar à colinha com o deputado em quem votou, em < 60 s, sem ajuda;
senadores anotados mas não decidem (cobertura de 100%). Ficha sem nome nem voto do participante
(P1–P5). Não aumentar a lista antes do teste: a tabela de cobertura vai para a decisão depois.
**Lacunas:** a lista da cidade não tem o deputado de ~1 em 3 eleitores; o caminho deles é a busca.
**Próximo passo:** aplicar o roteiro com as 5 pessoas (pelo menos 1 da capital) e preencher
"Resultados" e "Achados" em `docs/TESTE-USUARIOS.md`; depois decidir sobre o tamanho da lista.

## 2026-11-01 · E15
**Feito:** `/como-funciona` (`app/como-funciona/page.tsx`): 12 seções com âncora (cobertura, lista da
cidade, participação, governismo, concordância, "seu voto contou para", CEAP, o que fica fora, fontes,
privacidade, código e licenças, termos). Todos os números da página (438 políticos, 1.107 + 426
votações, 240 secretas, 866/129 com orientação do Governo, 14 perguntas com 5 Sim/5 Não/4 sem
orientação, mês de referência, data da coleta) saem do `repo`. `lib/glossario.ts` ganhou `SECOES`,
`secao` por termo e o termo "votação nominal"; o popover do `Termo` mostra "Como calculamos" → a
seção. Página do político com "como contamos" por seção; "Fonte: TSE" da lista da cidade e
"Como as votações foram escolhidas" do quiz linkam. Rodapé global (`components/Rodape.tsx`, no
layout; sobe quando há barra fixa via `body:has(.barra-fixa)`). 65 testes, build ok.
**Decidido:** sem analytics nesta versão (dependência nova e nada a medir antes da E16); a página
diz isso. A página em TSX é o texto canônico da metodologia; `docs/METODOLOGIA.md` fica como nota
técnica (nomes de campos, decisões datadas) e é atualizado junto. Revisão de adjetivos: nenhum
achado. O servidor `next start` da sessão anterior continuava na porta 3107 (não pude matá-lo);
o preview rodou em 3108 (`fiscaliza-3108` no launch.json do $HOME).
**Lacunas:** o repositório é privado, então o link "código-fonte no GitHub" da página dá 404 para
quem não está logado; a AGPL pede o fonte acessível. Tornar público antes do teste com pessoas.
Data da coleta vem do `updated_at` em UTC; a página converte para o fuso de Brasília.
**Próximo passo:** E16 — roteiro "digite sua cidade e monte sua colinha" com 5 pessoas, cronometrar,
registrar em `docs/TESTE-USUARIOS.md`. Antes: tornar o repo público (ou tirar o link) e decidir se
quer Vercel Web Analytics para medir o teste.

## 2026-11-01 · E14
**Feito:** slug nome de urna + UF (decisão do usuário; colinha no localStorage v2). Colunas
`telefone` e `redes_sociais` em `politicos`. `lib/pagina.ts` (votos por tipo e últimas 10 no
mandato, CEAP de 12 meses com meses em aberto e categorias, mandatos, afastamentos, contatos) com
testes em dado real (soma dos tipos = denominador da participação). `/p/[slug]` estática para os 438
(ISR 24 h); "mais detalhes" nos cards. 65 testes. Em produção: HTML 13 KB (Kiko) e 11 KB (Giordano)
comprimidos, pré-renderizados; 404 para slug inexistente. Conferido a 375 px.
**Decidido:** cargo fora do slug (muda entre eleições). Página só com dado da fonte; seções sem
dado somem.
**Lacunas:** nenhuma de dado. PageSpeed Insights sem chave deu 429 e o `npx lighthouse` local foi
bloqueado pela política da sessão; o usuário rodou o Lighthouse mobile no Chrome em
`/p/giordano-sp` e `/p/kiko-celeguim-sp`: LCP abaixo de 1 s nas duas (critério de pronto).
**Próximo passo:** E15 — `/como-funciona` renderizando `docs/METODOLOGIA.md` e o acabamento
previsto no `PLANO.md`.

## 2026-11-01 · E13
**Feito:** quiz ampliado de 10 para 14 perguntas (decisão do usuário, depois de medir que
senadores tinham só 4 votos comparáveis): PEC 8/2021, PLP 233/2023, PEC 9/2023 e PLP 177/2023.
`scripts/sonda/quiz-fontes.ts` (ementa, palavras-chave, situação e norma gerada, Câmara e Senado) →
textos em `data/sonda/quiz-textos.json` (o que faz e o que aconteceu depois, só com as fontes) +
parágrafo da votação gerado dos dados. `lib/quiz.ts` (respostas validadas, concordância, mínimo de
3, votação discordante; 4 testes). Card: votos do quiz em `CardDados.quiz`, terceiro número e
Cobrar no navegador (`components/QuizNoCard.tsx`, `useRespostas`). `/votacoes` com as 14 perguntas,
fontes oficiais e contador. 58 testes. Conferido a 375 px: o card e o e-mail mudam com as respostas.
**Decidido:** 14 perguntas (13 Câmara, 10 Senado); percentual só com ≥ 3 votos comparáveis e sempre
"N de M"; ausência na Câmara só dentro do mandato; e-mail cita a primeira discordância na ordem do
quiz. Frases do meu rascunho que não estavam nas fontes foram cortadas (ex.: "substitui o teto de
gastos").
**Lacunas:** ementas pouco descritivas; registros conflitantes do PL 2162/2023 (`LACUNAS.md`).
Bugs achados no teste: respostas rápidas se sobrescreviam (corrigido com atualização funcional);
dois testes meus partiam de suposição em vez do dado (corrigidos para comparar com o dado gravado).
**Próximo passo:** E14 — `/p/[slug]` (card, histórico 2023–26, CEAP, contatos, cobrar) e
`/como-funciona` renderizando `docs/METODOLOGIA.md`.

## 2026-11-01 · E12
**Feito:** `/c/[ids]` completa: frase "seu voto contou para" nos deputados (`CardDados.lista`,
nome oficial no "?"), botão Compartilhar (menu nativo; sem ele, copia o link), `generateMetadata`
com título e descrição contendo os números, `opengraph-image.tsx` (1200×630, 130–170 KB, layout
para 1, 2 ou 3 políticos, rodapé com a fonte). `resumoNumeros()` em `lib/card.ts` (mesmo texto na
descrição e na imagem). `metadataBase` pela URL de produção da Vercel. 54 testes.
**Decidido:** a linha de números sempre diz a Casa e o período ("Câmara 2023–2026: …"), porque o
Derrite é senador eleito com números da Câmara. Sem negrito na imagem (fonte padrão do `next/og` só
tem regular; fonte externa na hora seria chamada externa).
O usuário colou uma colinha no WhatsApp e o preview apareceu (critério de pronto). O exemplo dele
(Marina Silva, 4,9%) mostrou que a imagem e a descrição omitiam os dias afastado que o card mostra:
corrigido (`resumoNumeros` com "afastada 1.154 dias"; versão curta na imagem para caber numa linha).
**Lacunas:** fotos do Senado pesadas: colinha com os 3 senadores em exercício leva ~2 s até a 1ª
foto no 4G lento (típica: ~1 s). Registrado com alternativas em `LACUNAS.md`. O WhatsApp guarda o
preview de links já enviados: a correção só aparece em links novos.
**Próximo passo:** E13 — `/votacoes` com as 10 perguntas do quiz (pergunta e explicação em 3
parágrafos a partir do texto oficial), respostas no localStorage, concordância no card e votação
discordante no corpo do Cobrar.

## 2026-11-01 · E11
**Feito:** `/` com uma caixa de busca (cidade ou nome, sem acento) → top-20 da cidade com o card
compacto (mesmo `PoliticoCard`, variante `PoliticoCardCompacto`), posição e votos na cidade →
marcar 1 deputado e até 2 senadores → barra "Ver colinha". `lib/colinha.ts` (regras, URL com `+`,
leitura segura do localStorage; 5 testes). JSONs estáticos `/dados/politicos` (20 KB gzip) e
`/dados/cidade/[ibge]` (645 arquivos de ~0,6 KB gzip). `/c/[ids]` mínima com os cards completos e
ISR sob demanda. 52 testes. Conferido a 375 px: Campinas → Erika Hilton → Derrite e André do Prado →
colinha em 22 s (com latência da automação); colinha e cidade voltam ao reabrir; busca por nome
troca o deputado; sem erro no console. **O usuário testou no próprio celular, em produção:
colinha montada em menos de 1 minuto** (critério de pronto).
**Decidido:** cidade carregada no navegador a partir de JSON estático (nada de servidor por
requisição). Colinha segue a urna de 2026 (1 + 2); o terceiro senador substitui o mais antigo.
Índice de busca com rótulos prontos (`itemBusca`).
**Lacunas:** nenhuma nova. Bug achado e corrigido no teste: a lista da cidade era recriada a cada
toque (componente definido dentro de outro).
**Próximo passo:** E12 — em `/c/[ids]`: frase "seu voto contou para" por deputado, botão
compartilhar (Web Share API, fallback copiar link) e imagem OG com `next/og`; medir o peso das
fotos do Senado na meta de < 1 s.

## 2026-11-01 · E10
**Feito:** `lib/card.ts` (`montarCard`: rótulos de cargo e status flexionados, três números com
denominador por mandato, "afastado N dias", CEAP do mês de referência vs média SP com link oficial,
`mailto:` do Cobrar). `components/PoliticoCard.tsx` (só exibe; `<img>` direto da fonte),
`components/Termo.tsx` + `lib/glossario.ts` (popover nativo, 13 termos). Coluna `genero` em
`politicos` (TSE `DS_GENERO`, Senado `SexoParlamentar`). `/amostra` com os 20 cards (noindex).
`tests/card.test.ts`: os 20 sem campo vazio/NaN/undefined, 14 com mandato e 6 com "primeiro voto",
valores iguais ao SONDA. 47 testes. Conferido no navegador a 375 px, claro e escuro: sem rolagem
lateral, 20 fotos ok, popover abre e fecha (toque fora, Esc, "Fechar").
**Decidido:** popover nativo em vez do shadcn/ui (sem dependência; usuário sem preferência).
Gênero oficial para flexionar ("Deputada", "Reeleita", "afastada"); sem gênero, cai para o nome
da Casa. Nome de urna exibido como o TSE escreve (maiúsculas). Senador sem bloco de cota.
**Lacunas:** CEAPS do Senado não coletada; fotos do Senado pesadas (107–307 KB).
**Próximo passo:** E11 — página `/`: busca por cidade (autocomplete dos 645 municípios) ou por
nome, mostrando o top-20 com `PoliticoCard` compacto e seleção para a colinha.

## 2026-11-01 · E9
**Feito:** next 16.4.3 + react 19.3.1 + tailwindcss 4.3.3 no projeto existente (versões fixas,
0 vulnerabilidades). `lib/repo.ts` (interface `Repo` + `JsonRepo` com `deLinha`, cache por
tabela). `app/` com layout pt-BR e página `/` lendo dado real. `next.config.ts`:
`Referrer-Policy: same-origin` e `data/*.json` no pacote do servidor (sem `data/raw` e
`data/sonda`). `next build` ok com TypeScript 7. Repositório privado
`github.com/lucasmsze-ops/fiscaliza`; o usuário importou na Vercel. **Produção:
https://fiscaliza-rho.vercel.app** — 200, servida de gru1, header presente, mostra Lucas
Pavanato (785.870 votos na capital), 404 em rota inexistente.
**Decidido:** shadcn/ui só na E10 (Tooltip); repositório privado até limpar os hashes de CPF do
histórico de `data/sonda/` (abrir o código é decisão do lançamento). Sem `create-next-app`.
Preview local na porta 3107 (entrada `fiscaliza` no `~/.claude/launch.json`).
**Lacunas:** nenhuma.
**Próximo passo:** E10 — confirmar o shadcn/ui só com o Tooltip; `components/PoliticoCard.tsx`
com foto, nome de urna, partido-UF, status, os três números (participação + "afastado N dias",
governismo, concordância oculta), CEAP do mês de referência vs média SP e botão Cobrar; renderizar
os 20 da amostra sem campo vazio ou inventado.

## 2026-11-01 · Decisões de metodologia (pré-E9)
**Feito:** as 6 questões abertas da E8 decididas com o usuário e aplicadas no código e nos dados:
`diasAfastado()` em `lib/indicadores.ts`, `nomeCurtoLista()` e frase com nome curto em
`lib/quociente.ts`, `lib/ceap.ts#mesesFechados` e coluna `despesas_media_uf.fechado`
(coleta anterior guardada em `data/sonda/despesas-coleta-anterior.json`). `docs/METODOLOGIA.md`
como texto-fonte de `/como-funciona`. 38 testes; `validar.ts` ok.
**Decidido:** licença não descontada + "afastado N dias"; secretas do Senado no denominador;
P-NRV é ausência; CEAP no último mês fechado (hoje jul/2026); federação como "Federação" +
composição do TSE, nome oficial no tooltip; quiz de 10 aprovado (6 nas duas Casas, 4 só Câmara).
**Lacunas:** nenhuma nova. Corrigido no `SONDA.md`: só ago–out/2026 mudaram entre as coletas
(não jun–out), por isso o mês de referência é jul/2026 e não mai/2026.
**Próximo passo:** E9 — confirmar a instalação do Next.js e do shadcn/ui; `create-next-app`,
`lib/repo.ts` (`JsonRepo` com `deLinha`) e deploy inicial na Vercel.

## 2026-11-01 · E8
**Feito:** `lib/types.ts` reescrito (12 tabelas, `Linha<T>` snake_case) e `lib/linhas.ts`.
`participacao()` aceita mandatos ("sem mandato no período", nunca 0%); indicadores casam por
`Votacao.id`. `scripts/sonda/bancada.ts` (70 deputados de SP, join por CPF em memória, 69 ok);
`votos.ts` e `despesas.ts` cobrem a bancada inteira e gravam placar exato; `senadores.ts` grava
placar das abertas. `scripts/sonda/consolidar.ts` → `data/*.json` (438 políticos, 1.533 votações,
49.949 votos, 20.365 linhas de top-20, 9,6 MB). `scripts/sonda/validar.ts` passa (e pega 3 defeitos
plantados). `docs/QUIZ.md` com critério e 10 votações propostas. 33 testes.
**Decidido:** nenhum CPF nem hash gravado (join só no cron). Um registro por pessoa, id = slug.
Participação restrita ao mandato; licença não descontada. Quiz: mérito, aberta, minoria ≥ 20%,
duas Casas quando o texto é o mesmo (PL 5582/2025 ficou só Câmara). Ampliação: dados completos
para toda a bancada de SP em exercício que aparece nos top-20.
**Lacunas:** 1 perfil da Câmara com 504 persistente (não afeta o site); 373 políticos só com dado
do TSE; 187 votações sem resultado explícito.
**Próximo passo:** E9 — primeiro o usuário decide as 6 questões abertas do fim da E8 em
`docs/SONDA.md`; depois `create-next-app`, `lib/repo.ts` (`JsonRepo` lendo `data/*.json` com
`deLinha`) e deploy inicial na Vercel.

## 2026-11-01 · E7
**Feito:** `lib/quociente.ts` (QE, QP com exigência de 10%, sobras 80/20 e fase aberta, frase
"seu voto contou para") com 12 testes de borda e 5 em dado real (30 no total). `scripts/sonda/
quociente.ts` → `data/sonda/quociente.json`: as 70 vagas de deputado federal de SP batem com o
Relatório de Resultado da Totalização (QE 338.203, 20 listas, 70 eleitos um a um, ordem das
sobras). `lib/tse.ts` (JSON oficial de resultado por município e URL da foto).
`scripts/sonda/eleitos-mun.ts` → `data/sonda/eleitos-mun.json` (645 municípios, 2 cargos, código
IBGE): 1.290/1.290 listas iguais ao JSON oficial, incluindo São Paulo, Santos e Borá.
`_comparar-munzona.ts` para comparar gerações do CSV. `CLAUDE.md` (seção TSE), `SONDA.md`,
`LACUNAS.md`, `README.md`.
**Decidido:** federação como lista única; divisor da média com vagas obtidas por QP. Top-20
inclui quem empata com o 20º. Frase com N = 0: "que não elegeu ninguém em SP"; senador sem
frase. Foto de candidato pela URL pública do TSE (resolve a pendência da E1, sem hospedar nada).
Gabarito lido do PDF oficial com PDFKit do macOS, sem dependência nova.
**Lacunas:** empates na borda do top-20 (81 listas); 1 grafia TSE≠IBGE; o TSE regenera os CSVs
sem mudar conteúdo (cron compara conteúdo). Questão aberta: nome da federação no card (E10).
**Próximo passo:** E8 — reescrever `lib/types.ts` e gerar `data/*.json` no shape final
(`politicos`, `mandatos`, `eleitos_mun`, `despesas_mes`, `votacoes`, `votos`, `orientacoes`);
escolher 8–12 votações do quiz em `docs/QUIZ.md`; `scripts/sonda/validar.ts`.

## 2026-10-29 · E6
**Feito:** `lib/senado.ts` (lista atual, perfil, mandatos, licenças, `/votacao`, orientação de
bancada; normaliza o XML→JSON e as siglas do painel). `scripts/sonda/senadores.ts` gerou
`senadores.json` (3 de SP em exercício, join ao TSE), `votacoes-senado.json` (426 nominais
2023-02→hoje, 240 secretas), `orientacoes-senado.json` (2.043) e `votos-senado.json` (1.278; no
Senado a ausência é explícita e tem sigla). 15 chamadas, 0 falhas, 6 s. Tipo `secreto` em
`TipoVoto`; `participacao()` e `governismo()` rodaram sem mudança para senador (fixture real
do Marcos Pontes; 18 testes). `CLAUDE.md` (seção Senado reescrita), `SONDA.md`, `LACUNAS.md`, `README.md`.
**Decidido:** o path é `/votacao` (os do `CLAUDE.md` estavam deprecated). Secreta conta na
participação, não no governismo. Sigla de comparecimento → `ausente`; "Presidente (art. 51)" →
`art17`; NA → `nao_informado`. Join por nome completo + UF porque a API não expõe CPF. Vetos
(sessão conjunta do CN) ficam fora nas duas Casas. Foto com esquema trocado para https.
**Lacunas:** sem CPF; 56% das nominais secretas; 10 votações sem `sequencialVotacao` (sem
orientação); vetos; André do Prado e Derrite sem registro até 01/02/2027. Três questões novas de
metodologia no `SONDA.md` (secretas no denominador, P-NRV, licença).
**Próximo passo:** E7 — cadeiras por partido/federação em SP a partir do TSE 2026 (federação
como lista única), conferir contra o resultado oficial; top-20 por município e cargo →
`data/sonda/eleitos-mun.json`; `lib/quociente.ts` com testes.

## 2026-10-29 · E5
**Feito:** `listarDespesas()` em `lib/camara.ts`; `scripts/sonda/despesas.ts` busca a CEAP dos 70
deputados de SP (2025→hoje, 538 chamadas, 0 falhas) e grava `data/sonda/despesas.json` com os
meses da amostra (`total`, `porCategoria`, `documentos`) e `mediaUf` (SP, por mês). CSVs anuais
oficiais baixados em `data/raw/ceap/` só para comparação. `docs/SONDA.md`, `CLAUDE.md`, `LACUNAS.md`.
**Decidido:** média da bancada vem da API, não do CSV (o CSV omite passagens SIGEPA). Não deduplicar
`codDocumento` (linhas SIGEPA). Somar `valorLiquido` com estornos negativos. Média do mês conta só
quem tem lançamento. Mês a exibir: último fechado (regra provisória ≥90% da bancada; definitiva
no cron por estabilidade entre execuções).
**Lacunas:** últimos ~3 meses incompletos; `ano=` sozinho vazio na API (documentado).
**Próximo passo:** E6 — ler `legis.senado.leg.br/dadosabertos/docs/` e confirmar o path das
votações do plenário antes de codar; `lib/senado.ts`; join dos 5 senadores pelo hash de CPF.

## 2026-10-29 · E4
**Feito:** `scripts/sonda/votos.ts` chamou `/votos` das 6.537 votações (cache em `data/raw/apoio/votos-cache/`),
fixou a lista exata de **1.107 nominais** em `votacoes.json` (+`totalVotos`), completou `orientacoes.json`
(11.669) e gravou `votos.json` (8.476 votos dos 12 com `camaraId`). `lib/indicadores.ts` com
`participacao()`, `governismo()` e `concordancia()`; 13 testes vitest (8 de lógica + 5 em fixture
real do Kim Kataguiri). Tabela dos dois números dos reeleitos em `docs/SONDA.md`.
**Decidido:** 404 em `/votos` = sem votos (não é falha); `tipoVoto: null` → `nao_informado`
(conta na participação, não no governismo); art. 17 conta na participação. Governismo exclui
orientação vazia/"Liberado". Heurística do placar fica só como diagnóstico; a lista é por `/votos`.
**Lacunas:** 17 votações com placar mas sem votos na API; João Paulo Cunha sem mandato → "sem
mandato no período", não 0%. Duas questões de metodologia abertas no `SONDA.md` (licença como
ausência; denominador por mandato) para decidir antes do protótipo.
**Próximo passo:** E5 — `/deputados/{id}/despesas?ano&mes` dos 10 reeleitos (2025-01→hoje) e
média da bancada SP; medir custo em chamadas e decidir a janela.

## 2026-10-29 · E3
**Feito:** `lib/camara.ts` ganhou votações (lista por janelas de 90 dias, detalhe, orientações,
votos) e `lib/async.ts` (`mapLimite`). `scripts/sonda/votacoes.ts` gerou `data/sonda/votacoes.json`
(1.117 nominais de 2023→hoje, com proposição afetada e URL oficial) e `orientacoes.json` (11.594).
6.537 votações listadas; 2.611 chamadas em 7m40s, zero falhas. `docs/SONDA.md` e `CLAUDE.md`
atualizados (janela de 3 meses, 100 itens/página, valores de orientação).
**Decidido:** nominal = placar na descrição (validado: FP 0, FN 1 em 303); a E4 fecha a lista
exata chamando `/votos` de todas. Orientação "Governo" vazia ou "Liberado" não conta no
governismo. `aprovacao` null em 190 casos: resultado vai usar a descrição como fallback.
**Lacunas:** 18 nominais sem nenhuma orientação; 1 sem proposição afetada (votação de pessoa).
**Próximo passo:** E4 — `/votos` das 6.537 (≈15 min com 6 em voo), gravar só os votos dos 12 com
`camaraId` (10 reeleitos + Derrite + João Paulo Cunha), `lib/indicadores.ts` com
`participacao()` e `governismo()` + testes vitest em fixtures reais.

## 2026-10-29 · E2
**Feito:** `lib/camara.ts` (adapter: listar, perfil, órgãos, histórico; paginação por `links.next`).
`scripts/sonda/camara.ts` busca os 70 perfis de SP, casa por hash de CPF com a amostra e gera
`data/sonda/politicos-camara.json` (12 registros: 10 reeleitos, João Paulo Cunha com registro
antigo, Derrite). 40 dos 70 eleitos de 2026 por SP já estão em exercício; os 4 ambíguos da E1
eram reeleitos. `CLAUDE.md` corrigido (e-mail em `gabinete.email`, busca por nome por legislatura).
**Decidido:** para quem não está em exercício, varrer legislaturas 56→50 por nome e confirmar
pelo hash; nunca aceitar só o nome. Derrite entra no modelo com dois mandatos (Câmara até
01/2027, Senado depois). Retry de 1 s resolveu os 504 da Câmara; manter.
**Lacunas:** 4 novos sem registro na Câmara até 01/02/2027; João Paulo Cunha sem e-mail de
gabinete. Ver `docs/LACUNAS.md`.
**Próximo passo:** E3 — `/votacoes?idOrgao=180` por janela de datas (descobrir o intervalo máximo
que a API aceita), depois `/orientacoes` de cada uma; medir volume e tempo.

## 2026-10-29 · E1
**Feito:** `scripts/sonda/tse.ts` gera `data/sonda/politicos-tse.json` com os 20 da amostra
(10 reeleitos, 5 novos, 2 senadores eleitos, 3 em exercício), votos válidos de 2026, hash de CPF
e nome do arquivo de foto no zip do TSE. Apoio: `_listas-atuais.ts` (Câmara/Senado SP em
exercício → `data/raw/apoio/`) e `_inspecionar.ts` (consultas DuckDB ad hoc num CSV).
`docs/SONDA.md` registra formato, armadilhas e critério da amostra; `CLAUDE.md` corrigido
(TSE não tem foto no CSV, sentinelas, caixa do `DS_CARGO`, votos válidos).
**Decidido:** reeleito/novo por nome de urna exato só para escolher a amostra; o join real é
por CPF na E2 (4 ambíguos listados). Votos = `QT_VOTOS_NOMINAIS_VALIDOS`. Senadores em
exercício entram com o registro TSE da eleição deles (2018/2022). Não contornei o bloqueio
do DivulgaCand.
**Lacunas:** foto dos novos (TSE só dá arquivo em zip; decidir na E10 se o site hospeda os jpgs);
partido atual dos senadores em exercício vem do Senado na E6. Ver `docs/LACUNAS.md`.
**Próximo passo:** E2 — `lib/camara.ts`; `/deputados/{id}` dos 70 de SP para pegar CPF e
casar por hash com o JSON da E1; resolver os 4 ambíguos; marcar os 5 novos como "sem registro
na Câmara até 01/02/2027".

## 2026-10-29 · E0
**Feito:** `package.json` (só `tsx`, `typescript`, `@types/node`), `tsconfig.json`, `lib/types.ts`
(tipos internos do modelo de dados), `lib/http.ts` (fetch com timeout 30 s, retry com backoff
1/2/4 s em rede/429/5xx, log por endpoint), `LICENSE` AGPL-3.0, `README.md` com nota CC-BY.
`npm run ping` responde OK: Câmara (8 situações de deputado) e Senado (81 senadores em exercício).
**Decidido:** Senado responde JSON só com `Accept: application/json`, sem sufixo `.json`;
`fetchJson` já manda esse header por padrão. O shape de topo do Senado é
`ListaParlamentarEmExercicio.Parlamentares.Parlamentar[]`. TypeScript 7 removeu `baseUrl`;
o alias `@/*` fica só em `paths`. `HttpError` é lançado por endpoint; quem chama decide se
aborta o job (princípio do cron).
**Lacunas:** nenhuma.
**Próximo passo:** E1 — verificar se os CSVs de 2026 (`consulta_cand`, `votacao_candidato_munzona`)
já estão em `dadosabertos.tse.jus.br`; instalar `@duckdb/node-api`; baixar SP para `data/raw/`.

## 2026-10-29 · planejamento
**Feito:** repositório criado em `~/Projetos/fiscaliza` com `CLAUDE.md` (spec), `PLANO.md`
(21 etapas em 3 passos + backlog), `DIARIO.md`, `.gitignore`. Nada commitado ainda.
**Decidido:** Next.js só entra na E9; a sonda (E0–E8) roda com `tsx` puro para ver o dado
real antes de desenhar. DuckDB via pacote npm (CLI não instalado). Supabase só na E17.
**Lacunas:** nenhuma ainda.
**Próximo passo:** E0 — `package.json`, `lib/http.ts`, `lib/types.ts`, `scripts/ping.ts`.
