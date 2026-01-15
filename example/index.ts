/**
 * Example Cloudflare Worker using @triptech/cloudflare-worker-rollbar
 *
 * This demonstrates the recommended patterns for error reporting
 * in a Cloudflare Workers environment.
 */

import { Rollbar } from '@triptech/cloudflare-worker-rollbar'

export interface Env {
  ROLLBAR_TOKEN: string
  ENVIRONMENT: string
  GIT_SHA?: string
}

/**
 * Example 1: Using the handler wrapper (recommended)
 *
 * The wrapper automatically catches errors, reports them to Rollbar,
 * and returns a 500 response.
 */
export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const rollbar = new Rollbar({
      accessToken: env.ROLLBAR_TOKEN,
      environment: env.ENVIRONMENT || 'production',
      codeVersion: env.GIT_SHA,
    })

    // Wrap the entire handler
    return rollbar.wrap(
      async (req) => {
        const url = new URL(req.url)

        // Route handling
        if (url.pathname === '/api/users') {
          return handleUsers(req, rollbar)
        }

        if (url.pathname === '/api/error') {
          // This error will be automatically caught and reported
          throw new Error('Intentional error for testing')
        }

        return new Response('Not Found', { status: 404 })
      },
      {
        // Optional: Custom error response
        errorResponse: (error) =>
          Response.json(
            { error: 'Something went wrong', message: error.message },
            { status: 500 }
          ),
      }
    )(request, env, ctx)
  },
}

/**
 * Example 2: Manual error handling with user context
 */
async function handleUsers(request: Request, rollbar: Rollbar): Promise<Response> {
  try {
    // Simulate getting user from auth
    const userId = request.headers.get('x-user-id')

    if (userId) {
      // Create a user-bound rollbar instance
      const userRollbar = rollbar.withPerson({
        id: userId,
        username: request.headers.get('x-username') || undefined,
      })

      // All errors from this instance include user info
      try {
        const users = await fetchUsers()
        return Response.json(users)
      } catch (error) {
        await userRollbar.error(error as Error, {
          custom: { action: 'fetchUsers' },
        })
        return Response.json({ error: 'Failed to fetch users' }, { status: 500 })
      }
    }

    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  } catch (error) {
    // Report error with request context
    await rollbar.error(error as Error, {
      request: rollbar.buildRequestContext(request),
    })
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}

/**
 * Example 3: Logging messages (not just errors)
 */
async function logAnalytics(rollbar: Rollbar, eventName: string, data: Record<string, unknown>): Promise<void> {
  await rollbar.info(`Analytics: ${eventName}`, {
    custom: data,
  })
}

/**
 * Example 4: Using waitUntil for non-blocking reporting
 */
async function handleWithWaitUntil(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const rollbar = new Rollbar({
    accessToken: env.ROLLBAR_TOKEN,
    environment: env.ENVIRONMENT,
  })

  try {
    const result = await processRequest(request)

    // Log success asynchronously (doesn't delay response)
    ctx.waitUntil(
      rollbar.info('Request processed', {
        request: rollbar.buildRequestContext(request),
        custom: { result: 'success' },
      })
    )

    return Response.json(result)
  } catch (error) {
    // Report error asynchronously (doesn't delay error response)
    ctx.waitUntil(
      rollbar.error(error as Error, {
        request: rollbar.buildRequestContext(request),
      })
    )

    return Response.json({ error: 'Failed' }, { status: 500 })
  }
}

// Placeholder functions for examples
async function fetchUsers(): Promise<{ id: string; name: string }[]> {
  return [{ id: '1', name: 'Alice' }]
}

async function processRequest(_request: Request): Promise<{ success: boolean }> {
  return { success: true }
}

// Export for wrangler type generation
export { handleWithWaitUntil, logAnalytics }
