import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Add per-album default image sort setting.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_gallery_albums_settings_default_sort" AS ENUM(
        '-createdAt',
        'createdAt',
        'filename',
        '-filename'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    ALTER TABLE "gallery_albums"
      ADD COLUMN IF NOT EXISTS "settings_default_sort"
      "enum_gallery_albums_settings_default_sort"
      DEFAULT '-createdAt';

    UPDATE "gallery_albums"
      SET "settings_default_sort" = '-createdAt'
      WHERE "settings_default_sort" IS NULL;

    ALTER TABLE "gallery_albums"
      ALTER COLUMN "settings_default_sort" SET DEFAULT '-createdAt';

    ALTER TABLE "gallery_albums"
      ALTER COLUMN "settings_default_sort" SET NOT NULL;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "gallery_albums" DROP COLUMN IF EXISTS "settings_default_sort";
    DROP TYPE IF EXISTS "public"."enum_gallery_albums_settings_default_sort";
  `)
}
