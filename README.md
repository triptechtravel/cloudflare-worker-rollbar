# @triptech/cloudflare-worker-rollbar

A lightweight, TypeScript-first Rollbar client designed specifically for Cloudflare Workers runtime environment.

[![npm version](https://badge.fury.io/js/%40triptech%2Fcloudflare-worker-rollbar.svg)](https://www.npmjs.com/package/@triptech/cloudflare-worker-rollbar)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Why This Package?

Rollbar's official JavaScript SDK is built for Node.js and browser environments, which don't translate well to Cloudflare Workers' isolated V8 runtime. This package provides:

- **Zero dependencies** - Pure fetch-based implementation
- **Full TypeScript support** - Comprehensive types for all APIs
- **Cloudflare Workers optimized** - Works with `waitUntil()` for non-blocking error reporting
- **Request handler wrapper** - Automatically catch and report errors from your handlers
- **Sensitive data scrubbing** - Built-in scrubbing for passwords, tokens, and headers

## Installation

```bash
npm install @triptech/cloudflare-worker-rollbar
```

## Quick Start

```typescript
import { Rollbar } from '@triptech/cloudflare-worker-rollbar'

export interface Env {
  ROLLBAR_TOKEN: string
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const rollbar = new Rollbar({
      accessToken: env.ROLLBAR_TOKEN,
      environment: 'production',
    })

    try {
      // Your application logic
      return new Response('Hello World!')
    } catch (error) {
      // Report error without blocking response
      ctx.waitUntil(rollbar.error(error as Error))
      return new Response('Internal Server Error', { status: 500 })
    }
  },
}
```

## Using the Handler Wrapper

The easiest way to add error reporting to all your routes:

```typescript
import { Rollbar } from '@triptech/cloudflare-worker-rollbar'

export interface Env {
  ROLLBAR_TOKEN: string
}

export default {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) => {
    const rollbar = new Rollbar({
      accessToken: env.ROLLBAR_TOKEN,
      environment: 'production',
      codeVersion: 'abc123', // Your deploy SHA or version
    })

    return rollbar.wrap(async (req, env, ctx) => {
      // Any errors thrown here are automatically reported to Rollbar
      const data = await processRequest(req)
      return Response.json(data)
    })(request, env, ctx)
  },
}
```

## Configuration

```typescript
const rollbar = new Rollbar({
  // Required
  accessToken: 'your-server-side-token',

  // Optional (defaults shown)
  environment: 'production',        // Environment name
  codeVersion: undefined,           // Your code version/SHA
  host: undefined,                  // Server/worker identifier
  scrubFields: [],                  // Additional fields to scrub
  includeRequestBody: false,        // Include request body in reports
  payload: {},                      // Custom data for all reports
  verbose: false,                   // Enable debug logging
})
```

## API Reference

### Log Levels

```typescript
// Messages (without stack traces)
await rollbar.debug('Debug message')
await rollbar.info('Info message')
await rollbar.warning('Warning message')
await rollbar.log('Error-level message')

// Exceptions (with stack traces)
await rollbar.error(new Error('Something went wrong'))
await rollbar.critical(new Error('Critical failure'))
```

### Adding Context

```typescript
await rollbar.error(error, {
  // User information
  person: {
    id: 'user-123',
    username: 'johndoe',
    email: 'john@example.com',
  },

  // Request context (automatically added by wrapper)
  request: {
    url: 'https://api.example.com/users',
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    params: { id: '123' },
    userIp: '1.2.3.4',
  },

  // Custom data
  custom: {
    orderId: 'order-456',
    feature: 'checkout',
  },

  // Error grouping
  fingerprint: 'custom-fingerprint',
  title: 'Custom error title',
})
```

### Handler Wrapper Options

```typescript
const wrapped = rollbar.wrap(handler, {
  // Rethrow error after reporting (default: false)
  rethrow: false,

  // Custom error response
  errorResponse: (error) =>
    new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    }),

  // Additional context for all errors from this handler
  context: {
    custom: { route: '/api/users' },
  },
})
```

### Building Request Context

If you're manually handling errors, you can build request context:

```typescript
const requestContext = rollbar.buildRequestContext(request)
await rollbar.error(error, { request: requestContext })
```

### User-Bound Instance

Create an instance with user information pre-bound:

```typescript
const userRollbar = rollbar.withPerson({
  id: 'user-123',
  username: 'johndoe',
})

// All errors from this instance include user info
await userRollbar.error(error)
```

## Sensitive Data Scrubbing

The following fields are scrubbed by default:

**Headers:**
- `authorization`
- `cookie`
- `set-cookie`
- `x-api-key`
- `x-auth-token`

**Payload fields:**
- `password`
- `secret`
- `token`
- `accessToken`
- `access_token`
- `apiKey`
- `api_key`
- `credential`

Add custom fields to scrub:

```typescript
const rollbar = new Rollbar({
  accessToken: 'token',
  scrubFields: ['creditCard', 'ssn', 'myCustomSecret'],
})
```

## TypeScript Support

Full TypeScript definitions are included:

```typescript
import type {
  RollbarConfig,
  ReportContext,
  RequestContext,
  Person,
  LogLevel,
  RollbarPayload,
  RollbarResponse,
  WrapperOptions,
} from '@triptech/cloudflare-worker-rollbar'
```

## Best Practices

### Use `waitUntil()` for Non-Blocking Reporting

```typescript
// Good - doesn't delay response
ctx.waitUntil(rollbar.error(error))

// Avoid in hot paths - blocks response
await rollbar.error(error)
```

### Store Token as Secret

```bash
npx wrangler secret put ROLLBAR_TOKEN
```

### Include Code Version

```typescript
const rollbar = new Rollbar({
  accessToken: env.ROLLBAR_TOKEN,
  codeVersion: env.GIT_SHA || 'development',
})
```

### Use Different Environments

```typescript
const rollbar = new Rollbar({
  accessToken: env.ROLLBAR_TOKEN,
  environment: env.ENVIRONMENT || 'development', // production, staging, etc.
})
```

## Migration from v1

If upgrading from v1.x:

```typescript
// v1.x
import Rollbar from '@triptech/cloudflare-worker-rollbar'
const rollbar = new Rollbar('token', 'production')
await rollbar.error(error, 'description')
await rollbar.message('message', { extra: 'data' })

// v2.x
import { Rollbar } from '@triptech/cloudflare-worker-rollbar'
const rollbar = new Rollbar({
  accessToken: 'token',
  environment: 'production',
})
await rollbar.error(error, { custom: { description: 'description' } })
await rollbar.info('message', { custom: { extra: 'data' } })
```

## License

MIT © [TripTech Travel](https://github.com/triptechtravel)

## Credits

Inspired by:
- [Rollbar JavaScript SDK](https://github.com/rollbar/rollbar.js)
- [Original cloudflare-worker-rollbar gist](https://gist.github.com/dukejones/d160a1b2051ff7c1a485bdcf966f1bcc)
