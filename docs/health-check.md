# Scheduled public health check

GitHub Actions requests `https://maplepath-3b6a.onrender.com/api/health` every ten
minutes at :03, :13, :23, :33, :43 and :53 UTC. It runs outside Render and does not
depend on a developer's computer. Incoming requests should reduce Render Free's
15-minute idle spin-downs. This is a best-effort arrangement, not an uptime guarantee.

The workflow checks for a successful HTTP response and JSON reporting `status: ok`
and `database: connected`. It retries transient failures/cold starts, with a five-minute
job limit. It does not log in, write database records, read repository contents, use
secrets, upload artifacts or install dependencies. Response data exists only on the
temporary runner. A failed request or unhealthy response fails the workflow visibly.

## Operating it

- Open GitHub > mape-yt/maplepath > Actions > MaplePath health check to see runs.
- Use Run workflow for an immediate check. Editing this workflow on main also runs it.
- Use the workflow menu's Disable workflow action to stop scheduled checks.
- GitHub notifications depend on your personal Actions notification settings.
- This repository is public; standard GitHub-hosted runners are free for public repos.
  Reassess usage before making it private or changing runner types.

## Limits

GitHub may delay or drop scheduled runs. In public repositories, schedules are disabled
after 60 days without repository activity; check the Actions page if work pauses.
No fake commits or self-renewing activity are generated to bypass that policy.

Render can still restart a Free service. Its 750 free instance hours are shared by all
free web services in a workspace. One continuously running instance uses at most 744
hours in a 31-day month, but bandwidth and other service limits also still apply.

Official references, checked November 7, 2026:

- https://render.com/docs/free
- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule
- https://docs.github.com/en/billing/concepts/product-billing/github-actions
