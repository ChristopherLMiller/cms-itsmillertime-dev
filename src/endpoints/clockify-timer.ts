import { allowedRoles } from '@/access/methods/allowedRoles';
import { Clockify } from '@/lib/clockify';
import type { PayloadRequest } from 'payload';

/**
 * Admin-only Clockify endpoints for the www frontend and admin UI.
 * Paths are under Payload's `/api` catch-all:
 *   GET  /api/clockify/projects
 *   GET  /api/clockify/timer
 *   POST /api/clockify/timer/start
 *   POST /api/clockify/timer/stop
 */

async function requireAdmin(req: PayloadRequest): Promise<boolean> {
  return allowedRoles(['admin'])({ req });
}

async function readJson(req: PayloadRequest): Promise<Record<string, unknown> | null> {
  const parseJson = req.json;
  if (!parseJson) return null;
  try {
    const body = await parseJson.call(req);
    if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}

function clockifyOr503(): Clockify | Response {
  try {
    return new Clockify();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Clockify is not configured';
    return Response.json({ error: message }, { status: 503 });
  }
}

function logAndFail(context: string, err: unknown): Response {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[clockify] ${context} failed: ${message}`);
  return Response.json({ error: message }, { status: 502 });
}

/** GET /api/clockify/projects */
export async function clockifyProjectsHandler(req: PayloadRequest): Promise<Response> {
  if (!(await requireAdmin(req))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = clockifyOr503();
  if (client instanceof Response) return client;

  try {
    const projects = await client.getProjects();
    return Response.json(projects);
  } catch (err) {
    return logAndFail('projects', err);
  }
}

/** GET /api/clockify/timer */
export async function clockifyTimerStatusHandler(req: PayloadRequest): Promise<Response> {
  if (!(await requireAdmin(req))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = clockifyOr503();
  if (client instanceof Response) return client;

  try {
    const timers = await client.getInProgressTimers();
    return Response.json({
      isRunning: timers.length > 0,
      timer: timers[0] ?? null,
      timers,
    });
  } catch (err) {
    return logAndFail('timer status', err);
  }
}

/** POST /api/clockify/timer/start */
export async function clockifyTimerStartHandler(req: PayloadRequest): Promise<Response> {
  if (!(await requireAdmin(req))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await readJson(req)) ?? {};
  const projectId = typeof body.projectId === 'string' ? body.projectId : undefined;
  const description = typeof body.description === 'string' ? body.description : undefined;
  const billable = typeof body.billable === 'boolean' ? body.billable : undefined;
  const start = typeof body.start === 'string' ? body.start : undefined;

  if (body.projectId != null && typeof body.projectId !== 'string') {
    return Response.json({ error: 'projectId must be a string' }, { status: 400 });
  }

  const client = clockifyOr503();
  if (client instanceof Response) return client;

  try {
    const timer = await client.startTimer({ projectId, description, billable, start });
    return Response.json({ timer });
  } catch (err) {
    return logAndFail('timer start', err);
  }
}

/** POST /api/clockify/timer/stop */
export async function clockifyTimerStopHandler(req: PayloadRequest): Promise<Response> {
  if (!(await requireAdmin(req))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await readJson(req)) ?? {};
  const end = typeof body.end === 'string' ? body.end : undefined;

  const client = clockifyOr503();
  if (client instanceof Response) return client;

  try {
    const timer = await client.stopTimer(end);
    return Response.json({ timer });
  } catch (err) {
    return logAndFail('timer stop', err);
  }
}
