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
