# F01–F05 migration history reconciliation

The Console branch and main independently used migration numbers 0005 and 0006. Main's F04/F05 migrations have later timestamps than the Console branch's F01–F03 migrations. Drizzle's PostgreSQL migrator uses the latest applied timestamp as its cutoff, so merely merging the journal would skip Console changes on an existing main database.

## Preserved history

- Console migrations 0000–0008 keep their original SQL, hashes and timestamps.
- Main's networking and profile SQL is now named `0009_networking_inclusion.sql` and `0010_profile_versions.sql`. Its bytes, hashes and original timestamps are unchanged. Drizzle stores hashes/timestamps, not these filenames, in the database journal.
- Snapshots 0009 and 0010 were generated against the combined schema in feature order. The generated networking SQL moved its composite unique constraint after the foreign keys; the reviewed original main SQL is retained because it creates the constraint before those foreign keys.
- Custom migration `0011_reconcile_console_history.sql` was generated after the combined snapshots. It conditionally applies missing Console access, staff invitation, settings and attendee-identity capabilities. Databases that already have them retain their data. No journal rows are reset, relabeled or deleted.

## Upgrade paths

Fresh databases apply the full history and the final guard is a no-op. Console-only databases apply networking/profiles and the final guard is a no-op. Main-only databases skip older Console timestamps and receive those missing capabilities through 0011. Databases with both histories skip the original migrations and the final guard is a no-op.

The 2026-10-19 read-only audit found main's seven journal entries in production (`weft_console`), including networking/profiles but no Console access/settings/person columns. Shared development (`weft_console_test`) had all eleven original entries and both feature sets. Only metadata was read, inside read-only transactions; no migration was applied to either target.

Isolated PGlite PostgreSQL validation exercises fresh, main-only, Console-only and combined histories using the Drizzle migrator, including existing guest rows, exclusions, organizer-only profile versions and do-not-match pairs. It compares the resulting schemas, preserves existing values, checks reconciliation replay and forces rollback of a main-only upgrade. This validates SQL behavior in embedded PostgreSQL, not shared database concurrency or a live rollout. Temporary tooling lives outside the repository; application dependencies are unchanged. The ordinary Node suite guards the applied SQL hashes/timestamps and generated snapshot lineage.

Deployment/migration remains governed by [Vercel deployment](vercel-deployment.md) and [Verification](../VERIFICATION.md). This merge does not authorize applying production or shared-development migrations.
