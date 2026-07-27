import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

/**
 * Repair: article relation columns were marked migrated but never applied on prod
 * (schema drift after the batch=-1 push/migrate mix-up). Safe to re-run — all
 * statements are IF NOT EXISTS / duplicate_object guarded.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "posts_rels" ADD COLUMN IF NOT EXISTS "models_id" integer;
    ALTER TABLE "posts_rels" ADD COLUMN IF NOT EXISTS "gallery_albums_id" integer;

    DO $$ BEGIN
      ALTER TABLE "posts_rels"
        ADD CONSTRAINT "posts_rels_models_fk"
        FOREIGN KEY ("models_id") REFERENCES "public"."models"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "posts_rels"
        ADD CONSTRAINT "posts_rels_gallery_albums_fk"
        FOREIGN KEY ("gallery_albums_id") REFERENCES "public"."gallery_albums"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE INDEX IF NOT EXISTS "posts_rels_models_id_idx" ON "posts_rels" USING btree ("models_id");
    CREATE INDEX IF NOT EXISTS "posts_rels_gallery_albums_id_idx" ON "posts_rels" USING btree ("gallery_albums_id");

    ALTER TABLE "_posts_v_rels" ADD COLUMN IF NOT EXISTS "models_id" integer;
    ALTER TABLE "_posts_v_rels" ADD COLUMN IF NOT EXISTS "gallery_albums_id" integer;

    DO $$ BEGIN
      ALTER TABLE "_posts_v_rels"
        ADD CONSTRAINT "_posts_v_rels_models_fk"
        FOREIGN KEY ("models_id") REFERENCES "public"."models"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "_posts_v_rels"
        ADD CONSTRAINT "_posts_v_rels_gallery_albums_fk"
        FOREIGN KEY ("gallery_albums_id") REFERENCES "public"."gallery_albums"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE INDEX IF NOT EXISTS "_posts_v_rels_models_id_idx" ON "_posts_v_rels" USING btree ("models_id");
    CREATE INDEX IF NOT EXISTS "_posts_v_rels_gallery_albums_id_idx" ON "_posts_v_rels" USING btree ("gallery_albums_id");

    INSERT INTO "posts_rels" ("order", "parent_id", "path", "models_id")
    SELECT
      mr."order",
      mr."posts_id",
      'relatedModels',
      mr."parent_id"
    FROM "models_rels" mr
    WHERE mr."path" = 'relatedResources.relatedPosts'
      AND mr."posts_id" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM "posts_rels" pr
        WHERE pr."parent_id" = mr."posts_id"
          AND pr."path" = 'relatedModels'
          AND pr."models_id" = mr."parent_id"
      );
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // No-op: original article_relations down owns the destructive rollback.
  await db.execute(sql`SELECT 1`);
}
