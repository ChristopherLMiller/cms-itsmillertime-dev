import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

/**
 * Better Auth 1.7: account identity is keyed on (issuer, accountId) instead of providerId.
 * payload-better-auth 0.11 requires a nullable add → backfill → NOT NULL, plus a unique index.
 *
 * Authentik (generic OIDC) iss is read from stored id_token claims when present; remaining
 * OAuth rows fall back to local:oauth:<providerId>.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "issuer" varchar;

    UPDATE "accounts"
    SET "issuer" = 'local:credential'
    WHERE "provider_id" = 'credential';

    UPDATE "accounts" AS a
    SET "issuer" = decoded.iss
    FROM (
      SELECT
        id,
        (
          convert_from(
            decode(
              replace(replace(split_part("id_token", '.', 2), '-', '+'), '_', '/') ||
              repeat(
                '=',
                (4 - length(replace(replace(split_part("id_token", '.', 2), '-', '+'), '_', '/')) % 4) % 4
              ),
              'base64'
            ),
            'UTF8'
          )::json
        )->>'iss' AS iss
      FROM "accounts"
      WHERE "issuer" IS NULL
        AND "id_token" IS NOT NULL
        AND "provider_id" <> 'credential'
        AND split_part("id_token", '.', 2) <> ''
    ) AS decoded
    WHERE a.id = decoded.id
      AND decoded.iss IS NOT NULL
      AND decoded.iss <> '';

    UPDATE "accounts"
    SET "issuer" = 'local:oauth:' || "provider_id"
    WHERE "issuer" IS NULL;

    ALTER TABLE "accounts" ALTER COLUMN "issuer" SET NOT NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS "issuer_accountId_idx"
      ON "accounts" USING btree ("issuer", "account_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "issuer_accountId_idx";
    ALTER TABLE "accounts" DROP COLUMN IF EXISTS "issuer";
  `);
}
