import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

/**
 * Better Auth 1.7.3 reverted the 1.7.0–1.7.2 account schema: accounts are keyed
 * on (providerId, accountId) again and `issuer` is never written. Our
 * 20260902_better_auth_1_7 migration made `issuer` NOT NULL with a unique
 * (issuer, accountId) index, so on Better Auth >=1.7.3 every sign-up and
 * account link would fail until both are relaxed.
 *
 * See https://www.better-auth.com/docs/guides/1-7-upgrade-guide
 * ("Account identity keeps the provider key") and the payload-better-auth
 * 0.14.0 CHANGELOG.
 *
 * The column itself is kept (nullable) so a rollback to the previous deploy,
 * which still writes `issuer`, keeps working. Drop it in a later migration.
 */
export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "issuer_accountId_idx";
    ALTER TABLE "accounts" ALTER COLUMN "issuer" DROP NOT NULL;
  `);

  // Better Auth rejects account lookups when more than one row matches
  // (providerId, accountId). Surface any such rows; they must be resolved by hand.
  const dupes = await db.execute(sql`
    SELECT "provider_id", "account_id", count(*)::int AS "count"
    FROM "accounts"
    GROUP BY 1, 2
    HAVING count(*) > 1;
  `);
  if (dupes.rows.length > 0) {
    payload.logger.warn(
      { duplicates: dupes.rows },
      'accounts has duplicate (provider_id, account_id) rows; Better Auth >=1.7.3 will reject lookups for these until they are resolved',
    );
  }
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Rows created on Better Auth >=1.7.3 have no issuer; backfill with the same
  // fallbacks 20260902_better_auth_1_7 used before restoring the constraint.
  await db.execute(sql`
    UPDATE "accounts"
    SET "issuer" = 'local:credential'
    WHERE "issuer" IS NULL AND "provider_id" = 'credential';

    UPDATE "accounts"
    SET "issuer" = 'local:oauth:' || "provider_id"
    WHERE "issuer" IS NULL;

    ALTER TABLE "accounts" ALTER COLUMN "issuer" SET NOT NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS "issuer_accountId_idx"
      ON "accounts" USING btree ("issuer", "account_id");
  `);
}
