import { parseStackFrames } from './stack-parser'
import type {
  LogLevel,
  Person,
  RollbarConfig,
  RollbarPayload,
  RollbarResponse,
  ReportContext,
  RequestContext,
  RequestHandler,
  WorkerContext,
  WrapperOptions,
} from './types'

const ROLLBAR_API_URL = 'https://api.rollbar.com/api/1/item/'
const NOTIFIER_NAME = '@triptech/cloudflare-worker-rollbar'
const NOTIFIER_VERSION = '2.0.1'

/** Headers that should always be scrubbed from request context */
const DEFAULT_SCRUB_HEADERS = [
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-auth-token',
]

/** Default fields to scrub from payloads */
const DEFAULT_SCRUB_FIELDS = [
  'password',
  'secret',
  'token',
  'accessToken',
  'access_token',
  'apiKey',
  'api_key',
  'credential',
]

/**
 * Scrub sensitive values from an object
 * Uses a WeakSet to track visited objects and prevent infinite recursion
 * from circular references (common in DOM elements, React state, etc.)
 */
function scrubObject<T extends Record<string, unknown>>(
  obj: T,
  scrubFields: string[],
  visited: WeakSet<object> = new WeakSet()
): T {
  // Check for circular reference
  if (visited.has(obj)) {
    return '[Circular Reference]' as unknown as T
  }
  visited.add(obj)

  const result: Record<string, unknown> = { ...obj }
  const lowerFields = scrubFields.map((f) => f.toLowerCase())

  for (const key of Object.keys(result)) {
    if (lowerFields.includes(key.toLowerCase())) {
      result[key] = '[SCRUBBED]'
    } else if (typeof result[key] === 'object' && result[key] !== null) {
      // Check for circular reference before recursing
      if (visited.has(result[key] as object)) {
        result[key] = '[Circular Reference]'
      } else {
        result[key] = scrubObject(
          result[key] as Record<string, unknown>,
          scrubFields,
          visited
        )
      }
    }
  }

  return result as T
}

/**
 * Scrub headers, always removing sensitive authentication headers
 */
function scrubHeaders(
  headers: Record<string, string>,
  additionalScrubFields: string[] = []
): Record<string, string> {
  const scrubFields = [...DEFAULT_SCRUB_HEADERS, ...additionalScrubFields]
  const result: Record<string, string> = {}

  for (const [key, value] of Object.entries(headers)) {
    if (scrubFields.some((f) => key.toLowerCase().includes(f.toLowerCase()))) {
      result[key] = '[SCRUBBED]'
    } else {
      result[key] = value
    }
  }

  return result
}

/**
 * Rollbar client for Cloudflare Workers
 *
 * A lightweight, TypeScript-first Rollbar client designed specifically
 * for Cloudflare Workers runtime environment.
 *
 * @example
 * ```ts
 * const rollbar = new Rollbar({
 *   accessToken: env.ROLLBAR_TOKEN,
 *   environment: 'production',
 *   codeVersion: '1.0.0'
 * })
 *
 * // Report an error
 * await rollbar.error(new Error('Something went wrong'), { request })
 *
 * // Use with waitUntil for non-blocking
 * ctx.waitUntil(rollbar.error(error))
 * ```
 */
export class Rollbar {
  private readonly config: Required<
    Pick<RollbarConfig, 'accessToken' | 'environment'>
  > &
    Omit<RollbarConfig, 'accessToken' | 'environment'>

  private readonly scrubFields: string[]

  constructor(config: RollbarConfig) {
    if (!config.accessToken) {
      throw new Error('Rollbar accessToken is required')
    }

    this.config = {
      ...config,
      environment: config.environment ?? 'production',
    }

    this.scrubFields = [
      ...DEFAULT_SCRUB_FIELDS,
      ...(config.scrubFields ?? []),
    ]
  }

  /**
   * Log a debug-level message
   */
  async debug(message: string, context?: ReportContext): Promise<RollbarResponse | null> {
    return this.logMessage('debug', message, context)
  }

  /**
   * Log an info-level message
   */
  async info(message: string, context?: ReportContext): Promise<RollbarResponse | null> {
    return this.logMessage('info', message, context)
  }

  /**
   * Log a warning-level message
   */
  async warning(message: string, context?: ReportContext): Promise<RollbarResponse | null> {
    return this.logMessage('warning', message, context)
  }

  /**
   * Log an error-level message (without exception)
   */
  async log(message: string, context?: ReportContext): Promise<RollbarResponse | null> {
    return this.logMessage('error', message, context)
  }

  /**
   * Report an error/exception
   */
  async error(error: Error, context?: ReportContext): Promise<RollbarResponse | null> {
    return this.reportError('error', error, context)
  }

  /**
   * Report a critical error/exception
   */
  async critical(error: Error, context?: ReportContext): Promise<RollbarResponse | null> {
    return this.reportError('critical', error, context)
  }

  /**
   * Build request context from a Cloudflare Worker Request object
   */
  buildRequestContext(request: Request): RequestContext {
    const url = new URL(request.url)
    const headers: Record<string, string> = {}

    request.headers.forEach((value, key) => {
      headers[key] = value
    })

    return {
      url: request.url,
      method: request.method,
      headers: scrubHeaders(headers, this.scrubFields),
      params: Object.fromEntries(url.searchParams),
      userIp: request.headers.get('cf-connecting-ip') ?? undefined,
    }
  }

  /**
   * Create a wrapped request handler that automatically reports errors
   *
   * @example
   * ```ts
   * const rollbar = new Rollbar({ accessToken: env.ROLLBAR_TOKEN })
   *
   * export default {
   *   fetch: rollbar.wrap(async (request, env, ctx) => {
   *     // Your handler code here
   *     return new Response('OK')
   *   })
   * }
   * ```
   */
  wrap<TEnv = unknown>(
    handler: RequestHandler<TEnv>,
    options: WrapperOptions = {}
  ): RequestHandler<TEnv> {
    return async (
      request: Request,
      env: TEnv,
      ctx?: WorkerContext
    ): Promise<Response> => {
      try {
        return await handler(request, env, ctx)
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))

        const reportContext: ReportContext = {
          ...options.context,
          request: this.buildRequestContext(request),
        }

        // Use waitUntil if available for non-blocking error reporting
        const reportPromise = this.error(error, reportContext)
        if (ctx?.waitUntil) {
          ctx.waitUntil(reportPromise)
        } else {
          await reportPromise
        }

        if (options.rethrow) {
          throw error
        }

        if (options.errorResponse) {
          return options.errorResponse(error)
        }

        return new Response(
          JSON.stringify({ error: 'Internal Server Error' }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }
    }
  }

  /**
   * Create a context-bound instance with person information
   */
  withPerson(person: Person): Rollbar {
    const newConfig = {
      ...this.config,
      payload: {
        ...this.config.payload,
        person,
      },
    }
    return new Rollbar(newConfig)
  }

  /**
   * Report an error to Rollbar
   */
  private async reportError(
    level: LogLevel,
    error: Error,
    context?: ReportContext
  ): Promise<RollbarResponse | null> {
    const frames = parseStackFrames(error)

    const payload = this.buildPayload(level, context)
    payload.data.body = {
      trace: {
        frames,
        exception: {
          class: error.name,
          message: error.message,
        },
      },
    }

    return this.send(payload)
  }

  /**
   * Log a message to Rollbar
   */
  private async logMessage(
    level: LogLevel,
    message: string,
    context?: ReportContext
  ): Promise<RollbarResponse | null> {
    const payload = this.buildPayload(level, context)
    // Scrub custom data to handle circular references and sensitive fields
    const scrubbedCustom = context?.custom
      ? scrubObject(context.custom, this.scrubFields)
      : {}
    payload.data.body = {
      message: {
        body: message,
        ...scrubbedCustom,
      },
    }

    return this.send(payload)
  }

  /**
   * Build the base Rollbar payload
   */
  private buildPayload(level: LogLevel, context?: ReportContext): RollbarPayload {
    const payload: RollbarPayload = {
      access_token: this.config.accessToken,
      data: {
        environment: this.config.environment,
        body: {},
        level,
        timestamp: Math.floor(Date.now() / 1000),
        platform: 'cloudflare-workers',
        language: 'javascript',
        notifier: {
          name: NOTIFIER_NAME,
          version: NOTIFIER_VERSION,
        },
      },
    }

    // Add code version if configured
    if (this.config.codeVersion) {
      payload.data.code_version = this.config.codeVersion
    }

    // Add server info if host is configured
    if (this.config.host) {
      payload.data.server = {
        host: this.config.host,
      }
    }

    // Add custom payload data from config
    if (this.config.payload) {
      payload.data.custom = {
        ...payload.data.custom,
        ...scrubObject(this.config.payload as Record<string, unknown>, this.scrubFields),
      }
    }

    // Add context
    if (context) {
      if (context.person) {
        payload.data.person = context.person
      }

      if (context.request) {
        payload.data.request = {
          url: context.request.url,
          method: context.request.method,
          headers: context.request.headers,
          params: context.request.params,
          user_ip: context.request.userIp,
        }

        // Only include body if explicitly enabled
        if (this.config.includeRequestBody && context.request.body) {
          payload.data.request.body = scrubObject(
            context.request.body as Record<string, unknown>,
            this.scrubFields
          )
        }
      }

      if (context.custom) {
        payload.data.custom = {
          ...payload.data.custom,
          ...scrubObject(context.custom, this.scrubFields),
        }
      }

      if (context.fingerprint) {
        payload.data.fingerprint = context.fingerprint
      }

      if (context.title) {
        payload.data.title = context.title
      }

      if (context.uuid) {
        payload.data.uuid = context.uuid
      }
    }

    return payload
  }

  /**
   * Send payload to Rollbar API
   */
  private async send(payload: RollbarPayload): Promise<RollbarResponse | null> {
    if (this.config.verbose) {
      console.log('[Rollbar] Sending payload:', JSON.stringify(payload, null, 2))
    }

    try {
      const response = await fetch(ROLLBAR_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = (await response.json()) as RollbarResponse

      if (this.config.verbose) {
        console.log('[Rollbar] Response:', result)
      }

      if (result.err !== 0) {
        console.error('[Rollbar] Error response:', result.message)
      }

      return result
    } catch (err) {
      console.error('[Rollbar] Failed to send:', err)
      return null
    }
  }
}

export default Rollbar
