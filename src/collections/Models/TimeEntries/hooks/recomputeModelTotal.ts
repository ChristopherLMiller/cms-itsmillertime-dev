import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  PayloadRequest,
} from 'payload';

type Relation = number | string | { id: number | string } | null | undefined;

export function relationId(value: Relation): number | string | null {
  if (value == null) return null;
  return typeof value === 'object' ? value.id : value;
}

/**
 * Re-sum every finished entry for a model and store it on
 * `models.timeTracking.totalSeconds`. Summing from scratch (instead of adding
 * deltas) means the stored total can't drift from the entries.
 *
 * Writes through `payload.db.updateOne`: same transaction as `req`, but no
 * Models hooks (related-post sync) and no access checks — the field is
 * read-only to everyone else.
 */
export async function recomputeModelTotal(
  modelId: number | string,
  req: PayloadRequest,
): Promise<number> {
  const { payload } = req;
  const entries = await payload.find({
    collection: 'model-time-entries',
    where: {
      and: [{ model: { equals: modelId } }, { durationSeconds: { exists: true } }],
    },
    select: { durationSeconds: true },
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  });

  const totalSeconds = entries.docs.reduce(
    (sum, entry) => sum + Math.max(0, Math.floor(entry.durationSeconds ?? 0)),
    0,
  );

  await payload.db.updateOne({
    collection: 'models',
    id: modelId,
    data: { timeTracking: { totalSeconds } },
    req,
  });

  return totalSeconds;
}

export const recomputeTotalAfterChange: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
}) => {
  const modelId = relationId(doc.model);
  const previousModelId = relationId(previousDoc?.model);
  if (modelId != null) await recomputeModelTotal(modelId, req);
  if (previousModelId != null && previousModelId !== modelId) {
    await recomputeModelTotal(previousModelId, req);
  }
  return doc;
};

export const recomputeTotalAfterDelete: CollectionAfterDeleteHook = async ({ doc, req }) => {
  const modelId = relationId(doc.model);
  // The model itself may be the thing being deleted (entries cascade); ignore that.
  if (modelId != null) await recomputeModelTotal(modelId, req).catch(() => undefined);
  return doc;
};
