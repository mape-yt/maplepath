# Public health checks and Render idle sleep

## Diagnosis: November 11, 2026

The health endpoint is working: a direct request returned HTTP 200, `status: ok`,
`database: connected`, in about 213 ms during this investigation.

The GitHub workflow is active and requests a ten-minute schedule, but the actual
history showed only 13 scheduled executions between November 8 and November 11.
Every recorded run succeeded. Recent starts on November 11 were 01:51, 08:48,
and 16:46 UTC: hours apart, rather than ten minutes apart. These gaps leave the
Render service idle long enough to sleep. GitHub documents that scheduled jobs
can be delayed or dropped. The exact scheduler-side reason for these particular
gaps is not exposed by the run history.

Evidence: [workflow history](https://github.com/mape-yt/maplepath/actions/workflows/health-check.yml),
[successful November 11 run](https://github.com/mape-yt/maplepath/actions/runs/43061536967).

The existing GitHub check remains enabled as a secondary diagnostic. Its cron
expression is a requested schedule, not an assurance of timely requests. Merely
changing it to five minutes would not resolve the observed hours-long gaps.

## External scheduler: active; initial scheduled run verified

The owner created and verified a cron-job.org account. Job 8845289 was enabled on November 11, 2026. Its first automatic execution was scheduled for 14:45:00 America/Cambridge_Bay and ran at 14:45:03, returning HTTP 200 in 1.37 seconds (reported jitter 3.8 seconds). No payment, API key, or private MaplePath credentials were needed. Notifications were left at their existing defaults.

The saved job uses these settings:

| Setting | Value |
| --- | --- |
| Title | MaplePath health check |
| URL | https://maplepath-3b6a.onrender.com/api/health |
| Enabled | Yes |
| Method | GET |
| Schedule | Every 5 minutes, every day, without an expiry |
| Authentication | None |
| Request body / custom headers / cookies | None |
| Save response bodies | Off |

Enable failure, recovery, and automatic-disable notifications to the owner's
account email if desired. Do not put database credentials, a MaplePath session,
or any private API key into the job. The endpoint only returns basic service
and database connection status; it does not read user records or write data.

Open the health URL once to wake the app, then run the scheduler's test. Expect
HTTP 200 and `{"status":"ok","database":"connected"}`. A sleeping instance
can take about a minute to start, longer than the scheduler FAQ's documented
30-second request timeout. A first timeout can therefore be a cold start; wait
for the app to finish waking and repeat the test. Persistent failures need
investigation, not repeated blind retries.

Initial verification covers the saved enabled schedule and one successful automatic run. The first manual test returned a temporary 503; a subsequent direct request took about 21 seconds and returned healthy, consistent with waking up. A longer four-run observation spanning 15 minutes has not yet been completed. Use the provider history to review continued scheduling and any failures; one successful execution is not a continuous-uptime guarantee.

## Existing GitHub diagnostic

The workflow requests runs at :03, :13, :23, :33, :43 and :53 UTC. It checks the
HTTP response and both JSON fields, retries transient failures/cold starts, and
has a five-minute job limit. It does not use credentials or write account data.

- Open Actions > MaplePath health check to inspect runs.
- Run workflow starts a manual check. Editing the workflow on main also runs it.
- Disable workflow stops its scheduled checks.
- GitHub schedules can be disabled after 60 days without repository activity.
- Standard public-repository runners are free; reassess before changing repository
  visibility or runner types.

## Limits

Render Free sleeps after 15 minutes without inbound traffic and can also restart
at any time. A five-minute external request should reduce idle sleeps, but cannot
remove Render's free-tier restrictions or guarantee availability. An internal
Node timer stops when the process sleeps, and a browser timer stops when visitors
leave, so neither is a dependable replacement for an external scheduler.

Render provides 750 free instance hours per workspace each calendar month. One
continuously running instance uses at most 744 hours in a 31-day month. Other
services, bandwidth, and other platform limits still matter. No paid plan or
billable service was enabled. A paid Render service compute plan removes idle
spin-down; it is a separate future decision for the owner.

Official references checked November 11, 2026:

- [Render Free limits](https://render.com/docs/free)
- [GitHub schedule limits](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)
- [cron-job.org features](https://cron-job.org/en/)
- [cron-job.org FAQ and timeouts](https://cron-job.org/en/faq/)
