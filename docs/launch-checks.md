# Launch checks — November 10, 2026

## Repeatable checks

```powershell
npm test
npx playwright install chromium
npm run test:launch
```

The browser suite starts an isolated local MongoDB replica set and the real Express application. Email delivery is captured locally; it never contacts Brevo or uses Atlas. Test accounts and databases are disposed of afterward. `.qa-output/` holds screenshots of synthetic profiles and is ignored by Git.

Coverage:

- Public home, about/developer, authentication, contact, privacy, and recovery at 320, 390, 768, and 1280 pixels.
- New signup and login using the eight-character minimum.
- Planning, Express Entry in progress, Manitoba PNP completed, study-permit, and work-permit onboarding with unknown dates.
- Dashboard, profile, Journey, and Account at 320, 768, and 1280 pixels. Checks for horizontal document overflow and unhandled JavaScript errors; screenshots for visual review.
- Journey start, completion, and correction of historical dates, verified against stored timeline duration.
- Email verification and password reset using captured local messages, including opening a reset link in an already-open recovery tab.
- Account deletion and removal of its user, timeline, application, and session records.
- A temporary session API 429 response preserves the current page and username hint, displays a retry control, and recovers after retry rather than incorrectly redirecting to login.

## Fixes from this pass

- Recovery now reinitializes when a new link fragment is opened in the same tab. It removes the token immediately and ignores stale availability/submission responses from earlier links.
- Session checks distinguish a genuine 401 from temporary throttling/server/network failure. Temporary failures show Retry without clearing the username hint or redirecting to authentication.
- Onboarding no longer describes account-linked community data as internally anonymous. It explains that comparisons show combined results.
- The privacy notice now describes the tested local backup and the actual count-based retention limit.

The browser suite isolates scenarios with a fresh app-level request limiter; it does not weaken production limits. Existing security tests verify that those limits and authentication protections remain active.

## Limits

Headless Chromium with emulated viewport widths is not a physical-device certification. Safari/iOS, Android-specific keyboards, screen readers, email-client behavior, and every individual immigration stream still warrant a small user beta. Roadmap/data tests check all registered streams, while browser onboarding exercises representative routes. Live verification and recovery emails were confirmed by the owner before this pass; this suite tests the recovery logic without sending new real messages.

The interactive computer-use helper was unavailable in this session. Browser automation and screenshots were produced using the isolated Playwright test browser instead.

Donation integration, dashboard redesign, and trusted-data imports were not part of these checks.

## Validation results

The regression suite passed all 70 tests. The Chromium launch suite passed all seven tests (the parent and six scenarios). The encrypted backup restore matched 11 documents across three collections and their indexes; the disposable restore was removed. The owner chose local-only backups for now.

Mongoose was updated within major version 9 to 9.12.1 following the [maintainer security advisory](https://github.com/Automattic/mongoose/security/advisories/GHSA-8332-j7wj-wjw4). The complete dependency audit reports zero known vulnerabilities after the update. This does not replace ongoing dependency monitoring.
