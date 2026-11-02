/**
 * E20 — Calcula card e página de cada político a partir de data/*.json e grava em `resumos`, só onde
 * mudou. O cron faz o mesmo a partir de estado/dados (scripts/cron/index.ts).
 * Uso: npm run precalcular   (SUPABASE_URL e SUPABASE_SECRET_KEY de .env.local)
 */
import { gravarResumos } from "./cron/resumos";

const t0 = Date.now();
const r = await gravarResumos("data");
console.log(`${r.politicos} políticos · ${r.gravados} resumos gravados (os demais não mudaram) · média ${r.kbMedio.toFixed(1)} KB por página · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
