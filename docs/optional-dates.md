# Optional dates and clearer progress entry

Implemented October 4, 2026. Community analytics method 5.

## User behavior

- Onboarding and Profile accept unknown preparation, Canada arrival, PR and permit
  approval dates. All date fields are optional and have an “I don’t remember” action.
- Preparation is labelled separately from arriving in Canada or submitting an application.
- Journey's Record progress opens a form before saving. Users can record a started or
  finished step with past dates, explicitly choose Today, or leave either date unknown.
- Known submission, invitation and decision steps use event-specific labels. Other steps
  keep neutral start/finish wording rather than inventing government milestones.
- Edit dates can add, correct or clear dates without losing the step's progress.
- Application results and permit submission locations can be recorded without exact dates.
  A decision date still requires a result, so the meaning of that date is clear.
- Known invalid, future and reversed dates are rejected before mutation. Timeline dates
  retain the existing 24-hour local-noon timezone allowance. No plausible long duration
  is rejected merely for being unusual.

## Data and compatibility

Unknown timeline/profile dates use null; existing optional application details use their
existing blank-string representation. No new personal-information fields or uncertainty
flags are stored. Old dates and records are not rewritten or deleted. Legacy API clients
that omit timeline date properties retain their click-time behavior; explicit null means
unknown. The new UI always sends explicit dates or null.

Completed records need both dates to contribute a duration. Unknown dates never become
zero-day or epoch-based samples. Missing dates are counted separately from invalid dates.
Unfinished records with unknown starts remain in the ongoing-case count that can suppress
estimates; the user's own unknown start cannot produce a remaining-time estimate. Permit
grouping can use known submission location/type even if the application submission date
is unknown, while step duration calculations still require both step dates.

Existing test-data exclusion, distinct-contributor thresholds, repeated-value preservation,
ownership checks and separate application attempts remain. There is no database cleanup,
migration, real-data collection switch or new ML model in this change.

## Validation

Automated tests use real Express routers and Mongoose schemas with isolated in-memory
adapters, without connecting to Atlas. They cover unknown dates, direct historical entry,
later corrections, clearing dates, invalid dates, stale requests, profile completion and
analytics exclusion. Browser QA uses the same isolated fixtures and no real account.
Deployment and real MongoDB writes are not part of this local check.

## Files

Created: `services/timelineDates.js`, `public/js/optional-dates.js`,
`public/js/timeline-labels.js`, `public/css/optional-dates.css`,
`tests/timeline-dates.test.js`, and this document.

Updated: `models/TimelineRecord.js`, `routes/timelineRoutes.js`,
`routes/applicationRoutes.js`, `services/profileValidation.js`, `services/applications.js`,
`services/communityAnalytics.js`, `public/onboarding.html`, `public/profile.html`,
`public/journey.html`, `public/community-method.html`, `public/js/onboarding.js`,
`public/js/profile.js`, `public/js/journey.js`, `public/js/dashboard.js`,
`public/js/community-ui.js`, `docs/applications.md`, `docs/community-analytics.md`,
`tests/profile-validation.test.js`, `tests/permit-pathways.test.js`,
`tests/community-analytics.test.js`, `tests/applications.test.js`,
and `tests/public-pages.test.js`.
