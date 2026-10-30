# Lacunas do dado

O que a fonte oficial não forneceu e como a interface mostra a ausência.
Nunca preencher com dado sintético.

| Data | Fonte | Campo / caso | Como aparece na interface |
|------|-------|--------------|---------------------------|
| 2026-10-29 | TSE | `consulta_cand` não tem coluna de foto; fotos vêm em zip separado por UF, sem URL pública por candidato | Novos sem foto até decisão na E10 (ver `docs/SONDA.md`) |
| 2026-10-29 | TSE | Senadores em exercício (2018/2022) não têm registro em 2026; partido/foto desatualizados no TSE | Partido e foto virão do Senado na E6 |
| 2026-10-29 | Câmara | 4 novos (Nantes, Pavanato, Renato Bolsonaro, Cortez) não existem na API até 01/02/2027 | Card sem foto oficial, sem e-mail de gabinete, "primeiro voto em fevereiro"; botão Cobrar oculto até ter e-mail |
| 2026-10-29 | Câmara | João Paulo Cunha tem registro antigo (leg. 54) com `gabinete.email` nulo e situação "Vacância" | Mesmo tratamento dos novos até 01/02/2027; foto oficial antiga existe |
| 2026-10-29 | Câmara | 17 votações com placar na descrição mas sem votos em `/votos` (vazio ou 404) | Fora da lista de nominais; não entram em nenhum número |
| 2026-10-29 | Câmara | `tipoVoto: null` em votações de pessoa (voto não divulgado) | Conta como participação; não conta no governismo; rotulado "voto não informado" |
| 2026-10-29 | Câmara | Político sem mandato no período (João Paulo Cunha) | "Sem mandato no período" em vez de 0% (modelar na E8) |
| 2026-10-29 | Câmara | CEAP dos últimos ~3 meses está incompleta (lançamentos em aberto); CSV anual omite passagens SIGEPA | Card usa o último mês fechado (regra: ≥90% da bancada com lançamento) e avisa "mês em aberto" nos demais |
| 2026-10-29 | Câmara | 6 dos 70 de SP sem nenhum gasto em 2025 (assumiram em 2026) | Média do mês conta só deputados com lançamento no mês |
