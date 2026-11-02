/**
 * E21 — Cron do Fiscaliza. Ordem: coleta (jobs isolados: um falhando não impede o outro) →
 * validação de estado/dados → publicação só do que mudou → resumos (card e página) só onde mudou.
 * Dado inválido nunca é publicado. Sai com 1 se algum job falhou, para o Actions avisar (E22).
 * Uso: npm run cron   (SUPABASE_URL e SUPABASE_SECRET_KEY de .env.local; FISCALIZA_ESTADO=pasta opcional)
 */
import { spawnSync } from "node:child_process";
import { DADOS, gravarTabela, iniciarEstado, lerTabela, mesclar, type LinhaBruta } from "./estado";
import { publicar } from "./publicar";
import { gravarResumos } from "./resumos";
import { jobVotacoes } from "./votacoes";

const t0 = Date.now();
const seg = () => `${((Date.now() - t0) / 1000).toFixed(0)}s`;
const hoje = new Date().toISOString().slice(0, 10);
if (iniciarEstado()) console.log(`[${seg()}] estado novo em ${DADOS}, a partir de data/*.json (o que o seed carregou)`);

type Job = { nome: string; rodar: () => Promise<{ tabelas: Record<string, LinhaBruta[]>; relatorio: string[]; falhas: number }> };
const jobs: Job[] = [
  { nome: "votacoes", rodar: async () => { const r = await jobVotacoes(hoje); return { tabelas: { votacoes: r.votacoes, votos: r.votos, orientacoes: r.orientacoes }, relatorio: r.relatorio, falhas: r.falhas }; } },
];

let falhou = false;
for (const job of jobs) {
  try {
    const r = await job.rodar();
    for (const linha of r.relatorio) console.log(`[${seg()}] ${job.nome}: ${linha}`);
    // Ordem das tabelas no objeto = ordem das chaves estrangeiras (votações antes de votos).
    for (const [tabela, novas] of Object.entries(r.tabelas)) {
      const m = mesclar(tabela, lerTabela(tabela), novas);
      gravarTabela(tabela, m.linhas);
      console.log(`[${seg()}] ${job.nome}: ${tabela} ${m.novas} novas, ${m.alteradas} alteradas (${m.linhas.length} no total)`);
    }
    if (r.falhas) { falhou = true; console.error(`[${seg()}] ${job.nome}: ${r.falhas} falhas (tentadas de novo na próxima execução)`); }
  } catch (e) {
    falhou = true;
    console.error(`[${seg()}] ${job.nome} FALHOU: ${(e as Error).stack ?? e}`);
  }
}

const v = spawnSync("npx", ["tsx", "scripts/sonda/validar.ts"], { env: { ...process.env, DATA_DIR: DADOS }, encoding: "utf8" });
console.log(`[${seg()}] validação: ${(v.stdout + v.stderr).trim().split("\n").at(-1)}`);
if (v.status !== 0) { console.error(v.stdout + v.stderr); console.error("dado inválido: nada foi publicado"); process.exit(1); }

for (const p of await publicar()) console.log(`[${seg()}] publicar ${p.tabela.padEnd(18)} ${String(p.enviadas).padStart(6)} enviadas, ${p.semMudanca} sem mudança${p.soNoPublicado ? `, ${p.soNoPublicado} só no publicado (não apagadas)` : ""}`);
const r = await gravarResumos(DADOS, hoje);
console.log(`[${seg()}] resumos: ${r.gravados} de ${r.politicos} gravados (os demais não mudaram)`);
console.log(`[${seg()}] fim${falhou ? " com falhas" : ""}`);
process.exit(falhou ? 1 : 0);
