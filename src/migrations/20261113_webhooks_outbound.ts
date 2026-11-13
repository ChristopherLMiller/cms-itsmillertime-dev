import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

/**
 * payload-plugin-webhooks 1.3.0: outbound webhooks.
 * - webhook_endpoints (+ events collections/operations selects, headers array)
 * - webhook_deliveries (delivery log)
 * - lock rels so admin document locking works
 * - `deliverWebhook` task slug on the payload_jobs enums (`webhooks` queue)
 *
 * The events-collections enum lists every collection slug at the time of writing.
 * Adding a new collection later needs an ADD VALUE here-style migration so it can
 * be picked as a webhook trigger.
 *
 * Additive only. Coolify runs `payload migrate` (up).
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_webhook_endpoints_events_collections" AS ENUM(
        'map-markers', 'media', 'posts', 'posts-categories', 'posts-tags', 'pages',
        'gallery-albums', 'gallery-images', 'gallery-masters', 'gallery-product-requests',
        'gallery-tags', 'gallery-categories', 'gardens', 'kits', 'scales', 'manufacturers',
        'models-tags', 'models', 'model-time-entries', 'projects', 'projects-categories',
        'projects-technologies', 'sessions', 'accounts', 'verifications', 'twoFactors',
        'passkeys', 'apikeys', 'search', 'google-photos-oauth', 'google-photos-imports'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_webhook_endpoints_events_operations" AS ENUM('create', 'update', 'delete');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_webhook_endpoints_method" AS ENUM('POST', 'PUT', 'PATCH');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_webhook_endpoints_authentication_type" AS ENUM('none', 'bearer', 'basic', 'header');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_webhook_deliveries_status" AS ENUM('pending', 'success', 'failed', 'skipped');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE TABLE IF NOT EXISTS "webhook_endpoints" (
      "id" serial PRIMARY KEY NOT NULL,
      "enabled" boolean DEFAULT true,
      "run_as_id" integer NOT NULL,
      "include_document" boolean DEFAULT true,
      "timeout_seconds" numeric DEFAULT 10,
      "name" varchar NOT NULL,
      "method" "enum_webhook_endpoints_method" DEFAULT 'POST' NOT NULL,
      "url" varchar NOT NULL,
      "authentication_type" "enum_webhook_endpoints_authentication_type" DEFAULT 'none' NOT NULL,
      "authentication_token" varchar,
      "authentication_username" varchar,
      "authentication_password" varchar,
      "authentication_header_name" varchar,
      "authentication_header_value" varchar,
      "signing_secret" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "webhook_endpoints_events_collections" (
      "order" integer NOT NULL,
      "parent_id" integer NOT NULL,
      "value" "enum_webhook_endpoints_events_collections",
      "id" serial PRIMARY KEY NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "webhook_endpoints_events_operations" (
      "order" integer NOT NULL,
      "parent_id" integer NOT NULL,
      "value" "enum_webhook_endpoints_events_operations",
      "id" serial PRIMARY KEY NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "webhook_endpoints_headers" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "name" varchar NOT NULL,
      "value" varchar NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "webhook_deliveries" (
      "id" serial PRIMARY KEY NOT NULL,
      "endpoint_id" integer,
      "event" varchar,
      "document_id" varchar,
      "status" "enum_webhook_deliveries_status" DEFAULT 'pending',
      "attempts" numeric DEFAULT 0,
      "response_status" numeric,
      "duration_ms" numeric,
      "last_attempt_at" timestamp(3) with time zone,
      "error" varchar,
      "response_body" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "webhook_endpoints_id" integer;
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "webhook_deliveries_id" integer;

    DO $$ BEGIN
      ALTER TABLE "webhook_endpoints_events_collections" ADD CONSTRAINT "webhook_endpoints_events_collections_parent_fk"
        FOREIGN KEY ("parent_id") REFERENCES "public"."webhook_endpoints"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "webhook_endpoints_events_operations" ADD CONSTRAINT "webhook_endpoints_events_operations_parent_fk"
        FOREIGN KEY ("parent_id") REFERENCES "public"."webhook_endpoints"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "webhook_endpoints_headers" ADD CONSTRAINT "webhook_endpoints_headers_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."webhook_endpoints"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_run_as_id_users_id_fk"
        FOREIGN KEY ("run_as_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_endpoint_id_webhook_endpoints_id_fk"
        FOREIGN KEY ("endpoint_id") REFERENCES "public"."webhook_endpoints"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_webhook_endpoints_fk"
        FOREIGN KEY ("webhook_endpoints_id") REFERENCES "public"."webhook_endpoints"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_webhook_deliveries_fk"
        FOREIGN KEY ("webhook_deliveries_id") REFERENCES "public"."webhook_deliveries"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE INDEX IF NOT EXISTS "webhook_endpoints_events_collections_order_idx" ON "webhook_endpoints_events_collections" USING btree ("order");
    CREATE INDEX IF NOT EXISTS "webhook_endpoints_events_collections_parent_idx" ON "webhook_endpoints_events_collections" USING btree ("parent_id");
    CREATE INDEX IF NOT EXISTS "webhook_endpoints_events_operations_order_idx" ON "webhook_endpoints_events_operations" USING btree ("order");
    CREATE INDEX IF NOT EXISTS "webhook_endpoints_events_operations_parent_idx" ON "webhook_endpoints_events_operations" USING btree ("parent_id");
    CREATE INDEX IF NOT EXISTS "webhook_endpoints_headers_order_idx" ON "webhook_endpoints_headers" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "webhook_endpoints_headers_parent_id_idx" ON "webhook_endpoints_headers" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "webhook_endpoints_run_as_idx" ON "webhook_endpoints" USING btree ("run_as_id");
    CREATE INDEX IF NOT EXISTS "webhook_endpoints_updated_at_idx" ON "webhook_endpoints" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "webhook_endpoints_created_at_idx" ON "webhook_endpoints" USING btree ("created_at");
    CREATE INDEX IF NOT EXISTS "webhook_deliveries_endpoint_idx" ON "webhook_deliveries" USING btree ("endpoint_id");
    CREATE INDEX IF NOT EXISTS "webhook_deliveries_document_id_idx" ON "webhook_deliveries" USING btree ("document_id");
    CREATE INDEX IF NOT EXISTS "webhook_deliveries_status_idx" ON "webhook_deliveries" USING btree ("status");
    CREATE INDEX IF NOT EXISTS "webhook_deliveries_updated_at_idx" ON "webhook_deliveries" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "webhook_deliveries_created_at_idx" ON "webhook_deliveries" USING btree ("created_at");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_webhook_endpoints_id_idx" ON "payload_locked_documents_rels" USING btree ("webhook_endpoints_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_webhook_deliveries_id_idx" ON "payload_locked_documents_rels" USING btree ("webhook_deliveries_id");
  `);

  // ADD VALUE can't run inside a DO block; keep these as separate statements.
  await db.execute(sql`
    ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE IF NOT EXISTS 'deliverWebhook';
  `);
  await db.execute(sql`
    ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE IF NOT EXISTS 'deliverWebhook';
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Enum values added to payload_jobs enums are left in place (Postgres can't drop them).
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_webhook_endpoints_fk";
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_webhook_deliveries_fk";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_webhook_endpoints_id_idx";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_webhook_deliveries_id_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "webhook_endpoints_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "webhook_deliveries_id";

    DROP TABLE IF EXISTS "webhook_deliveries" CASCADE;
    DROP TABLE IF EXISTS "webhook_endpoints_headers" CASCADE;
    DROP TABLE IF EXISTS "webhook_endpoints_events_operations" CASCADE;
    DROP TABLE IF EXISTS "webhook_endpoints_events_collections" CASCADE;
    DROP TABLE IF EXISTS "webhook_endpoints" CASCADE;

    DROP TYPE IF EXISTS "public"."enum_webhook_deliveries_status";
    DROP TYPE IF EXISTS "public"."enum_webhook_endpoints_authentication_type";
    DROP TYPE IF EXISTS "public"."enum_webhook_endpoints_method";
    DROP TYPE IF EXISTS "public"."enum_webhook_endpoints_events_operations";
    DROP TYPE IF EXISTS "public"."enum_webhook_endpoints_events_collections";
  `);
}
