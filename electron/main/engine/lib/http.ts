// Shared HTTP client factory.
// Replaces ~5 hand-rolled fetch+timeout+auth+error-mapping blocks across tools.
//
// Design notes:
//  - Default timeout 30s, configurable per-call
//  - JSON body in / JSON or text out — caller picks via .json<T>() vs .text()
//  - All errors throw HttpError with status + body preview, never silently fail
//  - Bearer-token convenience for the most common auth pattern

export class HttpError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public bodyPreview: string,
    public url: string,
  ) {
    super(`HTTP ${status} ${statusText} for ${url}: ${bodyPreview.slice(0, 200)}`)
    this.name = 'HttpError'
  }
}

export interface HttpClientOptions {
  baseUrl?: string
  defaultHeaders?: Record<string, string>
  defaultTimeoutMs?: number
}

export interface RequestOptions {
  headers?: Record<string, string>
  timeoutMs?: number
  signal?: AbortSignal
  /** If false, do NOT throw on 4xx/5xx — return the response so caller can inspect. */
  throwOnError?: boolean
}

export interface HttpClient {
  get<T>(path: string, opts?: RequestOptions): Promise<T>
  post<T>(path: string, body: unknown, opts?: RequestOptions): Promise<T>
  put<T>(path: string, body: unknown, opts?: RequestOptions): Promise<T>
  del<T>(path: string, opts?: RequestOptions): Promise<T>
  /** Lower-level: returns the Response for streaming, multipart, etc. */
  raw(method: string, path: string, body?: BodyInit, opts?: RequestOptions): Promise<Response>
}

export function createHttpClient(opts: HttpClientOptions = {}): HttpClient {
  const baseUrl = opts.baseUrl?.replace(/\/$/, '') ?? ''
  const defaultHeaders = opts.defaultHeaders ?? {}
  const defaultTimeout = opts.defaultTimeoutMs ?? 30_000

  function buildUrl(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) return path
    if (baseUrl && path.startsWith('/')) return baseUrl + path
    if (baseUrl) return baseUrl + '/' + path
    return path
  }

  async function request(method: string, path: string, body?: BodyInit, ro: RequestOptions = {}): Promise<Response> {
    const url = buildUrl(path)
    const headers: Record<string, string> = { ...defaultHeaders, ...(ro.headers ?? {}) }
    const signal = ro.signal ?? AbortSignal.timeout(ro.timeoutMs ?? defaultTimeout)

    const resp = await fetch(url, { method, headers, body, signal })
    const throwOn = ro.throwOnError !== false
    if (throwOn && !resp.ok) {
      const preview = await resp.text().catch(() => '')
      throw new HttpError(resp.status, resp.statusText, preview, url)
    }
    return resp
  }

  async function jsonRequest<T>(method: string, path: string, body?: unknown, ro: RequestOptions = {}): Promise<T> {
    const headers = { Accept: 'application/json', ...(ro.headers ?? {}) }
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    const resp = await request(method, path, body !== undefined ? JSON.stringify(body) : undefined, { ...ro, headers })
    // Honor ro.throwOnError === false: caller may want to inspect non-OK
    if (!resp.ok && ro.throwOnError === false) {
      // Return the parsed body anyway so caller can decide; if non-JSON, return undefined cast
      try { return await resp.json() as T } catch { return undefined as T }
    }
    return await resp.json() as T
  }

  return {
    get<T>(path, ro) { return jsonRequest<T>('GET', path, undefined, ro) },
    post<T>(path, body, ro) { return jsonRequest<T>('POST', path, body, ro) },
    put<T>(path, body, ro) { return jsonRequest<T>('PUT', path, body, ro) },
    del<T>(path, ro) { return jsonRequest<T>('DELETE', path, undefined, ro) },
    raw(method, path, body, ro) { return request(method, path, body, ro) },
  }
}

/** Convenience: a Bearer-token client. */
export function createBearerClient(token: string, opts: Omit<HttpClientOptions, 'defaultHeaders'> & { defaultHeaders?: Record<string, string> } = {}): HttpClient {
  return createHttpClient({
    ...opts,
    defaultHeaders: { Authorization: `Bearer ${token}`, ...(opts.defaultHeaders ?? {}) },
  })
}
