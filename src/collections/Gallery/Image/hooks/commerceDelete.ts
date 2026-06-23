import type { CollectionAfterDeleteHook } from 'payload';
import { deleteProduct, getMedusaEnv, isMedusaConfigured } from '@/lib/medusa/client';

/**
 * When a gallery image that is linked to a Medusa product is deleted, remove the
 * product from Medusa too. Best-effort: a Medusa failure must not block deleting
 * the image in the CMS.
 */
export const removeMedusaProduct: CollectionAfterDeleteHook = async ({ doc, req }) => {
  const productId = (doc as { medusaProductId?: string | null })?.medusaProductId;
  if (!productId || !isMedusaConfigured()) {
    return doc;
  }

  try {
    await deleteProduct(getMedusaEnv(), productId);
  } catch (err) {
    req.payload.logger.error(
      `[medusa] failed to delete product ${productId} for gallery-image ${doc.id}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  return doc;
};
