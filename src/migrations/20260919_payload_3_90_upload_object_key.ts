import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Payload 3.90 upload filename hardening:
 * - `_objectkey` on media, gallery-images, and gallery-masters
 *
 * `resetPasswordRequestedAt` is not added: users use Better Auth
 * (`disableLocalStrategy: true`), so Payload does not persist that field.
 *
 * Additive only. Coolify runs `payload migrate` (up).
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "media"
      ADD COLUMN IF NOT EXISTS "_objectkey" varchar;
    ALTER TABLE "gallery_images"
      ADD COLUMN IF NOT EXISTS "_objectkey" varchar;
    ALTER TABLE "gallery_masters"
      ADD COLUMN IF NOT EXISTS "_objectkey" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "gallery_masters" DROP COLUMN IF EXISTS "_objectkey";
    ALTER TABLE "gallery_images" DROP COLUMN IF EXISTS "_objectkey";
    ALTER TABLE "media" DROP COLUMN IF EXISTS "_objectkey";
  `)
}
