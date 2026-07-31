import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Models.relatedResources.relatedPosts is now a join on posts.relatedModels
 * (Payload's reverse-relationship pattern) instead of a second writable
 * relationship kept in sync by hooks.
 *
 * - Re-backfill any model→post links missing from posts.relatedModels
 * - Drop the old models_rels rows for relatedResources.relatedPosts
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
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

    DELETE FROM "models_rels"
    WHERE "path" = 'relatedResources.relatedPosts';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Restore model-side relationship rows from posts.relatedModels so a
  // relationship field can read them again if this migration is reverted.
  await db.execute(sql`
    INSERT INTO "models_rels" ("order", "parent_id", "path", "posts_id")
    SELECT
      pr."order",
      pr."models_id",
      'relatedResources.relatedPosts',
      pr."parent_id"
    FROM "posts_rels" pr
    WHERE pr."path" = 'relatedModels'
      AND pr."models_id" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM "models_rels" mr
        WHERE mr."parent_id" = pr."models_id"
          AND mr."path" = 'relatedResources.relatedPosts'
          AND mr."posts_id" = pr."parent_id"
      );
  `)
}
