import type { CollectionBeforeChangeHook } from 'payload';

/**
 * Ensures upload docs get a document-level R2/S3 prefix on create and re-upload.
 * Existing root (prefix-less) docs keep working until they receive a new file.
 */
export const ensureUploadPrefix =
  (uploadPrefix: string): CollectionBeforeChangeHook =>
  ({ data, operation, originalDoc, req }) => {
    if (!data) return data;

    // Preserve an existing stored prefix on updates that omit it
    if (!data.prefix && originalDoc && typeof originalDoc.prefix === 'string' && originalDoc.prefix) {
      data.prefix = originalDoc.prefix;
      return data;
    }

    const hasIncomingFile = Boolean(req.file);
    const prefixMissing = !data.prefix;

    if (prefixMissing && (operation === 'create' || hasIncomingFile)) {
      data.prefix = uploadPrefix;
    }

    return data;
  };
