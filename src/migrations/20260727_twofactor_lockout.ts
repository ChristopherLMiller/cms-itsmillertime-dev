import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

/**
 * Better Auth 1.6.23+ twoFactor lockout columns (via payload-better-auth 0.8+):
 * - failed_verification_count
 * - locked_until
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "two_factors" ADD COLUMN IF NOT EXISTS "failed_verification_count" numeric;
    ALTER TABLE "two_factors" ADD COLUMN IF NOT EXISTS "locked_until" timestamp(3) with time zone;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "two_factors" DROP COLUMN IF EXISTS "locked_until";
    ALTER TABLE "two_factors" DROP COLUMN IF EXISTS "failed_verification_count";
  `);
}
