# Application identities and minimal details

Implemented October 3, 2026. No database deletion, migration, import, or real-data
collection switch is performed. Existing test data remains excluded.

## User flow

Journey has an Application selector and Add/Edit details. The first saved application
includes the existing timeline and copies its current progress. No old timeline record
is rewritten. New application explicitly creates a separate attempt with empty progress.
Users can select earlier attempts, including after switching pathways. Dashboard and
Journey show only the selected attempt's records and progress. Editing uses the existing
ID and creates no contribution. Starting an already-started step returns the same record.
An empty current application must be used before another is created, preventing accidental
stacks of unused attempts. Linked permit steps omit the unused current-location snapshot.

The questions are optional. We reuse profileKey for pathway, stream and province:

| Stored detail | Purpose |
| --- | --- |
| Submission date | Identify the attempt and validate result dates |
| Result and decision/withdrawal date | Show the application's state without mistaking a finished step for approval |
| New permit or extension, permits only | Separate permit comparison groups |
| Inside/outside Canada at submission, permits only | Compare submission context without guessing from current residence |

For Express Entry the submission is the PR application, not the pool profile. For PNP
these optional dates/result describe the provincial application; roadmap step dates
still describe the federal stages separately. Provincial approval does not mark PR received
or end federal waiting estimates. No eligibility guidance has been changed.

No names, government file numbers, uploads, education, employer names, country histories,
free-text notes, or demographic variables are added. Unknown values stay blank. App details
are stored once in Application, referenced by TimelineRecord.applicationId. Normal record
IDs, ownership, source, timestamps, progress and active selection are operational metadata.

## Persistence and compatibility

Application has username/profileKey ownership, immutable dataSource, optional details and
progress. User.activeApplications maps profileKey to the selected ID. Legacy progress maps
continue to serve accounts that have not saved Application details. The first application
has includesLegacy=true and reads unlinked records for that user/profile; later attempts
read only their own linked records. Existing records retain their original test provenance.

Two partial unique indexes protect new identities: one legacy-holder per user/profile,
and one linked timeline per application/step. Neither index constrains dates/durations or
existing unlinked records. The normal Mongoose startup creates indexes; no bulk rewrite is
needed. Independent accounts or applications with identical timings still count separately.

Application routes require the existing session/origin middleware. Ownership and selected
profile are checked on each request. Timeline start/complete and progress writes carry the
selected application ID, so a stale tab cannot accidentally update a newly selected attempt.
Explicit record-ID date edits remain available for owned historical records. Application
metadata uses Mongoose optimistic concurrency; conflicts ask for a reload.

Details accept an allowlist of fields, real calendar dates and no future dates. As of October 4,
dates may remain unknown even when a result or submission location is known. A decision date
requires a result; submission must precede the decision only when both dates are known.
Known outcomes and submission locations prevent an attempt being treated as empty.
Optional permit details are rejected on other pathways. A
test application's future steps remain test data even if community mode is later enabled.
No automatic promotion, deletion, moderation system or import tool is included.

## Analytics method 4, extended by method 5

See [Optional dates](optional-dates.md) for method 5 and unknown-date handling.

The method-3 rules preserving repeated values remain. Permit location now means location
at submission, with a separate new/extension filter. Missing details contribute only to
unfiltered groups and cannot unlock a permit estimate. Analytics reads the current referenced
Application details, so edits take effect without copied snapshots or cache backfills.
Linked records with missing, test or wrong-owner applications are excluded. Own estimates
use the selected attempt, not the latest record across different attempts. Closed applications
have no remaining-wait estimate (PNP approval can still lead to federal stages).

Responses still contain only aggregated counts and durations, never application IDs, owners,
or raw application dates. Distinct-contributor minimums and test-data exclusion remain.
Self-reported application IDs distinguish saved attempts; they do not independently prove
separate real applications. No ML accuracy claims are made.

## API

- GET /api/applications: selected pathway's applications and selectedId.
- POST /api/applications: create/select an attempt; profileKey and current applicationId
  (null for first save), plus optional details.
- PUT /api/applications/:id: replace optional details on an owned attempt in this pathway.
- POST /api/applications/:id/select: select an owned attempt, with profileKey.
- Journey progress includes a safe application object. Timeline start/complete and progress
  writes require its applicationId once selected; legacy clients work until then and receive
  a reload conflict afterward.
- Analytics accepts permitType=all|new|extension, default all. locationBasis identifies
  submission vs recorded location. Application details are never returned from analytics.

## Tests and limitations

Tests exercise actual Express routes and Mongoose schemas through isolated in-memory adapters,
not Atlas. They cover attempt isolation, old progress, duplicate starts, edits, ownership,
stale selections, provenance, strict inputs and permit grouping. Schema assertions cover partial
indexes; live MongoDB index execution/concurrent writes require deployment verification.
No live account or existing database record is modified during testing.

## Files

Created: `models/Application.js`, `services/applications.js`, `routes/applicationRoutes.js`,
`public/js/application-ui.js`, `tests/applications.test.js`, and this document.

Updated: `models/User.js`, `models/TimelineRecord.js`, `server.js`,
`routes/timelineRoutes.js`, `routes/journeyRoutes.js`, `routes/analyticsRoutes.js`,
`services/communityAnalytics.js`, `public/journey.html`, `public/js/journey.js`,
`public/js/dashboard.js`, `public/js/community-ui.js`, `public/css/community.css`,
`public/css/journey.css`, `public/community-method.html`, `docs/community-analytics.md`,
`tests/community-analytics.test.js`, and `tests/helpers/analytics-app.js`.
