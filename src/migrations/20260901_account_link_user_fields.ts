import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Account linking (Medusa customer ↔ Payload user):
 * - medusaCustomerId
 * - medusaCustomerEmail
 * - accountLinkedAt
 *
 * Additive only. Coolify runs `payload migrate` (up).
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "medusa_customer_id" varchar;
    ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "medusa_customer_email" varchar;
    ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "account_linked_at" timestamp(3) with time zone;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "users" DROP COLUMN IF EXISTS "account_linked_at";
    ALTER TABLE "users" DROP COLUMN IF EXISTS "medusa_customer_email";
    ALTER TABLE "users" DROP COLUMN IF EXISTS "medusa_customer_id";
  `)
}
