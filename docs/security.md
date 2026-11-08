# Security review and account controls

Reviewed November 7, 2026. This is an application security improvement, not a
penetration-test certification or a claim that every vulnerability has been found.

## Changes

- Updated compatible packages that npm reported as vulnerable, including production
  HTTP parsing/proxy dependencies. Removed unused CORS/JWT dependencies. Replaced
  nodemon with Node's built-in watch mode to remove its vulnerable development-only
  dependency chain. `npm run dev` and `npm start` remain the entry commands.
- New passwords require at least 8 Unicode code points and at most 72 UTF-8 bytes;
  bcrypt cost is 12. Existing passwords remain usable. Bcrypt historically ignored
  bytes beyond 72; an old oversized password should be changed to a compliant one.
  No old password is known, modified or silently truncated by new signup/change logic.
- Session tokens remain random, hashed in MongoDB, HttpOnly and SameSite=Strict;
  production cookies are Secure. Expiry is enforced during authentication, independently
  of database TTL cleanup. Session versions invalidate all prior sessions after password
  changes, resets, verified email changes and sign-out-everywhere, including a late login
  that began before the version changed. Legacy missing versions behave as version zero.
- Unsafe requests require a matching full Origin or same-origin Fetch Metadata. A
  non-browser client without those headers must send `X-Requested-With: MaplePath`.
  Cross-site/same-site browser writes are rejected. JSON-only bodies, disabled request
  decompression, bounded payloads, no-store API responses and generic errors reduce exposure.
- Login/signup throttling covers equivalent case/trailing-slash routes. API, recovery and
  account-change limits bound abuse. These limits use process memory and reset on restarts;
  use a shared store before scaling across multiple server processes. Task creation is capped
  at 100 existing tasks. This is not a distributed bot-defense system.
- Profile input has an allowlist and bounded scalar types. Existing route ownership checks
  are covered by real HTTP regression tests. No extra demographic data is collected.
- A new Account page provides change password, sign out everywhere and recovery-email setup.

## Email recovery

Existing users keep username/password sign-in. Email is optional. A signed-in user provides
their current password to add/change an email. The old verified address remains active until
the replacement is verified. Only verified addresses have a unique index and can receive
password-reset links. Startup waits for User indexes to initialize before accepting requests.

Verification/reset links use random 256-bit tokens; only SHA-256 hashes are stored. There is
one pending token of each kind per account, expiring after 30 minutes. New requests replace
old tokens; successful consumption is an atomic conditional database update. Verification
does not happen on GET, so link scanners cannot silently approve an address. Tokens are sent
in URL fragments, removed from the address bar by the page, and never logged by this code.
Passwords/reset tokens are not stored in localStorage. Reset never automatically signs in.

The only new saved account data is a verified email, session version, and bounded pending
email/token/expiry metadata. Pending metadata is overwritten or cleared on successful use;
expiry is enforced by queries (there is deliberately no TTL index that could delete a user).
Unknown and known reset-request addresses receive the same immediate generic response.
Mail delivery is best effort in the current single process; a restart may lose a pending send.
Users can request another link. No raw message history or mail queue is stored.

## Activate email on Render

No provider account was created, real email sent, Render setting changed, or secret committed.
The implementation uses the Resend HTTPS API and remains unavailable until configured.
There is no development backdoor or logged reset-link fallback in production.

1. Use a domain you own and verify a sending domain with Resend. A Render `onrender.com`
   address or a personal Gmail address is not a domain you own for this purpose. If no
   sending domain is available, choose a different delivery provider before activation.
2. Turn off open/click tracking for account emails in the provider settings.
3. In Render's environment settings, add:
   - `NODE_ENV=production`
   - `PUBLIC_APP_URL=https://maplepath-3b6a.onrender.com` (no path, query or fragment)
   - `ACCOUNT_EMAIL_FROM=MaplePath <account@YOUR-VERIFIED-DOMAIN>`
   - `RESEND_API_KEY` using a sending-only provider key, entered directly in Render.
4. Keep `MONGO_URI` and existing community-data mode settings unchanged. The Blueprint
   declares the first two values, but a manually created service still needs its environment
   checked. Redeploy after configuration and verify the email index exists successfully.
5. With a designated test account/inbox, add and verify an email, request a reset, use it
   once, confirm the old password and sessions fail, and confirm replay fails. Delivery and
   actual Atlas index/concurrency behavior still need this deployment check.

`.env` and `.env.*` stay ignored; never paste a provider key into chat or commit it.

## Validation and remaining launch work

Tests use the production Express app/middleware and Mongoose schemas with isolated database
and mail adapters. They exercise account isolation, CSRF, malformed/large/non-JSON requests,
rate limits, secure cookies, expiry/revocation, unverified addresses, atomic token reuse,
password changes and provider failures. No test connects to Atlas or sends real mail.
Browser checks cover Account/recovery navigation and responsive layouts. CI runs tests and
dependency audits on pushes, pull requests and weekly. The health-ping workflow is unchanged.
CI does not by itself block Render deployments; configure Render's after-CI deployment mode
or branch protection separately before wider release.

This pass does not implement account deletion/export, MFA, production backup/restore testing,
external security monitoring, or a privacy policy. Account deletion/export should be designed
with contribution removal and account-identity reuse in the next privacy/release phase.
Existing test records remain excluded from community statistics; no trusted data is imported.

## Files

Created: `app.js`, `routes/accountRoutes.js`, `services/accountEmail.js`,
`services/passwords.js`, `public/account.html`, `public/recover.html`,
`public/css/account.css`, `public/js/account.js`, `public/js/recover.js`,
`tests/helpers/security-app.js`, `tests/security.test.js`, `tests/account-email.test.js`,
`.github/workflows/security-checks.yml`, and this document.

Updated: `server.js`, `middleware/auth.js`, `controllers/authController.js`,
`models/User.js`, `models/Session.js`, `services/profileValidation.js`,
`routes/taskRoutes.js`, `public/auth.html`, `public/components/sidebar.html`,
`tests/public-pages.test.js`, `tests/responsive-layout.test.js`, `package.json`,
`package-lock.json`, `README.md`, `render.yaml`, and `.gitignore`.

## Primary references

- https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- https://github.com/kelektiv/node.bcrypt.js
- https://resend.com/docs/api-reference/emails/send-email
- https://resend.com/docs/dashboard/domains/introduction

## Launch follow-up

See [launch-readiness.md](launch-readiness.md) for Brevo setup without a custom domain, account deletion transactions, public support/privacy pages, and the outstanding backup verification.
