import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Gallery product waitlist:
 * - gallery_product_requests collection
 * - lock-document rel so admin document locking works
 * - job/webhook enum values + MCP API key columns
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_gallery_product_requests_status" AS ENUM(
        'pending',
        'notified',
        'cancelled'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    CREATE TABLE IF NOT EXISTS "gallery_product_requests" (
      "id" serial PRIMARY KEY NOT NULL,
      "gallery_image_id" integer NOT NULL,
      "name" varchar NOT NULL,
      "email" varchar NOT NULL,
      "status" "enum_gallery_product_requests_status" DEFAULT 'pending' NOT NULL,
      "album_slug" varchar,
      "image_title" varchar,
      "image_url" varchar,
      "notified_at" timestamp(3) with time zone,
      "user_id" integer,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    DO $$ BEGIN
      ALTER TABLE "gallery_product_requests"
        ADD CONSTRAINT "gallery_product_requests_gallery_image_id_gallery_images_id_fk"
        FOREIGN KEY ("gallery_image_id") REFERENCES "public"."gallery_images"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "gallery_product_requests"
        ADD CONSTRAINT "gallery_product_requests_user_id_users_id_fk"
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE INDEX IF NOT EXISTS "gallery_product_requests_gallery_image_idx"
      ON "gallery_product_requests" USING btree ("gallery_image_id");
    CREATE INDEX IF NOT EXISTS "gallery_product_requests_email_idx"
      ON "gallery_product_requests" USING btree ("email");
    CREATE INDEX IF NOT EXISTS "gallery_product_requests_status_idx"
      ON "gallery_product_requests" USING btree ("status");
    CREATE INDEX IF NOT EXISTS "gallery_product_requests_user_idx"
      ON "gallery_product_requests" USING btree ("user_id");
    CREATE INDEX IF NOT EXISTS "gallery_product_requests_updated_at_idx"
      ON "gallery_product_requests" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "gallery_product_requests_created_at_idx"
      ON "gallery_product_requests" USING btree ("created_at");

    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "gallery_product_requests_id" integer;

    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_gallery_product_requests_fk"
        FOREIGN KEY ("gallery_product_requests_id") REFERENCES "public"."gallery_product_requests"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_gallery_product_requests_i_idx"
      ON "payload_locked_documents_rels" USING btree ("gallery_product_requests_id");

    ALTER TABLE "payload_mcp_api_keys"
      ADD COLUMN IF NOT EXISTS "gallery_product_requests_find" boolean DEFAULT false;
    ALTER TABLE "payload_mcp_api_keys"
      ADD COLUMN IF NOT EXISTS "gallery_product_requests_create" boolean DEFAULT false;
    ALTER TABLE "payload_mcp_api_keys"
      ADD COLUMN IF NOT EXISTS "gallery_product_requests_update" boolean DEFAULT false;
    ALTER TABLE "payload_mcp_api_keys"
      ADD COLUMN IF NOT EXISTS "gallery_product_requests_delete" boolean DEFAULT false;
  `)

  await db.execute(sql`
    ALTER TYPE "public"."enum_payload_jobs_task_slug"
      ADD VALUE IF NOT EXISTS 'sendProductRequestAdminEmail';
  `)
  await db.execute(sql`
    ALTER TYPE "public"."enum_payload_jobs_task_slug"
      ADD VALUE IF NOT EXISTS 'sendProductRequestAvailableEmail';
  `)
  await db.execute(sql`
    ALTER TYPE "public"."enum_payload_jobs_log_task_slug"
      ADD VALUE IF NOT EXISTS 'sendProductRequestAdminEmail';
  `)
  await db.execute(sql`
    ALTER TYPE "public"."enum_payload_jobs_log_task_slug"
      ADD VALUE IF NOT EXISTS 'sendProductRequestAvailableEmail';
  `)
  await db.execute(sql`
    ALTER TYPE "public"."enum_webhooks_collections_collection"
      ADD VALUE IF NOT EXISTS 'gallery-product-requests';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_gallery_product_requests_fk";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_gallery_product_requests_i_idx";
    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "gallery_product_requests_id";

    ALTER TABLE "payload_mcp_api_keys"
      DROP COLUMN IF EXISTS "gallery_product_requests_find";
    ALTER TABLE "payload_mcp_api_keys"
      DROP COLUMN IF EXISTS "gallery_product_requests_create";
    ALTER TABLE "payload_mcp_api_keys"
      DROP COLUMN IF EXISTS "gallery_product_requests_update";
    ALTER TABLE "payload_mcp_api_keys"
      DROP COLUMN IF EXISTS "gallery_product_requests_delete";

    DROP TABLE IF EXISTS "gallery_product_requests";
    DROP TYPE IF EXISTS "public"."enum_gallery_product_requests_status";
  `)
}
