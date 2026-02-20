# Security Hardening Plan (ServicePro)

This document defines the Office MVP session-security plan and quick wins.

## Scope
- Web app session handling
- Route-level security headers
- XSS risk reduction guardrails
- Migration path from `localStorage` token usage to `httpOnly` cookies

## Current Session Posture
- Session token is currently stored in `localStorage` and also read from cookie/header paths.
- Middleware validates token by calling `/api/auth/me`.
- RBAC checks are enforced in middleware and API handlers.

Risk note:
- `localStorage` tokens are reachable by injected JavaScript and increase XSS blast radius.

## Quick Wins (Implemented)
- Baseline security headers added in `middleware.ts`:
  - `Content-Security-Policy`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- Baseline CSP (minimum recommendation):
  - `default-src 'self'`
  - `script-src 'self' 'unsafe-inline'` (and `unsafe-eval` only outside production)
  - `style-src 'self' 'unsafe-inline'`
  - `img-src 'self' data: blob: https:`
  - `font-src 'self' data:`
  - `connect-src 'self' https: wss:`
  - `object-src 'none'`
  - `base-uri 'self'`
  - `frame-ancestors 'none'`

## XSS Reduction Guardrails
- Do not use `dangerouslySetInnerHTML` unless there is a reviewed sanitizer path.
- Keep user-originated content rendered via React escaped output.
- If rich HTML rendering becomes necessary, enforce sanitizer usage at a single shared utility boundary.

## Session Migration Plan (httpOnly Cookie)

### Phase 1 - Dual Mode
- Continue accepting bearer tokens for API compatibility.
- Add login response mode that sets secure `httpOnly` session cookie:
  - `Secure`
  - `HttpOnly`
  - `SameSite=Lax` (or `Strict` if flow allows)
  - explicit `Max-Age`
- Keep middleware preference order: `cookie -> header`.

### Phase 2 - Web Cutover
- Remove `localStorage` token reads in browser pages/components.
- Migrate frontend fetch calls to cookie-authenticated same-origin requests.
- Keep bearer path only for non-browser integrations.

### Phase 3 - Tightening
- Disable bearer token auth for browser-facing routes.
- Revisit CSP to remove `unsafe-inline` where feasible.
- Add CSRF validation for state-changing cookie-authenticated endpoints.

## Operational Checks
- Verify `/health` and key UI flows after header/CSP updates.
- Run smoke and auth-related Playwright tests on each security change.
- Keep this file updated with each hardening step.
