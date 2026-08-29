import type { Payload, PayloadRequest } from 'payload'
import type { GalleryAlbumRef } from '@/lib/medusa/client'
import { normalizeRelationIds } from '@/utilities/normalizeRelationIds'

type AlbumDoc = {
  id: number
  slug?: string | null
  title?: string | null
  settings?: {
    isNsfw?: boolean | null
    visibility?: string | null
  } | null
}

function toAlbumRef(doc: AlbumDoc): GalleryAlbumRef {
  return {
    id: String(doc.id),
    slug: typeof doc.slug === 'string' ? doc.slug : '',
    title: typeof doc.title === 'string' ? doc.title : '',
    visibility: doc.settings?.visibility ?? undefined,
    isNsfw: doc.settings?.isNsfw === true,
  }
}

function isPublicStoreAlbum(album: GalleryAlbumRef): boolean {
  if (!album.slug) return false
  if (album.isNsfw) return false
  if (album.visibility && album.visibility !== 'ALL') return false
  return true
}

/**
 * Resolve gallery-album relationship values into Medusa metadata refs.
 * Privileged / NSFW albums are omitted so they never become public store
 * categories. Order follows the image's album list.
 */
export async function resolveGalleryAlbums(
  payload: Payload,
  albumsField: unknown,
  req?: PayloadRequest,
): Promise<GalleryAlbumRef[]> {
  const ids = normalizeRelationIds(albumsField)
  if (ids.length === 0) return []

  const result = await payload.find({
    collection: 'gallery-albums',
    where: { id: { in: ids } },
    depth: 0,
    limit: ids.length,
    pagination: false,
    overrideAccess: true,
    ...(req ? { req } : {}),
  })

  const fetched = new Map<number, GalleryAlbumRef>()
  for (const doc of result.docs as AlbumDoc[]) {
    fetched.set(doc.id, toAlbumRef(doc))
  }

  return ids
    .map((id) => fetched.get(id))
    .filter((album): album is GalleryAlbumRef => Boolean(album))
    .filter(isPublicStoreAlbum)
}
