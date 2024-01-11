# Cloudflare Worker Rollbar

Allow Cloudflare Workers to log to Rollbar

Example usage: see `example/index.ts`

## Methods

### Constructor

```
import Rollbar from "@triptech/cloudflare-worker-rollbar";

const rollbar = new Rollbar("token", "production");
```

### Error

```
try {...} catch(e) {
  rollbar.error(
    e, 
    'description' // optional
  );
}
```

### Message

```
rollbar.message(
  "message",
  {} // optional extra attributes
)
```

## Credits

https://github.com/rollbar/rollbar.js/blob/master/src/errorParser.js

https://gist.githubusercontent.com/dukejones/d160a1b2051ff7c1a485bdcf966f1bcc/raw/14ea6dbb7695eea7c9e5e7c5a6e65794fc3d2d9b/cloudflare-worker-rollbar.ts