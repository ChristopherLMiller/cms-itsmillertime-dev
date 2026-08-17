/** Keys that commonly hold large binary/base64 blobs from ExifReader expanded output */
const EXIF_HEAVY_KEYS = new Set(['Thumbnail', 'thumbnail', 'MakerNote', 'makerNote', 'icc']);

/**
 * Strip binary/thumbnail payloads and null bytes so EXIF JSON stays small enough
 * for Payload admin Server Action saves (Next.js default body limit is 1MB).
 * PostgreSQL JSON/JSONB also rejects `\u0000` (IPTC ApplicationRecordVersion).
 */
export function sanitizeExifForStorage(rawExif: unknown): Record<string, unknown> | null {
  if (rawExif == null) return null;

  const stripHeavy = (value: unknown): unknown => {
    if (value == null) return value;
    if (typeof value === 'string') return value.replaceAll('\u0000', '');
    if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) return undefined;
    if (ArrayBuffer.isView?.(value)) return undefined;
    if (Array.isArray(value)) return value.map(stripHeavy).filter((v) => v !== undefined);
    if (typeof value === 'object') {
      const out: Record<string, unknown> = {};
      for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        if (EXIF_HEAVY_KEYS.has(key)) continue;
        const cleaned = stripHeavy(child);
        if (cleaned !== undefined) out[key] = cleaned;
      }
      return out;
    }
    return value;
  };

  try {
    const stripped = stripHeavy(rawExif);
    return JSON.parse(JSON.stringify(stripped).replace(/\\u0000/g, ''));
  } catch {
    return { _error: 'failed_to_sanitize_exif' };
  }
}
