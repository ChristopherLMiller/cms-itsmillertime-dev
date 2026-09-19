import type { CollectionBeforeChangeHook } from 'payload';

/**
 * Ensures upload docs get a document-level R2/S3 prefix on create and re-upload.
 * Existing root (prefix-less) docs keep working until they receive a new file.
 *
 * Payload 3.90 treats `prefix` as storage-path data and only accepts changes
 * together with a file replacement. Metadata-only updates must keep the stored value.
 */
export const ensureUploadPrefix =
  (uploadPrefix: string): CollectionBeforeChangeHook =>
  ({ data, operation, originalDoc, req }) => {
    if (!data) return data;

    const hasIncomingFile = Boolean(req.file);

    if (operation === 'update' && !hasIncomingFile) {
      data.prefix = originalDoc?.prefix ?? null;
      return data;
    }

    if (!data.prefix) {
      data.prefix = uploadPrefix;
    }

    return data;
  };
