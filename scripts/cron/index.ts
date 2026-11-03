/**
 * E21 — Cron do Fiscaliza. Ordem: coleta (jobs isolados: um falhando não impede o outro) →
 * validação de estado/dados → publicação só do que mudou → resumos (card e página) só onde mudou.
 * Dado inválido nunca é publicado. Sai com 1 se algum job falhou, para o Actions avisar (E22).
 * Uso: npm run cron   (SUPABASE_URL e SUPABASE_SECRET_KEY de .env.local; FISCALIZA_ESTADO=pasta opcional)
 */
import { spawnSync } from "node:child_process";
import { jobCota } from "./cota";
import { jobProposicoes } from "./proposicoes";
import { DADOS, gravarTabela, iniciarEstado, lerTabela, mesclar, type LinhaBruta } from "./estado";
import { publicar } from "./publicar";
import { jobParlamentares } from "./parlamentares";
import { gravarResumos } from "./resumos";
import { jobVotacoes } from "./votacoes";

/** --sem-publicar: coleta, mescla e valida em estado/dados, mas não envia nada ao Supabase (ensaio). */
const SEM_PUBLICAR = process.argv.includes("--sem-publicar");

const t0 = Date.now();
const seg = () => `${((Date.now() - t0) / 1000).toFixed(0)}s`;
const hoje = new Date().toISOString().slice(0, 10);
if (iniciarEstado()) console.log(`[${seg()}] estado novo em ${DADOS}, a partir de data/*.json (o que o seed carregou)`);

/** `atualizadas`: fontes coletadas com sucesso nesta execução (tabela `atualizacoes`); sem o campo, as duas Casas do job, se não houve falha. */
type Job = { nome: string; rodar: () => Promise<{ tabelas: Record<string, LinhaBruta[]>; relatorio: string[]; falhas: number; atualizadas?: string[] }> };
const jobs: Job[] = [
  // Ordem: políticos antes das votações (os votos de quem acabou de entrar vêm do histórico).
  { nome: "parlamentares", rodar: () => jobParlamentares(hoje) },
  { nome: "votacoes", rodar: async () => { const r = await jobVotacoes(hoje); return { tabelas: { votacoes: r.votacoes, votos: r.votos, orientacoes: r.orientacoes }, relatorio: r.relatorio, falhas: r.falhas }; } },
  // Depois de parlamentares: despesas_mes só guarda quem está em politicos.
  { nome: "cota", rodar: () => jobCota(hoje) },
  { nome: "proposicoes", rodar: () => jobProposicoes(hoje) },
];

let falhou = false;
const atualizadas: string[] = [];
for (const job of jobs) {
  try {
    const r = await job.rodar();
    atualizadas.push(...(r.atualizadas ?? (r.falhas ? [] : [`camara_${job.nome}`, `senado_${job.nome}`])));
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

// Data da última coleta bem-sucedida de cada fonte (base da página /atualizacoes). Também é a escrita
// diária que mantém o Supabase free acordado.
const coletadoEm = new Date().toISOString();
const m = mesclar("atualizacoes", lerTabela("atualizacoes"), atualizadas.map((fonte) => ({ fonte, coletado_em: coletadoEm })));
gravarTabela("atualizacoes", m.linhas);
console.log(`[${seg()}] atualizacoes: ${atualizadas.join(", ") || "nenhuma fonte coletada"}`);

const v = spawnSync("npx", ["tsx", "scripts/sonda/validar.ts"], { env: { ...process.env, DATA_DIR: DADOS }, encoding: "utf8" });
console.log(`[${seg()}] validação: ${(v.stdout + v.stderr).trim().split("\n").at(-1)}`);
if (v.status !== 0) { console.error(v.stdout + v.stderr); console.error("dado inválido: nada foi publicado"); process.exit(1); }

if (SEM_PUBLICAR) { console.log(`[${seg()}] --sem-publicar: nada enviado ao Supabase`); process.exit(falhou ? 1 : 0); }
for (const p of await publicar()) console.log(`[${seg()}] publicar ${p.tabela.padEnd(18)} ${String(p.enviadas).padStart(6)} enviadas, ${p.semMudanca} sem mudança${p.soNoPublicado ? `, ${p.soNoPublicado} só no publicado (não apagadas)` : ""}`);
const r = await gravarResumos(DADOS, hoje);
console.log(`[${seg()}] resumos: ${r.gravados} de ${r.politicos} gravados (os demais não mudaram)`);
console.log(`[${seg()}] fim${falhou ? " com falhas" : ""}`);
process.exit(falhou ? 1 : 0);
