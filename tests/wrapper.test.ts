import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Rollbar } from '../src/client'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('Rollbar Wrapper', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockFetch.mockResolvedValue({
      json: async () => ({ err: 0, result: { uuid: 'test-uuid' } }),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('wrap()', () => {
    it('should pass through successful responses', async () => {
      const rollbar = new Rollbar({ accessToken: 'test-token' })
      const handler = vi.fn().mockResolvedValue(new Response('OK'))

      const wrapped = rollbar.wrap(handler)
      const request = new Request('https://example.com/test')
      const response = await wrapped(request, {})

      expect(handler).toHaveBeenCalledWith(request, {}, undefined)
      expect(await response.text()).toBe('OK')
      expect(mockFetch).not.toHaveBeenCalled() // No errors to report
    })

    it('should catch and report errors', async () => {
      const rollbar = new Rollbar({ accessToken: 'test-token' })
      const error = new Error('Handler error')
      const handler = vi.fn().mockRejectedValue(error)

      const wrapped = rollbar.wrap(handler)
      const request = new Request('https://example.com/test')
      const response = await wrapped(request, {})

      expect(response.status).toBe(500)
      expect(mockFetch).toHaveBeenCalledTimes(1)

      const payload = JSON.parse(mockFetch.mock.calls[0]?.[1]?.body as string)
      expect(payload.data.body.trace.exception.message).toBe('Handler error')
      expect(payload.data.request.url).toBe('https://example.com/test')
    })

    it('should use waitUntil when context is provided', async () => {
      const rollbar = new Rollbar({ accessToken: 'test-token' })
      const handler = vi.fn().mockRejectedValue(new Error('Test error'))
      const waitUntil = vi.fn()

      const wrapped = rollbar.wrap(handler)
      const request = new Request('https://example.com/test')
      await wrapped(request, {}, { waitUntil })

      expect(waitUntil).toHaveBeenCalledWith(expect.any(Promise))
    })

    it('should rethrow error when rethrow option is true', async () => {
      const rollbar = new Rollbar({ accessToken: 'test-token' })
      const error = new Error('Rethrow me')
      const handler = vi.fn().mockRejectedValue(error)

      const wrapped = rollbar.wrap(handler, { rethrow: true })
      const request = new Request('https://example.com/test')

      await expect(wrapped(request, {})).rejects.toThrow('Rethrow me')
    })

    it('should use custom error response when provided', async () => {
      const rollbar = new Rollbar({ accessToken: 'test-token' })
      const handler = vi.fn().mockRejectedValue(new Error('Custom error'))
      const customErrorResponse = (err: Error) =>
        new Response(JSON.stringify({ customError: err.message }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })

      const wrapped = rollbar.wrap(handler, { errorResponse: customErrorResponse })
      const request = new Request('https://example.com/test')
      const response = await wrapped(request, {})

      expect(response.status).toBe(503)
      const body = await response.json()
      expect(body).toEqual({ customError: 'Custom error' })
    })

    it('should include additional context from options', async () => {
      const rollbar = new Rollbar({ accessToken: 'test-token' })
      const handler = vi.fn().mockRejectedValue(new Error('Test error'))

      const wrapped = rollbar.wrap(handler, {
        context: {
          custom: { routeName: '/api/users' },
        },
      })
      const request = new Request('https://example.com/test')
      await wrapped(request, {})

      const payload = JSON.parse(mockFetch.mock.calls[0]?.[1]?.body as string)
      expect(payload.data.custom.routeName).toBe('/api/users')
    })

    it('should convert non-Error throws to Error', async () => {
      const rollbar = new Rollbar({ accessToken: 'test-token' })
      const handler = vi.fn().mockRejectedValue('String error')

      const wrapped = rollbar.wrap(handler)
      const request = new Request('https://example.com/test')
      await wrapped(request, {})

      const payload = JSON.parse(mockFetch.mock.calls[0]?.[1]?.body as string)
      expect(payload.data.body.trace.exception.class).toBe('Error')
      expect(payload.data.body.trace.exception.message).toBe('String error')
    })

    it('should include request method and headers in context', async () => {
      const rollbar = new Rollbar({ accessToken: 'test-token' })
      const handler = vi.fn().mockRejectedValue(new Error('Test'))

      const wrapped = rollbar.wrap(handler)
      const request = new Request('https://example.com/test', {
        method: 'POST',
        headers: { 'X-Request-ID': '12345' },
      })
      await wrapped(request, {})

      const payload = JSON.parse(mockFetch.mock.calls[0]?.[1]?.body as string)
      expect(payload.data.request.method).toBe('POST')
      expect(payload.data.request.headers['x-request-id']).toBe('12345')
    })
  })
})
