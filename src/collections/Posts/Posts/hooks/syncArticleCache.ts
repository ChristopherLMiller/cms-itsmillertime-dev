import { cacheDel, cacheKeys } from '@/lib/cache';
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload';

/**
 * Invalidate the Upstash article cache on publish/unpublish/delete so the next
 * www request misses and repopulates fresh from the CMS.
 */
export const syncArticleCache: CollectionAfterChangeHook = async ({ doc, previousDoc }) => {
  if (doc.id == null) return doc;

  const wasPublished = previousDoc?._status === 'published';
  const isPublished = doc._status === 'published';

  if (isPublished || wasPublished) {
    try {
      await cacheDel(cacheKeys.article(doc.id));
    } catch (err) {
      console.error(`[cache] Failed to invalidate article ${doc.id}:`, err);
    }
  }

  return doc;
};

export const removeArticleCacheOnDelete: CollectionAfterDeleteHook = async ({ doc }) => {
  if (doc.id == null) return doc;

  try {
    await cacheDel(cacheKeys.article(doc.id));
  } catch (err) {
    console.error(`[cache] Failed to invalidate deleted article ${doc.id}:`, err);
  }

  return doc;
};
