import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Rollbar } from '../src/client'
import type { RollbarPayload, RollbarResponse } from '../src/types'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('Rollbar Client', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockFetch.mockResolvedValue({
      json: async () => ({ err: 0, result: { uuid: 'test-uuid' } }),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('constructor', () => {
    it('should throw if accessToken is missing', () => {
      expect(() => new Rollbar({ accessToken: '' })).toThrow(
        'Rollbar accessToken is required'
      )
    })

    it('should default environment to production', () => {
      const rollbar = new Rollbar({ accessToken: 'test-token' })
      expect(rollbar).toBeDefined()
    })

    it('should accept custom environment', () => {
      const rollbar = new Rollbar({
        accessToken: 'test-token',
        environment: 'staging',
      })
      expect(rollbar).toBeDefined()
    })

    it('should accept all configuration options', () => {
      const rollbar = new Rollbar({
        accessToken: 'test-token',
        environment: 'production',
        codeVersion: '1.0.0',
        host: 'my-worker',
        scrubFields: ['customSecret'],
        includeRequestBody: true,
        payload: { customField: 'value' },
        verbose: false,
      })
      expect(rollbar).toBeDefined()
    })
  })

  describe('error reporting', () => {
    it('should send error to Rollbar API', async () => {
      const rollbar = new Rollbar({ accessToken: 'test-token' })
      const error = new Error('Test error')

      await rollbar.error(error)

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.rollbar.com/api/1/item/',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      )

      const payload = JSON.parse(
        mockFetch.mock.calls[0]?.[1]?.body as string
      ) as RollbarPayload
      expect(payload.access_token).toBe('test-token')
      expect(payload.data.environment).toBe('production')
      expect(payload.data.level).toBe('error')
      expect(payload.data.body.trace).toBeDefined()
      expect(payload.data.body.trace?.exception.class).toBe('Error')
      expect(payload.data.body.trace?.exception.message).toBe('Test error')
    })

    it('should send critical errors with critical level', async () => {
      const rollbar = new Rollbar({ accessToken: 'test-token' })
      const error = new Error('Critical error')

      await rollbar.critical(error)

      const payload = JSON.parse(
        mockFetch.mock.calls[0]?.[1]?.body as string
      ) as RollbarPayload
      expect(payload.data.level).toBe('critical')
    })

    it('should include custom context', async () => {
      const rollbar = new Rollbar({ accessToken: 'test-token' })
      const error = new Error('Test error')

      await rollbar.error(error, {
        custom: { userId: '123', action: 'test' },
        fingerprint: 'custom-fingerprint',
        title: 'Custom Title',
      })

      const payload = JSON.parse(
        mockFetch.mock.calls[0]?.[1]?.body as string
      ) as RollbarPayload
      expect(payload.data.custom?.['userId']).toBe('123')
      expect(payload.data.custom?.['action']).toBe('test')
      expect(payload.data.fingerprint).toBe('custom-fingerprint')
      expect(payload.data.title).toBe('Custom Title')
    })

    it('should include person context', async () => {
      const rollbar = new Rollbar({ accessToken: 'test-token' })
      const error = new Error('Test error')

      await rollbar.error(error, {
        person: { id: 'user-123', username: 'testuser', email: 'test@example.com' },
      })

      const payload = JSON.parse(
        mockFetch.mock.calls[0]?.[1]?.body as string
      ) as RollbarPayload
      expect(payload.data.person?.id).toBe('user-123')
      expect(payload.data.person?.username).toBe('testuser')
      expect(payload.data.person?.email).toBe('test@example.com')
    })

    it('should include code version when configured', async () => {
      const rollbar = new Rollbar({
        accessToken: 'test-token',
        codeVersion: 'abc123',
      })
      const error = new Error('Test error')

      await rollbar.error(error)

      const payload = JSON.parse(
        mockFetch.mock.calls[0]?.[1]?.body as string
      ) as RollbarPayload
      expect(payload.data.code_version).toBe('abc123')
    })

    it('should include host when configured', async () => {
      const rollbar = new Rollbar({
        accessToken: 'test-token',
        host: 'my-worker-host',
      })
      const error = new Error('Test error')

      await rollbar.error(error)

      const payload = JSON.parse(
        mockFetch.mock.calls[0]?.[1]?.body as string
      ) as RollbarPayload
      expect(payload.data.server?.host).toBe('my-worker-host')
    })
  })

  describe('message logging', () => {
    it('should send debug messages', async () => {
      const rollbar = new Rollbar({ accessToken: 'test-token' })

      await rollbar.debug('Debug message')

      const payload = JSON.parse(
        mockFetch.mock.calls[0]?.[1]?.body as string
      ) as RollbarPayload
      expect(payload.data.level).toBe('debug')
      expect(payload.data.body.message?.body).toBe('Debug message')
    })

    it('should send info messages', async () => {
      const rollbar = new Rollbar({ accessToken: 'test-token' })

      await rollbar.info('Info message')

      const payload = JSON.parse(
        mockFetch.mock.calls[0]?.[1]?.body as string
      ) as RollbarPayload
      expect(payload.data.level).toBe('info')
      expect(payload.data.body.message?.body).toBe('Info message')
    })

    it('should send warning messages', async () => {
      const rollbar = new Rollbar({ accessToken: 'test-token' })

      await rollbar.warning('Warning message')

      const payload = JSON.parse(
        mockFetch.mock.calls[0]?.[1]?.body as string
      ) as RollbarPayload
      expect(payload.data.level).toBe('warning')
      expect(payload.data.body.message?.body).toBe('Warning message')
    })

    it('should send log messages at error level', async () => {
      const rollbar = new Rollbar({ accessToken: 'test-token' })

      await rollbar.log('Log message')

      const payload = JSON.parse(
        mockFetch.mock.calls[0]?.[1]?.body as string
      ) as RollbarPayload
      expect(payload.data.level).toBe('error')
      expect(payload.data.body.message?.body).toBe('Log message')
    })
  })

  describe('scrubbing', () => {
    it('should scrub default sensitive fields', async () => {
      const rollbar = new Rollbar({ accessToken: 'test-token' })

      await rollbar.info('Test', {
        custom: {
          password: 'secret123',
          username: 'testuser',
          apiKey: 'key123',
        },
      })

      const payload = JSON.parse(
        mockFetch.mock.calls[0]?.[1]?.body as string
      ) as RollbarPayload
      expect(payload.data.custom?.['password']).toBe('[SCRUBBED]')
      expect(payload.data.custom?.['username']).toBe('testuser')
      expect(payload.data.custom?.['apiKey']).toBe('[SCRUBBED]')
    })

    it('should scrub custom fields', async () => {
      const rollbar = new Rollbar({
        accessToken: 'test-token',
        scrubFields: ['customSecret'],
      })

      await rollbar.info('Test', {
        custom: {
          customSecret: 'secret',
          normalField: 'value',
        },
      })

      const payload = JSON.parse(
        mockFetch.mock.calls[0]?.[1]?.body as string
      ) as RollbarPayload
      expect(payload.data.custom?.['customSecret']).toBe('[SCRUBBED]')
      expect(payload.data.custom?.['normalField']).toBe('value')
    })

    it('should handle circular references without stack overflow', async () => {
      const rollbar = new Rollbar({ accessToken: 'test-token' })

      // Create an object with a circular reference
      const circularObj: Record<string, unknown> = {
        name: 'test',
        value: 123,
      }
      circularObj.self = circularObj // Circular reference

      await rollbar.info('Test', {
        custom: circularObj,
      })

      // Should not throw and should complete successfully
      expect(mockFetch).toHaveBeenCalledTimes(1)

      const payload = JSON.parse(
        mockFetch.mock.calls[0]?.[1]?.body as string
      ) as RollbarPayload
      expect(payload.data.custom?.['name']).toBe('test')
      expect(payload.data.custom?.['self']).toBe('[Circular Reference]')
    })

    it('should handle deeply nested circular references', async () => {
      const rollbar = new Rollbar({ accessToken: 'test-token' })

      // Create a more complex circular structure
      const parent: Record<string, unknown> = { name: 'parent' }
      const child: Record<string, unknown> = { name: 'child', parent }
      parent.child = child

      await rollbar.info('Test', {
        custom: parent,
      })

      expect(mockFetch).toHaveBeenCalledTimes(1)

      const payload = JSON.parse(
        mockFetch.mock.calls[0]?.[1]?.body as string
      ) as RollbarPayload
      expect(payload.data.custom?.['name']).toBe('parent')
      // The child's parent reference should be detected as circular
      const childData = payload.data.custom?.['child'] as Record<string, unknown>
      expect(childData?.['parent']).toBe('[Circular Reference]')
    })
  })

  describe('request context', () => {
    it('should build request context from Request object', () => {
      const rollbar = new Rollbar({ accessToken: 'test-token' })
      const request = new Request('https://example.com/api/test?foo=bar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token123',
          'X-Custom-Header': 'value',
        },
      })

      const context = rollbar.buildRequestContext(request)

      expect(context.url).toBe('https://example.com/api/test?foo=bar')
      expect(context.method).toBe('POST')
      expect(context.params?.['foo']).toBe('bar')
      expect(context.headers?.['content-type']).toBe('application/json')
      expect(context.headers?.['authorization']).toBe('[SCRUBBED]')
      expect(context.headers?.['x-custom-header']).toBe('value')
    })
  })

  describe('withPerson', () => {
    it('should create a new instance with person bound', async () => {
      const rollbar = new Rollbar({ accessToken: 'test-token' })
      const userRollbar = rollbar.withPerson({
        id: 'user-456',
        username: 'johndoe',
      })

      await userRollbar.info('User action')

      const payload = JSON.parse(
        mockFetch.mock.calls[0]?.[1]?.body as string
      ) as RollbarPayload
      // Person should be in payload data (via custom)
      expect(payload.data.custom?.['person']).toBeDefined()
    })
  })

  describe('error handling', () => {
    it('should handle fetch errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const rollbar = new Rollbar({ accessToken: 'test-token' })
      const result = await rollbar.error(new Error('Test'))

      expect(result).toBeNull()
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('should log Rollbar API errors', async () => {
      mockFetch.mockResolvedValue({
        json: async () => ({ err: 1, message: 'Invalid token' } as RollbarResponse),
      })
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const rollbar = new Rollbar({ accessToken: 'bad-token' })
      await rollbar.error(new Error('Test'))

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Rollbar] Error response:',
        'Invalid token'
      )

      consoleSpy.mockRestore()
    })
  })

  describe('verbose mode', () => {
    it('should log payloads when verbose is enabled', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const rollbar = new Rollbar({
        accessToken: 'test-token',
        verbose: true,
      })
      await rollbar.info('Test message')

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Rollbar] Sending payload:',
        expect.any(String)
      )

      consoleSpy.mockRestore()
    })
  })

  describe('notifier metadata', () => {
    it('should include notifier info in payload', async () => {
      const rollbar = new Rollbar({ accessToken: 'test-token' })

      await rollbar.info('Test')

      const payload = JSON.parse(
        mockFetch.mock.calls[0]?.[1]?.body as string
      ) as RollbarPayload
      expect(payload.data.notifier?.name).toBe('@triptech/cloudflare-worker-rollbar')
      expect(payload.data.notifier?.version).toBe('2.0.1')
      expect(payload.data.platform).toBe('cloudflare-workers')
      expect(payload.data.language).toBe('javascript')
    })
  })
})
