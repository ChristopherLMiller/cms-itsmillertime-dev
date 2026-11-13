import type { CollectionAfterChangeHook } from 'payload';

/**
 * When a model is saved as COMPLETED, stop any timer still running on it so
 * time isn't tracked against a finished build. Runs in the same transaction
 * as the save; stopping the entry re-sums the model total via the time-entry
 * hooks.
 */
export const stopTimerOnComplete: CollectionAfterChangeHook = async ({ doc, req }) => {
  if (doc?.model_meta?.status !== 'COMPLETED') return doc;

  const running = await req.payload.find({
    collection: 'model-time-entries',
    where: {
      and: [
        { model: { equals: doc.id } },
        { startedAt: { exists: true } },
        { stoppedAt: { exists: false } },
      ],
    },
    limit: 1,
    depth: 0,
    req,
  });

  const entry = running.docs[0];
  if (entry) {
    await req.payload.update({
      collection: 'model-time-entries',
      id: entry.id,
      data: { stoppedAt: new Date().toISOString() },
      depth: 0,
      req,
    });
    req.payload.logger.info(`[model-time] stopped timer ${entry.id} because model ${doc.id} was completed`);
  }

  return doc;
};
