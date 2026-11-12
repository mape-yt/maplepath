# Signed-in workspace redesign — November 11, 2026

## What changed

- Dashboard: one journey overview with progress and a next-step action, followed by tasks and recent activity. Removed duplicated pathway/province/progress cards and the profile snapshot. Community comparisons remain accessible through a compact link; related pathways remain available in a disclosure.
- Navigation: Dashboard, Journey, Tasks, and Your account. Profile and security share account tabs. Secondary public links are grouped under Help & links. Sign-out is available from every signed-in page. The active navigation item handles dashboard section links and both account pages.
- Journey: stages expand individually using native details/summary controls, with the current stage open. The dashboard links to the relevant stage. Open steps remain open across timeline updates. Official guidance, sources, intake notices, date editing, application controls and comparisons remain available.
- Profile: existing fields grouped into About you, Your pathway and Key dates. Editing and validation use the existing endpoints.
- Security: existing account forms use the same workspace styling, with deletion separated at the bottom.
- Planning users see a useful Journey starting state when no pathway is selected.

The new workspace stylesheet is loaded only by dashboard, journey, profile and account. Public pages, login/signup, password recovery, onboarding, roadmap data, database models and backend APIs were not changed. Existing layout/account styles used by recovery were left intact. No database migration is required.

## Files

Created: `public/css/workspace.css`, this document.

Updated:
- `public/dashboard.html`, `public/journey.html`, `public/profile.html`, `public/account.html`
- `public/components/sidebar.html`
- `public/css/dashboard.css`, `public/css/sidebar.css`, `public/css/profile.css`
- `public/js/dashboard.js`, `public/js/journey.js`, `public/js/profile.js`, `public/js/layout.js`
- `tests/public-pages.test.js`, `tests/e2e/launch.test.js`

## Validation

- 70 regression tests passed.
- Seven Chromium launch checks passed, including planning, Express Entry, completed PNP, study permit and work permit flows.
- Authenticated page overflow checks at 320, 768, 900, 1024, 1280 and 1920 pixels; public checks remain at 320, 390, 768 and 1280 pixels.
- Task creation/completion/persistence/removal, profile save, account tabs, active navigation, keyboard stage expansion, next-step deep link, timeline date correction, email verification/reset, sidebar sign-out and account deletion checked with isolated test data.
- Desktop and phone screenshots reviewed. Screenshots are under ignored `.qa-output/`; no production user data or credentials are included.
- Git diff confirms public pages and shared recovery styles are unchanged.

This is Chromium viewport testing, not a claim of physical-device, Safari or screen-reader certification.
