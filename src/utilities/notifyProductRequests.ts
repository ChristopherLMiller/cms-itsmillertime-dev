import type { Payload, Where } from 'payload';
import { frontendBaseUrl, galleryImagePublicUrl } from './productRequestUrls';

const pendingWhere = (galleryImageId: number): Where => ({
  and: [{ galleryImage: { equals: galleryImageId } }, { status: { equals: 'pending' } }],
});

export async function countPendingProductRequests(
  payload: Payload,
  galleryImageId: number,
): Promise<number> {
  const id = Number(galleryImageId);
  if (!Number.isFinite(id)) return 0;

  const result = await payload.count({
    collection: 'gallery-product-requests',
    where: pendingWhere(id),
    overrideAccess: true,
  });

  return result.totalDocs ?? 0;
}

/**
 * Queue a "now available" email for every pending request on this image.
 * Safe to call more than once: the job no-ops if the row is no longer pending.
 * Returns how many emails were queued.
 */
export async function notifyPendingProductRequests(
  payload: Payload,
  galleryImageId: number,
): Promise<number> {
  const id = Number(galleryImageId);
  if (!Number.isFinite(id)) return 0;

  let page = 1;
  const limit = 50;
  let hasMore = true;
  let queued = 0;

  while (hasMore) {
    const result = await payload.find({
      collection: 'gallery-product-requests',
      where: pendingWhere(id),
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
          galleryUrl: galleryImagePublicUrl(doc.albumSlug, id) ?? frontendBaseUrl(),
        },
        queue: 'email',
      });
      queued += 1;
    }

    hasMore = Boolean(result.hasNextPage);
    page += 1;
  }

  if (queued > 0) {
    payload.logger.info(
      `[product-request] queued ${queued} waitlist email(s) for gallery-image ${id}`,
    );
  }

  return queued;
}
