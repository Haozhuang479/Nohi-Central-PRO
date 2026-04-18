import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createHttpClient, createBearerClient, HttpError } from '../../electron/main/engine/lib/http'

const ORIGINAL_FETCH = globalThis.fetch

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH
})

function mockFetch(impl: (url: string, init?: RequestInit) => Promise<Response>) {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    return impl(typeof input === 'string' ? input : input.toString(), init)
  }) as typeof globalThis.fetch
}

describe('createHttpClient', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('GET returns parsed JSON', async () => {
    mockFetch(async () => new Response(JSON.stringify({ hello: 'world' }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    const client = createHttpClient({ baseUrl: 'https://api.example.com' })
    const r = await client.get<{ hello: string }>('/foo')
    expect(r.hello).toBe('world')
  })

  it('POST sends JSON body', async () => {
    let capturedBody: string | undefined
    mockFetch(async (_url, init) => {
      capturedBody = init?.body as string
      return new Response(JSON.stringify({ ok: 1 }), { status: 200 })
    })
    const client = createHttpClient({ baseUrl: 'https://api.example.com' })
    await client.post('/foo', { x: 1 })
    expect(capturedBody).toBe('{"x":1}')
  })

  it('throws HttpError on 4xx', async () => {
    mockFetch(async () => new Response('not found', { status: 404, statusText: 'Not Found' }))
    const client = createHttpClient({ baseUrl: 'https://api.example.com' })
    await expect(client.get('/foo')).rejects.toBeInstanceOf(HttpError)
  })

  it('does not throw on 4xx when throwOnError=false', async () => {
    mockFetch(async () => new Response('{"err":1}', { status: 404 }))
    const client = createHttpClient({ baseUrl: 'https://api.example.com' })
    const r = await client.get<{ err: number }>('/foo', { throwOnError: false })
    expect(r.err).toBe(1)
  })

  it('respects an absolute URL', async () => {
    let capturedUrl = ''
    mockFetch(async (url) => {
      capturedUrl = url
      return new Response('{}', { status: 200 })
    })
    const client = createHttpClient({ baseUrl: 'https://api.example.com' })
    await client.get('https://other.com/x')
    expect(capturedUrl).toBe('https://other.com/x')
  })

  it('handles base URL trailing slash', async () => {
    let capturedUrl = ''
    mockFetch(async (url) => { capturedUrl = url; return new Response('{}', { status: 200 }) })
    const client = createHttpClient({ baseUrl: 'https://api.example.com/' })
    await client.get('/foo')
    expect(capturedUrl).toBe('https://api.example.com/foo')
  })
})

describe('createBearerClient', () => {
  it('adds Authorization header', async () => {
    let capturedAuth: string | undefined
    mockFetch(async (_url, init) => {
      capturedAuth = (init?.headers as Record<string, string>)?.Authorization
      return new Response('{}', { status: 200 })
    })
    const client = createBearerClient('mytoken', { baseUrl: 'https://api.example.com' })
    await client.get('/foo')
    expect(capturedAuth).toBe('Bearer mytoken')
  })
})

describe('HttpError', () => {
  it('contains status, body preview, and url', () => {
    const e = new HttpError(500, 'Internal', 'oops', 'https://x.com/y')
    expect(e.status).toBe(500)
    expect(e.bodyPreview).toBe('oops')
    expect(e.url).toBe('https://x.com/y')
    expect(e.message).toMatch(/500/)
    expect(e.message).toMatch(/x\.com/)
  })
})
