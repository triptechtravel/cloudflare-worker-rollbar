/**
 * @triptech/cloudflare-worker-rollbar
 *
 * A lightweight, TypeScript-first Rollbar client designed specifically
 * for Cloudflare Workers runtime environment.
 *
 * @packageDocumentation
 */

// Main client
export { Rollbar, Rollbar as default } from './client'

// Types
export type {
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
  StackFrame,
  RollbarTrace,
  RollbarMessage,
  RollbarBody,
} from './types'

// Utilities
export { parseStackFrames, createStackFrame, getErrorLocation } from './stack-parser'

/**
 * Create a new Rollbar client instance
 *
 * @example
 * ```ts
 * import { createRollbar } from '@triptech/cloudflare-worker-rollbar'
 *
 * const rollbar = createRollbar({
 *   accessToken: env.ROLLBAR_TOKEN,
 *   environment: 'production'
 * })
 * ```
 */
export { Rollbar as createRollbar } from './client'
