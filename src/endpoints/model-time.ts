import type { Model, ModelTimeEntry } from '@/payload-types';
import {
  commitTransaction,
  initTransaction,
  killTransaction,
  type PayloadRequest,
} from 'payload';
import { readJson, requireAdmin, unauthorized } from './lib/adminRequest';
import { relationId } from '@/collections/Models/TimeEntries/hooks/recomputeModelTotal';

/**
 * Admin-only model time tracking:
 *   GET  /api/model-time/timer[?modelId=]      running timer, plus model totals when modelId is given
 *   POST /api/model-time/timer/start {modelId} stop any running timer, start one on modelId
 *   POST /api/model-time/timer/stop            stop the running timer
 *
 * Starting a timer on a NOT_STARTED model moves it to IN_PROGRESS; COMPLETED
 * models refuse new timers.
 */

const COLLECTION = 'model-time-entries' as const;

function bad(status: number, error: string): Response {
  return Response.json({ error }, { status });
}

function parseModelId(value: unknown): number | null {
  const id = typeof value === 'string' ? Number(value) : value;
  return typeof id === 'number' && Number.isInteger(id) && id > 0 ? id : null;
}

/** Read a model directly from the DB: skips the Models read hook that hides NOT_STARTED models. */
async function findModel(req: PayloadRequest, id: number): Promise<Model | null> {
  return (await req.payload.db.findOne<Model>({
    collection: 'models',
    where: { id: { equals: id } },
    req,
  })) as Model | null;
}

async function findRunning(req: PayloadRequest): Promise<ModelTimeEntry | null> {
  const result = await req.payload.find({
    collection: COLLECTION,
    where: {
      and: [{ startedAt: { exists: true } }, { stoppedAt: { exists: false } }],
    },
    sort: '-startedAt',
    limit: 1,
    depth: 0,
    req,
  });
  return result.docs[0] ?? null;
}

async function describeRunning(req: PayloadRequest, entry: ModelTimeEntry | null) {
  if (!entry) return null;
  const modelId = relationId(entry.model);
  const model = modelId != null ? await findModel(req, Number(modelId)) : null;
  return {
    id: entry.id,
    modelId,
    modelTitle: model?.title ?? null,
    startedAt: entry.startedAt,
  };
}

function isUniqueViolation(err: unknown): boolean {
  const text = err instanceof Error ? `${err.message} ${String((err as { cause?: unknown }).cause ?? '')}` : String(err);
  return /model_time_entries_one_running|duplicate key|unique constraint/i.test(text);
}

/** GET /api/model-time/timer */
export async function modelTimeStatusHandler(req: PayloadRequest): Promise<Response> {
  if (!(await requireAdmin(req))) return unauthorized();

  const running = await describeRunning(req, await findRunning(req));
  const body: Record<string, unknown> = { isRunning: running != null, entry: running };

  const modelIdParam = req.searchParams?.get('modelId');
  if (modelIdParam != null) {
    const modelId = parseModelId(modelIdParam);
    if (modelId == null) return bad(400, 'modelId must be a positive integer');
    const model = await findModel(req, modelId);
    if (!model) return bad(404, 'Model not found');
    body.model = {
      id: model.id,
      totalSeconds: model.timeTracking?.totalSeconds ?? 0,
      status: model.model_meta?.status ?? null,
    };
  }

  return Response.json(body);
}

/** POST /api/model-time/timer/start */
export async function modelTimeStartHandler(req: PayloadRequest): Promise<Response> {
  if (!(await requireAdmin(req))) return unauthorized();

  const body = (await readJson(req)) ?? {};
  const modelId = parseModelId(body.modelId);
  if (modelId == null) return bad(400, 'modelId must be a positive integer');
  const model = await findModel(req, modelId);
  if (!model) return bad(404, 'Model not found');
  if (model.model_meta?.status === 'COMPLETED') {
    return bad(409, 'This model is completed. Change its status before tracking more time.');
  }

  const shouldCommit = await initTransaction(req);
  try {
    const now = new Date().toISOString();
    const running = await findRunning(req);
    let stopped: ModelTimeEntry | null = null;

    if (running && relationId(running.model) === modelId) {
      if (shouldCommit) await commitTransaction(req);
      return Response.json({ entry: running, stopped: null, alreadyRunning: true });
    }
    if (running) {
      stopped = await req.payload.update({
        collection: COLLECTION,
        id: running.id,
        data: { stoppedAt: now },
        depth: 0,
        req,
      });
    }

    const entry = await req.payload.create({
      collection: COLLECTION,
      data: { model: modelId, startedAt: now, source: 'timer' },
      depth: 0,
      req,
    });

    let statusChanged = false;
    if (model.model_meta?.status === 'NOT_STARTED') {
      await req.payload.update({
        collection: 'models',
        id: modelId,
        // Title is passed through so the title hook doesn't re-derive it from
        // the kit; the rest of model_meta is kept so only status changes.
        data: {
          title: model.title,
          model_meta: { ...model.model_meta, status: 'IN_PROGRESS' },
        },
        depth: 0,
        req,
      });
      statusChanged = true;
    }

    if (shouldCommit) await commitTransaction(req);
    return Response.json({
      entry,
      stopped,
      alreadyRunning: false,
      modelStatus: statusChanged ? 'IN_PROGRESS' : (model.model_meta?.status ?? null),
    });
  } catch (err) {
    await killTransaction(req);
    if (isUniqueViolation(err)) return bad(409, 'Another timer was started at the same time. Try again.');
    req.payload.logger.error({ err }, '[model-time] start failed');
    return bad(500, err instanceof Error ? err.message : 'Failed to start timer');
  }
}

/** POST /api/model-time/timer/stop */
export async function modelTimeStopHandler(req: PayloadRequest): Promise<Response> {
  if (!(await requireAdmin(req))) return unauthorized();

  const running = await findRunning(req);
  if (!running) return bad(409, 'No timer is running');

  const entry = await req.payload.update({
    collection: COLLECTION,
    id: running.id,
    data: { stoppedAt: new Date().toISOString() },
    depth: 0,
    req,
  });
  return Response.json({ entry });
}
