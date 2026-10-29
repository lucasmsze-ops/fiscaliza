// Apoio à E1: quem está em exercício hoje em SP (Câmara e Senado), para separar reeleitos de novos.
import { fetchJson } from "../../lib/http";
import { writeFileSync, mkdirSync } from "node:fs";

// Sem idLegislatura a API devolve só quem está em exercício agora. Paginar mesmo assim.
const dep: any[] = [];
for (let pagina = 1; pagina <= 5; pagina++) {
  const r = await fetchJson<{ dados: any[]; links: { rel: string }[] }>(
    `https://dadosabertos.camara.leg.br/api/v2/deputados?siglaUf=SP&itens=100&pagina=${pagina}&ordem=ASC&ordenarPor=nome`,
    { label: "camara:/deputados?siglaUf=SP" },
  );
  dep.push(...r.dados);
  if (!r.links.some((l) => l.rel === "next")) break;
}
const sen = await fetchJson<any>("https://legis.senado.leg.br/dadosabertos/senador/lista/atual", { label: "senado:/senador/lista/atual" });
const senSP = sen.ListaParlamentarEmExercicio.Parlamentares.Parlamentar
  .filter((p: any) => p.IdentificacaoParlamentar.UfParlamentar === "SP");

mkdirSync("data/raw/apoio", { recursive: true });
writeFileSync("data/raw/apoio/camara-sp-atual.json", JSON.stringify(dep, null, 2));
writeFileSync("data/raw/apoio/senado-sp-atual.json", JSON.stringify(senSP, null, 2));
console.log("Câmara SP em exercício:", dep.length);
console.log("Senado SP em exercício:", senSP.length);
