import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Private gallery master originals:
 * - gallery_masters upload collection (no imageSizes / focal point)
 * - gallery_images.master_id relation
 * - lock/preference rels so admin document locking works
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "gallery_masters" (
      "id" serial PRIMARY KEY NOT NULL,
      "prefix" varchar DEFAULT 'gallery-masters',
      "alt" varchar NOT NULL,
      "source_stem" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "url" varchar,
      "thumbnail_u_r_l" varchar,
      "filename" varchar,
      "mime_type" varchar,
      "filesize" numeric,
      "width" numeric,
      "height" numeric
    );

    CREATE INDEX IF NOT EXISTS "gallery_masters_updated_at_idx"
      ON "gallery_masters" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "gallery_masters_created_at_idx"
      ON "gallery_masters" USING btree ("created_at");
    CREATE UNIQUE INDEX IF NOT EXISTS "gallery_masters_filename_idx"
      ON "gallery_masters" USING btree ("filename");

    ALTER TABLE "gallery_images"
      ADD COLUMN IF NOT EXISTS "master_id" integer;

    DO $$ BEGIN
      ALTER TABLE "gallery_images"
        ADD CONSTRAINT "gallery_images_master_id_gallery_masters_id_fk"
        FOREIGN KEY ("master_id") REFERENCES "public"."gallery_masters"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE INDEX IF NOT EXISTS "gallery_images_master_idx"
      ON "gallery_images" USING btree ("master_id");

    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "gallery_masters_id" integer;

    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_gallery_masters_fk"
        FOREIGN KEY ("gallery_masters_id") REFERENCES "public"."gallery_masters"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_gallery_masters_id_idx"
      ON "payload_locked_documents_rels" USING btree ("gallery_masters_id");

    ALTER TABLE "payload_preferences_rels"
      ADD COLUMN IF NOT EXISTS "gallery_masters_id" integer;

    DO $$ BEGIN
      ALTER TABLE "payload_preferences_rels"
        ADD CONSTRAINT "payload_preferences_rels_gallery_masters_fk"
        FOREIGN KEY ("gallery_masters_id") REFERENCES "public"."gallery_masters"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE INDEX IF NOT EXISTS "payload_preferences_rels_gallery_masters_id_idx"
      ON "payload_preferences_rels" USING btree ("gallery_masters_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "gallery_images" DROP CONSTRAINT IF EXISTS "gallery_images_master_id_gallery_masters_id_fk";
    DROP INDEX IF EXISTS "gallery_images_master_idx";
    ALTER TABLE "gallery_images" DROP COLUMN IF EXISTS "master_id";

    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_gallery_masters_fk";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_gallery_masters_id_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "gallery_masters_id";

    ALTER TABLE "payload_preferences_rels" DROP CONSTRAINT IF EXISTS "payload_preferences_rels_gallery_masters_fk";
    DROP INDEX IF EXISTS "payload_preferences_rels_gallery_masters_id_idx";
    ALTER TABLE "payload_preferences_rels" DROP COLUMN IF EXISTS "gallery_masters_id";

    DROP TABLE IF EXISTS "gallery_masters";
  `)
}
