import { normalizeRelationIds } from '@/utilities/normalizeRelationIds'
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

type RelationSyncContext = {
  skipRelationSync?: boolean
}

const idsEqual = (a: number[], b: number[]) => {
  if (a.length !== b.length) return false
  const sortedA = [...a].sort((x, y) => x - y)
  const sortedB = [...b].sort((x, y) => x - y)
  return sortedA.every((id, index) => id === sortedB[index])
}

/**
 * Keep Posts.relatedModels in sync when a model's relatedPosts change,
 * so editors can link from either direction.
 */
export const syncRelatedPostsOnModelChange: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
  context,
}) => {
  const syncContext = context as RelationSyncContext
  if (syncContext?.skipRelationSync || doc?.id == null) return doc

  const modelId = typeof doc.id === 'number' ? doc.id : Number(doc.id)
  if (Number.isNaN(modelId)) return doc

  const nextPostIds = normalizeRelationIds(doc.relatedResources?.relatedPosts)
  const prevPostIds = normalizeRelationIds(previousDoc?.relatedResources?.relatedPosts)

  if (idsEqual(nextPostIds, prevPostIds)) return doc

  const added = nextPostIds.filter((id) => !prevPostIds.includes(id))
  const removed = prevPostIds.filter((id) => !nextPostIds.includes(id))

  for (const postId of added) {
    try {
      const post = await req.payload.findByID({
        collection: 'posts',
        id: postId,
        depth: 0,
        overrideAccess: true,
      })

      const currentModels = normalizeRelationIds(post.relatedModels)
      if (currentModels.includes(modelId)) continue

      await req.payload.update({
        collection: 'posts',
        id: postId,
        data: {
          relatedModels: [...currentModels, modelId],
        },
        depth: 0,
        overrideAccess: true,
        context: { skipRelationSync: true },
      })
    } catch (err) {
      req.payload.logger.error({
        err,
        msg: `Failed to add model ${modelId} to post ${postId} relatedModels`,
      })
    }
  }

  for (const postId of removed) {
    try {
      const post = await req.payload.findByID({
        collection: 'posts',
        id: postId,
        depth: 0,
        overrideAccess: true,
      })

      const currentModels = normalizeRelationIds(post.relatedModels)
      if (!currentModels.includes(modelId)) continue

      await req.payload.update({
        collection: 'posts',
        id: postId,
        data: {
          relatedModels: currentModels.filter((id) => id !== modelId),
        },
        depth: 0,
        overrideAccess: true,
        context: { skipRelationSync: true },
      })
    } catch (err) {
      req.payload.logger.error({
        err,
        msg: `Failed to remove model ${modelId} from post ${postId} relatedModels`,
      })
    }
  }

  return doc
}

export const removeModelFromRelatedPostsOnDelete: CollectionAfterDeleteHook = async ({
  doc,
  req,
}) => {
  if (doc?.id == null) return doc

  const modelId = typeof doc.id === 'number' ? doc.id : Number(doc.id)
  if (Number.isNaN(modelId)) return doc

  const postIds = normalizeRelationIds(doc.relatedResources?.relatedPosts)
  if (postIds.length === 0) return doc

  for (const postId of postIds) {
    try {
      const post = await req.payload.findByID({
        collection: 'posts',
        id: postId,
        depth: 0,
        overrideAccess: true,
      })

      const currentModels = normalizeRelationIds(post.relatedModels)
      if (!currentModels.includes(modelId)) continue

      await req.payload.update({
        collection: 'posts',
        id: postId,
        data: {
          relatedModels: currentModels.filter((id) => id !== modelId),
        },
        depth: 0,
        overrideAccess: true,
        context: { skipRelationSync: true },
      })
    } catch (err) {
      req.payload.logger.error({
        err,
        msg: `Failed to remove deleted model ${modelId} from post ${postId} relatedModels`,
      })
    }
  }

  return doc
}
