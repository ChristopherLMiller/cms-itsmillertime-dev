import type { Payload, PayloadRequest } from 'payload'
import type { GalleryAlbumRef } from '@/lib/medusa/client'
import { normalizeRelationIds } from '@/utilities/normalizeRelationIds'

type AlbumDoc = {
  id: number
  slug?: string | null
  title?: string | null
}

/**
 * Resolve gallery-album relationship values into Medusa metadata refs
 * (`id` / `slug` / `title`). Order follows the image's album list.
 */
export async function resolveGalleryAlbums(
  payload: Payload,
  albumsField: unknown,
  req?: PayloadRequest,
): Promise<GalleryAlbumRef[]> {
  const ids = normalizeRelationIds(albumsField)
  if (ids.length === 0) return []

  // Prefer titles/slugs already populated on the relationship field.
  const fromPopulated = new Map<number, GalleryAlbumRef>()
  if (Array.isArray(albumsField)) {
    for (const item of albumsField) {
      if (!item || typeof item !== 'object' || !('id' in item)) continue
      const id = typeof (item as AlbumDoc).id === 'number' ? (item as AlbumDoc).id : Number((item as AlbumDoc).id)
      if (Number.isNaN(id)) continue
      const title = typeof (item as AlbumDoc).title === 'string' ? (item as AlbumDoc).title : null
      const slug = typeof (item as AlbumDoc).slug === 'string' ? (item as AlbumDoc).slug : null
      if (title != null || slug != null) {
        fromPopulated.set(id, {
          id: String(id),
          slug: slug ?? '',
          title: title ?? '',
        })
      }
    }
  }

  const missing = ids.filter((id) => !fromPopulated.has(id))
  const fetched = new Map<number, GalleryAlbumRef>()

  if (missing.length > 0) {
    const result = await payload.find({
      collection: 'gallery-albums',
      where: { id: { in: missing } },
      depth: 0,
      limit: missing.length,
      pagination: false,
      overrideAccess: true,
      ...(req ? { req } : {}),
    })

    for (const doc of result.docs as AlbumDoc[]) {
      fetched.set(doc.id, {
        id: String(doc.id),
        slug: typeof doc.slug === 'string' ? doc.slug : '',
        title: typeof doc.title === 'string' ? doc.title : '',
      })
    }
  }

  return ids.map((id) => {
    return (
      fromPopulated.get(id) ??
      fetched.get(id) ?? {
        id: String(id),
        slug: '',
        title: '',
      }
    )
  })
}
