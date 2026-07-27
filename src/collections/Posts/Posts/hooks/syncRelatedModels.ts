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
 * Keep Models.relatedResources.relatedPosts in sync when an article's relatedModels change,
 * so editors can link from either direction without duplicate sources of truth drifting.
 */
export const syncRelatedModelsOnPostChange: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
  context,
}) => {
  const syncContext = context as RelationSyncContext
  if (syncContext?.skipRelationSync || doc?.id == null) return doc

  const postId = typeof doc.id === 'number' ? doc.id : Number(doc.id)
  if (Number.isNaN(postId)) return doc

  const nextModelIds = normalizeRelationIds(doc.relatedModels)
  const prevModelIds = normalizeRelationIds(previousDoc?.relatedModels)

  if (idsEqual(nextModelIds, prevModelIds)) return doc

  const added = nextModelIds.filter((id) => !prevModelIds.includes(id))
  const removed = prevModelIds.filter((id) => !nextModelIds.includes(id))

  for (const modelId of added) {
    try {
      const model = await req.payload.findByID({
        collection: 'models',
        id: modelId,
        depth: 0,
        overrideAccess: true,
      })

      const currentPosts = normalizeRelationIds(model.relatedResources?.relatedPosts)
      if (currentPosts.includes(postId)) continue

      await req.payload.update({
        collection: 'models',
        id: modelId,
        data: {
          relatedResources: {
            relatedPosts: [...currentPosts, postId],
            relatedModels: normalizeRelationIds(model.relatedResources?.relatedModels),
          },
        },
        depth: 0,
        overrideAccess: true,
        context: { skipRelationSync: true },
      })
    } catch (err) {
      req.payload.logger.error({
        err,
        msg: `Failed to add post ${postId} to model ${modelId} relatedPosts`,
      })
    }
  }

  for (const modelId of removed) {
    try {
      const model = await req.payload.findByID({
        collection: 'models',
        id: modelId,
        depth: 0,
        overrideAccess: true,
      })

      const currentPosts = normalizeRelationIds(model.relatedResources?.relatedPosts)
      if (!currentPosts.includes(postId)) continue

      await req.payload.update({
        collection: 'models',
        id: modelId,
        data: {
          relatedResources: {
            relatedPosts: currentPosts.filter((id) => id !== postId),
            relatedModels: normalizeRelationIds(model.relatedResources?.relatedModels),
          },
        },
        depth: 0,
        overrideAccess: true,
        context: { skipRelationSync: true },
      })
    } catch (err) {
      req.payload.logger.error({
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

  for (const modelId of modelIds) {
    try {
      const model = await req.payload.findByID({
        collection: 'models',
        id: modelId,
        depth: 0,
        overrideAccess: true,
      })

      const currentPosts = normalizeRelationIds(model.relatedResources?.relatedPosts)
      if (!currentPosts.includes(postId)) continue

      await req.payload.update({
        collection: 'models',
        id: modelId,
        data: {
          relatedResources: {
            relatedPosts: currentPosts.filter((id) => id !== postId),
            relatedModels: normalizeRelationIds(model.relatedResources?.relatedModels),
          },
        },
        depth: 0,
        overrideAccess: true,
        context: { skipRelationSync: true },
      })
    } catch (err) {
      req.payload.logger.error({
        err,
        msg: `Failed to remove deleted post ${postId} from model ${modelId} relatedPosts`,
      })
    }
  }

  return doc
}
