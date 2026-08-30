import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Site settings global:
 * - AI provider/model/key + prompts array
 * - Last.fm username/key
 * - Resend key + from address/name
 *
 * Additive only. `up()` never DROP/DELETE/TRUNCATE/ALTER existing tables.
 * Payload's migrate:create emitted a full-schema dump (local drizzle snapshot
 * was empty); that dump was discarded. Coolify runs `payload migrate` (up),
 * not migrate:down.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_site_settings_ai_provider" AS ENUM(
        'anthropic',
        'openai'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    CREATE TABLE IF NOT EXISTS "site_settings" (
      "id" serial PRIMARY KEY NOT NULL,
      "ai_provider" "enum_site_settings_ai_provider" DEFAULT 'anthropic',
      "ai_model" varchar DEFAULT 'claude-sonnet-5',
      "ai_api_key" varchar,
      "lastfm_username" varchar,
      "lastfm_api_key" varchar,
      "email_resend_api_key" varchar,
      "email_from_address" varchar DEFAULT 'support@itsmillertime.dev',
      "email_from_name" varchar DEFAULT 'ItsMillerTime',
      "updated_at" timestamp(3) with time zone,
      "created_at" timestamp(3) with time zone
    );

    CREATE TABLE IF NOT EXISTS "site_settings_ai_prompts" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "slug" varchar NOT NULL,
      "label" varchar NOT NULL,
      "body" varchar NOT NULL
    );

    DO $$ BEGIN
      ALTER TABLE "site_settings_ai_prompts"
        ADD CONSTRAINT "site_settings_ai_prompts_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE INDEX IF NOT EXISTS "site_settings_ai_prompts_order_idx"
      ON "site_settings_ai_prompts" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "site_settings_ai_prompts_parent_id_idx"
      ON "site_settings_ai_prompts" USING btree ("_parent_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "site_settings_ai_prompts"
      DROP CONSTRAINT IF EXISTS "site_settings_ai_prompts_parent_id_fk";
    DROP INDEX IF EXISTS "site_settings_ai_prompts_order_idx";
    DROP INDEX IF EXISTS "site_settings_ai_prompts_parent_id_idx";
    DROP TABLE IF EXISTS "site_settings_ai_prompts";
    DROP TABLE IF EXISTS "site_settings";
    DROP TYPE IF EXISTS "public"."enum_site_settings_ai_provider";
  `)
}
