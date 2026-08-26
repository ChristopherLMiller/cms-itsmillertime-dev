import type { CollectionAfterChangeHook } from 'payload';
import { notifyPendingProductRequests } from '@/utilities/notifyProductRequests';

/**
 * When a gallery image first gets a Medusa product pointer, email everyone
 * waiting on that image. Republish (draft → published) does not change this
 * field — that path is handled in the Medusa status endpoint.
 */
export const notifyProductWaitlist: CollectionAfterChangeHook = async ({
  req,
  doc,
  previousDoc,
  operation,
  context,
}) => {
  if (context?.skipWaitlistNotify) return doc;
  if (operation !== 'update') return doc;

  const previousId =
    typeof previousDoc?.medusaProductId === 'string' ? previousDoc.medusaProductId.trim() : '';
  const nextId = typeof doc?.medusaProductId === 'string' ? doc.medusaProductId.trim() : '';

  if (!nextId || previousId === nextId) return doc;

  try {
    await notifyPendingProductRequests(req.payload, Number(doc.id));
  } catch (err) {
    req.payload.logger.error(
      `[product-request] failed to queue waitlist emails for gallery-image ${doc.id}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  return doc;
};
