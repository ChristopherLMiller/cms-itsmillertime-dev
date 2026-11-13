import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

/**
 * Strip embedded-image blobs from stored EXIF.
 *
 * ExifReader's expanded output for Pixel Ultra HDR / Motion Photos includes
 * `mpf.Images[].base64` (the embedded images, 5–10 MB per record), and older
 * rows may still carry `Thumbnail` / `exif.MakerNote`. Every list query and the
 * admin upload picker loaded these, which made selecting media very slow
 * (50 Media rows was ~126 MB).
 *
 * Only blob keys are removed; all real tag values are kept. Applies to both
 * upload collections that store EXIF. Guarded: re-running is a no-op, and a
 * missing table/column is skipped.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    DECLARE
      tbl text;
      col_type text;
    BEGIN
      FOREACH tbl IN ARRAY ARRAY['media', 'gallery_images'] LOOP
        SELECT data_type INTO col_type
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'exif';

        CONTINUE WHEN col_type IS NULL;

        -- mpf.Images[*].base64
        EXECUTE format($q$
          UPDATE %1$I SET exif = (
            jsonb_set(
              exif::jsonb,
              '{mpf,Images}',
              (SELECT COALESCE(jsonb_agg(img - 'base64'), '[]'::jsonb)
                 FROM jsonb_array_elements(exif::jsonb -> 'mpf' -> 'Images') AS img)
            )
          )::%2$s
          WHERE jsonb_typeof(exif::jsonb -> 'mpf' -> 'Images') = 'array'
            AND jsonb_path_exists(exif::jsonb, '$.mpf.Images[*].base64')
        $q$, tbl, col_type);

        -- Thumbnail (top level) and exif.MakerNote
        EXECUTE format($q$
          UPDATE %1$I SET exif = ((exif::jsonb - 'Thumbnail') #- '{exif,MakerNote}')::%2$s
          WHERE jsonb_typeof(exif::jsonb) = 'object'
            AND (exif::jsonb ? 'Thumbnail' OR exif::jsonb -> 'exif' ? 'MakerNote')
        $q$, tbl, col_type);
      END LOOP;
    END $$;
  `);
}

/** The stripped blobs are not needed and cannot be restored. */
export async function down(_args: MigrateDownArgs): Promise<void> {}
