import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

/**
 * Remove the Clockify integration now that time tracking is built in.
 *
 * - models.clockify_project: dropped (the project picker is gone).
 * - model_time_entries.source: 'clockify-import' is renamed to 'imported' so
 *   the totals already carried over from Clockify are kept as-is (fixed
 *   duration, no timestamps). Their note still names the Clockify project.
 * - model_time_entries.clockify_project_id and the one-import-per-model index:
 *   dropped.
 *
 * Every step is guarded so a re-run is a no-op.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "model_time_entries_one_clockify_import";

    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'enum_model_time_entries_source' AND e.enumlabel = 'clockify-import'
      ) THEN
        ALTER TYPE "public"."enum_model_time_entries_source" RENAME VALUE 'clockify-import' TO 'imported';
      END IF;
    END $$;

    ALTER TABLE "model_time_entries" DROP COLUMN IF EXISTS "clockify_project_id";
    ALTER TABLE "models" DROP COLUMN IF EXISTS "clockify_project";
  `);
}

/** Restores the schema shape only; dropped Clockify project ids are not recoverable. */
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "models" ADD COLUMN IF NOT EXISTS "clockify_project" varchar;
    ALTER TABLE "model_time_entries" ADD COLUMN IF NOT EXISTS "clockify_project_id" varchar;

    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'enum_model_time_entries_source' AND e.enumlabel = 'imported'
      ) THEN
        ALTER TYPE "public"."enum_model_time_entries_source" RENAME VALUE 'imported' TO 'clockify-import';
      END IF;
    END $$;

    CREATE UNIQUE INDEX IF NOT EXISTS "model_time_entries_one_clockify_import"
      ON "model_time_entries" USING btree ("model_id")
      WHERE "source" = 'clockify-import';
  `);
}
