# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-01-15

### Added

- Full TypeScript support with strict mode and comprehensive type definitions
- Multiple log levels: `debug()`, `info()`, `warning()`, `log()`, `error()`, `critical()`
- Request handler wrapper with `wrap()` method for automatic error catching
- Support for `waitUntil()` for non-blocking error reporting
- Person/user context binding with `withPerson()`
- Request context builder with `buildRequestContext()`
- Automatic sensitive data scrubbing (passwords, tokens, auth headers)
- Custom scrub fields configuration
- Stack trace parsing without external dependencies
- ESM and CommonJS dual exports
- Comprehensive test suite (41 tests)

### Changed

- **BREAKING**: Constructor now accepts a configuration object instead of positional arguments
- **BREAKING**: `message()` method renamed to `log()`, new level-specific methods added
- **BREAKING**: Minimum Node.js version is now 18.0.0
- Removed `error-stack-parser` dependency - now zero runtime dependencies
- Improved stack trace parsing for V8/Chrome and Firefox formats

### Removed

- **BREAKING**: Removed positional constructor arguments `(token, environment)`
- Removed `error-stack-parser` dependency

### Migration from v1.x

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

## [1.0.1] - 2024-01-15

### Fixed

- Minor bug fixes

## [1.0.0] - 2024-01-01

### Added

- Initial release
- Basic `error()` and `message()` methods
- Support for Cloudflare Workers runtime
