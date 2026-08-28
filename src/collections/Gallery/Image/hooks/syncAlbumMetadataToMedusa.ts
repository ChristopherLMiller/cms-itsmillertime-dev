import type { CollectionAfterChangeHook } from 'payload'
import {
  buildAlbumMetadata,
  getMedusaEnv,
  isMedusaConfigured,
  patchProductMetadata,
} from '@/lib/medusa/client'
import {
  idsEqual,
  normalizeRelationIds,
  shouldSkipRelationSync,
} from '@/utilities/relationSync'
import { resolveGalleryAlbums } from '@/utilities/resolveGalleryAlbums'

/**
 * When a listed gallery image's album membership changes, mirror the new
 * album list onto the Medusa product's metadata (album_ids / albums).
 *
 * Best-effort: a Medusa failure must not block saving the image in the CMS.
 */
export const syncAlbumMetadataToMedusa: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
  context,
  operation,
}) => {
  if (shouldSkipRelationSync(req, context, operation)) return doc
  if (operation !== 'update') return doc

  const productId =
    typeof doc?.medusaProductId === 'string' ? doc.medusaProductId.trim() : ''
  if (!productId || !isMedusaConfigured()) return doc

  const nextIds = normalizeRelationIds(doc?.albums)
  const prevIds = normalizeRelationIds(previousDoc?.albums)
  if (idsEqual(nextIds, prevIds)) return doc

  try {
    const albums = await resolveGalleryAlbums(req.payload, doc?.albums, req)
    await patchProductMetadata(getMedusaEnv(), productId, buildAlbumMetadata(albums))
  } catch (err) {
    req.payload.logger.error(
      `[medusa] failed to sync album metadata for gallery-image ${doc.id} → ${productId}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    )
  }

  return doc
}
