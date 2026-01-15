# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.x     | :white_check_mark: |
| 1.x     | :x:                |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please report it responsibly.

### How to Report

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, please email security concerns to: **security@triptech.co.nz**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fixes (optional)

### What to Expect

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 5 business days
- **Resolution Timeline**: Depends on severity, typically within 30 days

### Disclosure Policy

- We will work with you to understand and resolve the issue
- We will credit reporters in release notes (unless you prefer anonymity)
- We ask that you do not publicly disclose until we've had time to address the issue

## Security Best Practices

When using this package:

1. **Store tokens as secrets**: Use Cloudflare Workers secrets, not environment variables in code
2. **Use server-side tokens**: Never expose your Rollbar token client-side
3. **Review scrubbed fields**: Ensure sensitive data in your application is being scrubbed
4. **Keep updated**: Always use the latest version for security patches
