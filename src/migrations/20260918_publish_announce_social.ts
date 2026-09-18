import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Publish announce:
 * - social-destinations global (multi-instance platform configs)
 * - announce.notifiedAt / announce.skippedAt on posts, models, gallery-albums
 * - sendPublishAnnounce job task slug
 *
 * Additive only. `up()` never DROP/DELETE/TRUNCATE existing tables or wipe data.
 * Existing first-eligible docs are marked skipped so announce only prompts on new events.
 * Coolify runs `payload migrate` (up), not migrate:down.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_social_destinations_destinations_type" AS ENUM(
        'discord',
        'slack',
        'reddit',
        'x',
        'bluesky',
        'mastodon',
        'facebook',
        'instagram',
        'linkedin',
        'threads',
        'telegram',
        'tumblr',
        'pinterest',
        'custom_webhook'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    CREATE TABLE IF NOT EXISTS "social_destinations" (
      "id" serial PRIMARY KEY NOT NULL,
      "updated_at" timestamp(3) with time zone,
      "created_at" timestamp(3) with time zone
    );

    CREATE TABLE IF NOT EXISTS "social_destinations_destinations" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "label" varchar NOT NULL,
      "type" "enum_social_destinations_destinations_type" NOT NULL,
      "enabled" boolean DEFAULT true,
      "default_selected" boolean DEFAULT false,
      "webhook_url" varchar,
      "subreddit" varchar,
      "instance_url" varchar,
      "handle" varchar,
      "page_id" varchar,
      "board_id" varchar,
      "chat_id" varchar,
      "blog_name" varchar,
      "client_id" varchar,
      "client_secret" varchar,
      "access_token" varchar,
      "refresh_token" varchar,
      "api_key" varchar,
      "api_secret" varchar,
      "app_password" varchar,
      "bot_token" varchar,
      "bearer_token" varchar,
      "notes" varchar
    );

    DO $$ BEGIN
      ALTER TABLE "social_destinations_destinations"
        ADD CONSTRAINT "social_destinations_destinations_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."social_destinations"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE INDEX IF NOT EXISTS "social_destinations_destinations_order_idx"
      ON "social_destinations_destinations" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "social_destinations_destinations_parent_id_idx"
      ON "social_destinations_destinations" USING btree ("_parent_id");
  `)

  await db.execute(sql`
    ALTER TABLE "posts"
      ADD COLUMN IF NOT EXISTS "announce_notified_at" timestamp(3) with time zone;
    ALTER TABLE "posts"
      ADD COLUMN IF NOT EXISTS "announce_skipped_at" timestamp(3) with time zone;

    ALTER TABLE "_posts_v"
      ADD COLUMN IF NOT EXISTS "version_announce_notified_at" timestamp(3) with time zone;
    ALTER TABLE "_posts_v"
      ADD COLUMN IF NOT EXISTS "version_announce_skipped_at" timestamp(3) with time zone;

    ALTER TABLE "models"
      ADD COLUMN IF NOT EXISTS "announce_notified_at" timestamp(3) with time zone;
    ALTER TABLE "models"
      ADD COLUMN IF NOT EXISTS "announce_skipped_at" timestamp(3) with time zone;

    ALTER TABLE "gallery_albums"
      ADD COLUMN IF NOT EXISTS "announce_notified_at" timestamp(3) with time zone;
    ALTER TABLE "gallery_albums"
      ADD COLUMN IF NOT EXISTS "announce_skipped_at" timestamp(3) with time zone;
  `)

  // Existing eligible docs: mark skipped so the dialog only appears for new first events.
  await db.execute(sql`
    UPDATE "posts"
    SET "announce_skipped_at" = NOW()
    WHERE "_status" = 'published'
      AND "announce_notified_at" IS NULL
      AND "announce_skipped_at" IS NULL;

    UPDATE "models"
    SET "announce_skipped_at" = NOW()
    WHERE "model_meta_status" IN ('IN_PROGRESS', 'COMPLETED')
      AND "announce_notified_at" IS NULL
      AND "announce_skipped_at" IS NULL;

    UPDATE "gallery_albums"
    SET "announce_skipped_at" = NOW()
    WHERE "settings_visibility" = 'ALL'
      AND "announce_notified_at" IS NULL
      AND "announce_skipped_at" IS NULL;
  `)

  await db.execute(sql`
    ALTER TYPE "public"."enum_payload_jobs_task_slug"
      ADD VALUE IF NOT EXISTS 'sendPublishAnnounce';
  `)
  await db.execute(sql`
    ALTER TYPE "public"."enum_payload_jobs_log_task_slug"
      ADD VALUE IF NOT EXISTS 'sendPublishAnnounce';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "gallery_albums" DROP COLUMN IF EXISTS "announce_skipped_at";
    ALTER TABLE "gallery_albums" DROP COLUMN IF EXISTS "announce_notified_at";
    ALTER TABLE "models" DROP COLUMN IF EXISTS "announce_skipped_at";
    ALTER TABLE "models" DROP COLUMN IF EXISTS "announce_notified_at";
    ALTER TABLE "_posts_v" DROP COLUMN IF EXISTS "version_announce_skipped_at";
    ALTER TABLE "_posts_v" DROP COLUMN IF EXISTS "version_announce_notified_at";
    ALTER TABLE "posts" DROP COLUMN IF EXISTS "announce_skipped_at";
    ALTER TABLE "posts" DROP COLUMN IF EXISTS "announce_notified_at";

    ALTER TABLE "social_destinations_destinations"
      DROP CONSTRAINT IF EXISTS "social_destinations_destinations_parent_id_fk";
    DROP INDEX IF EXISTS "social_destinations_destinations_order_idx";
    DROP INDEX IF EXISTS "social_destinations_destinations_parent_id_idx";
    DROP TABLE IF EXISTS "social_destinations_destinations";
    DROP TABLE IF EXISTS "social_destinations";
    DROP TYPE IF EXISTS "public"."enum_social_destinations_destinations_type";
  `)
}
