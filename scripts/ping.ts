/**
 * E0 — confirma que as duas APIs respondem e que o cliente HTTP funciona.
 * Uso: npm run ping
 */
import { fetchJson, HttpError } from "../lib/http";

const CAMARA = "https://dadosabertos.camara.leg.br/api/v2";
const SENADO = "https://legis.senado.leg.br/dadosabertos";

interface Alvo {
  nome: string;
  url: string;
  contar: (json: unknown) => number;
}

const alvos: Alvo[] = [
  {
    nome: "Câmara  /referencias/situacoesDeputado",
    url: `${CAMARA}/referencias/situacoesDeputado`,
    contar: (j) => (j as { dados: unknown[] }).dados.length,
  },
  {
    nome: "Senado  /senador/lista/atual",
    url: `${SENADO}/senador/lista/atual`,
    contar: (j) => {
      const lista = (j as any).ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar;
      return Array.isArray(lista) ? lista.length : -1;
    },
  },
];

let falhas = 0;
for (const alvo of alvos) {
  try {
    const json = await fetchJson(alvo.url, { label: alvo.nome.trim() });
    const n = alvo.contar(json);
    console.log(`OK    ${alvo.nome}  →  ${n} itens`);
    if (n < 0) {
      console.log("      shape inesperado; chaves de topo:", Object.keys(json as object));
    }
  } catch (err) {
    falhas++;
    const msg = err instanceof HttpError ? `HTTP ${err.status ?? "ERR"}` : String(err);
    console.log(`FALHA ${alvo.nome}  →  ${msg}`);
  }
}
process.exit(falhas ? 1 : 0);
