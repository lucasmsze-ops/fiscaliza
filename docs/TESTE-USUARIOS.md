# Teste com 5 pessoas (E16)

**Tarefa:** "digite sua cidade e monte sua colinha". **Pronto quando:** 4 de 5 conseguem em menos de
1 minuto, sem ajuda. Este arquivo tem o roteiro, a ficha e, depois do teste, os achados. Nada aqui é
inventado: a seção de resultados só recebe o que foi observado.

## Privacidade dos participantes
Este arquivo fica no repositório. Não registrar nome, contato nem **em quem a pessoa votou** (voto é
secreto e o site não guarda isso de ninguém). Participantes viram P1 a P5. Da escolha, anotar só se o
candidato estava na lista da cidade e por qual caminho foi achado.

## Quem chamar
- 5 pessoas que **votaram em São Paulo** em 2026 (o site só cobre SP nesta versão) e que **não
  acompanham política** de perto. Ninguém que já tenha visto o site.
- Variar: pelo menos 1 da capital (a lista da capital é a que menos cobre, ver "Preparação"), pelo
  menos 1 de cidade pequena, idades diferentes, pelo menos 1 pessoa com mais de 50 anos.
- No celular **da própria pessoa**, com o navegador que ela usa, no 4G ou Wi-Fi de onde estiver.

## Antes de cada sessão
1. Ter o link de produção pronto para mandar: https://fiscaliza-rho.vercel.app
2. Cronômetro no seu celular, zerado.
3. A ficha da pessoa (abaixo) aberta para anotar.

## O que dizer (ler igual para todos)
> "Este site mostra em quem você votou para o Congresso em 2026. Quero ver se ele é fácil de usar:
> quem está sendo testado é o site, não você. A tarefa é montar a sua colinha, com quem recebeu o seu
> voto para deputado federal e para senador. Pode falar em voz alta o que estiver pensando. Durante a
> tarefa eu não vou ajudar; quando achar que terminou, me avise. Não precisa me dizer em quem votou."

Depois disso, a pessoa abre o link. **Começar o cronômetro no primeiro toque na tela** com a página
inicial carregada. **Parar quando a tela "Sua colinha" aparecer** (endereço `/c/...`).

## O que conta como sucesso
- **Sucesso:** chegou à tela "Sua colinha" com o **deputado federal em quem votou** (a pessoa confirma,
  sem dizer o nome), em **menos de 60 s**, **sem ajuda**.
- Senadores são anotados, mas não decidem o sucesso: a lista de senadores cobre 100% dos votos de
  todas as cidades; o risco está no deputado (ver "Preparação").
- **Ajuda:** se a pessoa pedir ajuda ou ficar parada por mais de 30 s, ajudar com o mínimo e marcar
  "com ajuda". A tarefa segue até o fim para ver o resto do caminho, mas não conta como sucesso.
- Se a pessoa **não lembrava** em quem votou e reconheceu pela foto ou pelo nome na lista, anotar: é
  exatamente o caso da definição de pronto do MVP.

## O que observar durante a tarefa
- Caminho: digitou a cidade, o nome ou o número? Tocou na sugestão na primeira tentativa?
- O candidato estava na lista da cidade? Se não, usou o aviso "Não está na lista? Busque pelo nome ou
  pelo número de urna"? Achou pela busca?
- Hesitações (mais de 5 s parada), toques errados, voltas, rolagem procurando o Senado.
- Encontrou o botão "Ver colinha" sozinha?
- Frases ditas em voz alta que mostrem dúvida (anotar literalmente).

## Depois da tarefa (perguntas, nesta ordem, sem comentar as respostas)
1. "Com suas palavras, o que esse site faz?"
2. "Teve alguma parte confusa ou que você não entendeu?"
3. "Tem algo nos números dos cards que você não entendeu?" (só se ela olhou os cards)
4. "Você mandaria isso para alguém? Para quem?"

**Parte opcional (não conta para o critério, serve para a E34):** pedir para abrir "Como cobrar" e
achar o e-mail do gabinete, tocar em "Receber avisos" e compartilhar no
WhatsApp com ela mesma. Anotar onde travou.

## Ficha (uma por pessoa)

```
P_ · data: __/__/____ · cidade: capital / grande / pequena · faixa de idade: ____
celular/navegador: ________ · rede: 4G / Wi-Fi

tempo até "Sua colinha": ___ s · sucesso (< 60 s, sem ajuda): sim / não · ajuda: não / sim (em quê)
lembrava em quem votou antes de começar: sim / não / só reconheceu na lista
caminho do deputado: lista da cidade / busca por nome / busca por número
deputado estava na lista da cidade: sim / não · senadores marcados: 0 / 1 / 2
hesitações e toques errados:
frases em voz alta:
respostas 1–4:
parte opcional (como cobrar, receber avisos, compartilhar):
```

## Preparação (piloto em 2026-11-01, antes de qualquer participante)

Não é participante: é a checagem do fluxo e do dado antes do teste.

- **Fotos:** as 438 URLs de foto respondem 200 com JPEG (conferido uma a uma).
- **Peso:** página inicial 9 KB, índice de busca 20 KB e lista da cidade 0,6 KB, comprimidos.
- **Cobertura da lista da cidade** (`scripts/sonda/_cobertura-top20.ts`, votação por município do TSE):
  parte dos votos nominais válidos para deputado federal que foi para alguém que aparece na lista.

  | lista | estado (por voto) | capital |
  |---|---|---|
  | top-20 (a do site) | 67,4% | 57,2% |
  | top-30 | 74,7% | 65,1% |
  | top-50 | 83,0% | 75,5% |
  | top-100 | 92,1% | 88,1% |

  Senador: 100% em todos os 645 municípios. Ou seja, cerca de 1 em cada 3 eleitores do estado (e
  mais de 4 em cada 10 na capital) **não vai achar o seu deputado na lista** e depende da busca. Com 5
  pessoas, o esperado é que 1 ou 2 passem por esse caminho.
- **Ajustes feitos antes do teste** por causa disso (nenhum muda a lista):
  - Aviso no fim da lista de deputados: "Não está na lista? Busque pelo nome ou pelo número de urna",
    que volta o foco para a caixa de busca.
  - Busca por **número de urna** (o índice passou a incluir o número; 435 de 438 têm número).
  - Busca **palavra por palavra**, em qualquer ordem e pelo começo da palavra ("luciene silva" acha
    "PROFESSORA LUCIENE CAVALCANTE", nome civil "LUCIENE CAVALCANTE DA SILVA").
  - Resultados por **mais votados primeiro**, e quem casa pelo **nome de urna** antes de quem casa só
    pelo nome civil (antes, "silva" mostrava 6 de 49 em ordem de arquivo).
- **Decisão adiada para depois do teste:** aumentar a lista (top-30/50) ou não. A tabela acima é o
  custo-benefício; o teste mostra se a busca resolve.

## Resultados

### Rodada 1 (relato do usuário em 2026-11-01)
Sem ficha por pessoa: o registro é o resumo que o usuário deu depois de aplicar o teste.

- **Pessoas:** menos de 5 (número exato não informado).
- **Menos de 1 minuto, sem ajuda:** todas.
- **Caminho do deputado:** todas acharam na lista da cidade; ninguém precisou da busca.
- **Tropeços:** nenhum relatado.

O que esta rodada **não** cobre:
- O critério do PLANO pede 5 pessoas (4 de 5). Com menos de 5, ele não está cumprido no papel.
- Ninguém passou pela busca. É o caminho de cerca de 1 em 3 eleitores (ver "Preparação"), então a
  busca por nome ou número e o aviso "Não está na lista?" seguem sem teste com gente.
- Sem tempos individuais, cidades ou faixas de idade: não dá para saber se alguém era da capital.

| P | cidade | tempo | sucesso | caminho do deputado | na lista? | ajuda | principal tropeço |
|---|--------|-------|---------|---------------------|-----------|-------|-------------------|

## Achados e ajustes

Rodada 1: nada impediu o < 1 min; nenhum ajuste.
