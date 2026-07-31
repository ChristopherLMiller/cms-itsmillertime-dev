import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Restore models.relatedPosts relationship rows from posts.relatedModels so
 * both sides can edit the link again (join-only reverse UI was insufficient).
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    INSERT INTO "models_rels" ("order", "parent_id", "path", "posts_id")
    SELECT
      pr."order",
      pr."models_id",
      'relatedPosts',
      pr."parent_id"
    FROM "posts_rels" pr
    WHERE pr."path" = 'relatedModels'
      AND pr."models_id" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM "models_rels" mr
        WHERE mr."parent_id" = pr."models_id"
          AND mr."path" = 'relatedPosts'
          AND mr."posts_id" = pr."parent_id"
      );
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DELETE FROM "models_rels" WHERE "path" = 'relatedPosts';
  `)
}
