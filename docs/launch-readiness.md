# Launch readiness — November 8, 2026

## Account email: active; inbox placement still needs improvement

On November 8, 2026, the owner confirmed that verification and password recovery worked after configuring Brevo in Render. The first message arrived in spam. This confirms delivery and account recovery, not reliable inbox placement for all users.

The application supports Brevo's HTTPS transactional API and the existing Resend adapter. No email credentials are included in Git. Email recovery stays disabled unless configuration is complete. Configuration availability is not proof of successful inbox delivery.

Setup reference for the current Gmail/Brevo configuration:

1. Create a free Brevo account. Complete the provider's account checks and any transactional-email activation it requests.
2. Add `sylim.cs@gmail.com` as a sender named MaplePath. Complete verification from that inbox. Do not import contacts or start marketing campaigns.
3. Generate an API key in Brevo. Enter it directly into Render's environment settings; never paste it in chat, a commit, a screenshot, or browser JavaScript.
4. Set these Render environment variables and deploy:

   ```text
   ACCOUNT_EMAIL_PROVIDER=brevo
   ACCOUNT_EMAIL_FROM=sylim.cs@gmail.com
   PUBLIC_APP_URL=https://maplepath-3b6a.onrender.com
   BREVO_API_KEY=<enter privately in Render>
   SUPPORT_EMAIL=sylim.cs@gmail.com
   ```

5. Disable email open/click tracking in the provider where available. Keep message-content and delivery-log retention as short as practical. Record the actual provider retention policy before public launch; do not assume deleting a MaplePath account deletes provider logs.
6. With a dedicated test account, add your own recovery address in Account. Verify the email, sign back in, request a forgotten-password link, reset the password, and confirm the old password and sessions stop working. Check inbox and spam folders, and verify that following a consumed link fails. Do not test with another user's account.
7. Record successful delivery, verification, reset, and repeat-link rejection. Only then describe email recovery as live and verified.

Brevo currently replaces a free-email sender with a provider-domain address for delivery. This is a temporary fallback, not a deliverability guarantee. A domain you own with DKIM/DMARC authentication is the recommended long-term setup. Resend remains supported with `ACCOUNT_EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, and a verified-domain `ACCOUNT_EMAIL_FROM`.

Official references: [Brevo sender requirements](https://help.brevo.com/hc/en-us/articles/14925263522578-Comply-with-Gmail-Yahoo-and-Microsoft-s-requirements-for-email-senders), [Brevo transactional API](https://developers.brevo.com/reference/send-transac-email), [Resend domain verification](https://resend.com/docs/dashboard/domains/introduction).

## Email delivery follow-up

- Account messages explain the requested action, identify the MaplePath website, include the single-use expiry, and point replies to the validated SUPPORT_EMAIL address. Brevo falls back to the configured sender inbox when no valid support address is configured. Resend omits Reply-To when no valid support address is configured.
- The application sends plain text and does not add tracking pixels, remote assets, URL shorteners, or invented authentication headers. Provider-side tracking settings are separate and have not been verified. Message wording and Reply-To help recipients recognize and contact MaplePath; they do not fix sender authentication or guarantee inbox placement.
- The verification screen reminds users to check spam. Marking a genuine MaplePath email as Not spam helps that recipient's inbox; it does not authenticate the sending domain for everyone.
- To improve authentication, first obtain a domain the owner controls. In Brevo's Domains settings, add the domain and copy the exact verification, DKIM and DMARC records provided into that domain's DNS. Do not invent DNS values, add a second DMARC record, or change existing mail records blindly. Follow the provider's instructions and check authentication succeeds before switching the Render sender address.
- Verify a sender on the authenticated domain, update ACCOUNT_EMAIL_FROM in Render, deploy, and test with a dedicated MaplePath account. The website can stay on its Render URL; buying an email-sending domain does not require moving the website.
- Inspect a delivered test message's Authentication-Results for SPF/DKIM/DMARC outcomes and From alignment. Use metadata only; do not share reset links or raw message bodies. Check more than one mailbox provider. Inbox placement remains the receiving provider's decision.
- No domain has been purchased and no DNS/provider authentication settings have been changed by this code update.

## Public contact and privacy

- Contact and privacy pages are linked from public footers, authentication, and the signed-in sidebar.
- `SUPPORT_EMAIL` changes the live contact links. The static fallback appears in `public/contact.html` and `public/privacy.html`; update both when permanently retiring the temporary address so JavaScript-disabled/offline clients also see the new inbox.
- Contact opens the user's email application. No contact-message table or upload endpoint is added.
- The project is identified as MaplePath. No registered business name, compliance certification, or Canada-only data residency is claimed.
- Before public launch, the operator must settle support-message retention and verify provider/backup retention. Update the notice to match the actual decisions. [OPC retention guidance](https://www.priv.gc.ca/en/privacy-topics/privacy-for-businesses/appropriate-handling-of-personal-information/gd_rd_201406/) informs this checklist; it is not a legal compliance assessment.

## Account deletion

`POST /api/account/delete` requires an authenticated same-origin request, the current password, and the exact confirmation `DELETE`. It deletes the User document (including tasks/profile/progress), TimelineRecords, Applications, and Sessions in one MongoDB transaction. A failure rolls back the entire cleanup. There is no soft-deleted profile or permanent username tombstone.

Timeline/application writes use `saveOwned()` to touch the immutable owner ID within their transaction. Deletion touches the same User document, causing concurrent writes to retry or fail if the owner was removed. New records carry an immutable `ownerId`; legacy records remain readable. Authenticated user lookups and selection updates use `_id`, preventing an old request from acting as a newly registered owner of the same username. Session creation is similarly guarded. Transactions require a replica set, as provided by Atlas; standalone local MongoDB is not sufficient.

Community calculations read current records, so deleted timelines disappear from subsequent calculations. Already-rendered results update on refresh. The old TimelineAverage collection is unused, contains aggregate numbers rather than account records, and is not served.

Support messages and provider operational logs are separate. Deletion from those systems must be handled according to the applicable request and verified retention policy. Backups must not silently resurrect deleted accounts: restore into an isolated destination, reconcile deletions since the snapshot using the source database or operator records, invalidate restored sessions/recovery tokens, and verify the result before any production promotion. If reconciliation cannot be established, do not promote the snapshot.

## Backups: not yet verified

No production backup or restore has been performed by this change. The owner must inspect the Atlas cluster's Backup tab, its tier, snapshot dates, retention, and available restore destinations. Do not report Git commits as database backups.

MongoDB's current [Free Cluster Backups](https://www.mongodb.com/docs/atlas/backup/cloud-backup/free-cluster-backup/) page describes a gradually released **paid private preview**: daily snapshots, four retained, $0.10/day up to $3/month. Older overview pages still say free clusters have no managed backups. The actual Atlas UI and account availability must therefore be checked. Do not enable a paid subscription without the owner's agreement.

If managed backups are unavailable or declined, [MongoDB Database Tools](https://www.mongodb.com/docs/database-tools/mongodump/) provide `mongodump`/`mongorestore`. A local dump is not an automated backup policy. Choose an encrypted destination outside the repository, public directory, and OneDrive-synced project folders; agree on frequency and retention before collecting extra copies of account data. Keep connection credentials out of shell history and logs using a protected tools configuration file. Never commit dumps, exports, or that file.

Verification procedure after choosing a backup method:

1. Confirm a successful snapshot/dump and record its timestamp and retention, without credentials or user records.
2. Restore to an isolated test destination with no public application attached. Never restore over production for a drill. Review any billable destination with the owner first.
3. Compare collection counts and indexes, and test login, profile, application selection, timeline dates, and progress using a dedicated test account. Do not email restored users.
4. Verify account deletion handling and invalidate restored sessions/recovery tokens before a possible promotion.
5. Remove the test restore after validation and record the outcome, destination cleanup, and next drill date. A snapshot without a successful restore drill is not a verified recovery plan.

## Tests

`npm test` runs isolated HTTP and data tests without Atlas or live email. The additional real-database transaction test requires an explicitly supplied disposable **local replica set**:

```powershell
$env:MAPLEPATH_TEST_MONGO_URI='mongodb://127.0.0.1:27017/maplepath_test_deletion?replicaSet=rs0'
node --test tests/integration/account-deletion.test.js
```

The integration test rejects non-loopback targets and database names without the `maplepath_test_` prefix, and drops only its test database after completion. It tests transaction rollback, owner isolation, username reuse, and concurrent saves/deletion. No `.env` is loaded.

Trusted-data imports, enabling community collection, donations, and dashboard redesign remain separate decisions.
