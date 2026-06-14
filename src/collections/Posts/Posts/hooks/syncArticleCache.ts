import { removeArticleCache, setArticleCache } from '@/lib/cache/articleCache';
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload';

/**
 * When an article is published (or re-published), write the full document to
 * Upstash at `payload:article:{id}` for the www frontend article loader.
 */
export const syncArticleCache: CollectionAfterChangeHook = async ({ doc, previousDoc, req }) => {
  const articleId = doc.id;
  if (articleId == null) return doc;

  if (doc._status === 'published') {
    try {
      const article = await req.payload.findByID({
        collection: 'posts',
        id: articleId,
        depth: 2,
        draft: false,
        overrideAccess: true,
      });

      if (article) {
        await setArticleCache(articleId, article);
      }
    } catch (err) {
      console.error(`[article-cache] Failed to sync published article ${articleId}:`, err);
    }

    return doc;
  }

  if (previousDoc?._status === 'published' && doc._status !== 'published') {
    try {
      await removeArticleCache(articleId);
    } catch (err) {
      console.error(`[article-cache] Failed to remove unpublished article ${articleId}:`, err);
    }
  }

  return doc;
};

export const removeArticleCacheOnDelete: CollectionAfterDeleteHook = async ({ doc }) => {
  const articleId = doc.id;
  if (articleId == null) return doc;

  try {
    await removeArticleCache(articleId);
  } catch (err) {
    console.error(`[article-cache] Failed to remove deleted article ${articleId}:`, err);
  }

  return doc;
};
