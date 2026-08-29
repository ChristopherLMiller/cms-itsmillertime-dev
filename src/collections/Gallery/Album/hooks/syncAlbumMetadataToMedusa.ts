import type { CollectionAfterChangeHook } from 'payload'
import {
  buildAlbumMetadata,
  getMedusaEnv,
  isMedusaConfigured,
  patchProductMetadata,
} from '@/lib/medusa/client'
import { shouldSkipRelationSync } from '@/utilities/relationSync'
import { resolveGalleryAlbums } from '@/utilities/resolveGalleryAlbums'

type ListedImage = {
  id: number
  albums?: unknown
  medusaProductId?: string | null
}

/**
 * When an album's title or slug changes, refresh `albums` metadata on every
 * Medusa product linked from a member image. Membership itself is owned on the
 * image; this only keeps enriched album labels current.
 *
 * Best-effort: Medusa failures are logged and do not block the album save.
 */
export const syncAlbumLabelToMedusaProducts: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
  context,
  operation,
}) => {
  if (shouldSkipRelationSync(req, context, operation)) return doc
  if (operation !== 'update') return doc
  if (!isMedusaConfigured()) return doc

  const nextTitle = typeof doc?.title === 'string' ? doc.title : ''
  const prevTitle = typeof previousDoc?.title === 'string' ? previousDoc.title : ''
  const nextSlug = typeof doc?.slug === 'string' ? doc.slug : ''
  const prevSlug = typeof previousDoc?.slug === 'string' ? previousDoc.slug : ''
  if (nextTitle === prevTitle && nextSlug === prevSlug) return doc

  const albumId = typeof doc.id === 'number' ? doc.id : Number(doc.id)
  if (Number.isNaN(albumId)) return doc

  try {
    const env = getMedusaEnv()
    let page = 1
    let hasNextPage = true

    while (hasNextPage) {
      const result = await req.payload.find({
        collection: 'gallery-images',
        where: {
          and: [
            // hasMany relationship: image is in this album
            { albums: { in: [albumId] } },
            { medusaProductId: { exists: true } },
          ],
        },
        depth: 0,
        limit: 50,
        page,
        overrideAccess: true,
        req,
      })

      for (const image of result.docs as ListedImage[]) {
        const productId =
          typeof image.medusaProductId === 'string' ? image.medusaProductId.trim() : ''
        if (!productId) continue

        try {
          const albums = await resolveGalleryAlbums(req.payload, image.albums, req)
          // Ensure the just-saved album title/slug wins even if depth-0 ids only.
          const withFreshLabel = albums.map((album) =>
            album.id === String(albumId)
              ? {
                  ...album,
                  slug: nextSlug,
                  title: nextTitle,
                }
              : album,
          )
          await patchProductMetadata(env, productId, buildAlbumMetadata(withFreshLabel))
        } catch (err) {
          req.payload.logger.error(
            `[medusa] failed to sync album label for gallery-image ${image.id} → ${productId}: ${
              err instanceof Error ? err.message : String(err)
            }`,
          )
        }
      }

      hasNextPage = Boolean(result.hasNextPage)
      page += 1
    }
  } catch (err) {
    req.payload.logger.error(
      `[medusa] failed to find listed images for album ${albumId}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    )
  }

  return doc
}
