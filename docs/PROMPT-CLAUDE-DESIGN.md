Você vai desenhar o protótipo navegável do **Fiscaliza**, um site cívico brasileiro. Você tem liberdade total sobre a organização: quais telas existem, como se chega a cada coisa, a navegação, o layout, a hierarquia visual, a identidade, as cores, a tipografia e as interações. Abaixo está tudo o que o produto precisa conter e as regras que ele nunca pode quebrar. Não estou dizendo como organizar; estou dizendo o que existe e o que não pode acontecer. Se achar que uma ideia minha atrapalha a experiência, proponha outra e diga por quê.

## O produto

O Fiscaliza mostra, só com dado oficial, quem representa o eleitor e o que cada um faz no mandato. O fio da pessoa é: em quem eu votei? → quem me representa? → o que essa pessoa está fazendo? → como eu cobro? → com quem eu compartilho?

- Sem fins lucrativos, feito por duas pessoas, custo zero (hospedagem gratuita).
- Público: qualquer eleitor brasileiro, de qualquer estado, a maioria no celular, muitos com internet lenta e pouca familiaridade com política e com termos legislativos. Precisa funcionar para quem nunca ouviu falar de "votação nominal" ou "PEC".
- Teste de sucesso: a pessoa acha quem a representa (pelo mapa, pela cidade ou pelo nome), reconhece os rostos, abre a página de cada um e **entende em 10 segundos** o resumo do mandato; vê como cada um votou em qualquer votação; acha os canais oficiais para cobrar; compartilha. Tudo sem conta e sem pagar nada.

## Regras que o desenho não pode quebrar

1. **Só dado oficial, zero adjetivo.** O site mostra número e fonte; nunca qualifica um político ou um partido. Proibido: nota, ranking, "melhores e piores", selo de bom ou ruim, cor que sugira julgamento (verde = bom, vermelho = ruim aplicado a pessoas), régua ideológica (esquerda/direita), recomendação de voto.
2. **Nenhuma ordem ou cor por posição política.** Partidos aparecem em ordem neutra (tamanho da bancada, alfabética). Cores de partido são só para distinguir, nunca para agrupar por lado.
3. **Toda métrica explica como foi calculada** (um "?" ou link para a metodologia) e **aponta para a página oficial de origem** (Câmara, Senado, TSE).
4. **Dado que não existe não aparece como zero.** Quando a fonte não publica, mostra "—" com o porquê em uma frase. Quando um bloco inteiro ainda não tem dado, ele não aparece.
5. **Sem conta, sem login, sem e-mail, sem telefone, sem cadastro.** O que a pessoa "acompanha" fica só no aparelho dela (como favoritos locais). Avisos não existem de verdade: no máximo um botão "Receber avisos" que explica que ainda não existe, sem pedir nenhum contato.
6. **Completo, mas legível.** Cada página abre com poucos números grandes e claros; o detalhe vem embaixo, em seções que a pessoa abre. Termo técnico sempre com explicação curta ao lado (PEC, PL, obstrução, quociente, cota parlamentar…).
7. **Celular primeiro.** Tudo precisa ser confortável numa tela de 375 px com o polegar: sem rolagem para o lado, alvos de toque grandes, campos de texto com 16 px (o iPhone dá zoom abaixo disso), nada que dependa de passar o mouse. Página do político e lista de representantes têm que abrir rápido no 4G (pouco peso, fotos pequenas).
8. **Acessível.** Contraste AA, nunca cor como única pista (sempre texto ou número junto), funciona com leitor de tela e teclado.
9. **Fotos são as oficiais** (Câmara, Senado, TSE): retratos de tamanhos e fundos variados.
10. **Identidade própria.** Pode se inspirar em sites cívicos, mas não copie layout, textos ou marca de nenhum site existente.

Fora de escopo, não desenhar: presença em sessões, discursos, conta/login, avisos reais por e-mail ou WhatsApp, quiz de concordância, ranking, recomendação de voto, votações de comissão, geolocalização automática.

## O que existe hoje (MVP: Congresso no Brasil inteiro)

Escala real: 513 deputados federais e 81 senadores em exercício; ~3.700 políticos no total (inclui quem disputou 2026 sem ser eleito); 5.571 cidades; ~1.500 votações nominais no Plenário de 2023 a 2026; ~25 mil propostas de autoria.

**Por pessoa (deputado federal ou senador):**
- Foto, nome de urna, cargo, estado, partido (sigla e nome completo), situação em 2026 (eleito, reeleito, suplente, não eleito, em exercício).
- Mandato atual (em exercício desde, mandato até) e o próximo, se eleito em 2026.
- Salário (valor fixado em lei, igual para todos do Congresso).
- **Participação em votações:** % das votações nominais do Plenário em que registrou voto, com "N de M". Ao lado, a média da Casa. Dias afastado (licença) no período. Nunca chamar de "presença".
- **Votou com o partido?** % de votos iguais à orientação da bancada do partido da pessoa no dia de cada votação, com o número de votações consideradas.
- **Governismo:** % de votos iguais à orientação do líder do Governo.
- **Quem vota mais parecido:** os 5 colegas da mesma Casa com mais votos iguais, com % e número de votações em comum (é comparação voto a voto, não posição política).
- **Votos:** lista das votações com o assunto (ementa), o que foi votado naquele dia, o voto da pessoa (Sim, Não, Abstenção, Obstrução, não registrou voto, voto secreto, voto não divulgado), a orientação do partido e o link oficial.
- **Propostas de autoria:** quantas podem virar lei (projetos de lei, emendas à Constituição etc.), em quantas é primeiro autor, quantas viraram lei, e a contagem dos demais pedidos (requerimentos, emendas). Lista com ementa, ano, situação e link, filtrável por ano e busca.
- **Cota parlamentar:** valor gasto no mês, comparado à média da bancada do mesmo estado e da mesma Casa (a cota varia por estado), mês a mês e por categoria (passagens, escritório, divulgação…).
- Contatos oficiais do gabinete (e-mail, telefone) e **canais para cobrar** (ouvidoria da Casa, Fala.BR, TCU, MPF), sem texto pronto.
- Data da última coleta e o que a página cobre e não cobre.

**Congresso:**
- Quem ocupa cada cadeira hoje (Câmara e Senado), por partido, filtrável por estado; a composição da Câmara a partir de fevereiro de 2027 (eleitos de 2026).
- Votações nominais por dia (calendário), com placar (sim, não, abstenção), resultado e assunto.
- O que virou lei.

**Lugar:** estado ou cidade → os 3 senadores e os deputados federais do estado (o estado inteiro elege os dois); número de municípios do estado.

**Site:** busca por nome de político ou página; metodologia (como cada número é calculado), fontes, privacidade, licenças, glossário.

## O que vem a seguir, ainda no MVP

- **Tema oficial** de cada proposta e votação (classificação da Câmara e do Senado: "Educação", "Saúde", "Segurança Pública"…), com filtro por tema.
- **Acompanhar neste aparelho:** a pessoa marca quem quer acompanhar e vê "o que aconteceu desde a última visita" (novos votos, propostas, gastos), sem conta.
- **Comparar** de 2 a 5 políticos lado a lado (salário, participação, votou com o partido, cota, propostas, patrimônio, mandatos), sem nota.
- **Patrimônio declarado ao TSE** por eleição (total, sem descrever os bens) e **dinheiro de campanha** (arrecadado, gasto, % de dinheiro público).
- **Linha do tempo de candidaturas** (2008–2026: cargo, votos, se foi eleito por quociente ou por média).
- **Todas as votações** com filtros (Casa, data, tema, busca) e o **detalhe de uma votação:** o que era, o que foi votado, quórum necessário, placar, como votou cada partido e cada parlamentar, filtro por estado, o caminho da proposta.
- **Agenda e pauta do Plenário** (atualizada uma vez por dia, nunca "ao vivo").
- **Comissões** de que a pessoa faz parte e **equipe do gabinete** (quantas pessoas, folha do mês).
- **Cota completa** com os maiores fornecedores e **"quanto custa o mandato"** (salário, cota, verba de gabinete, auxílios, cada item com o ato legal).
- **Compartilhar:** imagem pronta por político (para feed e stories) e "reportar erro" / "direito de resposta" por e-mail do projeto.
- **Página de atualizações:** cada fonte e quando foi coletada pela última vez.

## A visão final (depois do MVP)

- **Todos os eleitos**, do vereador ao presidente: governadores, deputados estaduais, prefeitos, vereadores e presidente, cada um com a página dele (com o que a fonte oficial publica para cada cargo).
- **Mapa, estado e cidade** com "quem me representa" em todos os níveis (Brasília, estado, cidade) e resultados das eleições por lugar.
- **Legislativos estaduais e municipais** (votos e propostas) só onde há dado aberto; onde não há, a página diz que a fonte não publica.
- **Contexto:** governos e indicadores, partidos (filiados, eleitos, sem régua ideológica), "entenda os cargos" (o que cada um faz, com base na Constituição), dicionário político, mais vistos (sem rastrear ninguém), impostômetro e STF (só com fonte aberta), ouvir a página, tema claro e escuro.

## Casos reais que o desenho precisa acomodar

- Eleito em 2026 que ainda não tomou posse: tem foto, partido e votos, mas nenhum número de mandato até fevereiro de 2027.
- Suplente ou não eleito sem mandato: página curta.
- Parlamentar licenciado: o mandato continua, mas a cadeira é do suplente.
- Voto secreto no Senado: só se sabe que votou, não como.
- Votação de escolha de pessoa na Câmara: o voto é registrado, mas a direção não é divulgada.
- Partido que mudou: "votou com o partido" usa o partido de cada dia.
- Números com poucos casos: menos de 20 votações → sem percentual, só a explicação.
- Textos oficiais longos e em linguagem jurídica ("Altera o art. 9º da Emenda Constitucional nº 132…"): o desenho precisa ajudar a entender o assunto sem inventar resumo.
- Nomes muito longos, partidos com nomes longos, fotos de proporções diferentes.

## Sobre os dados do protótipo

Use nomes, partidos e números **fictícios, mas com ordem de grandeza realista** (salário ~R$ 46 mil; participação entre 60% e 98%; centenas de votações; dezenas de propostas), e marque em cada tela "dados fictícios de protótipo". Não use nomes de políticos reais.

Entregue um protótipo navegável, com as telas que você achar necessárias para cobrir o MVP e mostrar como a visão final se encaixa sem refazer tudo. Pense primeiro no celular. Antes de desenhar, se quiser, me diga em poucas linhas como pretende organizar o site e por quê.
