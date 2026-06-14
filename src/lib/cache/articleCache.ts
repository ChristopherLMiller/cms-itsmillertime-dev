import { removePayloadCache, setPayloadCache } from '@/lib/cache/payloadCache';

export function articleCacheKey(articleId: number | string): string {
  return `payload:article:${articleId}`;
}

export async function setArticleCache(articleId: number | string, article: unknown): Promise<void> {
  await setPayloadCache(`article:${articleId}`, article);
}

export async function removeArticleCache(articleId: number | string): Promise<void> {
  await removePayloadCache(`article:${articleId}`);
}
