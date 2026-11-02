/**
 * Cliente HTTP único dos adapters e do cron.
 *
 * - timeout de 30 s por tentativa
 * - retry com backoff exponencial (1 s, 2 s, 4 s) em erro de rede, 429 e 5xx
 * - log por endpoint: status, tentativa e duração
 *
 * Uma falha num endpoint lança `HttpError`; quem chama decide se aborta o job.
 * Nunca é usado em requisição de usuário: só nos scripts.
 */

export interface FetchOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
  retries?: number;
  /** Rótulo curto para o log, ex.: "camara:/deputados/{id}". */
  label?: string;
}

export class HttpError extends Error {
  constructor(
    public readonly url: string,
    public readonly status: number | null,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

const DEFAULTS = { timeoutMs: 30_000, retries: 3 };

export async function fetchJson<T = unknown>(
  url: string,
  opts: FetchOptions = {},
): Promise<T> {
  const res = await fetchWithRetry(url, {
    ...opts,
    headers: { Accept: "application/json", ...opts.headers },
  });
  return (await res.json()) as T;
}

export async function fetchText(
  url: string,
  opts: FetchOptions = {},
): Promise<string> {
  const res = await fetchWithRetry(url, opts);
  return res.text();
}

export async function fetchWithRetry(
  url: string,
  opts: FetchOptions = {},
): Promise<Response> {
  const timeoutMs = opts.timeoutMs ?? DEFAULTS.timeoutMs;
  const retries = opts.retries ?? DEFAULTS.retries;
  const label = opts.label ?? new URL(url).pathname;

  let lastError: unknown;
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    const started = Date.now();
    try {
      const res = await fetch(url, {
        headers: opts.headers,
        signal: AbortSignal.timeout(timeoutMs),
      });
      log(label, res.status, attempt, Date.now() - started);
      if (res.ok) return res;
      lastError = new HttpError(url, res.status, `HTTP ${res.status} em ${url}`);
      if (!isRetryable(res.status)) throw lastError;
    } catch (err) {
      if (err instanceof HttpError) throw err;
      lastError = new HttpError(url, null, `${label}: ${describe(err)}`);
      log(label, null, attempt, Date.now() - started, describe(err));
    }
    if (attempt <= retries) await sleep(1000 * 2 ** (attempt - 1));
  }
  throw lastError;
}

function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

function describe(err: unknown): string {
  if (err instanceof Error) return err.name === "TimeoutError" ? "timeout" : err.message;
  return String(err);
}

function log(
  label: string,
  status: number | null,
  attempt: number,
  ms: number,
  note?: string,
) {
  const parts = [
    `[http] ${label}`,
    status === null ? "ERR" : String(status),
    `${ms}ms`,
    attempt > 1 ? `tentativa ${attempt}` : "",
    note ?? "",
  ].filter(Boolean);
  console.error(parts.join("  "));
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Baixa um arquivo grande para `destino`, retomando com `Range` quando a conexão cai no meio (os
 * arquivos anuais da Câmara chegam cortados: 43 de 90 MB na primeira tentativa, medido em
 * 2026-11-02). Grava em `destino.parcial` e só renomeia quando o tamanho bate com o anunciado.
 */
export async function baixarArquivo(url: string, destino: string, opts: { label?: string; tentativas?: number } = {}): Promise<number> {
  const { createWriteStream, existsSync, renameSync, statSync, unlinkSync } = await import("node:fs");
  const { Readable } = await import("node:stream");
  const { pipeline } = await import("node:stream/promises");
  const label = opts.label ?? new URL(url).pathname;
  const parcial = `${destino}.parcial`;
  if (existsSync(parcial)) unlinkSync(parcial); // o arquivo pode ter sido regenerado desde a última tentativa
  let total: number | null = null;
  for (let tentativa = 1; tentativa <= (opts.tentativas ?? 8); tentativa++) {
    const feito = existsSync(parcial) ? statSync(parcial).size : 0;
    const started = Date.now();
    try {
      const res = await fetch(url, { headers: feito ? { Range: `bytes=${feito}-` } : {}, signal: AbortSignal.timeout(300_000) });
      log(label, res.status, tentativa, Date.now() - started, feito ? `retomando de ${feito} bytes` : undefined);
      if (feito && res.status !== 206) throw new HttpError(url, res.status, `${label}: servidor ignorou o Range`);
      if (!res.ok || !res.body) throw new HttpError(url, res.status, `HTTP ${res.status} em ${url}`);
      const tamanho = res.headers.get("content-range")?.split("/")[1] ?? res.headers.get("content-length");
      if (tamanho) total = Number(tamanho);
      await pipeline(Readable.fromWeb(res.body as never), createWriteStream(parcial, { flags: feito ? "a" : "w" }));
    } catch (err) {
      if (err instanceof HttpError && err.status !== null && !isRetryable(err.status) && err.status !== 206) throw err;
      log(label, null, tentativa, Date.now() - started, describe(err));
    }
    const agora = existsSync(parcial) ? statSync(parcial).size : 0;
    if (total !== null && agora === total) { renameSync(parcial, destino); return total; }
    if (total !== null && agora > total) unlinkSync(parcial);
  }
  throw new HttpError(url, null, `${label}: download incompleto depois de ${opts.tentativas ?? 8} tentativas`);
}
