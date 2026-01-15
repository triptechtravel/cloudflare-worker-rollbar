# Contributing to @triptech/cloudflare-worker-rollbar

Thank you for your interest in contributing! This document provides guidelines and information for contributors.

## How to Contribute

### Reporting Bugs

Before creating a bug report, please check existing issues to avoid duplicates. When creating a bug report, include:

- A clear, descriptive title
- Steps to reproduce the issue
- Expected vs actual behavior
- Your environment (Node.js version, Cloudflare Workers runtime, etc.)
- Any relevant code snippets or error messages

### Suggesting Features

Feature requests are welcome! Please include:

- A clear description of the feature
- The problem it solves or use case it enables
- Any implementation ideas you have

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Install dependencies**: `npm install`
3. **Make your changes** following the code style guidelines below
4. **Add tests** for any new functionality
5. **Run the test suite**: `npm test`
6. **Run type checking**: `npm run typecheck`
7. **Update documentation** if needed
8. **Submit your pull request**

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/cloudflare-worker-rollbar.git
cd cloudflare-worker-rollbar

# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Type check
npm run typecheck

# Build
npm run build
```

## Code Style Guidelines

- **TypeScript**: All code must be written in TypeScript with strict mode enabled
- **No `any`**: Avoid using `any` type; use `unknown` and type guards instead
- **Formatting**: Code is formatted with default TypeScript/ESLint rules
- **Naming**: Use camelCase for variables/functions, PascalCase for classes/types
- **Comments**: Add JSDoc comments for public APIs
- **Tests**: All new features must include tests

## Testing

We use [Vitest](https://vitest.dev/) for testing. Tests should:

- Cover both success and error cases
- Mock external dependencies (like `fetch`)
- Be independent and not rely on test order
- Have descriptive names that explain the expected behavior

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `test:` Adding or updating tests
- `refactor:` Code changes that neither fix bugs nor add features
- `chore:` Maintenance tasks

Examples:

```
feat: add support for custom scrub fields
fix: handle errors without stack traces
docs: update README with new API examples
test: add tests for request context builder
```

## Release Process

Releases are managed by maintainers. The process:

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create a git tag
4. Publish to npm

## Questions?

Feel free to open an issue for any questions about contributing.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
