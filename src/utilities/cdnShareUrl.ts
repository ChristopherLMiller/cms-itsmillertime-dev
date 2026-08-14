const CDN_HOSTS: Record<string, string> = {
  media: 'media.itsmillertime.dev',
  'gallery-images': 'gallery-images.itsmillertime.dev',
};

const CMS_URL_FALLBACK = 'https://cms.itsmillertime.dev';

/**
 * Rewrite a Payload file URL to the Cloudflare-cached CDN host.
 *
 * `https://cms.itsmillertime.dev/api/gallery-images/file/IMG_3213.jpg?prefix=gallery-images`
 * → `https://gallery-images.itsmillertime.dev/IMG_3213.jpg?prefix=gallery-images`
 */
export function toCdnShareUrl(
  collectionSlug: string | undefined,
  fileUrl: string | null | undefined,
  filename?: string | null,
  prefix?: string | null,
): string | null {
  const host = collectionSlug ? CDN_HOSTS[collectionSlug] : undefined;
  if (!host) return null;

  if (fileUrl) {
    try {
      const parsed = new URL(fileUrl, CMS_URL_FALLBACK);
      const name = parsed.pathname.split('/').filter(Boolean).pop();
      if (name) {
        return `https://${host}/${name}${parsed.search}`;
      }
    } catch {
      // Fall through to filename + prefix.
    }
  }

  if (!filename) return null;
  const search = prefix ? `?prefix=${encodeURIComponent(prefix)}` : '';
  return `https://${host}/${encodeURIComponent(filename)}${search}`;
}
