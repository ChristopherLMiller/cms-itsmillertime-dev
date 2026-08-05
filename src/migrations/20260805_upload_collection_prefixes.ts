import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Add document-level R2/S3 prefix columns for media and gallery-images.
 * Existing rows stay NULL so legacy root-key objects keep resolving.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "media"
      ADD COLUMN IF NOT EXISTS "prefix" varchar;

    ALTER TABLE "gallery_images"
      ADD COLUMN IF NOT EXISTS "prefix" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "media" DROP COLUMN IF EXISTS "prefix";
    ALTER TABLE "gallery_images" DROP COLUMN IF EXISTS "prefix";
  `)
}
