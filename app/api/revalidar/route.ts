import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";

/**
 * Revalidação sob demanda, chamada pelo cron (`.github/workflows/cron.yml`) depois de publicar: as páginas com ISR de
 * 24 h passam a mostrar a coleta do dia na próxima visita, sem esperar a regeneração nem um novo deploy. Marca tudo
 * como velho (o layout raiz); cada página só é refeita quando alguém a abre, então o custo é o mesmo do ISR.
 *
 * Protegida pelo segredo `REVALIDAR_SEGREDO` (variável de ambiente na Vercel, segredo no GitHub). Sem ele configurado,
 * responde 503 e não faz nada.
 */
export async function POST(req: Request) {
  const segredo = process.env.REVALIDAR_SEGREDO;
  if (!segredo) return new Response("revalidação não configurada", { status: 503 });
  const enviado = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = Buffer.from(enviado), b = Buffer.from(segredo);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return new Response("não autorizado", { status: 401 });
  revalidatePath("/", "layout");
  return Response.json({ revalidado: true, em: new Date().toISOString() });
}
