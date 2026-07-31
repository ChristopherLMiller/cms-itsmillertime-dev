import {
  idsEqual,
  normalizeRelationIds,
  shouldSkipRelationSync,
} from '@/utilities/relationSync'
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

/**
 * Keep Models.relatedPosts in sync when an article's relatedModels change.
 *
 * Nested updates intentionally omit `req` so they run outside the parent
 * transaction (avoids lock contention with draft/versioned post saves).
 */
export const syncRelatedModelsOnPostChange: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
  context,
}) => {
  if (shouldSkipRelationSync(req, context) || doc?.id == null) return doc

  const postId = typeof doc.id === 'number' ? doc.id : Number(doc.id)
  if (Number.isNaN(postId)) return doc

  const nextModelIds = normalizeRelationIds(doc.relatedModels)
  const prevModelIds = normalizeRelationIds(previousDoc?.relatedModels)

  if (idsEqual(nextModelIds, prevModelIds)) return doc

  const added = nextModelIds.filter((id) => !prevModelIds.includes(id))
  const removed = prevModelIds.filter((id) => !nextModelIds.includes(id))
  const { payload } = req

  for (const modelId of added) {
    try {
      const model = await payload.findByID({
        collection: 'models',
        id: modelId,
        depth: 0,
        overrideAccess: true,
      })

      const currentPosts = normalizeRelationIds(model.relatedPosts)
      if (currentPosts.includes(postId)) continue

      await payload.update({
        collection: 'models',
        id: modelId,
        data: {
          relatedPosts: [...currentPosts, postId],
        },
        depth: 0,
        overrideAccess: true,
        context: { skipRelationSync: true },
      })
    } catch (err) {
      payload.logger.error({
        err,
        msg: `Failed to add post ${postId} to model ${modelId} relatedPosts`,
      })
    }
  }

  for (const modelId of removed) {
    try {
      const model = await payload.findByID({
        collection: 'models',
        id: modelId,
        depth: 0,
        overrideAccess: true,
      })

      const currentPosts = normalizeRelationIds(model.relatedPosts)
      if (!currentPosts.includes(postId)) continue

      await payload.update({
        collection: 'models',
        id: modelId,
        data: {
          relatedPosts: currentPosts.filter((id) => id !== postId),
        },
        depth: 0,
        overrideAccess: true,
        context: { skipRelationSync: true },
      })
    } catch (err) {
      payload.logger.error({
        err,
        msg: `Failed to remove post ${postId} from model ${modelId} relatedPosts`,
      })
    }
  }

  return doc
}

export const removePostFromRelatedModelsOnDelete: CollectionAfterDeleteHook = async ({
  doc,
  req,
}) => {
  if (doc?.id == null) return doc

  const postId = typeof doc.id === 'number' ? doc.id : Number(doc.id)
  if (Number.isNaN(postId)) return doc

  const modelIds = normalizeRelationIds(doc.relatedModels)
  if (modelIds.length === 0) return doc

  const { payload } = req

  for (const modelId of modelIds) {
    try {
      const model = await payload.findByID({
        collection: 'models',
        id: modelId,
        depth: 0,
        overrideAccess: true,
      })

      const currentPosts = normalizeRelationIds(model.relatedPosts)
      if (!currentPosts.includes(postId)) continue

      await payload.update({
        collection: 'models',
        id: modelId,
        data: {
          relatedPosts: currentPosts.filter((id) => id !== postId),
        },
        depth: 0,
        overrideAccess: true,
        context: { skipRelationSync: true },
      })
    } catch (err) {
      payload.logger.error({
        err,
        msg: `Failed to remove deleted post ${postId} from model ${modelId} relatedPosts`,
      })
    }
  }

  return doc
}
