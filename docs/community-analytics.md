# Community analytics, method 3

Implemented October 2–3, 2026. No database cleanup or user-record deletion is required.

## Current data is test data

The project owner confirmed on October 3 that all current database records contain
random testing data. None is a source for real-world analytics, training or validation.
The default `COMMUNITY_DATA_MODE` is `testing`; unset or unrecognized values fail closed.
In this mode analytics returns a `testing` state with null durations and no forecasts,
without querying the timeline database for aggregates. The Journey UI explains why.

When genuine community collection is deliberately enabled later, set
`COMMUNITY_DATA_MODE=community` on the server and restart it. This has NOT been enabled
as part of this update, and `.env` has not been edited. New timeline records then receive
server-assigned `dataSource: self-reported`; otherwise they receive `dataSource: test`.
Clients cannot assign this field through start, complete or edit requests. The schema
also makes it immutable. Test records and unlabelled legacy records are excluded by
the calculation engine even in community mode. Editing or completing an old record
never upgrades its source. New genuine records still require consistency checks and
minimum samples; self-reported does not mean independently verified.

There is no bulk relabelling or deletion script. Importing actual external records is a
separate later task that needs source provenance and explicit source-record identities. Copying data
into the database without an eligible source label will not make it count. Do not promote
random records to bypass minimum samples. Synthetic tests exercise the real-data branch
only within their isolated in-memory fixture, never against Atlas.

## Before and after

| Before | Now |
| --- | --- |
| Average of stored durationDays on completed records | Eligible source records only, durations recalculated from dates; matching durations and separate records from the same account all count |
| One record could produce an average and a finish date | Five distinct other contributors before displaying durations; twenty recent comparable contributors before a remaining-time range |
| Every stored completed record included | Invalid dates, wrong pathway identities and completions older than 730 days excluded; test data never included |
| Mean alone could be distorted by unusual durations | Median and middle 50% shown first; the mean still includes every eligible duration, with unusual values flagged only |
| Start date plus average produced a single estimated completion date | Historical remaining-time range conditioned on elapsed waiting time; no guarantee or claimed individual probability |
| Count alone labelled confidence as High | Sample size, recency, unfinished counts and exclusion reasons shown without an accuracy claim |
| Separate cached average calculators in two routes | One pure calculation service, reading current records per request; edits and empty samples cannot leave a stale cached average |
| Sequential network request for each roadmap step | One batch request and one bounded DB read for the current roadmap |

For example, the synthetic test durations 9, 10, 10, 11, 11, 12, 12, 13, 13, 1000
produce a 110-day rounded average and a 12-day rounded median. Method 3 retains the 1000-day
record in the average, median, quartiles and any eligible historical estimate. It is
flagged as unusual, not excluded or declared inaccurate.
This example verifies arithmetic, not real-world forecast accuracy.

### Revision from method 2

The initial uncommitted method 2 counted only the latest eligible record per account
and step. It never collapsed matching durations from different accounts. At the owner's
request, method 3 removes that account-level restriction: separate saved records count
even when their account, dates and durations match. It also replaces automatic outlier
removal from the mean with informational flags. Nothing is deleted from the database.
The only repeat-read protection is for the same saved `_id` returned more than once;
that is one observation, not multiple contributions. Date edits update that observation.

## Calculation rules

`services/communityAnalytics.js` owns the policy and pure functions. Every route is
scoped to the registry's profileKey and stepOrder. A user sees comparisons with their
own records excluded. All separate eligible records count with equal weight; we never
compare dates or durations to decide whether two records are the same. Only repeated
reads of the same saved `_id` count once, using its latest updated version. Invalid newer
versions do not fall back to an older favourable value. Missing IDs are not guessed from
matching content. Existing usernames are case-sensitive, matching the account system.

Dates must parse, use a real calendar date, be ordered, and not exceed server time plus
24 hours (the existing local-noon date-edit allowance). Null or invalid starts/ends
are excluded. Same-day completion counts as one day. Durations consistently use
`max(1, round((end-start)/86400000))` in completion, edits and analytics. Legacy stored
duration mismatches are corrected in calculation, never by a bulk database rewrite.

The observation window is completedAt within 730 days. Statistics require five distinct
other contributors with valid completed records, regardless of how many records each
contributor has. With ten or more contributors, values outside Q1-3*IQR and Q3+3*IQR
are flagged only; IQR has a one-day floor. Quartiles use linear interpolation. Displayed
median and mean are rounded; range endpoints round outward. All eligible records,
including matching and unusual durations, participate in every duration statistic.
Multiple records from one account have more influence than one record; this is disclosed
in the UI. Distinct contributor thresholds are not a full defence against repeated reports
or multiple accounts, and record counts do not prove separate immigration applications.

Location is a snapshot of the profile at first record creation; date edits do not
reconstruct historical location. Unknown legacy locations participate only in All
locations. No historical context is backfilled from a user's later profile.

Historical remaining-time ranges require an active record and a suitable IRCC or
explicitly reviewed permit waiting step. Invitation pools and selection rounds are
not queues, so they are excluded. Preparation and work-authorization checklists are
also excluded. WP-OPEN and WP-EMP-EXEMPT remain too heterogeneous for forecasts.
Permits need a known matching location group. Completions from twenty distinct other
contributors within 180 days must last longer than elapsed whole days. Subtract elapsed
days, then show the 25th–75th percentile of all those remaining durations, retaining valid
outliers and repeated values. If distinct contributors with ongoing records started
within 730 days equal or exceed those with recent completions, suppress the range.

This ongoing-count rule is conservative and is not survival analysis. Completed-only
data has censoring and selection bias. The 730-day completion window also favours some
cohorts over others. Neither the range nor the sample label is a calibrated individual
prediction. Future ML needs sufficient real data, capture of application category and
submission context, censored-case modelling, and time-based held-out validation before
any accuracy claims. Passing tests does not establish prediction quality.

## Sources and trust

- [NIST: box plots and 3-IQR fences](https://www.itl.nist.gov/div898/handbook/eda/section3/boxplot.htm)
- [NIST: outliers can be real observations](https://www.itl.nist.gov/div898/handbook/eda/section3/eda35h.htm)
- [IRCC: current application processing times](https://www.canada.ca/en/immigration-refugees-citizenship/services/application/check-processing-times.html)

Reviewed October 2, 2026; NIST outlier guidance rechecked October 3. MaplePath's sample sizes and time windows are product
safeguards, not official government rules. IRCC whole-application times are linked
separately rather than mixed with per-step observations. No invented government
numbers, forum scraping, or synthetic seed data are imported into production.

Account-authenticated dates are still self-reports. Consistency checks cannot establish
truth, authenticate immigration documents, or stop a person creating multiple accounts.
The public method page makes this limitation explicit. API responses return aggregate
values and counts, never names, record IDs or individual dates. Small duration samples
are suppressed, but this is not a differential-privacy guarantee.

## API, compatibility and operation

- GET `/api/analytics/pathway/:profileKey?location=all` returns all step summaries.
- GET `/api/analytics/:profileKey/:stepOrder` keeps averageDays/totalUsers and adds median,
  range, sample, quality and forecast fields.
- `methodVersion: 3` distinguishes the revised method. `totalUsers`, `averageUsers`,
  `recentUsers`, `ongoingUsers` and forecast `totalUsers` count distinct contributors.
  `totalRecords`, `recentRecords`, `ongoingRecords` and forecast `totalRecords` count
  included timelines. `averageUsers` remains a compatibility alias for `totalUsers`.
  `quality.repeatedRecordCopies` counts repeat reads of the same ID, replacing the old
  account-based `duplicates` counter. `quality.unusual` is informational only.
- POST `/api/analytics/calculate` keeps the `{message, average}` response shape, recalculates
  current statistics and no longer writes the obsolete aggregate cache.
- The existing server authentication/origin middleware still protects all analytics.
  Queries are allowlisted, rate limited to 90/minute per IP, and use `Cache-Control: no-store`.
- Reading more than 20,000 records returns 503 rather than a biased truncated sample.
  DB failures also return 503; the UI says unavailable, not zero contributions.
- `TimelineAverage` is retained for rollback but no longer read or written by these routes.
  The new non-unique profileKey/stepOrder index does not fail on matching records.
  Analytics never deletes historical records or merges separate saved timelines.
- No dependencies, secrets, existing account data or roadmap step IDs change. The optional
  server setting above is new; no environment file was read or changed.

## Verification and changed files

`npm test` includes deterministic statistics tests and actual Express timeline/analytics
HTTP tests backed by an in-memory adapter with the real Mongoose schema. They do not
connect to Atlas or test production authentication. Browser preview uses only synthetic
data and tests cohort filtering, insufficient samples, details, date edits, and responsive
pages. Production data volume, distribution and forecast accuracy remain unmeasured.

New: `services/communityAnalytics.js`, `public/js/community-ui.js`,
`public/css/community.css`, `public/community-method.html`, this document,
`tests/community-analytics.test.js`, `tests/analytics-routes.test.js`,
`tests/helpers/analytics-app.js`.

Updated: `routes/analyticsRoutes.js`, `routes/timelineRoutes.js`,
`models/TimelineRecord.js`, `public/js/journey.js`, `public/journey.html`,
`public/dashboard.html`, `public/js/dashboard.js`, `public/index.html`,
`tests/public-pages.test.js`, `tests/responsive-layout.test.js`.
