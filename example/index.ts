import Rollbar from "@triptech/cloudflare-worker-rollbar";

export interface Env {
  ROLLBAR_TOKEN: string;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const rollbar = new Rollbar(env.ROLLBAR_TOKEN, "production");
    try {
      // ... code ...

      // using waitUntil is a good idea to try and reduce latency
      // https://developers.cloudflare.com/workers/runtime-apis/handlers/fetch/#contextwaituntil
      ctx.waitUntil(rollbar.message("Test Message"));
    } catch (error) {
      ctx.waitUntil(rollbar.error(error as Error));

      // ... handle error gracefully ...
    }
  },
};
