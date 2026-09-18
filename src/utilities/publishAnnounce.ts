import { frontendBaseUrl } from '@/utilities/productRequestUrls';
import type { AnnounceCollection } from '@/utilities/socialPlatforms';

type Sluggable = {
  slug?: string | null;
  title?: string | null;
  announce?: {
    notifiedAt?: string | null;
    skippedAt?: string | null;
  } | null;
  _status?: string | null;
  model_meta?: { status?: string | null } | null;
  settings?: {
    slug?: string | null;
    visibility?: string | null;
  } | null;
};

export function docPublicUrl(collection: AnnounceCollection, doc: Sluggable): string | null {
  const base = frontendBaseUrl();
  const slugFromDoc =
    typeof doc.slug === 'string' && doc.slug.trim().length > 0 ? doc.slug.trim() : null;
  const slugFromSettings =
    typeof doc.settings?.slug === 'string' && doc.settings.slug.trim().length > 0
      ? doc.settings.slug.trim()
      : null;
  const slug = slugFromDoc || slugFromSettings;
  if (!slug) return null;

  switch (collection) {
    case 'posts':
      return `${base}/articles/${encodeURIComponent(slug)}`;
    case 'models':
      return `${base}/models/${encodeURIComponent(slug)}`;
    case 'gallery-albums':
      return `${base}/galleries/${encodeURIComponent(slug)}`;
    default:
      return null;
  }
}

export function docTitle(doc: Sluggable): string {
  return typeof doc.title === 'string' && doc.title.trim() ? doc.title.trim() : 'Untitled';
}

/** True when the doc is in a first-announce-eligible state and has not been notified/skipped. */
export function isAnnounceEligible(
  collection: AnnounceCollection,
  doc: Sluggable,
  opts?: { hasPublishedDoc?: boolean },
): boolean {
  if (doc.announce?.notifiedAt || doc.announce?.skippedAt) return false;

  switch (collection) {
    case 'posts':
      return doc._status === 'published' || Boolean(opts?.hasPublishedDoc);
    case 'models': {
      const status = doc.model_meta?.status;
      return status === 'IN_PROGRESS' || status === 'COMPLETED';
    }
    case 'gallery-albums':
      return doc.settings?.visibility === 'ALL';
    default:
      return false;
  }
}

export function buildAnnounceContent(message: string, url: string): string {
  const trimmed = message.trim();
  if (!trimmed) return url;
  if (trimmed.includes(url)) return trimmed;
  return `${trimmed}\n${url}`;
}
