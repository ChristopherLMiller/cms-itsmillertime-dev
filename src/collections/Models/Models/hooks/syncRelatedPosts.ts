import {
  idsEqual,
  normalizeRelationIds,
  shouldSkipRelationSync,
} from '@/utilities/relationSync'
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

/**
 * Keep Posts.relatedModels in sync when a model's relatedPosts change.
 *
 * Nested Local API calls must pass `req` so they join the parent Postgres
 * transaction — omitting it opens a second transaction and deadlocks the save.
 * overrideLock avoids draft locks on articles blocking the model save.
 */
export const syncRelatedPostsOnModelChange: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
  context,
  operation,
}) => {
  if (shouldSkipRelationSync(req, context, operation) || doc?.id == null) return doc

  const modelId = typeof doc.id === 'number' ? doc.id : Number(doc.id)
  if (Number.isNaN(modelId)) return doc

  const nextPostIds = normalizeRelationIds(doc.relatedPosts)
  const prevPostIds = normalizeRelationIds(previousDoc?.relatedPosts)

  if (idsEqual(nextPostIds, prevPostIds)) return doc

  const added = nextPostIds.filter((id) => !prevPostIds.includes(id))
  const removed = prevPostIds.filter((id) => !nextPostIds.includes(id))
  const { payload } = req

  for (const postId of added) {
    try {
      const post = await payload.findByID({
        collection: 'posts',
        id: postId,
        depth: 0,
        overrideAccess: true,
        req,
      })

      const currentModels = normalizeRelationIds(post.relatedModels)
      if (currentModels.includes(modelId)) continue

      await payload.update({
        collection: 'posts',
        id: postId,
        data: {
          relatedModels: [...currentModels, modelId],
        },
        depth: 0,
        overrideAccess: true,
        overrideLock: true,
        context: { skipRelationSync: true },
        req,
      })
    } catch (err) {
      payload.logger.error({
        err,
        msg: `Failed to add model ${modelId} to post ${postId} relatedModels`,
      })
    }
  }

  for (const postId of removed) {
    try {
      const post = await payload.findByID({
        collection: 'posts',
        id: postId,
        depth: 0,
        overrideAccess: true,
        req,
      })

      const currentModels = normalizeRelationIds(post.relatedModels)
      if (!currentModels.includes(modelId)) continue

      await payload.update({
        collection: 'posts',
        id: postId,
        data: {
          relatedModels: currentModels.filter((id) => id !== modelId),
        },
        depth: 0,
        overrideAccess: true,
        overrideLock: true,
        context: { skipRelationSync: true },
        req,
      })
    } catch (err) {
      payload.logger.error({
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

  const postIds = normalizeRelationIds(doc.relatedPosts)
  if (postIds.length === 0) return doc

  const { payload } = req

  for (const postId of postIds) {
    try {
      const post = await payload.findByID({
        collection: 'posts',
        id: postId,
        depth: 0,
        overrideAccess: true,
        req,
      })

      const currentModels = normalizeRelationIds(post.relatedModels)
      if (!currentModels.includes(modelId)) continue

      await payload.update({
        collection: 'posts',
        id: postId,
        data: {
          relatedModels: currentModels.filter((id) => id !== modelId),
        },
        depth: 0,
        overrideAccess: true,
        overrideLock: true,
        context: { skipRelationSync: true },
        req,
      })
    } catch (err) {
      payload.logger.error({
        err,
        msg: `Failed to remove deleted model ${modelId} from post ${postId} relatedModels`,
      })
    }
  }

  return doc
}
