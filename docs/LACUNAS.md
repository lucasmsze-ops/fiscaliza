# Lacunas do dado

O que a fonte oficial não forneceu e como a interface mostra a ausência.
Nunca preencher com dado sintético.

| Data | Fonte | Campo / caso | Como aparece na interface |
|------|-------|--------------|---------------------------|
| 2026-10-29 | TSE | `consulta_cand` não tem coluna de foto; fotos vêm em zip separado por UF | **Resolvido na E7**: URL pública por candidato em `resultados.tse.jus.br/oficial/ele2026/6259/fotos/{uf}/{sq}.jpeg` |
| 2026-10-29 | TSE | Senadores em exercício (2018/2022) não têm registro em 2026; partido/foto desatualizados no TSE | Partido e foto virão do Senado na E6 |
| 2026-10-29 | Câmara | 4 novos (Nantes, Pavanato, Renato Bolsonaro, Cortez) não existem na API até 01/02/2027 | Card sem foto oficial, sem e-mail de gabinete, "primeiro voto em fevereiro"; botão Cobrar oculto até ter e-mail |
| 2026-10-29 | Câmara | João Paulo Cunha tem registro antigo (leg. 54) com `gabinete.email` nulo e situação "Vacância" | Mesmo tratamento dos novos até 01/02/2027; foto oficial antiga existe |
| 2026-10-29 | Câmara | 17 votações com placar na descrição mas sem votos em `/votos` (vazio ou 404) | Fora da lista de nominais; não entram em nenhum número |
| 2026-10-29 | Câmara | `tipoVoto: null` em votações de pessoa (voto não divulgado) | Conta como participação; não conta no governismo; rotulado "voto não informado" |
| 2026-10-29 | Câmara | Político sem mandato no período (João Paulo Cunha) | "Sem mandato no período" em vez de 0% (modelar na E8) |
| 2026-10-29 | Câmara | CEAP dos últimos ~3 meses está incompleta (lançamentos em aberto); CSV anual omite passagens SIGEPA | Card usa o último mês fechado (regra: ≥90% da bancada com lançamento) e avisa "mês em aberto" nos demais |
| 2026-10-29 | Câmara | 6 dos 70 de SP sem nenhum gasto em 2025 (assumiram em 2026) | Média do mês conta só deputados com lançamento no mês |
| 2026-10-29 | Senado | Nenhum endpoint expõe CPF | Join com o TSE por nome completo + UF, método gravado em `join`; revisar à mão se houver homônimo |
| 2026-10-29 | Senado | 240 das 426 votações nominais do plenário (2023-02→2026-10) são secretas: a API diz só "Votou" | Conta na participação (tipo `secreto`); fora de governismo e concordância; quiz só usa abertas |
| 2026-10-29 | Senado | 10 votações com `sequencialVotacao` nulo não casam com a orientação de bancada | Fora do governismo (sem orientação); seguem na participação |
| 2026-10-29 | Senado / Câmara | Vetos são votados em sessão conjunta do CN e não estão em `/votacao` (Senado) nem em `/votacoes?idOrgao=180` (Câmara) | Fora dos números do MVP; dito em `/como-funciona#fora` (E15) |
| 2026-10-29 | Senado | André do Prado e Derrite (eleitos 2026) não existem na API até 01/02/2027 | Perfil só do TSE; "primeiro voto em fevereiro" |
| 2026-11-01 | TSE | Em 81 das 1.290 listas de top-20 (cidades pequenas) há empate de votos com o 20º colocado | A lista inclui todos os empatados (até 23 nomes); ordem dentro do empate por número de urna, sem significado |
| 2026-11-01 | TSE | Votação municipal não traz código IBGE; 1 município de SP com grafia diferente no IBGE | Código IBGE por nome normalizado + de-para revisado (São Luís/Luiz do Paraitinga) |
| 2026-11-01 | TSE | Senador é eleito por maioria; não há lista nem quociente | Card de senador sem a frase "seu voto contou para"; mostra só os votos no município |
| 2026-11-01 | TSE | `consulta_cand` 2026 não indica quem concorre à reeleição | "reeleito" vem do join por CPF com a Câmara (em memória; nada de CPF gravado) |
| 2026-11-01 | Câmara | `/deputados/220651` (Simone Marquetto) devolve 504 persistente; `/historico` responde | Bancada com 69 de 70 perfis; ela não concorreu em SP em 2026 e não aparece em nenhum top-20, então nada no site depende dela |
| 2026-11-01 | TSE | 373 dos 438 políticos (suplentes, não eleitos e novos) não têm registro na Câmara/Senado | Card com foto do TSE, nome, partido, status e votos 2026; sem e-mail (Cobrar oculto), sem os três números ("primeiro voto em fevereiro" para eleitos) |
| 2026-11-01 | Câmara | 187 votações sem resultado explícito (`aprovacao` nulo e descrição sem "Aprovad"/"Rejeitad", ex.: "Mantido o texto") | `resultado` null; nenhuma delas está no quiz |
| 2026-11-01 | Senado | Cota dos senadores (CEAPS) não foi coletada na sonda | **Resolvido na E21d**: 78 dos 81 senadores com a cota no card |
| 2026-11-01 | Senado | Fotos oficiais do Senado têm 105–299 KB (Câmara e TSE: 5–61 KB) | Medido na E12: colinha típica mostra conteúdo + 1ª foto em ~1 s no 4G lento; com os 3 senadores em exercício, ~2 s. Sem redimensionar (seria proxiar). Alternativas a decidir: foto do TSE da eleição deles, ou aceitar |
| 2026-11-01 | Câmara / Senado | Ementas que não dizem o que a matéria faz (ex.: PLP 177/2023: "Altera a redação da Lei Complementar nº 78") | Explicação do quiz usa a ementa do texto aprovado no Senado e as palavras-chave da Câmara; nenhum número que não esteja nas fontes (ex.: a nova quantidade de deputados não aparece) |
| 2026-11-01 | Senado | PL 2162/2023: situação "VETADA" e, ao mesmo tempo, norma gerada Lei nº 15.402/2026; Câmara ainda mostra "Aguardando Envio ao Senado" | O quiz relata os dois registros do Senado como estão, sem interpretar |
| 2026-11-01 | Repositório | `github.com/lucasmsze-ops/fiscaliza` é privado; `/como-funciona#licencas` linka para ele como código-fonte (AGPL) | Link dá 404 para quem não está logado até o repo virar público; decidir antes da E16 |
| 2026-11-01 | Senado | CEAPS (cota dos senadores) continua fora | **Resolvido na E21d** |
| 2026-11-01 | TSE | Top-20 da cidade cobre 67,4% dos votos para deputado no estado (57,2% na capital); senador, 100% | Aviso "Não está na lista? Busque pelo nome ou pelo número de urna"; tamanho da lista decidido depois da E16 (`docs/TESTE-USUARIOS.md`) |
| 2026-11-01 | Câmara | Telefone do gabinete vem sem DDD | "Como cobrar" mostra o telefone como a fonte escreve; não acrescentamos DDD |
| 2026-11-01 | Senado | CEAPS traz CPF de fornecedor pessoa física (306 de 23.850 despesas em 2025) | CPF nunca é gravado; o fornecedor pessoa física aparece só pelo nome, como a fonte publica, ou fica agregado |
| 2026-11-01 | Câmara | Cota nota a nota do Brasil inteiro (~1 milhão de linhas em 2023–26) não cabe no Supabase free | A decidir: agregado por fornecedor e mês, com link para as notas na página oficial (`docs/VOLUME.md`) |
| 2026-11-02 | IBGE | `servicodados.ibge.gov.br` não aceita conexão a partir de runners do GitHub Actions (2 execuções, timeout de conexão) | Municípios e códigos IBGE gerados na máquina local e versionados; o cron só lê |
| 2026-11-02 | Câmara | Descrição oficial de uma votação (prisão de deputado) traz o CPF dele por extenso | Ocultado como "[CPF omitido]" (`lib/texto.ts#semCpf`); o restante do texto fica como a fonte publica |
| 2026-11-02 | TSE / IBGE | 13 municípios com grafia diferente entre TSE e IBGE (um com o nome antigo no TSE: "Boa Saúde", hoje Januário Cicco/RN) | De-para explícito em `scripts/tse/municipios.ts`; o site mostra o nome do IBGE |
| 2026-11-02 | TSE | Uma deputada eleita por média (RJ) não está no top-20 de nenhuma cidade | Todos os eleitos entram em `politicos`, além de quem aparece em algum top-20: tem página e busca, não aparece na lista de nenhuma cidade |
| 2026-11-02 | TSE | Status "reeleito" não está no TSE 2026 | Fora de SP, até a E21c, os eleitos ficam como "eleito" nas tabelas geradas; nada é publicado antes do cruzamento |
| 2026-11-02 | Senado | `/senador/{codigo}/licencas` repete a mesma licença (mesmo início e motivo) com fins diferentes: prorrogação ou correção (5 casos em 2023–26) | Fica o fim mais tardio (`lib/linhas-mandato.ts#deSenado`); os dias afastado não contam a mesma licença duas vezes |
| 2026-11-02 | TSE | 421 candidaturas a deputado federal e senador em 2026 com situação de totalização `#NULO` | Status desconhecido: quem está em exercício entra como "em exercício"; ninguém aparece como "não eleito" sem a fonte dizer |
| 2026-11-02 | Senado | Só os 81 em exercício são consultados; quem exerceu no período e saiu (ex.: suplente convocado por um tempo) e disputou 2026 não ganha o vínculo com o Senado | O card desses mostraria "sem mandato" ou "primeiro voto"; ampliar para os senadores da legislatura 57 quando houver endpoint por legislatura |
| 2026-11-02 | Câmara | Cota (CEAP) carregada só para os deputados de SP | **Resolvido na E21d**: 27 UFs, 553 dos 575 deputados com mandato em curso têm a cota no card (os 22 restantes são suplentes afastados desde antes de 2025, sem lançamento no período) |
| 2026-11-02 | Senado | CEAPS sem UF do senador; `/senador/{codigo}` sem `UfParlamentar` para quem não está em exercício (12 casos) | UF dos mandatos da legislatura 57 (`/senador/{codigo}/mandatos`); nada aparece na interface |
| 2026-11-02 | Senado | CEAPS: 131 despesas (2025–26) sem tipo de despesa, todas "Recibo" (R$ 382 mil) | Somadas no total; na página, categoria "Tipo não informado pela fonte" |
| 2026-11-02 | Senado | Jorge Kajuru (GO), em exercício desde 2019, não tem nenhuma despesa na CEAPS de 2025–26 (nem pelo código, nem pelo nome); Leany Lemos (DF) e Renzo Braz (MG) entraram em set–out/2026 | Card sem o bloco de cota (como qualquer parlamentar sem lançamento no período); nunca "R$ 0" |
| 2026-11-02 | Câmara / Senado | Primeira coleta nacional da cota sem coleta anterior comparável (e a de SP seguia outra regra de média) | Meses fechados até jul/2026, o último fechado de SP; a regra de duas coletas vale a partir de dezembro (`docs/METODOLOGIA.md`) |
| 2026-11-02 | Câmara / Senado | Cota só desde jan/2025 | A página mostra os últimos 12 meses; 2023–2024 entram na E27 |
| 2026-11-02 | Senado | Listagem por autor (`/processo?codigoParlamentarAutor`) inclui quem não está na autoria de iniciativa: 9 senadores num PL da Comissão Diretora (PL 6070/2025, virou lei) e 1 assinatura num PRS | Vale a autoria de iniciativa (tem a ordem): o PL da Comissão Diretora não entra como autoria individual de nenhum senador |
| 2026-11-02 | Câmara | Arquivos anuais de proposições chegam cortados (o servidor encerra a conexão a cada ~17 s) | Download retomado com `Range` até o tamanho bater; nada aparece na interface |
| 2026-11-02 | Câmara / Senado | Proposições de autoria só desde 2023 e só dos parlamentares do site (os 70 deputados da legislatura 57 que não estão em `politicos` ficam fora) | A página mostrará os números a partir de 2023 (E25) |
| 2026-11-03 | TSE | O mesmo CPF tem mais de uma candidatura no ano (registro cancelado e refeito, troca de cargo): 22 em 2026, 94 em 2022; a ordem das linhas muda quando o TSE regenera os arquivos | Ligação deputado–TSE usa a candidatura que foi à urna e, no empate, o registro mais recente (`porCpf`, E22) |
| 2026-11-04 | Câmara | Em votação de pessoa todos os votos vêm `tipoVoto: null`: o placar fica zerado (2 votações, ex.: PDL 995/2026) | `/congresso` diz "a Câmara não divulga a direção dos votos nesta votação", nunca "0 sim · 0 não" |
| 2026-11-04 | TSE × Câmara/Senado | A mesma sigla com duas grafias: TSE "PCDOB", Casas "PCdoB" (20 políticos) | Grafia única "PCdoB" no cron (`lib/partidos.ts`) e na montagem das bancadas |
| 2026-11-04 | Senado | Composição a partir de 01/02/2027: das 27 cadeiras eleitas em 2022, 9 têm suplente hoje e não se sabe quem ocupará em fevereiro | `/congresso` mostra "A partir de fev/2027" só na Câmara (513 eleitos) |
| 2026-11-04 | Câmara e Senado | Pauta e agenda de sessões futuras não são coletadas | "Sem sessão agora / próxima sessão" e a pauta marcada do protótipo ficam ocultas; a agenda mostra só as votações que já houve |
| 2026-11-04 | Câmara | Orientação de bloco parlamentar vem só com o nome abreviado e cortado ("Bl PlFdrPtUniPp..."); `/blocos` lista só os 7 blocos de hoje | "Votou com o partido?" usa o bloco só quando o nome lista o partido; o resto fica fora da conta (MDB, Republicanos, Podemos e PSDB quase sem 2025) e o card diz em quantas votações a conta foi feita |
| 2026-11-04 | Câmara e Senado | O partido de cada parlamentar no dia de cada votação não vai para o banco (a janela partidária de 2026 trocou muitos de partido) | O cron lê o partido do dia nas respostas em cache das fontes e grava só o resultado no resumo da página |
| 2026-11-05 | TSE / Câmara | `politicos.uf` é a UF da candidatura de 2026, que pode não ser a da cadeira (Rosangela Moro e Tiririca: cadeiras de SP, candidaturas no PR e no CE; Hélio Lopes: cadeira do RJ, candidatura em RR) | Listas por estado usam `mandatos.uf` (E23d, migração 0007). O crachá ainda mostra partido-UF da candidatura no cabeçalho |
| 2026-11-05 | Sonda | 3 mandatos antigos de João Paulo Cunha (2003–2014), fora dos caches, sem a UF da cadeira | `mandatos.uf` nulo; não entram em nenhuma lista por estado (nenhum está em curso) |
| 2026-11-05 | Câmara | Palavras-chave de indexação e hora da votação não coletadas | Fora da página da votação (E23k) |
