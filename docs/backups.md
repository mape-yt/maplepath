# Database backup and recovery

## Verified on November 8, 2026

An encrypted backup of the configured Atlas database was created and restored into a disposable local MongoDB 8 replica set. All 11 documents across 3 included collections matched their SHA-256 content inventories, and index definitions matched. The local restore was removed. Production data was not changed.

This is a **manual local backup**, not an Atlas snapshot service or an automatic daily schedule. It is useful for recovering from a database mistake while this Windows profile is still available. An off-device copy with an independently saved recovery key is still needed to protect against losing this PC. The owner chose to keep backups local for now on November 10, 2026. No off-device storage was configured or purchased.

## Run from the project folder

```powershell
npm run backup:create
npm run backup:verify
npm run backup:restore-test
npm run backup:status
```

- `backup:create` reads the existing MONGO_URI privately, exports with official MongoDB Database Tools, encrypts the archive, and keeps the seven most recent successful backups. Run it before database maintenance and regularly while collecting user data. A failed attempt does not replace a good backup.
- `backup:verify` checks the newest archive's encryption/authentication. It is not a restore test.
- `backup:restore-test` starts a disposable local replica set, restores the newest archive, compares every document's serialized BSON hash and the indexes, invalidates recovery tokens in the test copy, and drops that test database. It does not accept a production restore destination.
- `backup:status` shows the latest backup and restore-test records. A successful restore of the latest file marks that backup as restore verified.

Backups and status reports are stored at:

```text
%LOCALAPPDATA%\MaplePath\Backups
```

On this PC that is `C:\Users\Seungyun Lim\AppData\Local\MaplePath\Backups`. This directory is outside Git and OneDrive. Its ACL permits only the current Windows user and SYSTEM. Do not move it into the public folder, repository, or a shared directory.

## Encryption and recovery key

Archives use AES-256-GCM with a random nonce for each backup. Metadata and ciphertext are authenticated before data is sent to the restore process. Readable archives exist only in process memory; the export is never saved as a plaintext dump. The current implementation caps the archive buffer at 256 MiB and fails rather than producing an oversized/partial backup.

The AES key is stored in `key.dpapi`, protected using Windows DPAPI's CurrentUser scope. The CLI captures the unprotected key only in memory and never prints it. **A copy of the archive and key.dpapi alone is not a portable recovery kit:** the original Windows user's DPAPI access is needed. Windows reinstallation or profile loss can make it inaccessible. Do not delete or replace key.dpapi. An independent, secure recovery-key export and off-device destination must be selected before calling this machine-loss protection complete.

The temporary MongoDB tools configuration contains the connection URI and inherits the private folder ACL. It is removed in a `finally` block. A force-killed process or power loss can leave a `connection-<uuid>.yml` file; remove that specific stale file from the protected backup directory when no backup is running. Tool stderr is suppressed because it can contain connection details or records. No keys or URIs are included in command-line arguments, reports, or Git.

## What is included

All ordinary database collections and their indexes are included, except:

- `sessions`: existing login sessions should not be revived.
- `timelineaverages`: the unused legacy cache; current comparisons are recalculated from timeline records.
- MongoDB system collections.

Accounts, password hashes, profile/tasks, applications, and timeline records are included. Views and unsupported database names fail closed. The source and restore destination must have matching MongoDB major versions; the source version is recorded in new backup metadata. The current local restore runner uses MongoDB 8.0.17, matching the current Atlas major version. Review/update it if Atlas changes major versions.

This is not an oplog or point-in-time snapshot. The script compares document/index inventories before and after export and refuses to keep a new archive if they differ. Run during a quiet period. This check is useful for the current small database but is not a transactionally consistent snapshot guarantee under arbitrary concurrent writes. Use a managed backup/snapshot strategy as traffic grows.

## Retention and deleted accounts

Seven successful versions are retained. Because backups currently run manually, this is **not a seven-day retention policy**. Copies remain until replaced or explicitly removed. Keep this distinction in the public privacy notice.

Never restore an old backup directly over production. Deleted accounts, old password hashes, and pending email metadata can exist in a snapshot. Before any future production recovery, reconcile deletions and account-security changes since the backup, clear sessions and pending email/reset tokens, and verify indexes/data/application behavior in isolation. If the current source database is lost and deletion history cannot be established, pause promotion and investigate; the local drill is not permission to resurrect accounts. The provided CLI intentionally offers no production-promotion command.

## Tools and repeatability

Database Tools 100.20.1 are installed outside the repository under:

```text
%LOCALAPPDATA%\MaplePath\Tools\mongodb-database-tools-windows-x86_64-100.20.1\bin
```

On a new Windows environment, obtain the Windows ZIP from the official MongoDB download page and extract it to that location. Use matching mongodump/mongorestore versions. Do not copy or print the production connection URI during installation.

The restore drill uses the development-only `mongodb-memory-server` dependency and may download the pinned MongoDB binary on first use. It binds to loopback, has a generated `maplepath_restore_...` destination name, rejects a nonempty destination, and removes the test database afterward. Production's `npm ci --omit=dev` does not install browser/replica-set test tools.

Sources: [MongoDB export behavior and version requirements](https://www.mongodb.com/docs/database-tools/mongodump/mongodump-behavior/), [MongoDB restore options](https://www.mongodb.com/docs/database-tools/mongorestore/), [official Database Tools downloads](https://www.mongodb.com/try/download/database-tools/releases/archive), [Windows DPAPI scope](https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.dataprotectionscope).
