export type TransportResponse<T = unknown> = {
  status: number;
  ok: boolean;
  body: T;
  rawText: string;
  durationMs: number;
};

export class HttpTransport {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl: string, timeout = 15_000) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  async get<T>(path: string, opts?: { timeout?: number }): Promise<TransportResponse<T>> {
    return this.request<T>("GET", path, undefined, opts?.timeout);
  }

  async post<T>(path: string, body: unknown, opts?: { timeout?: number }): Promise<TransportResponse<T>> {
    return this.request<T>("POST", path, body, opts?.timeout);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    timeout?: number
  ): Promise<TransportResponse<T>> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout ?? this.timeout);
    const start = Date.now();

    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const rawText = await res.text();
      let parsed: T;
      try {
        parsed = JSON.parse(rawText) as T;
      } catch {
        parsed = rawText as unknown as T;
      }

      return {
        status: res.status,
        ok: res.ok,
        body: parsed,
        rawText,
        durationMs: Date.now() - start,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

export const expectOk = <T>(res: TransportResponse<T>, context?: string): T => {
  if (!res.ok) {
    throw new Error(
      `HTTP ${res.status} ${context ? `(${context})` : ""}: ${res.rawText.slice(0, 500)}`
    );
  }
  return res.body;
};
