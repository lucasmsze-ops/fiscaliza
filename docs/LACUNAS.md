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
| 2026-10-29 | Senado / Câmara | Vetos são votados em sessão conjunta do CN e não estão em `/votacao` (Senado) nem em `/votacoes?idOrgao=180` (Câmara) | Fora dos números do MVP; dizer em `/como-funciona` |
| 2026-10-29 | Senado | André do Prado e Derrite (eleitos 2026) não existem na API até 01/02/2027 | Perfil só do TSE; "primeiro voto em fevereiro" |
| 2026-11-01 | TSE | Em 81 das 1.290 listas de top-20 (cidades pequenas) há empate de votos com o 20º colocado | A lista inclui todos os empatados (até 23 nomes); ordem dentro do empate por número de urna, sem significado |
| 2026-11-01 | TSE | Votação municipal não traz código IBGE; 1 município de SP com grafia diferente no IBGE | Código IBGE por nome normalizado + de-para revisado (São Luís/Luiz do Paraitinga) |
| 2026-11-01 | TSE | Senador é eleito por maioria; não há lista nem quociente | Card de senador sem a frase "seu voto contou para"; mostra só os votos no município |
| 2026-11-01 | TSE | `consulta_cand` 2026 não indica quem concorre à reeleição | "reeleito" vem do join por CPF com a Câmara (em memória; nada de CPF gravado) |
| 2026-11-01 | Câmara | `/deputados/220651` (Simone Marquetto) devolve 504 persistente; `/historico` responde | Bancada com 69 de 70 perfis; ela não concorreu em SP em 2026 e não aparece em nenhum top-20, então nada no site depende dela |
| 2026-11-01 | TSE | 373 dos 438 políticos (suplentes, não eleitos e novos) não têm registro na Câmara/Senado | Card com foto do TSE, nome, partido, status e votos 2026; sem e-mail (Cobrar oculto), sem os três números ("primeiro voto em fevereiro" para eleitos) |
| 2026-11-01 | Câmara | 187 votações sem resultado explícito (`aprovacao` nulo e descrição sem "Aprovad"/"Rejeitad", ex.: "Mantido o texto") | `resultado` null; nenhuma delas está no quiz |
| 2026-11-01 | Senado | Cota dos senadores (CEAPS) não foi coletada na sonda | Card de senador sem o bloco de cota; coletar antes do lançamento ou documentar como fora do MVP |
| 2026-11-01 | Senado | Fotos oficiais do Senado têm 107–307 KB (Câmara e TSE: 5–40 KB) | Carregam sob demanda; pesam na meta de < 1 s em 4G da colinha (medir na E12) |
