import { toCdnShareUrl } from './cdnShareUrl';

const FRONTEND_FALLBACK = 'https://www.itsmillertime.dev';
const CMS_FALLBACK = 'https://cms.itsmillertime.dev';

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

export function frontendBaseUrl(): string {
  return stripTrailingSlash(process.env.NEXT_PUBLIC_FRONTEND_URL || FRONTEND_FALLBACK);
}

export function cmsBaseUrl(): string {
  return stripTrailingSlash(process.env.NEXT_PUBLIC_SERVER_URL || CMS_FALLBACK);
}

export function galleryImagePublicUrl(
  albumSlug: string | null | undefined,
  imageId: number,
): string | null {
  if (!albumSlug) return null;
  return `${frontendBaseUrl()}/galleries/${encodeURIComponent(albumSlug)}?selected=${imageId}`;
}

export function galleryImageCmsUrl(imageId: number): string {
  return `${cmsBaseUrl()}/admin/collections/gallery-images/${imageId}`;
}

export function galleryImageEmailSrc(image: {
  url?: string | null;
  filename?: string | null;
  prefix?: string | null;
}): string | null {
  return toCdnShareUrl('gallery-images', image.url, image.filename, image.prefix);
}
