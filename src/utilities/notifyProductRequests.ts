import type { Payload } from 'payload';
import { frontendBaseUrl, galleryImagePublicUrl } from './productRequestUrls';

/**
 * Queue a "now available" email for every pending request on this image.
 * Safe to call more than once: the job no-ops if the row is no longer pending.
 */
export async function notifyPendingProductRequests(
  payload: Payload,
  galleryImageId: number,
): Promise<void> {
  let page = 1;
  const limit = 50;
  let hasMore = true;

  while (hasMore) {
    const result = await payload.find({
      collection: 'gallery-product-requests',
      where: {
        and: [
          { galleryImage: { equals: galleryImageId } },
          { status: { equals: 'pending' } },
        ],
      },
      limit,
      page,
      depth: 0,
      overrideAccess: true,
    });

    for (const doc of result.docs) {
      const imageTitle = (doc.imageTitle ?? '').trim() || 'a gallery image';
      await payload.jobs.queue({
        task: 'sendProductRequestAvailableEmail',
        input: {
          requestId: doc.id,
          requesterName: doc.name,
          requesterEmail: doc.email,
          imageTitle,
          galleryUrl: galleryImagePublicUrl(doc.albumSlug, galleryImageId) ?? frontendBaseUrl(),
        },
        queue: 'email',
      });
    }

    hasMore = Boolean(result.hasNextPage);
    page += 1;
  }
}
