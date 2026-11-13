/**
 * Keys that commonly hold large binary/base64 blobs from ExifReader expanded output.
 * `base64` is the embedded-image payload under `mpf.Images[]` (Pixel Ultra HDR /
 * Motion Photos): it can be the whole primary image again, 5–10 MB per record.
 */
const EXIF_HEAVY_KEYS = new Set(['Thumbnail', 'thumbnail', 'MakerNote', 'makerNote', 'icc', 'base64']);

/** Backstop for blobs under keys we don't know about yet. No real tag value is this long. */
const MAX_STRING_LENGTH = 16 * 1024;

/**
 * Strip binary/thumbnail payloads and null bytes so EXIF JSON stays small enough
 * for Payload admin Server Action saves (Next.js default body limit is 1MB).
 * PostgreSQL JSON/JSONB also rejects `\u0000` (IPTC ApplicationRecordVersion).
 */
export function sanitizeExifForStorage(rawExif: unknown): Record<string, unknown> | null {
  if (rawExif == null) return null;

  const stripHeavy = (value: unknown): unknown => {
    if (value == null) return value;
    if (typeof value === 'string') {
      return value.length > MAX_STRING_LENGTH ? undefined : value.replaceAll('\u0000', '');
    }
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
