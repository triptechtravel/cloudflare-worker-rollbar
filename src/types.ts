/**
 * Rollbar log levels matching the Rollbar API
 */
export type LogLevel = 'debug' | 'info' | 'warning' | 'error' | 'critical'

/**
 * Configuration options for initializing the Rollbar client
 */
export interface RollbarConfig {
  /** Rollbar server-side access token (POST_SERVER_ITEM_ACCESS_TOKEN) */
  accessToken: string

  /** Environment name (e.g., 'production', 'staging', 'development') */
  environment?: string

  /** Version string for your code (e.g., git SHA or semver) */
  codeVersion?: string

  /** Server host identifier */
  host?: string

  /** Fields to scrub from payloads before sending (e.g., 'password', 'secret') */
  scrubFields?: string[]

  /** Whether to include request bodies in error reports (default: false for security) */
  includeRequestBody?: boolean

  /** Custom payload data to include with every report */
  payload?: Record<string, unknown>

  /** Enable verbose console logging for debugging (default: false) */
  verbose?: boolean
}

/**
 * Person/user information to associate with error reports
 */
export interface Person {
  /** Unique user identifier */
  id: string

  /** User's username (optional) */
  username?: string

  /** User's email address (optional) */
  email?: string
}

/**
 * HTTP request context for error reports
 */
export interface RequestContext {
  /** Full request URL */
  url: string

  /** HTTP method (GET, POST, etc.) */
  method: string

  /** Request headers (sensitive headers will be scrubbed) */
  headers?: Record<string, string>

  /** Query string parameters */
  params?: Record<string, string>

  /** Request body (only included if includeRequestBody is true) */
  body?: unknown

  /** User/client IP address */
  userIp?: string
}

/**
 * Additional context to include with an error or message report
 */
export interface ReportContext {
  /** Person/user information */
  person?: Person

  /** HTTP request context */
  request?: RequestContext

  /** Custom key-value data */
  custom?: Record<string, unknown>

  /** Fingerprint for grouping similar errors */
  fingerprint?: string

  /** Title override for this occurrence */
  title?: string

  /** UUID for this specific occurrence */
  uuid?: string
}

/**
 * Stack frame structure for Rollbar trace
 */
export interface StackFrame {
  /** Source filename */
  filename?: string

  /** Line number */
  lineno?: number

  /** Column number */
  colno?: number

  /** Function/method name */
  method?: string

  /** Code context (lines around the error) */
  code?: string

  /** Function arguments */
  args?: string[]
}

/**
 * Rollbar API trace structure for exceptions
 */
export interface RollbarTrace {
  frames: StackFrame[]
  exception: {
    class: string
    message: string
    description?: string
  }
}

/**
 * Rollbar API message structure
 */
export interface RollbarMessage {
  body: string
  [key: string]: unknown
}

/**
 * Rollbar API payload body - either a trace or message
 */
export interface RollbarBody {
  trace?: RollbarTrace
  message?: RollbarMessage
}

/**
 * Full Rollbar API payload structure
 */
export interface RollbarPayload {
  access_token: string
  data: {
    environment: string
    body: RollbarBody
    level?: LogLevel
    timestamp?: number
    code_version?: string
    platform?: string
    language?: string
    framework?: string
    context?: string
    request?: {
      url?: string
      method?: string
      headers?: Record<string, string>
      params?: Record<string, string>
      body?: unknown
      user_ip?: string
    }
    person?: Person
    server?: {
      host?: string
      root?: string
      branch?: string
    }
    client?: {
      javascript?: {
        browser?: string
        code_version?: string
      }
    }
    custom?: Record<string, unknown>
    fingerprint?: string
    title?: string
    uuid?: string
    notifier?: {
      name: string
      version: string
    }
  }
}

/**
 * Response from Rollbar API
 */
export interface RollbarResponse {
  err: number
  result?: {
    uuid: string
  }
  message?: string
}

/**
 * Cloudflare Worker execution context (subset of ExecutionContext)
 */
export interface WorkerContext {
  waitUntil(promise: Promise<unknown>): void
  passThroughOnException?(): void
}

/**
 * Generic request handler type for Cloudflare Workers
 */
export type RequestHandler<TEnv = unknown> = (
  request: Request,
  env: TEnv,
  ctx?: WorkerContext
) => Promise<Response> | Response

/**
 * Options for the request handler wrapper
 */
export interface WrapperOptions {
  /** Whether to rethrow the error after reporting (default: false) */
  rethrow?: boolean

  /** Custom error response generator */
  errorResponse?: (error: Error) => Response

  /** Additional context to include with errors from this handler */
  context?: Partial<ReportContext>
}
