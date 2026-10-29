# Lacunas do dado

O que a fonte oficial não forneceu e como a interface mostra a ausência.
Nunca preencher com dado sintético.

| Data | Fonte | Campo / caso | Como aparece na interface |
|------|-------|--------------|---------------------------|
| 2026-10-29 | TSE | `consulta_cand` não tem coluna de foto; fotos vêm em zip separado por UF, sem URL pública por candidato | Novos sem foto até decisão na E10 (ver `docs/SONDA.md`) |
| 2026-10-29 | TSE | Senadores em exercício (2018/2022) não têm registro em 2026; partido/foto desatualizados no TSE | Partido e foto virão do Senado na E6 |
| 2026-10-29 | Câmara | 4 novos (Nantes, Pavanato, Renato Bolsonaro, Cortez) não existem na API até 01/02/2027 | Card sem foto oficial, sem e-mail de gabinete, "primeiro voto em fevereiro"; botão Cobrar oculto até ter e-mail |
| 2026-10-29 | Câmara | João Paulo Cunha tem registro antigo (leg. 54) com `gabinete.email` nulo e situação "Vacância" | Mesmo tratamento dos novos até 01/02/2027; foto oficial antiga existe |
