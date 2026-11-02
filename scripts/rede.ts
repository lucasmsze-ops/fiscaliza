/**
 * E18 — Teste de rede das fontes oficiais: cada endpoint que o cron vai usar responde daqui?
 * Roda sem dependências (`node scripts/rede.ts`, Node ≥ 23 executa TypeScript direto), para medir
 * também de um runner do GitHub Actions, que fica fora do Brasil (`.github/workflows/rede.yml`).
 *
 * Uma tentativa por endpoint, sem retry, timeout de 30 s: o objetivo é ver bloqueio ou lentidão,
 * não buscar dado. Sai com 1 se alguma fonte obrigatória falhar.
 */
export {}; // módulo ES: permite await no topo

const CAMARA = "https://dadosabertos.camara.leg.br/api/v2";
const SENADO = "https://legis.senado.leg.br/dadosabertos";
const JSON_ = { Accept: "application/json" };

interface Alvo {
  fonte: string;
  nome: string;
  url: string;
  metodo?: "GET" | "HEAD";
  headers?: Record<string, string>;
  /** Status aceitos além de 2xx (ex.: 401 de quem exige chave: a fonte respondeu). */
  aceitos?: number[];
}

const alvos: Alvo[] = [
  { fonte: "Câmara", nome: "deputados em exercício", url: `${CAMARA}/deputados?itens=100`, headers: JSON_ },
  { fonte: "Câmara", nome: "votações do plenário (1 mês)", url: `${CAMARA}/votacoes?idOrgao=180&dataInicio=2026-09-01&dataFim=2026-09-30&itens=100`, headers: JSON_ },
  { fonte: "Câmara", nome: "despesas de um deputado (CEAP)", url: `${CAMARA}/deputados/162067/despesas?idLegislatura=57&ano=2026&itens=100`, headers: JSON_ },
  { fonte: "Câmara", nome: "proposições (PL, 1 trimestre)", url: `${CAMARA}/proposicoes?siglaTipo=PL&dataApresentacaoInicio=2026-07-01&dataApresentacaoFim=2026-09-30&itens=100`, headers: JSON_ },
  { fonte: "Câmara", nome: "foto oficial", url: "https://www.camara.leg.br/internet/deputado/bandep/162067.jpg", metodo: "HEAD" },
  { fonte: "Senado", nome: "senadores em exercício", url: `${SENADO}/senador/lista/atual`, headers: JSON_ },
  { fonte: "Senado", nome: "votações nominais (1 mês)", url: `${SENADO}/votacao?dataInicio=2026-09-01&dataFim=2026-09-30`, headers: JSON_ },
  { fonte: "Senado", nome: "orientação de bancada (1 mês)", url: `${SENADO}/plenario/votacao/orientacaoBancada/20260901/20260930`, headers: JSON_ },
  { fonte: "Senado", nome: "CEAPS (cota, ano inteiro)", url: "https://adm.senado.gov.br/adm-dadosabertos/api/v1/senadores/despesas_ceaps/2026", headers: JSON_ },
  { fonte: "TSE", nome: "catálogo CKAN (candidatos 2026)", url: "https://dadosabertos.tse.jus.br/api/3/action/package_show?id=candidatos-2026", headers: JSON_ },
  { fonte: "TSE", nome: "zip de candidatos 2026 (CDN)", url: "https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2026.zip", metodo: "HEAD" },
  { fonte: "TSE", nome: "resultados: configuração", url: "https://resultados.tse.jus.br/oficial/comum/config/ele-c.json", headers: JSON_ },
  { fonte: "TSE", nome: "resultados: foto de candidato", url: "https://resultados.tse.jus.br/oficial/ele2026/6259/fotos/sp/250002536722.jpeg", metodo: "HEAD" },
  { fonte: "IBGE", nome: "localidades (estados)", url: "https://servicodados.ibge.gov.br/api/v1/localidades/estados", headers: JSON_ },
  { fonte: "CGU", nome: "Portal da Transparência (sem chave)", url: "https://api.portaldatransparencia.gov.br/api-de-dados/emendas?pagina=1", headers: JSON_, aceitos: [401, 403] },
];

interface Resultado { alvo: Alvo; status: number | string; ms: number; bytes: number; ok: boolean }

async function testar(alvo: Alvo): Promise<Resultado> {
  const t0 = performance.now();
  try {
    const r = await fetch(alvo.url, { method: alvo.metodo ?? "GET", headers: alvo.headers, signal: AbortSignal.timeout(30_000), redirect: "follow" });
    const corpo = alvo.metodo === "HEAD" ? 0 : (await r.arrayBuffer()).byteLength;
    const bytes = corpo || Number(r.headers.get("content-length") ?? 0);
    const ok = r.ok || (alvo.aceitos ?? []).includes(r.status);
    return { alvo, status: r.status, ms: Math.round(performance.now() - t0), bytes, ok };
  } catch (e) {
    const err = e as Error & { cause?: { code?: string } };
    return { alvo, status: err.name === "TimeoutError" ? "timeout" : (err.cause?.code ?? err.name), ms: Math.round(performance.now() - t0), bytes: 0, ok: false };
  }
}

const onde = process.env.GITHUB_ACTIONS ? `GitHub Actions (${process.env.RUNNER_OS ?? "?"}, ${process.env.RUNNER_ARCH ?? "?"})` : "máquina local";
console.log(`Teste de rede das fontes · ${onde} · ${new Date().toISOString()}\n`);
const resultados: Resultado[] = [];
for (const a of alvos) resultados.push(await testar(a)); // em série: mede cada fonte sem disputa de banda
const kb = (b: number) => (b ? `${(b / 1024).toFixed(0)} KB` : "—");
for (const r of resultados) {
  console.log(`${r.ok ? "ok   " : "FALHA"}  ${r.alvo.fonte.padEnd(7)} ${r.alvo.nome.padEnd(36)} ${String(r.status).padStart(7)} ${String(r.ms).padStart(6)} ms ${kb(r.bytes).padStart(9)}`);
}
const falhas = resultados.filter((r) => !r.ok);
console.log(`\n${resultados.length - falhas.length}/${resultados.length} responderam.`);
process.exit(falhas.length ? 1 : 0);
