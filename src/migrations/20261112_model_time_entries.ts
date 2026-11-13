import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

/**
 * Built-in model time tracking (replaces Clockify):
 * - model_time_entries collection (+ source enum)
 * - models.time_tracking_total_seconds, maintained by the time-entry hooks
 * - lock rels so admin document locking works
 *
 * Differences from Payload's generated schema, on purpose:
 * - model_id FK is ON DELETE CASCADE (Payload would emit SET NULL on a NOT NULL
 *   column, which makes hard-deleting a model with entries fail).
 * - Two partial unique indexes Payload can't express: at most one running
 *   timer overall, and at most one Clockify import entry per model.
 *
 * Additive only. Coolify runs `payload migrate` (up).
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_model_time_entries_source" AS ENUM ('timer', 'manual', 'clockify-import');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE TABLE IF NOT EXISTS "model_time_entries" (
      "id" serial PRIMARY KEY NOT NULL,
      "model_id" integer NOT NULL,
      "started_at" timestamp(3) with time zone,
      "stopped_at" timestamp(3) with time zone,
      "duration_seconds" numeric,
      "source" "enum_model_time_entries_source" DEFAULT 'timer',
      "clockify_project_id" varchar,
      "note" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    DO $$ BEGIN
      ALTER TABLE "model_time_entries"
        ADD CONSTRAINT "model_time_entries_model_id_models_id_fk"
        FOREIGN KEY ("model_id") REFERENCES "public"."models"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE INDEX IF NOT EXISTS "model_time_entries_model_idx"
      ON "model_time_entries" USING btree ("model_id");
    CREATE INDEX IF NOT EXISTS "model_time_entries_started_at_idx"
      ON "model_time_entries" USING btree ("started_at");
    CREATE INDEX IF NOT EXISTS "model_time_entries_updated_at_idx"
      ON "model_time_entries" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "model_time_entries_created_at_idx"
      ON "model_time_entries" USING btree ("created_at");

    CREATE UNIQUE INDEX IF NOT EXISTS "model_time_entries_one_running"
      ON "model_time_entries" ((true))
      WHERE "stopped_at" IS NULL AND "started_at" IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS "model_time_entries_one_clockify_import"
      ON "model_time_entries" USING btree ("model_id")
      WHERE "source" = 'clockify-import';

    ALTER TABLE "models"
      ADD COLUMN IF NOT EXISTS "time_tracking_total_seconds" numeric DEFAULT 0;

    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "model_time_entries_id" integer;

    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_model_time_entries_fk"
        FOREIGN KEY ("model_time_entries_id") REFERENCES "public"."model_time_entries"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_model_time_entries_id_idx"
      ON "payload_locked_documents_rels" USING btree ("model_time_entries_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_model_time_entries_fk";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_model_time_entries_id_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "model_time_entries_id";

    ALTER TABLE "models" DROP COLUMN IF EXISTS "time_tracking_total_seconds";

    DROP TABLE IF EXISTS "model_time_entries" CASCADE;
    DROP TYPE IF EXISTS "public"."enum_model_time_entries_source";
  `);
}
