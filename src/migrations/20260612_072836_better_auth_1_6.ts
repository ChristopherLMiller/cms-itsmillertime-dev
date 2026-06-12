import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

/**
 * Better Auth 1.5/1.6 schema changes for Payload-managed auth tables:
 * - apikeys: user_id → reference_id (varchar), add config_id
 * - two_factors: add verified column (defaults true for existing rows)
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "apikeys" DROP CONSTRAINT IF EXISTS "apikeys_user_id_users_id_fk";
    DROP INDEX IF EXISTS "apikeys_user_idx";
    ALTER TABLE "apikeys" RENAME COLUMN "user_id" TO "reference_id";
    ALTER TABLE "apikeys" ALTER COLUMN "reference_id" TYPE varchar USING "reference_id"::varchar;
    ALTER TABLE "apikeys" ADD COLUMN IF NOT EXISTS "config_id" varchar DEFAULT 'default' NOT NULL;
    CREATE INDEX IF NOT EXISTS "apikeys_reference_id_idx" ON "apikeys" USING btree ("reference_id");

    ALTER TABLE "two_factors" ADD COLUMN IF NOT EXISTS "verified" boolean DEFAULT true;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "two_factors" DROP COLUMN IF EXISTS "verified";

    DROP INDEX IF EXISTS "apikeys_reference_id_idx";
    ALTER TABLE "apikeys" DROP COLUMN IF EXISTS "config_id";
    ALTER TABLE "apikeys" ALTER COLUMN "reference_id" TYPE integer USING "reference_id"::integer;
    ALTER TABLE "apikeys" RENAME COLUMN "reference_id" TO "user_id";
    CREATE INDEX IF NOT EXISTS "apikeys_user_idx" ON "apikeys" USING btree ("user_id");
    ALTER TABLE "apikeys"
      ADD CONSTRAINT "apikeys_user_id_users_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
      ON DELETE set null ON UPDATE no action;
  `);
}
