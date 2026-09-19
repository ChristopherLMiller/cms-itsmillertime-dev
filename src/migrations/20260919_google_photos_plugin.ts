import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * payload-plugin-google-photos:
 * - google_photos_oauth / google_photos_imports plugin tables
 * - lock + preference rel columns so Better Auth / admin document-lock queries succeed
 *
 * Additive only. Production runs `payload migrate` (up).
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "google_photos_oauth" (
      "id" serial PRIMARY KEY NOT NULL,
      "user_id" integer NOT NULL,
      "google_email" varchar,
      "encrypted_refresh_token" varchar NOT NULL,
      "access_token" varchar,
      "access_token_expires_at" timestamp(3) with time zone,
      "scope" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    DO $$ BEGIN
      ALTER TABLE "google_photos_oauth"
        ADD CONSTRAINT "google_photos_oauth_user_id_users_id_fk"
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE UNIQUE INDEX IF NOT EXISTS "google_photos_oauth_user_idx"
      ON "google_photos_oauth" USING btree ("user_id");
    CREATE INDEX IF NOT EXISTS "google_photos_oauth_updated_at_idx"
      ON "google_photos_oauth" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "google_photos_oauth_created_at_idx"
      ON "google_photos_oauth" USING btree ("created_at");

    CREATE TABLE IF NOT EXISTS "google_photos_imports" (
      "id" serial PRIMARY KEY NOT NULL,
      "google_photos_id" varchar NOT NULL,
      "target_collection" varchar NOT NULL,
      "document_id" varchar NOT NULL,
      "filename" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "google_photos_imports_google_photos_id_target_collecti_idx"
      ON "google_photos_imports" USING btree ("google_photos_id", "target_collection");
    CREATE INDEX IF NOT EXISTS "google_photos_imports_google_photos_id_idx"
      ON "google_photos_imports" USING btree ("google_photos_id");
    CREATE INDEX IF NOT EXISTS "google_photos_imports_target_collection_idx"
      ON "google_photos_imports" USING btree ("target_collection");
    CREATE INDEX IF NOT EXISTS "google_photos_imports_updated_at_idx"
      ON "google_photos_imports" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "google_photos_imports_created_at_idx"
      ON "google_photos_imports" USING btree ("created_at");

    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "google_photos_oauth_id" integer;
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "google_photos_imports_id" integer;

    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_google_photos_oauth_fk"
        FOREIGN KEY ("google_photos_oauth_id") REFERENCES "public"."google_photos_oauth"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_google_photos_imports_fk"
        FOREIGN KEY ("google_photos_imports_id") REFERENCES "public"."google_photos_imports"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_google_photos_oauth_id_idx"
      ON "payload_locked_documents_rels" USING btree ("google_photos_oauth_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_google_photos_imports_id_idx"
      ON "payload_locked_documents_rels" USING btree ("google_photos_imports_id");

    ALTER TABLE "payload_preferences_rels"
      ADD COLUMN IF NOT EXISTS "google_photos_oauth_id" integer;
    ALTER TABLE "payload_preferences_rels"
      ADD COLUMN IF NOT EXISTS "google_photos_imports_id" integer;

    DO $$ BEGIN
      ALTER TABLE "payload_preferences_rels"
        ADD CONSTRAINT "payload_preferences_rels_google_photos_oauth_fk"
        FOREIGN KEY ("google_photos_oauth_id") REFERENCES "public"."google_photos_oauth"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "payload_preferences_rels"
        ADD CONSTRAINT "payload_preferences_rels_google_photos_imports_fk"
        FOREIGN KEY ("google_photos_imports_id") REFERENCES "public"."google_photos_imports"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE INDEX IF NOT EXISTS "payload_preferences_rels_google_photos_oauth_id_idx"
      ON "payload_preferences_rels" USING btree ("google_photos_oauth_id");
    CREATE INDEX IF NOT EXISTS "payload_preferences_rels_google_photos_imports_id_idx"
      ON "payload_preferences_rels" USING btree ("google_photos_imports_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_google_photos_oauth_fk";
    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_google_photos_imports_fk";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_google_photos_oauth_id_idx";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_google_photos_imports_id_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "google_photos_oauth_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "google_photos_imports_id";

    ALTER TABLE "payload_preferences_rels"
      DROP CONSTRAINT IF EXISTS "payload_preferences_rels_google_photos_oauth_fk";
    ALTER TABLE "payload_preferences_rels"
      DROP CONSTRAINT IF EXISTS "payload_preferences_rels_google_photos_imports_fk";
    DROP INDEX IF EXISTS "payload_preferences_rels_google_photos_oauth_id_idx";
    DROP INDEX IF EXISTS "payload_preferences_rels_google_photos_imports_id_idx";
    ALTER TABLE "payload_preferences_rels" DROP COLUMN IF EXISTS "google_photos_oauth_id";
    ALTER TABLE "payload_preferences_rels" DROP COLUMN IF EXISTS "google_photos_imports_id";

    DROP TABLE IF EXISTS "google_photos_imports";
    DROP TABLE IF EXISTS "google_photos_oauth";
  `)
}
